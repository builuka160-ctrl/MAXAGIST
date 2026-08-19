// MAXAGIST Telegram bot webhook + самонастройка.
// GET  ?setup=<secret>  → ставит webhook + кнопку меню + команду /start (открыть раз в браузере).
// POST (Telegram update) → на /start и любое сообщение отвечает кнопкой-миниаппом.
//
// Секрет: токен бота — из env BOT_TOKEN (в git не хранится):
//   supabase secrets set BOT_TOKEN=<token>
const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? '';
const FN_URL   = 'https://xqwawjnvvmcydcbswous.supabase.co/functions/v1/bot';
const APP_URL  = 'https://maxagist.com/app/';
const SETUP_SECRET = Deno.env.get('SETUP_SECRET') ?? '';

async function tg(method: string, payload: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return await r.json();
}

const KB = { inline_keyboard: [[{ text: '📊 Открыть панель', web_app: { url: APP_URL } }]] };

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const requestedSetup = url.searchParams.has('setup');
    if (requestedSetup && !SETUP_SECRET) {
      return new Response('Setup disabled: SETUP_SECRET is not configured.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (!requestedSetup || url.searchParams.get('setup') !== SETUP_SECRET) {
      return new Response('MAXAGIST bot is running.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const webhook  = await tg('setWebhook', { url: FN_URL, allowed_updates: ['message'], drop_pending_updates: true });
    const menu     = await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Панель', web_app: { url: APP_URL } } });
    const commands = await tg('setMyCommands', { commands: [{ command: 'start', description: 'Открыть панель активности' }] });
    const me       = await tg('getMe', {});
    return new Response(JSON.stringify({ ok: true, bot: me?.result?.username, webhook, menu, commands }, null, 2),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }

  if (req.method === 'POST') {
    let upd: any;
    try { upd = await req.json(); } catch { return new Response('ok'); }
    const msg = upd?.message;
    if (msg?.chat?.id) {
      const text = String(msg.text || '');
      await tg('sendMessage', {
        chat_id: msg.chat.id,
        text: text.startsWith('/start')
          ? 'Панель активности MAXAGIST — нажмите кнопку ниже 👇 (или кнопку «Панель» слева от поля ввода).'
          : 'Откройте панель кнопкой ниже 👇',
        reply_markup: KB,
      });
    }
    return new Response('ok');
  }

  return new Response('ok');
});
