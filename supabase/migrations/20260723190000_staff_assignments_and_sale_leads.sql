-- Leads públicos para "Vende tu auto" y alcance admin/staff por asignación.
-- Basado en los principios de autorización auditados en autosenventa, adaptado
-- al modelo multi-tenant de Auto-traders.

alter table public.lote_usuarios
  drop constraint if exists lote_usuarios_role_check;

alter table public.lote_usuarios
  add constraint lote_usuarios_role_check
  check (role in ('lote_admin', 'lote_staff', 'lote_editor', 'lote_viewer'));

alter table public.inventario
  add column if not exists assigned_staff_id uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz;

create index if not exists idx_inventario_assigned_staff
  on public.inventario(lote_id, assigned_staff_id, created_at desc);

create or replace function public.guard_inventory_assignment_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.lote_id is distinct from new.lote_id then
    raise exception 'El lote del vehículo no se puede cambiar';
  end if;

  if old.created_by is distinct from new.created_by then
    raise exception 'El creador del vehículo no se puede cambiar';
  end if;

  if (
    old.assigned_staff_id is distinct from new.assigned_staff_id
    or old.assigned_by is distinct from new.assigned_by
    or old.assigned_at is distinct from new.assigned_at
  ) and current_setting('app.inventory_assignment', true) <> 'allowed'
  then
    raise exception 'Usa assign_inventory_staff para cambiar la asignación';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_inventory_assignment_guard on public.inventario;
create trigger trg_inventory_assignment_guard
before update on public.inventario
for each row
execute function public.guard_inventory_assignment_fields();

create table if not exists public.sale_leads (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'contacted', 'qualified', 'won', 'lost', 'rejected')),
  contact_name text not null check (length(trim(contact_name)) between 2 and 120),
  contact_phone text,
  contact_email text,
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('whatsapp', 'phone', 'email')),
  marca text not null check (length(trim(marca)) between 1 and 80),
  modelo text not null check (length(trim(modelo)) between 1 and 120),
  anio integer not null check (anio between 1900 and extract(year from now())::integer + 1),
  version text,
  kilometraje integer check (kilometraje is null or kilometraje >= 0),
  precio_esperado numeric(12,2) check (precio_esperado is null or precio_esperado >= 0),
  ciudad text,
  estado text,
  descripcion text check (descripcion is null or length(descripcion) <= 5000),
  photo_paths text[] not null default '{}'::text[],
  source text not null default 'vende-tu-auto',
  submission_fingerprint text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sale_lead_contact_required
    check (
      nullif(trim(coalesce(contact_phone, '')), '') is not null
      or nullif(trim(coalesce(contact_email, '')), '') is not null
    )
);

