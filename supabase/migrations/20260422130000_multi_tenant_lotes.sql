-- Multi-tenant schema for car lots on Supabase.
-- Assumptions:
-- 1) The previously defined columns are not available in this workspace.
-- 2) This migration includes a pragmatic base schema for `lotes`, `inventario`, and `metricas`.
-- 3) `lote_usuarios` is added as a support table so RLS can enforce tenant isolation correctly.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  dominio_personalizado text,
  telefono text,
  whatsapp text,
  facebook_page_id text,
  plan text not null default 'base',
  activo boolean not null default true,
  configuracion jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lote_usuarios (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid references public.lotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'lote_admin', 'editor', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (lote_id, user_id),
  unique (user_id, role, lote_id)
);

create table if not exists public.inventario (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  sku text,
  marca text not null,
  modelo text not null,
  anio integer not null check (anio between 1900 and extract(year from now())::integer + 1),
  version text,
  precio numeric(12,2) not null default 0,
  moneda text not null default 'MXN',
  kilometraje integer check (kilometraje is null or kilometraje >= 0),
  combustible text,
  transmision text,
  carroceria text,
  color_exterior text,
  color_interior text,
  vin text,
  descripcion text,
  ciudad text,
  estado text,
  estatus text not null default 'disponible' check (estatus in ('disponible', 'apartado', 'vendido', 'borrador')),
  destacado boolean not null default false,
  fotos jsonb not null default '[]'::jsonb,
  meta_tags jsonb not null default '{}'::jsonb,
  publicado_en_facebook boolean not null default false,
  whatsapp_activo boolean not null default true,
  published_at timestamptz,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.metricas (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  inventario_id uuid references public.inventario(id) on delete cascade,
  fecha date not null default current_date,
  canal text not null default 'web',
  impresiones integer not null default 0,
  clics integer not null default 0,
  visitas_detalle integer not null default 0,
  leads integer not null default 0,
  llamadas integer not null default 0,
  mensajes_whatsapp integer not null default 0,
  favoritos integer not null default 0,
  gasto numeric(12,2) not null default 0,
  ingresos_atribuidos numeric(12,2) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (lote_id, inventario_id, fecha, canal)
);

create index if not exists idx_lote_usuarios_user_id on public.lote_usuarios(user_id);
create index if not exists idx_lote_usuarios_lote_id on public.lote_usuarios(lote_id);
create index if not exists idx_inventario_lote_id on public.inventario(lote_id);
create index if not exists idx_inventario_slug_lookup on public.inventario(lote_id, marca, modelo, anio);
create index if not exists idx_metricas_lote_fecha on public.metricas(lote_id, fecha desc);
create index if not exists idx_metricas_inventario_fecha on public.metricas(inventario_id, fecha desc);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'super_admin';
$$;

create or replace function public.user_has_lote_role(target_lote_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.lote_usuarios lu
      where lu.lote_id = target_lote_id
        and lu.user_id = auth.uid()
        and lu.role = any (allowed_roles)
    );
$$;

create or replace function public.user_has_lote_role_from_path(folder_lote_id text, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.lote_usuarios lu
      where lu.lote_id::text = folder_lote_id
        and lu.user_id = auth.uid()
        and lu.role = any (allowed_roles)
    );
$$;

create or replace function public.build_inventario_meta_tags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lote_nombre text;
  seo_title text;
  seo_description text;
begin
  select l.nombre
  into lote_nombre
  from public.lotes l
  where l.id = new.lote_id;

  seo_title := trim(
    concat_ws(
      ' ',
      new.marca,
      new.modelo,
      new.anio::text,
      'en Venta'
    )
  ) || ' - ' || coalesce(lote_nombre, 'Lote');

  seo_description := concat_ws(
    '. ',
    trim(concat_ws(' ', new.marca, new.modelo, new.anio::text)),
    case
      when new.precio > 0 then 'Precio desde ' || to_char(new.precio, 'FM$999,999,999,990.00') || ' ' || new.moneda
      else null
    end,
    case
      when new.ciudad is not null or new.estado is not null
        then 'Disponible en ' || trim(concat_ws(', ', new.ciudad, new.estado))
      else null
    end
  );

  new.meta_tags :=
    coalesce(new.meta_tags, '{}'::jsonb)
    || jsonb_build_object(
      'title', seo_title,
      'description', seo_description,
      'og_title', seo_title,
      'keywords', jsonb_build_array(new.marca, new.modelo, new.anio, lote_nombre)
    );

  return new;
end;
$$;

drop trigger if exists trg_lotes_updated_at on public.lotes;
create trigger trg_lotes_updated_at
before update on public.lotes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_inventario_updated_at on public.inventario;
create trigger trg_inventario_updated_at
before update on public.inventario
for each row
execute function public.set_updated_at();

drop trigger if exists trg_metricas_updated_at on public.metricas;
create trigger trg_metricas_updated_at
before update on public.metricas
for each row
execute function public.set_updated_at();

drop trigger if exists trg_inventario_meta_tags on public.inventario;
create trigger trg_inventario_meta_tags
before insert on public.inventario
for each row
execute function public.build_inventario_meta_tags();

alter table public.lotes enable row level security;
alter table public.lote_usuarios enable row level security;
alter table public.inventario enable row level security;
alter table public.metricas enable row level security;

alter table public.lotes force row level security;
alter table public.lote_usuarios force row level security;
alter table public.inventario force row level security;
alter table public.metricas force row level security;

drop policy if exists "lotes_select_own" on public.lotes;
create policy "lotes_select_own"
on public.lotes
for select
to authenticated
using (public.user_has_lote_role(id, array['lote_admin', 'editor', 'viewer']));

drop policy if exists "lotes_update_own" on public.lotes;
create policy "lotes_update_own"
on public.lotes
for update
to authenticated
using (public.user_has_lote_role(id, array['lote_admin']))
with check (public.user_has_lote_role(id, array['lote_admin']));

drop policy if exists "lote_usuarios_select_own_lote" on public.lote_usuarios;
create policy "lote_usuarios_select_own_lote"
on public.lote_usuarios
for select
to authenticated
using (
  public.user_has_lote_role(lote_id, array['lote_admin'])
  or user_id = auth.uid()
);

drop policy if exists "inventario_select_own_lote" on public.inventario;
create policy "inventario_select_own_lote"
on public.inventario
for select
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin', 'editor', 'viewer']));

drop policy if exists "inventario_insert_own_lote" on public.inventario;
create policy "inventario_insert_own_lote"
on public.inventario
for insert
to authenticated
with check (public.user_has_lote_role(lote_id, array['lote_admin', 'editor']));

drop policy if exists "inventario_update_own_lote" on public.inventario;
create policy "inventario_update_own_lote"
on public.inventario
for update
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin', 'editor']))
with check (public.user_has_lote_role(lote_id, array['lote_admin', 'editor']));

drop policy if exists "inventario_delete_own_lote" on public.inventario;
create policy "inventario_delete_own_lote"
on public.inventario
for delete
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin']));

drop policy if exists "metricas_select_own_lote" on public.metricas;
create policy "metricas_select_own_lote"
on public.metricas
for select
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin', 'editor', 'viewer']));

drop policy if exists "metricas_write_own_lote" on public.metricas;
create policy "metricas_write_own_lote"
on public.metricas
for all
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin']))
with check (public.user_has_lote_role(lote_id, array['lote_admin']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inventario-images',
  'inventario-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_can_read_inventario_images" on storage.objects;
create policy "public_can_read_inventario_images"
on storage.objects
for select
to public
using (bucket_id = 'inventario-images');

drop policy if exists "tenant_can_upload_in_own_folder" on storage.objects;
create policy "tenant_can_upload_in_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inventario-images'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_path((storage.foldername(name))[1], array['lote_admin', 'editor'])
);

drop policy if exists "tenant_can_update_in_own_folder" on storage.objects;
create policy "tenant_can_update_in_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inventario-images'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_path((storage.foldername(name))[1], array['lote_admin', 'editor'])
)
with check (
  bucket_id = 'inventario-images'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_path((storage.foldername(name))[1], array['lote_admin', 'editor'])
);

drop policy if exists "tenant_can_delete_in_own_folder" on storage.objects;
create policy "tenant_can_delete_in_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inventario-images'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_path((storage.foldername(name))[1], array['lote_admin'])
);
