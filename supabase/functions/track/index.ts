// MAXAGIST tracker ingest. Public (verify_jwt=false). Пишет в site_events service role'ом.
// Дополнительно принимает заявку формы-анкеты (body.lead) → таблица leads.
// Deploy: supabase functions deploy track --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const str = (v: unknown, n: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null;

// Понятное описание устройства из User-Agent: «📱 iPhone · Safari» и т.п.
function deviceFromUA(ua: string): string {
  ua = String(ua || '');
  if (!ua) return 'неизвестно';
  let os = '';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) { const m = ua.match(/Android[ ;]([\d.]+)/i); os = 'Android' + (m ? ' ' + m[1] : ''); }
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'Mac';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let br = '';
  if (/Edg\//i.test(ua)) br = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) br = 'Opera';
  else if (/CriOS/i.test(ua)) br = 'Chrome';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) br = 'Chrome';
  else if (/FxiOS/i.test(ua) || /Firefox\//i.test(ua)) br = 'Firefox';
  else if (/Version\//i.test(ua) && /Safari/i.test(ua)) br = 'Safari';
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const label = [os, br].filter(Boolean).join(' · ') || 'неизвестно';
  return (mobile ? '📱 ' : '💻 ') + label;
}

// Уведомление админам в Telegram о новой заявке (best-effort, не блокирует ответ).
async function notifyAdmins(supabase: any, lead: Record<string, unknown>, device: string) {
  const token = Deno.env.get('BOT_TOKEN');
  if (!token) return;
  const { data: admins } = await supabase.from('app_admins').select('tg_id');
  if (!admins?.length) return;
  const esc = (s: unknown) =>
    String(s ?? '').replace(/[<>&]/g, (m: string) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[m]!));
  const lines = [
    '🔔 <b>Новая заявка с сайта</b>',
    '',
    `👤 <b>${esc(lead.name)}</b>`,
    `📞 ${esc(lead.phone)}`,
    lead.email ? `✉️ ${esc(lead.email)}` : '',
    lead.message ? `\n💬 ${esc(lead.message)}` : '',
    lead.path ? `\n🔗 ${esc(lead.path)}` : '',
    `\n${esc(device)}`,
  ].filter(Boolean);
  const text = lines.join('\n');
  await Promise.all((admins as Array<{ tg_id: number }>).map((a) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: a.tg_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    }).catch(() => {}),
  ));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'bad json' }, 400); }

  const ctx = body?.ctx ?? {};
  const country = req.headers.get('cf-ipcountry') || req.headers.get('x-country') || null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // --- Заявка с формы-анкеты (лид). name + phone обязательны. ---
  let leadSaved = 0;
  const leadIn = body?.lead;
  if (leadIn && typeof leadIn === 'object') {
    const name = str(leadIn.name, 120);
    const phone = str(leadIn.phone, 40);
    if (name && phone) {
      const userAgent = (req.headers.get('user-agent') || '').slice(0, 300) || null;
      const lead = {
        name,
        phone,
        email:      str(leadIn.email, 160),
        message:    str(leadIn.message, 2000),
        source:     str(leadIn.source, 40) || 'site',
        path:       str(leadIn.path, 300) ?? (ctx.path ?? null),
        referrer:   str(leadIn.referrer, 400) ?? (ctx.ref ?? null),
        utm:        (leadIn.utm && typeof leadIn.utm === 'object') ? leadIn.utm : (ctx.utm ?? {}),
        country,
        visitor_id: str(leadIn.uid, 80) ?? (ctx.uid ?? null),
        session_id: str(leadIn.sid, 80) ?? (ctx.sid ?? null),
        user_agent: userAgent,
      };
      const { error: lerr } = await supabase.from('leads').insert(lead);
      if (lerr) return json({ ok: false, error: lerr.message }, 500);
      leadSaved = 1;
      // Уведомляем админов в Telegram (не блокируем ответ сайту при ошибке).
      try { await notifyAdmins(supabase, lead, deviceFromUA(userAgent || '')); } catch (_e) { /* best-effort */ }
    }
  }

  // --- События трекера. ---
  const events: any[] = Array.isArray(body?.events) ? body.events.slice(0, 100) : [];
  let eventsSaved = 0;
  if (events.length) {
    const rows = events.map((e) => ({
      client_ts:   e?.ts ? new Date(e.ts).toISOString() : null,
      site:        ctx.site ?? null,
      visitor_id:  ctx.uid ?? null,
      session_id:  ctx.sid ?? null,
      view_id:     ctx.vid ?? null,
      event_type:  e?.t ?? null,
      path:        ctx.path ?? null,
      title:       ctx.title ?? null,
      referrer:    ctx.ref ?? null,
      utm:         ctx.utm ?? {},
      lang:        ctx.lang ?? null,
      country,
      is_mobile:   !!ctx.mobile,
      new_visitor: !!ctx.newVisitor,
      viewport:    ctx.vp ?? null,
      screen:      ctx.scr ?? null,
      timezone:    ctx.tz ?? null,
      label:       e?.label ?? null,
      href:        e?.href ?? null,
      section:     e?.section ?? null,
      depth:       Number.isFinite(e?.depth) ? e.depth : null,
      active_ms:   Number.isFinite(e?.active_ms) ? e.active_ms : null,
      total_ms:    Number.isFinite(e?.total_ms) ? e.total_ms : null,
      form:        e?.form ?? null,
      extra:       { rel: e?.rel ?? null, aux: e?.aux ?? null, max_depth: e?.max_depth ?? null },
    }));
    const { error } = await supabase.from('site_events').insert(rows);
    if (error) return json({ ok: false, error: error.message }, 500);
    eventsSaved = rows.length;
  }

  return json({ ok: true, n: eventsSaved, lead: leadSaved });
});