create table if not exists public.sale_lead_history (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.sale_leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  note text check (note is null or length(note) <= 4000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_sale_leads_lote_status
  on public.sale_leads(lote_id, status, created_at desc);

create index if not exists idx_sale_leads_assigned_staff
  on public.sale_leads(lote_id, assigned_staff_id, created_at desc);

create index if not exists idx_sale_leads_submission_fingerprint
  on public.sale_leads(submission_fingerprint, created_at desc)
  where submission_fingerprint is not null;

create index if not exists idx_sale_lead_history_lead
  on public.sale_lead_history(lead_id, created_at desc);

create trigger trg_sale_leads_updated_at
before update on public.sale_leads
for each row
execute function public.set_updated_at();

create or replace function public.is_lote_admin(target_lote_id uuid)
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
        and membership.role = 'lote_admin'
    );
$$;

create or replace function public.is_assigned_lote_staff(
  target_lote_id uuid,
  target_staff_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lote_usuarios membership
    where membership.lote_id = target_lote_id
      and membership.user_id = auth.uid()
      and membership.user_id = target_staff_id
      and membership.role in ('lote_staff', 'lote_editor')
  );
$$;

revoke all on function public.is_lote_admin(uuid) from public;
revoke all on function public.is_assigned_lote_staff(uuid, uuid) from public;
grant execute on function public.is_lote_admin(uuid) to authenticated;
grant execute on function public.is_assigned_lote_staff(uuid, uuid) to authenticated;

create or replace function public.get_lote_staff(target_lote_id uuid)
returns table(user_id uuid, full_name text, email text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.full_name, profile.email, membership.role
  from public.lote_usuarios membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.lote_id = target_lote_id
    and membership.role in ('lote_staff', 'lote_editor')
    and public.is_lote_admin(target_lote_id)
  order by coalesce(profile.full_name, profile.email)
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
begin
  select lote_id into target_lote_id
  from public.inventario
  where id = target_inventory_id
  for update;

  if target_lote_id is null or not public.is_lote_admin(target_lote_id) then
    raise exception 'Se requiere rol admin del lote';
  end if;

  if target_staff_id is not null and not exists (
    select 1
    from public.lote_usuarios
    where lote_id = target_lote_id
      and user_id = target_staff_id
      and role in ('lote_staff', 'lote_editor')
  ) then
    raise exception 'El usuario no es staff de este lote';
  end if;

  perform set_config('app.inventory_assignment', 'allowed', true);

  update public.inventario
  set
    assigned_staff_id = target_staff_id,
    assigned_by = auth.uid(),
    assigned_at = case when target_staff_id is null then null else timezone('utc', now()) end
  where id = target_inventory_id;

  perform set_config('app.inventory_assignment', '', true);
end;
$$;

create or replace function public.assign_sale_lead_staff(
  target_lead_id uuid,
  target_staff_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lote_id uuid;
begin
  select lote_id into target_lote_id
  from public.sale_leads
  where id = target_lead_id
  for update;

  if target_lote_id is null or not public.is_lote_admin(target_lote_id) then
    raise exception 'Se requiere rol admin del lote';
  end if;

  if target_staff_id is not null and not exists (
    select 1
    from public.lote_usuarios
    where lote_id = target_lote_id
      and user_id = target_staff_id
      and role in ('lote_staff', 'lote_editor')
  ) then
    raise exception 'El usuario no es staff de este lote';
  end if;

  update public.sale_leads
  set
    assigned_staff_id = target_staff_id,
    assigned_by = auth.uid(),
    assigned_at = case when target_staff_id is null then null else timezone('utc', now()) end
  where id = target_lead_id;
end;
$$;

create or replace function public.update_sale_lead_status(
  target_lead_id uuid,
  target_status text,
  status_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_lead public.sale_leads;
  allowed boolean := false;
begin
  select * into current_lead
  from public.sale_leads
  where id = target_lead_id
  for update;

  if current_lead.id is null then
    raise exception 'Lead no encontrado';
  end if;

  if not (
    public.is_lote_admin(current_lead.lote_id)
    or public.is_assigned_lote_staff(current_lead.lote_id, current_lead.assigned_staff_id)
  ) then
    raise exception 'No tienes acceso a este lead';
  end if;

  allowed := case
    when current_lead.status = 'new'
      and target_status in ('reviewing', 'contacted', 'rejected') then true
    when current_lead.status = 'reviewing'
      and target_status in ('contacted', 'qualified', 'rejected') then true
    when current_lead.status = 'contacted'
      and target_status in ('qualified', 'lost', 'rejected') then true
    when current_lead.status = 'qualified'
      and target_status in ('won', 'lost') then true
    else false
  end;

  if not allowed then
    raise exception 'Transición de lead no permitida';
  end if;

  update public.sale_leads
  set status = target_status
  where id = target_lead_id;

  insert into public.sale_lead_history(lead_id, from_status, to_status, actor_id, note)
  values(target_lead_id, current_lead.status, target_status, auth.uid(), nullif(trim(status_note), ''));
end;
$$;

revoke all on function public.assign_inventory_staff(uuid, uuid) from public, anon;
revoke all on function public.assign_sale_lead_staff(uuid, uuid) from public, anon;
revoke all on function public.update_sale_lead_status(uuid, text, text) from public, anon;
grant execute on function public.assign_inventory_staff(uuid, uuid) to authenticated;
grant execute on function public.assign_sale_lead_staff(uuid, uuid) to authenticated;
grant execute on function public.update_sale_lead_status(uuid, text, text) to authenticated;

alter table public.sale_leads enable row level security;
alter table public.sale_lead_history enable row level security;
alter table public.sale_leads force row level security;
alter table public.sale_lead_history force row level security;

drop policy if exists "sale_leads_admin_or_assigned_read" on public.sale_leads;
create policy "sale_leads_admin_or_assigned_read"
on public.sale_leads
for select
to authenticated
using (
  public.is_lote_admin(lote_id)
  or public.is_assigned_lote_staff(lote_id, assigned_staff_id)
);

drop policy if exists "sale_lead_history_admin_or_assigned_read" on public.sale_lead_history;
create policy "sale_lead_history_admin_or_assigned_read"
on public.sale_lead_history
for select
to authenticated
using (
  exists (
    select 1
    from public.sale_leads lead
    where lead.id = sale_lead_history.lead_id
      and (
        public.is_lote_admin(lead.lote_id)
        or public.is_assigned_lote_staff(lead.lote_id, lead.assigned_staff_id)
      )
  )
);

revoke all on public.sale_leads, public.sale_lead_history from anon;
revoke insert, update, delete on public.sale_leads, public.sale_lead_history from authenticated;
grant select on public.sale_leads, public.sale_lead_history to authenticated;
grant all on public.sale_leads, public.sale_lead_history to service_role;
grant usage, select on sequence public.sale_lead_history_id_seq to service_role;

-- El admin ve todo el lote. Staff/editor sólo ve y modifica sus vehículos.
drop policy if exists "inventario_admin_select_own" on public.inventario;
create policy "inventario_admin_select_own"
on public.inventario
for select
to authenticated
using (
  public.is_lote_admin(lote_id)
  or public.is_assigned_lote_staff(lote_id, assigned_staff_id)
);

drop policy if exists "inventario_admin_insert_own" on public.inventario;
create policy "inventario_admin_insert_own"
on public.inventario
for insert
to authenticated
with check (public.is_lote_admin(lote_id));

drop policy if exists "inventario_admin_update_own" on public.inventario;
create policy "inventario_admin_update_own"
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

drop policy if exists "inventario_admin_delete_own" on public.inventario;
create policy "inventario_admin_delete_own"
on public.inventario
for delete
to authenticated
using (public.is_lote_admin(lote_id));

-- El dashboard de staff recibe métricas únicamente de sus vehículos asignados.
drop policy if exists "metricas_admin_select_own" on public.metricas;
create policy "metricas_admin_select_own"
on public.metricas
for select
to authenticated
using (
  public.is_lote_admin(lote_id)
  or exists (
    select 1
    from public.inventario
    where inventario.id = metricas.inventario_id
      and inventario.lote_id = metricas.lote_id
      and public.is_assigned_lote_staff(
        inventario.lote_id,
        inventario.assigned_staff_id
      )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sale-lead-media',
  'sale-lead-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sale_lead_media_admin_or_assigned_read" on storage.objects;
create policy "sale_lead_media_admin_or_assigned_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sale-lead-media'
  and exists (
    select 1
    from public.sale_leads lead
    where lead.id::text = (storage.foldername(name))[1]
      and (
        public.is_lote_admin(lead.lote_id)
        or public.is_assigned_lote_staff(lead.lote_id, lead.assigned_staff_id)
      )
  )
);

-- El bucket de inventario conserva los archivos existentes. Los nuevos uploads
-- usan `<lote_id>/<inventario_id>/<uuid>` para que staff sólo opere medios de
-- vehículos asignados; `unassigned` queda reservado para altas hechas por admin.
drop policy if exists "autos_admin_insert_own" on storage.objects;
create policy "autos_admin_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'autos'
  and (
    public.user_has_lote_role_from_storage_path(
      (storage.foldername(name))[1],
      array['lote_admin']
    )
    or exists (
      select 1
      from public.inventario
      where inventario.id::text = (storage.foldername(name))[2]
        and inventario.lote_id::text = (storage.foldername(name))[1]
        and public.is_assigned_lote_staff(
          inventario.lote_id,
          inventario.assigned_staff_id
        )
    )
  )
);

drop policy if exists "autos_admin_update_own" on storage.objects;
create policy "autos_admin_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'autos'
  and (
    public.user_has_lote_role_from_storage_path(
      (storage.foldername(name))[1],
      array['lote_admin']
    )
    or exists (
      select 1
      from public.inventario
      where inventario.id::text = (storage.foldername(name))[2]
        and inventario.lote_id::text = (storage.foldername(name))[1]
        and public.is_assigned_lote_staff(
          inventario.lote_id,
          inventario.assigned_staff_id
        )
    )
  )
)
with check (
  bucket_id = 'autos'
  and (
    public.user_has_lote_role_from_storage_path(
      (storage.foldername(name))[1],
      array['lote_admin']
    )
    or exists (
      select 1
      from public.inventario
      where inventario.id::text = (storage.foldername(name))[2]
        and inventario.lote_id::text = (storage.foldername(name))[1]
        and public.is_assigned_lote_staff(
          inventario.lote_id,
          inventario.assigned_staff_id
        )
    )
  )
);

drop policy if exists "autos_admin_delete_own" on storage.objects;
create policy "autos_admin_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'autos'
  and (
    public.user_has_lote_role_from_storage_path(
      (storage.foldername(name))[1],
      array['lote_admin']
    )
    or exists (
      select 1
      from public.inventario
      where inventario.id::text = (storage.foldername(name))[2]
        and inventario.lote_id::text = (storage.foldername(name))[1]
        and public.is_assigned_lote_staff(
          inventario.lote_id,
          inventario.assigned_staff_id
        )
    )
  )
);
