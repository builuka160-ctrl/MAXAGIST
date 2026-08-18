// MAXAGIST admin-api: дашборд + редактор контента для Telegram Mini App.
// verify_jwt=false: авторизация через Telegram initData (HMAC) + allowlist app_admins.
// Deploy: supabase functions deploy admin-api --no-verify-jwt
//
// СЕКРЕТ: токен бота берётся из переменной окружения BOT_TOKEN (не хранится в git).
//   supabase secrets set BOT_TOKEN=<token-from-BotFather>
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const enc = new TextEncoder();
async function hmac(keyBytes: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

// Окно свежести initData. Настоящая проверка доступа — HMAC(BOT_TOKEN) + allowlist
// app_admins; auth_date лишь ограничивает переигрывание. Мобильный Telegram при
// переоткрытии Mini App нередко отдаёт закешированный initData со старым auth_date,
// поэтому окно широкое (30 дней), а по истечении клиенту возвращается код 'stale',
// чтобы он попросил переоткрыть панель, а не показывал «unauthorized».
const INITDATA_MAX_AGE = 30 * 86400;

// reason помогает отличить причину отказа: no_token/no_initdata/no_hash/
// bad_signature (→ BOT_TOKEN не совпадает с ботом)/no_user/stale.
type AuthReason = 'no_token' | 'no_initdata' | 'no_hash' | 'bad_signature' | 'no_user' | 'stale';
type AuthResult = { user: any } | { reason: AuthReason };
async function verifyInitData(initData: string): Promise<AuthResult> {
  if (!BOT_TOKEN) return { reason: 'no_token' };
  if (!initData) return { reason: 'no_initdata' };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { reason: 'no_hash' };
  params.delete('hash');
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmac(enc.encode('WebAppData'), BOT_TOKEN);
  const calc = hex(await hmac(secret, dcs));
  if (calc !== hash) return { reason: 'bad_signature' };
  const authDate = Number(params.get('auth_date') || '0');
  if (!authDate || (Date.now() / 1000 - authDate) > INITDATA_MAX_AGE) return { reason: 'stale' };
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user?.id ? { user } : { reason: 'no_user' };
  } catch { return { reason: 'no_user' }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Диагностика: какому боту принадлежит секрет BOT_TOKEN (getMe со стороны
  // Supabase). Токен не раскрывается — только публичное имя бота. Открывается
  // в браузере: <fn-url>/admin-api?diag=1. Можно удалить после починки.
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('diag') === '1') {
      const hasToken = !!BOT_TOKEN;
      let tgOk = false; let bot: string | null = null; let botId: number | null = null;
      if (hasToken) {
        try {
          const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
          const j = await r.json();
          tgOk = !!j?.ok; bot = j?.result?.username ?? null; botId = j?.result?.id ?? null;
        } catch (_e) { /* ignore */ }
      }
      return json({ ok: true, diag: { has_token: hasToken, tg_ok: tgOk, bot_username: bot, bot_id: botId } });
    }
    return json({ ok: false, error: 'method' }, 405);
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'bad json' }, 400); }

  const auth = await verifyInitData(body?.initData || '');
  if ('reason' in auth) {
    // reason виден клиенту: stale (переоткрыть), bad_signature (BOT_TOKEN не от этого
    // бота), no_initdata (открыто не через Telegram) и т.п.
    return json({ ok: false, error: auth.reason }, auth.reason === 'no_token' ? 500 : 401);
  }
  const user = auth.user;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: admin } = await supabase.from('app_admins').select('role,name').eq('tg_id', user.id).maybeSingle();
  if (!admin) return json({ ok: false, error: 'forbidden', id: user.id }, 403);
  const role = admin.role as string;
  const action = body?.action;

  if (action === 'me') return json({ ok: true, id: user.id, name: admin.name, role });

  if (action === 'stats') {
    const days = Math.min(90, Math.max(1, Number(body?.days) || 7));
    const { data, error } = await supabase.rpc('tracker_dashboard', { p_days: days });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, role, stats: data });
  }

  if (action === 'leads') {
    const limit = Math.min(500, Math.max(1, Number(body?.limit) || 200));
    const { data, error } = await supabase.from('leads')
      .select('id,received_at,name,phone,email,message,source,path,user_agent')
      .order('received_at', { ascending: false })
      .limit(limit);
    if (error) return json({ ok: false, error: error.message }, 500);
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true });
    return json({ ok: true, role, leads: data, total: count ?? (data?.length ?? 0) });
  }

  if (action === 'content_get') {
    const { data, error } = await supabase.from('site_content').select('key,value,updated_at');
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, role, content: data });
  }

  if (action === 'content_set') {
    if (role !== 'admin') return json({ ok: false, error: 'read-only' }, 403);
    const key = String(body?.key || '').slice(0, 80);
    if (!key) return json({ ok: false, error: 'no key' }, 400);
    const value = body?.value ?? {};
    const { error } = await supabase.from('site_content')
      .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user.id });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'unknown action' }, 400);
});
