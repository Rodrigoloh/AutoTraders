-- Public catalog access and safe metric recording for anonymous visitors.

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
    clics,
    visitas_detalle,
    mensajes_whatsapp
  )
  values (
    p_lote_id,
    p_inventario_id,
    current_date,
    p_canal,
    case when p_event_type = 'click_card' then 1 else 0 end,
    case when p_event_type = 'view_detail' then 1 else 0 end,
    case when p_event_type = 'click_whatsapp' then 1 else 0 end
  )
  on conflict (lote_id, inventario_id, fecha, canal)
  do update set
    clics = public.metricas.clics + excluded.clics,
    visitas_detalle = public.metricas.visitas_detalle + excluded.visitas_detalle,
    mensajes_whatsapp = public.metricas.mensajes_whatsapp + excluded.mensajes_whatsapp,
    updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.record_inventory_metric(uuid, uuid, text, text) to anon;
grant execute on function public.record_inventory_metric(uuid, uuid, text, text) to authenticated;

drop policy if exists "lotes_public_catalog_read" on public.lotes;
create policy "lotes_public_catalog_read"
on public.lotes
for select
to anon, authenticated
using (activo = true);

drop policy if exists "inventario_public_catalog_read" on public.inventario;
create policy "inventario_public_catalog_read"
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
