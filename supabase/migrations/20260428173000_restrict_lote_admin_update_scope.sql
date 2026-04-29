-- Restrict lote_admin writes to inventory operations only.
-- super_admin keeps full control through platform workflows.

create or replace function public.enforce_lote_admin_lotes_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() then
    return new;
  end if;

  if public.user_has_lote_role(old.id, array['lote_admin']) then
    if new is distinct from old then
      raise exception 'lote_admin cannot update lote settings or public site content';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_lote_admin_inventario_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() then
    return new;
  end if;

  if public.user_has_lote_role(old.lote_id, array['lote_admin']) then
    if row(
      new.lote_id,
      new.moneda,
      new.created_by
    ) is distinct from row(
      old.lote_id,
      old.moneda,
      old.created_by
    ) then
      raise exception 'lote_admin can update vehicle card text, images, detail specs and status, but not ownership fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_a_lotes_restrict_lote_admin_update_scope on public.lotes;
create trigger trg_a_lotes_restrict_lote_admin_update_scope
before update on public.lotes
for each row
execute function public.enforce_lote_admin_lotes_update_scope();

drop trigger if exists trg_a_inventario_restrict_lote_admin_update_scope on public.inventario;
create trigger trg_a_inventario_restrict_lote_admin_update_scope
before update on public.inventario
for each row
execute function public.enforce_lote_admin_inventario_update_scope();
