-- Orden público de inventario: selección editorial del admin y rendimiento agregado.

alter table public.inventario
  add column if not exists destacado boolean not null default false;

create index if not exists idx_inventario_lote_destacado
on public.inventario(lote_id, destacado desc, created_at desc);

create or replace function public.get_public_inventory_ranking(
  p_lote_id uuid,
  p_limit integer default 12
)
returns table (
  inventario_id uuid,
  destacado boolean,
  popularity_score bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id as inventario_id,
    i.destacado,
    coalesce(
      sum(
        coalesce(m.vistas_totales, 0)
        + coalesce(m.clics, 0) * 2
        + coalesce(m.interesados_whatsapp, 0) * 5
      ),
      0
    )::bigint as popularity_score
  from public.inventario i
  join public.lotes l
    on l.id = i.lote_id
   and l.activo = true
  left join public.metricas m
    on m.inventario_id = i.id
   and m.lote_id = i.lote_id
  where i.lote_id = p_lote_id
    and i.estatus = 'disponible'
  group by i.id, i.destacado, i.created_at
  order by
    i.destacado desc,
    popularity_score desc,
    i.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 12));
$$;

revoke all on function public.get_public_inventory_ranking(uuid, integer) from public;
grant execute on function public.get_public_inventory_ranking(uuid, integer) to anon;
grant execute on function public.get_public_inventory_ranking(uuid, integer) to authenticated;
