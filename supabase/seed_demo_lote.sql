-- Demo seed for the multi-tenant car lot template.
-- Usage:
-- 1) Create an auth user in Supabase Auth with the email defined below.
-- 2) Run this script in the SQL editor after `final_multi_tenant_lotes.sql`.
-- 3) Open /demo-lote-norte in the frontend.

do $$
declare
  demo_lote_id uuid := '11111111-1111-1111-1111-111111111111';
  demo_auto_1 uuid := '22222222-2222-2222-2222-222222222221';
  demo_auto_2 uuid := '22222222-2222-2222-2222-222222222222';
  demo_auto_3 uuid := '22222222-2222-2222-2222-222222222223';
  demo_admin_email text := 'demo-admin@carsaler.mx';
  demo_admin_user_id uuid;
begin
  insert into public.lotes (
    id,
    nombre,
    slug,
    dominio_personalizado,
    telefono,
    whatsapp,
    facebook_page_id,
    activo,
    config_estetica
  )
  values (
    demo_lote_id,
    'Autos Norte Demo',
    'demo-lote-norte',
    'demo.autosnorte.mx',
    '8181234567',
    '528181234567',
    'autos-norte-demo',
    true,
    jsonb_build_object(
      'nombre_marca', 'Autos Norte Demo',
      'color_primario', '#c44900',
      'color_secundario', '#12233d',
      'color_acento', '#ffcf5c',
      'color_superficie', '#fff8ef',
      'color_texto', '#101828',
      'color_muted', '#667085',
      'logo_url', 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=240&q=80'
    )
  )
  on conflict (id) do update
  set
    nombre = excluded.nombre,
    slug = excluded.slug,
    dominio_personalizado = excluded.dominio_personalizado,
    telefono = excluded.telefono,
    whatsapp = excluded.whatsapp,
    facebook_page_id = excluded.facebook_page_id,
    activo = excluded.activo,
    config_estetica = excluded.config_estetica,
    updated_at = timezone('utc', now());

  select id
  into demo_admin_user_id
  from auth.users
  where email = demo_admin_email
  limit 1;

  if demo_admin_user_id is not null then
    insert into public.lote_usuarios (lote_id, user_id, role)
    values (demo_lote_id, demo_admin_user_id, 'lote_admin')
    on conflict (lote_id, user_id) do update
    set role = excluded.role;
  else
    raise notice 'No auth user found for %. Create it first in Supabase Auth and rerun this script.', demo_admin_email;
  end if;

  insert into public.inventario (
    id,
    lote_id,
    marca,
    modelo,
    anio,
    version,
    precio,
    moneda,
    kilometraje,
    combustible,
    transmision,
    descripcion,
    ciudad,
    estado,
    estatus,
    imagenes
  )
  values
    (
      demo_auto_1,
      demo_lote_id,
      'Mazda',
      'CX-5',
      2022,
      'i Grand Touring',
      468900,
      'MXN',
      32450,
      'Gasolina',
      'Automatica',
      'SUV seminueva, servicio reciente, pantalla, camara de reversa y excelente estado general.',
      'Monterrey',
      'Nuevo Leon',
      'disponible',
      array[
        'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1494976688153-cbe2305abf84?auto=format&fit=crop&w=1200&q=80'
      ]::text[]
    ),
    (
      demo_auto_2,
      demo_lote_id,
      'Toyota',
      'Corolla',
      2021,
      'LE CVT',
      319500,
      'MXN',
      41200,
      'Gasolina',
      'Automatica',
      'Sedan ideal para ciudad, bajo consumo y mantenimiento al dia.',
      'Monterrey',
      'Nuevo Leon',
      'disponible',
      array[
        'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80'
      ]::text[]
    ),
    (
      demo_auto_3,
      demo_lote_id,
      'Ford',
      'Ranger',
      2020,
      'XLT Diesel',
      539900,
      'MXN',
      68500,
      'Diesel',
      'Automatica',
      'Pickup para trabajo y uso personal, buena presencia y lista para entrega.',
      'San Nicolas',
      'Nuevo Leon',
      'vendido',
      array[
        'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80'
      ]::text[]
    )
  on conflict (id) do update
  set
    lote_id = excluded.lote_id,
    marca = excluded.marca,
    modelo = excluded.modelo,
    anio = excluded.anio,
    version = excluded.version,
    precio = excluded.precio,
    moneda = excluded.moneda,
    kilometraje = excluded.kilometraje,
    combustible = excluded.combustible,
    transmision = excluded.transmision,
    descripcion = excluded.descripcion,
    ciudad = excluded.ciudad,
    estado = excluded.estado,
    estatus = excluded.estatus,
    imagenes = excluded.imagenes,
    updated_at = timezone('utc', now());

  insert into public.metricas (
    lote_id,
    inventario_id,
    fecha,
    canal,
    vistas_totales,
    interesados_whatsapp,
    clics
  )
  select
    demo_lote_id,
    demo_auto_1,
    gs::date,
    'web',
    18 + ((extract(day from gs)::int * 3) % 15),
    2 + ((extract(day from gs)::int) % 4),
    5 + ((extract(day from gs)::int * 2) % 8)
  from generate_series(current_date - 6, current_date, interval '1 day') as gs
  on conflict (lote_id, inventario_id, fecha, canal) do update
  set
    vistas_totales = excluded.vistas_totales,
    interesados_whatsapp = excluded.interesados_whatsapp,
    clics = excluded.clics,
    updated_at = timezone('utc', now());

  insert into public.metricas (
    lote_id,
    inventario_id,
    fecha,
    canal,
    vistas_totales,
    interesados_whatsapp,
    clics
  )
  select
    demo_lote_id,
    demo_auto_2,
    gs::date,
    'web',
    10 + ((extract(day from gs)::int * 2) % 10),
    1 + ((extract(day from gs)::int) % 3),
    3 + ((extract(day from gs)::int * 2) % 6)
  from generate_series(current_date - 6, current_date, interval '1 day') as gs
  on conflict (lote_id, inventario_id, fecha, canal) do update
  set
    vistas_totales = excluded.vistas_totales,
    interesados_whatsapp = excluded.interesados_whatsapp,
    clics = excluded.clics,
    updated_at = timezone('utc', now());

  insert into public.metricas (
    lote_id,
    inventario_id,
    fecha,
    canal,
    vistas_totales,
    interesados_whatsapp,
    clics
  )
  select
    demo_lote_id,
    demo_auto_3,
    gs::date,
    'web',
    4 + ((extract(day from gs)::int) % 4),
    (extract(day from gs)::int) % 2,
    1 + ((extract(day from gs)::int) % 3)
  from generate_series(current_date - 6, current_date, interval '1 day') as gs
  on conflict (lote_id, inventario_id, fecha, canal) do update
  set
    vistas_totales = excluded.vistas_totales,
    interesados_whatsapp = excluded.interesados_whatsapp,
    clics = excluded.clics,
    updated_at = timezone('utc', now());
end $$;
