-- Final Supabase schema for a multi-tenant car lot platform.
-- Includes:
-- 1) lotes, inventario, metricas
-- 2) SEO trigger for inventario.meta_tags
-- 3) RLS so lote_admin only manages its own lote_id
-- 4) Storage policies for autos/{lote_id}/{archivo}
-- 5) Public catalog read + safe metric RPC for WhatsApp click tracking

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
  activo boolean not null default true,
  config_estetica jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lote_usuarios (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'lote_admin')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (lote_id, user_id)
);

create table if not exists public.inventario (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  marca text not null,
  modelo text not null,
  anio integer not null check (anio between 1900 and extract(year from now())::integer + 1),
  version text,
  precio numeric(12,2) not null default 0,
  moneda text not null default 'MXN',
  kilometraje integer check (kilometraje is null or kilometraje >= 0),
  combustible text,
  transmision text,
  descripcion text,
  ciudad text,
  estado text,
  estatus text not null default 'disponible' check (estatus in ('disponible', 'apartado', 'vendido', 'borrador')),
  imagenes text[] not null default '{}'::text[],
  meta_tags jsonb not null default '{}'::jsonb,
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
  vistas_totales integer not null default 0,
  interesados_whatsapp integer not null default 0,
  clics integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (lote_id, inventario_id, fecha, canal)
);

create index if not exists idx_lote_usuarios_user_id on public.lote_usuarios(user_id);
create index if not exists idx_lote_usuarios_lote_id on public.lote_usuarios(lote_id);
create index if not exists idx_inventario_lote_id on public.inventario(lote_id);
create index if not exists idx_inventario_estatus on public.inventario(lote_id, estatus);
create index if not exists idx_metricas_lote_fecha on public.metricas(lote_id, fecha desc);
create index if not exists idx_metricas_auto_fecha on public.metricas(inventario_id, fecha desc);

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

create or replace function public.user_has_lote_role_from_storage_path(folder_lote_id text, allowed_roles text[])
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
      when new.precio > 0 then 'Precio ' || to_char(new.precio, 'FM$999,999,999,990.00') || ' ' || new.moneda
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

create or replace function public.record_inventory_metric(
  p_lote_id uuid,
  p_inventario_id uuid,
  p_event_type text,
  p_canal text default 'web'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in ('click_whatsapp', 'view_detail', 'click_card') then
    raise exception 'Unsupported metric event: %', p_event_type;
  end if;

  insert into public.metricas (
    lote_id,
    inventario_id,
    fecha,
    canal,
    vistas_totales,
    interesados_whatsapp,
    clics
  )
  values (
    p_lote_id,
    p_inventario_id,
    current_date,
    p_canal,
    case when p_event_type = 'view_detail' then 1 else 0 end,
    case when p_event_type = 'click_whatsapp' then 1 else 0 end,
    case when p_event_type = 'click_card' then 1 else 0 end
  )
  on conflict (lote_id, inventario_id, fecha, canal)
  do update set
    vistas_totales = public.metricas.vistas_totales + excluded.vistas_totales,
    interesados_whatsapp = public.metricas.interesados_whatsapp + excluded.interesados_whatsapp,
    clics = public.metricas.clics + excluded.clics,
    updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.record_inventory_metric(uuid, uuid, text, text) to anon;
grant execute on function public.record_inventory_metric(uuid, uuid, text, text) to authenticated;

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
before insert or update of marca, modelo, anio, precio, moneda, ciudad, estado, lote_id
on public.inventario
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

drop policy if exists "lotes_admin_select_own" on public.lotes;
create policy "lotes_admin_select_own"
on public.lotes
for select
to authenticated
using (public.user_has_lote_role(id, array['lote_admin']));

drop policy if exists "lotes_admin_update_own" on public.lotes;
create policy "lotes_admin_update_own"
on public.lotes
for update
to authenticated
using (public.user_has_lote_role(id, array['lote_admin']))
with check (public.user_has_lote_role(id, array['lote_admin']));

drop policy if exists "lote_usuarios_select_own" on public.lote_usuarios;
create policy "lote_usuarios_select_own"
on public.lote_usuarios
for select
to authenticated
using (
  user_id = auth.uid()
  or public.user_has_lote_role(lote_id, array['lote_admin'])
);

drop policy if exists "inventario_admin_select_own" on public.inventario;
create policy "inventario_admin_select_own"
on public.inventario
for select
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin']));

drop policy if exists "inventario_admin_insert_own" on public.inventario;
create policy "inventario_admin_insert_own"
on public.inventario
for insert
to authenticated
with check (public.user_has_lote_role(lote_id, array['lote_admin']));

drop policy if exists "inventario_admin_update_own" on public.inventario;
create policy "inventario_admin_update_own"
on public.inventario
for update
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin']))
with check (public.user_has_lote_role(lote_id, array['lote_admin']));

drop policy if exists "inventario_admin_delete_own" on public.inventario;
create policy "inventario_admin_delete_own"
on public.inventario
for delete
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin']));

drop policy if exists "metricas_admin_select_own" on public.metricas;
create policy "metricas_admin_select_own"
on public.metricas
for select
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin']));

drop policy if exists "metricas_admin_write_own" on public.metricas;
create policy "metricas_admin_write_own"
on public.metricas
for all
to authenticated
using (public.user_has_lote_role(lote_id, array['lote_admin']))
with check (public.user_has_lote_role(lote_id, array['lote_admin']));

-- Public catalog policies for the storefront.
drop policy if exists "lotes_public_read_active" on public.lotes;
create policy "lotes_public_read_active"
on public.lotes
for select
to anon, authenticated
using (activo = true);

drop policy if exists "inventario_public_read_available" on public.inventario;
create policy "inventario_public_read_available"
on public.inventario
for select
to anon, authenticated
using (
  estatus = 'disponible'
  and exists (
    select 1
    from public.lotes l
    where l.id = inventario.lote_id
      and l.activo = true
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'autos',
  'autos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "autos_public_read" on storage.objects;
create policy "autos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'autos');

drop policy if exists "autos_admin_insert_own" on storage.objects;
create policy "autos_admin_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'autos'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_storage_path((storage.foldername(name))[1], array['lote_admin'])
);

drop policy if exists "autos_admin_update_own" on storage.objects;
create policy "autos_admin_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'autos'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_storage_path((storage.foldername(name))[1], array['lote_admin'])
)
with check (
  bucket_id = 'autos'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_storage_path((storage.foldername(name))[1], array['lote_admin'])
);

drop policy if exists "autos_admin_delete_own" on storage.objects;
create policy "autos_admin_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'autos'
  and array_length(storage.foldername(name), 1) >= 1
  and public.user_has_lote_role_from_storage_path((storage.foldername(name))[1], array['lote_admin'])
);
