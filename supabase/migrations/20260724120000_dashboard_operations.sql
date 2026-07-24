-- Dashboard operativo: equipo, asesores por unidad, leads de compradores y
-- actividad de búsqueda. Staff puede consultar todo el inventario, pero sólo
-- modificar las unidades que tiene asignadas.

alter table public.profiles
  add column if not exists phone text;

alter table public.inventario
  add column if not exists advisor_name text,
  add column if not exists advisor_phone text;

create or replace function public.is_lote_member(target_lote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.lote_usuarios membership
      where membership.lote_id = target_lote_id
        and membership.user_id = auth.uid()
        and membership.role in ('lote_admin', 'lote_staff', 'lote_editor', 'lote_viewer')
    );
$$;

revoke all on function public.is_lote_member(uuid) from public;
grant execute on function public.is_lote_member(uuid) to authenticated;

drop function if exists public.get_lote_staff(uuid);
create function public.get_lote_staff(target_lote_id uuid)
returns table(user_id uuid, full_name text, email text, phone text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.full_name, profile.email, profile.phone, membership.role
  from public.lote_usuarios membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.lote_id = target_lote_id
    and membership.role in ('lote_staff', 'lote_editor')
    and public.is_lote_admin(target_lote_id)
  order by coalesce(profile.full_name, profile.email);
$$;

revoke all on function public.get_lote_staff(uuid) from public, anon;
grant execute on function public.get_lote_staff(uuid) to authenticated;

create or replace function public.assign_inventory_staff(
  target_inventory_id uuid,
  target_staff_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lote_id uuid;
  staff_name text;
  staff_phone text;
begin
  select lote_id into target_lote_id
  from public.inventario
  where id = target_inventory_id
  for update;

  if target_lote_id is null or not public.is_lote_admin(target_lote_id) then
    raise exception 'Se requiere rol admin del lote';
  end if;

  if target_staff_id is not null then
    if not exists (
      select 1
      from public.lote_usuarios
      where lote_id = target_lote_id
        and user_id = target_staff_id
        and role in ('lote_staff', 'lote_editor')
    ) then
      raise exception 'El usuario no es staff de este lote';
    end if;

    select full_name, phone into staff_name, staff_phone
    from public.profiles
    where id = target_staff_id;
  end if;

  perform set_config('app.inventory_assignment', 'allowed', true);

  update public.inventario
  set
    assigned_staff_id = target_staff_id,
    assigned_by = auth.uid(),
    assigned_at = case when target_staff_id is null then null else timezone('utc', now()) end,
    advisor_name = case when target_staff_id is null then null else staff_name end,
    advisor_phone = case when target_staff_id is null then null else staff_phone end
  where id = target_inventory_id;

  perform set_config('app.inventory_assignment', '', true);
end;
$$;

drop policy if exists "inventario_admin_select_own" on public.inventario;
create policy "inventario_team_read"
on public.inventario
for select
to authenticated
using (public.is_lote_member(lote_id));

drop policy if exists "inventario_admin_update_own" on public.inventario;
create policy "inventario_admin_or_assigned_update"
on public.inventario
for update
to authenticated
using (
  public.is_lote_admin(lote_id)
  or public.is_assigned_lote_staff(lote_id, assigned_staff_id)
)
with check (
  public.is_lote_admin(lote_id)
  or public.is_assigned_lote_staff(lote_id, assigned_staff_id)
);

create table if not exists public.buyer_leads (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  inventario_id uuid not null references public.inventario(id) on delete cascade,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  contact_name text not null check (length(trim(contact_name)) between 2 and 120),
  contact_phone text not null check (length(trim(contact_phone)) between 8 and 30),
  intent text not null check (intent in ('reserve', 'test_drive', 'contact')),
  status text not null default 'whatsapp_opened'
    check (status in ('whatsapp_opened', 'contacted', 'qualified', 'won', 'lost')),
  whatsapp_target text,
  whatsapp_opened_at timestamptz not null default timezone('utc', now()),
  source text not null default 'inventory',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_buyer_leads_lote_created
  on public.buyer_leads(lote_id, created_at desc);
create index if not exists idx_buyer_leads_assigned
  on public.buyer_leads(lote_id, assigned_staff_id, created_at desc);

drop trigger if exists trg_buyer_leads_updated_at on public.buyer_leads;
create trigger trg_buyer_leads_updated_at
before update on public.buyer_leads
for each row execute function public.set_updated_at();

alter table public.buyer_leads enable row level security;
alter table public.buyer_leads force row level security;

drop policy if exists "buyer_leads_admin_or_assigned_read" on public.buyer_leads;
create policy "buyer_leads_admin_or_assigned_read"
on public.buyer_leads
for select
to authenticated
using (
  public.is_lote_admin(lote_id)
  or public.is_assigned_lote_staff(lote_id, assigned_staff_id)
);

drop policy if exists "buyer_leads_admin_or_assigned_update" on public.buyer_leads;
create policy "buyer_leads_admin_or_assigned_update"
on public.buyer_leads
for update
to authenticated
using (
  public.is_lote_admin(lote_id)
  or public.is_assigned_lote_staff(lote_id, assigned_staff_id)
)
with check (
  public.is_lote_admin(lote_id)
  or public.is_assigned_lote_staff(lote_id, assigned_staff_id)
);

revoke all on public.buyer_leads from anon;
revoke insert, update, delete on public.buyer_leads from authenticated;
grant select on public.buyer_leads to authenticated;
grant all on public.buyer_leads to service_role;

create or replace function public.update_buyer_lead_status(
  target_lead_id uuid,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  lead public.buyer_leads;
begin
  select * into lead from public.buyer_leads where id = target_lead_id for update;
  if lead.id is null then raise exception 'Lead no encontrado'; end if;
  if not (
    public.is_lote_admin(lead.lote_id)
    or public.is_assigned_lote_staff(lead.lote_id, lead.assigned_staff_id)
  ) then raise exception 'No tienes acceso a este lead'; end if;
  if target_status not in ('whatsapp_opened', 'contacted', 'qualified', 'won', 'lost') then
    raise exception 'Estatus no permitido';
  end if;
  update public.buyer_leads set status = target_status where id = target_lead_id;
end;
$$;

revoke all on function public.update_buyer_lead_status(uuid, text) from public, anon;
grant execute on function public.update_buyer_lead_status(uuid, text) to authenticated;

create table if not exists public.catalog_search_metrics (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  fecha date not null default current_date,
  canal text not null default 'web',
  searches integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(lote_id, fecha, canal)
);

alter table public.catalog_search_metrics enable row level security;
alter table public.catalog_search_metrics force row level security;

drop policy if exists "catalog_search_metrics_admin_read" on public.catalog_search_metrics;
create policy "catalog_search_metrics_admin_read"
on public.catalog_search_metrics
for select to authenticated
using (public.is_lote_admin(lote_id));

grant select on public.catalog_search_metrics to authenticated;
grant all on public.catalog_search_metrics to service_role;

create or replace function public.record_catalog_search(
  p_lote_id uuid,
  p_canal text default 'web'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.lotes where id = p_lote_id and activo = true) then
    raise exception 'Lote no disponible';
  end if;
  insert into public.catalog_search_metrics(lote_id, fecha, canal, searches)
  values(p_lote_id, current_date, p_canal, 1)
  on conflict(lote_id, fecha, canal)
  do update set searches = public.catalog_search_metrics.searches + 1,
    updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.record_catalog_search(uuid, text) to anon, authenticated;

-- Convierte las unidades visuales del demo en registros editables reales.
insert into public.inventario (
  id, lote_id, marca, modelo, anio, version, precio, moneda, kilometraje,
  combustible, transmision, descripcion, ciudad, estado, estatus, imagenes, meta_tags
)
select seed.id, lote.id, seed.marca, seed.modelo, seed.anio, seed.version,
  seed.precio, 'MXN', seed.km, 'Gasolina', seed.transmision,
  'Unidad demo editable desde el dashboard. Sustituye la información y fotografías por las de la unidad real.',
  'Monterrey', 'Nuevo León', 'disponible', seed.imagenes, seed.meta_tags
from public.lotes lote
cross join (
  values
  ('33333333-3333-3333-3333-333333333301'::uuid,'BMW','M2 Competition',2023,'Coupe Track Pack',1180000,18500,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/BMW_M2_at_the_2025_Adelaide_Grand_Final_Parade.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/BMW_M2_CS_(G87)_DSC_9730.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/BMW_G87_M2_1X7A6997.jpg&width=960']::text[],
    '{"body_shape":"Coupé","motor":"3.0 Turbo","traccion":"Trasera","asientos":"4"}'::jsonb),
  ('33333333-3333-3333-3333-333333333302'::uuid,'Audi','RS5 Sportback',2022,'Black Optic',1320000,26400,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Audi_RS5_Sportback_5F_FL_IMG_8131.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Audi_RS5,_Binz_(P1090702).jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Audi_RS5_Coupé_8T_IMG_3030_(cropped).jpg&width=960']::text[],
    '{"body_shape":"Sportback","motor":"2.9 Turbo","traccion":"Quattro","asientos":"5"}'::jsonb),
  ('33333333-3333-3333-3333-333333333303'::uuid,'Mercedes-Benz','GLB 250',2023,'AMG Line',920000,31200,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Mercedes-AMG_GLB_35_4MATIC_(X247)_(2023)_IMG_9649.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Mercedes-AMG_GLB_35_4MATIC_(X247)_(2023)_IMG_9652.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/MERCEDES-BENZ_GLB_China_(3).jpg&width=960']::text[],
    '{"body_shape":"SUV","motor":"2.0 Turbo","traccion":"Integral","asientos":"7"}'::jsonb),
  ('33333333-3333-3333-3333-333333333304'::uuid,'Ford','Mustang GT',2022,'Performance Package',1060000,22800,'Manual',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/2018_Ford_Mustang_GT_5.0_Front.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/2018_Ford_Mustang_GT_5.0_Rear.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/2024_Ford_Mustang_GT,_Kingsville,_Ontario,_2025-06-29.jpg&width=960']::text[],
    '{"body_shape":"Coupé","motor":"5.0 V8","traccion":"Trasera","asientos":"4"}'::jsonb),
  ('33333333-3333-3333-3333-333333333305'::uuid,'Porsche','911 Carrera',2023,'Sport Chrono',2380000,14200,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Porsche_992_Carrera_S_coupe_IMG_5838.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Porsche_992_Carrera_S_coupe_IMG_5832.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Porsche_992_Carrera_S_coupe_IMG_5847.jpg&width=960']::text[],
    '{"body_shape":"Coupé","motor":"3.0 Twin Turbo","traccion":"Trasera","asientos":"4"}'::jsonb),
  ('33333333-3333-3333-3333-333333333306'::uuid,'Lamborghini','Huracán',2022,'EVO',6200000,9800,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Lamborghini_Huracan_Performante,_IAA_2017,_Frankfurt_(1Y7A2827).jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Lamborghini_Huracán_Tecnica_1X7A7430.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Lamborghini_Huracan_STO_1X7A0297.jpg&width=960']::text[],
    '{"body_shape":"Coupé","motor":"5.2 V10","traccion":"Integral","asientos":"2"}'::jsonb),
  ('33333333-3333-3333-3333-333333333307'::uuid,'BMW','X5 M',2021,'Competition',2140000,19600,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/BMW_X5_M_(G05)_1X7A7047.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/BMW_X5_M_(73885).jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/BMW_X5_M_(F15)_China.jpg&width=960']::text[],
    '{"body_shape":"SUV","motor":"4.4 V8 Twin Turbo","traccion":"Integral","asientos":"5"}'::jsonb),
  ('33333333-3333-3333-3333-333333333308'::uuid,'Audi','Q8',2022,'S line',1780000,24100,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Audi_Q8,_Paris_Motor_Show_2018,_Paris_(1Y7A1776).jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Audi_Q8_1X7A6004.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Audi_Q8_Facelift_DSC_7380.jpg&width=960']::text[],
    '{"body_shape":"SUV","motor":"3.0 Turbo","traccion":"Quattro","asientos":"5"}'::jsonb),
  ('33333333-3333-3333-3333-333333333309'::uuid,'Chevrolet','Corvette',2023,'Stingray',2450000,11200,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Chevrolet_Corvette_C8_IAA_2021_1X7A0156.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Chevrolet_Corvette_C8_IMG_8837.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Chevrolet_Corvette_C8_IMG_2537.jpg&width=960']::text[],
    '{"body_shape":"Coupé","motor":"6.2 V8","traccion":"Trasera","asientos":"2"}'::jsonb),
  ('33333333-3333-3333-3333-333333333310'::uuid,'Mercedes-Benz','AMG GT',2022,'53 4MATIC+',2260000,17300,'Automática',
    array['https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Mercedes-AMG_C192_1X7A0832.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Mercedes-AMG_GT_63_S_(Facelift)_1X7A7353.jpg&width=960','https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Mercedes-AMG_GT_Black_Series_IMG_0324.jpg&width=960']::text[],
    '{"body_shape":"Coupé","motor":"3.0 Turbo","traccion":"Integral","asientos":"4"}'::jsonb)
) as seed(id,marca,modelo,anio,version,precio,km,transmision,imagenes,meta_tags)
where lote.slug = 'demo-lote-norte'
on conflict(id) do nothing;

-- Historial inicial de 90 días; los eventos reales siguen sumándose desde hoy.
insert into public.metricas (
  lote_id, inventario_id, fecha, canal, vistas_totales, interesados_whatsapp, clics
)
select inventory.lote_id, inventory.id, day::date, 'web',
  4 + ((hashtext(inventory.id::text || day::text) & 2147483647) % 22),
  (hashtext('wa' || inventory.id::text || day::text) & 2147483647) % 4,
  2 + ((hashtext('click' || inventory.id::text || day::text) & 2147483647) % 9)
from public.inventario inventory
join public.lotes lote on lote.id = inventory.lote_id and lote.slug = 'demo-lote-norte'
cross join generate_series(current_date - 89, current_date - 1, interval '1 day') day
on conflict(lote_id, inventario_id, fecha, canal) do nothing;

insert into public.catalog_search_metrics(lote_id, fecha, canal, searches)
select lote.id, day::date, 'web',
  2 + ((hashtext(lote.id::text || day::text) & 2147483647) % 13)
from public.lotes lote
cross join generate_series(current_date - 89, current_date - 1, interval '1 day') day
where lote.slug = 'demo-lote-norte'
on conflict(lote_id, fecha, canal) do nothing;
