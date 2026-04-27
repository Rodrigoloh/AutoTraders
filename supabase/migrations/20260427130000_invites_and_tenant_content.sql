alter table public.lotes
  add column if not exists email_contacto text,
  add column if not exists config_contenido jsonb not null default '{}'::jsonb;
