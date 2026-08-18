-- MAXAGIST: закрываем прямой публичный вызов агрегатов дашборда.
-- tracker_dashboard — SECURITY DEFINER: читать её должен только admin-api (service_role)
-- после Telegram-авторизации из allowlist app_admins. Ключ anon/authenticated
-- публичен (зашит в сайте для трекера и CMS), поэтому прямой вызов RPC отдавал бы
-- аналитику в обход allowlist. Отзываем EXECUTE у публичных ролей.
revoke execute on function public.tracker_dashboard(integer) from public, anon, authenticated;
grant  execute on function public.tracker_dashboard(integer) to service_role;
