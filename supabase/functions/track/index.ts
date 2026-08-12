// MAXAGIST tracker ingest. Public (verify_jwt=false). Пишет в site_events service role'ом.
// Deploy: supabase functions deploy track --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'bad json' }, 400); }

  const ctx = body?.ctx ?? {};
  const events: any[] = Array.isArray(body?.events) ? body.events.slice(0, 100) : [];
  if (!events.length) return json({ ok: true, n: 0 });

  const country = req.headers.get('cf-ipcountry') || req.headers.get('x-country') || null;
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.from('site_events').insert(rows);
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, n: rows.length });
});
