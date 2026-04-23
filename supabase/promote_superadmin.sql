-- Promote an existing Supabase Auth user to platform super_admin.
-- Replace the email below and run in Supabase SQL editor.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"platform_role":"super_admin"}'::jsonb
where email = 'tu-correo@dominio.com';
