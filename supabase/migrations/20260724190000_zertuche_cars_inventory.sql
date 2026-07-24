-- Rebranding y catálogo real de Zertuche Cars.
-- La dirección y el correo del lote se preservan intencionalmente.

update public.lotes
set
  nombre = 'Zertuche Cars',
  telefono = '8118142655',
  whatsapp = '528118142655',
  config_estetica = coalesce(config_estetica, '{}'::jsonb) || jsonb_build_object(
    'nombre_marca', 'Zertuche Cars',
    'logo_url', '/branding/demo-lote/logo-light.svg'
  )
where slug = 'demo-lote-norte';

-- El usuario autorizó reemplazar por completo el inventario de este lote.
delete from public.inventario
where lote_id = (
  select id from public.lotes where slug = 'demo-lote-norte'
);

insert into public.inventario (
  id, lote_id, sku, marca, modelo, anio, version, precio, moneda,
  kilometraje, combustible, transmision, descripcion, ciudad, estado,
  estatus, destacado, imagenes, meta_tags, publicado_en_facebook,
  whatsapp_activo, published_at
)
select
  seed.id,
  lote.id,
  seed.sku,
  seed.marca,
  seed.modelo,
  seed.anio,
  seed.version,
  seed.precio,
  'MXN',
  seed.kilometraje,
  seed.combustible,
  seed.transmision,
  seed.descripcion,
  'Monterrey',
  'Nuevo León',
  'disponible',
  seed.destacado,
  array[
    '/inventory/zertuche/' || seed.slug || '/01.webp',
    '/inventory/zertuche/' || seed.slug || '/02.webp',
    '/inventory/zertuche/' || seed.slug || '/03.webp',
    '/inventory/zertuche/' || seed.slug || '/04.webp'
  ]::text[],
  seed.meta_tags || jsonb_build_object(
    'source', 'Zertuche Cars en Facebook',
    'source_url', seed.source_url
  ),
  true,
  true,
  timezone('utc', now()) - seed.age
from public.lotes lote
cross join (
  values
    (
      '44444444-4444-4444-4444-444444444401'::uuid,
      'ZER-001', 'Chevrolet', 'Cheyenne', 1993, 'Importada', 235000, null::integer,
      'Gasolina', 'Automática',
      'Cheyenne importada con alarma Viper, equipo de sonido, rines Centerline y muy buen manejo.',
      true, 'cheyenne-1993',
      '{"body_shape":"Pickup","rines":"Centerline","equipo":"Alarma Viper y equipo de sonido"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0fMKqFV2seN5c4zi1BJdB11M4kV36frFDezRa2X6rb1TnECfV2g99x8nUJKcQYe3Al',
      interval '7 days'
    ),
    (
      '44444444-4444-4444-4444-444444444402'::uuid,
      'ZER-002', 'Ford', 'Lightning', 1999, 'SVT Lightning', 490000, null::integer,
      'Gasolina', 'Automática',
      'Lightning con motor 5.4 supercargado, equipamiento eléctrico, audio y llantas nuevas. Excelente potencia y condiciones.',
      true, 'lightning-1999',
      '{"body_shape":"Pickup","motor":"5.4 supercargado","equipo":"Eléctrica y equipo de audio"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0vEjtGYKyVgAncxAk7wckBWUrZJMkwkgihCKVHenWiFbKdNnXk4eXkC3WsWnzvfk8l',
      interval '14 days'
    ),
    (
      '44444444-4444-4444-4444-444444444403'::uuid,
      'ZER-003', 'Toyota', 'Yaris GR', 2023, 'Circuit Package #17 de 100', 598000, 30000,
      'Gasolina', 'Manual de 6 velocidades',
      'Edición especial Circuit Package #17 de 100 vendidas en México. Motor 1.6 turbo de 3 cilindros y 257 HP, tracción GR-FOUR, suspensión GR, BBS forjados de 18 pulgadas, Michelin PS4 nuevas, faros LED e interior en piel.',
      true, 'toyota-yaris-gr-2023',
      '{"body_shape":"Hatchback","motor":"1.6 turbo, 3 cilindros","potencia":"257 HP","traccion":"GR-FOUR integral","rines":"BBS forjados de 18 pulgadas","interior":"Piel"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0G7zx9wECWWWQfmPRvPmN6RWjXP89v3pew6iwQmAGZYxt8LiCpCQKSZ2GDTAjRMbtl',
      interval '21 days'
    ),
    (
      '44444444-4444-4444-4444-444444444404'::uuid,
      'ZER-004', 'Chevrolet', '400SS', 2003, 'Paquete K', 365000, null::integer,
      'Gasolina', 'Automática',
      'Chevy 400SS con factura de agencia, Paquete K, motor 5.3, aire acondicionado y excelente manejo.',
      true, 'chevy-400ss-2003',
      '{"body_shape":"Pickup","motor":"5.3","documentacion":"Factura de agencia","equipo":"Paquete K y aire acondicionado"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0EyGmG75uH9ow8fm8V5Q6Mfrzrofdqanqke2e1orGU1mtS6XDNXqEHUAPVERNvPPdl',
      interval '28 days'
    ),
    (
      '44444444-4444-4444-4444-444444444405'::uuid,
      'ZER-005', 'Ford', 'Lightning', 2001, 'SVT Lightning', 595000, null::integer,
      'Gasolina', 'Automática',
      'Ford Lightning importada por aduana con motor 5.4 supercargado. En excelentes condiciones y lista para disfrutar.',
      false, 'ford-lightning-2001',
      '{"body_shape":"Pickup","motor":"5.4 supercargado","documentacion":"Importada por aduana"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid02dAy6SYGNFZozCmNsceczt2aWRCr5XkACMh5GsRy9NKiLen2Xmm7Xo2zgESRLiVMml',
      interval '32 days'
    ),
    (
      '44444444-4444-4444-4444-444444444406'::uuid,
      'ZER-006', 'Chevrolet', 'Cheyenne', 1990, 'Custom 6.0', 395000, null::integer,
      'Gasolina', 'Automática 4L60',
      'Cheyenne con factura de agencia, rines Intro 20x8 y 22x13, cofre y defensas de fibra de vidrio, motor 6.0 con árbol, resortes y reprogramación, tubería custom y ventiladores eléctricos.',
      false, 'cheyenne-1990',
      '{"body_shape":"Pickup","motor":"6.0 preparado","rines":"Intro 20x8 y 22x13","documentacion":"Factura de agencia","equipo":"Tubería custom y ventiladores eléctricos"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0oKin3aaeN7GYpKwqvQn9QY8Wgb98EvQ4W5hSZBLbNGKrF92R4U3KF6E5hNo3Vi9Kl',
      interval '36 days'
    ),
    (
      '44444444-4444-4444-4444-444444444407'::uuid,
      'ZER-007', 'Jeep', 'Grand Cherokee Trackhawk', 2021, '4x4', 2180000, 19000,
      'Gasolina', 'Automática',
      'Trackhawk 4x4 del último año de producción, factura original, motor 6.2 supercargado preparado a 900 HP, inyectores y HP Tuners. Rojo Adrenalina, piel, audio SRT, quemacocos panorámico dual, rines 20, Brembo y protección Xpel.',
      false, 'jeep-trackhawk-2021',
      '{"body_shape":"SUV","motor":"6.2 supercargado","potencia":"900 HP","traccion":"4x4","color":"Rojo Adrenalina","rines":"20 pulgadas","frenos":"Brembo","interior":"Piel","equipo":"Audio SRT, quemacocos panorámico dual y Xpel"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0xaAJP5qcWhJSmABxwtvyi6TSEEgouVEgce9UnaNZNNRDR6cZPngeFGNysuBAtQiZl',
      interval '40 days'
    ),
    (
      '44444444-4444-4444-4444-444444444408'::uuid,
      'ZER-008', 'Dodge', 'Challenger Hellcat', 2016, 'Widebody', 785000, null::integer,
      'Gasolina', 'Automática',
      'Challenger Hellcat de único dueño con factura de agencia, conversión Widebody, motor 6.2 supercargado de 700 HP e interior camel.',
      false, 'challenger-hellcat-2016',
      '{"body_shape":"Coupé","motor":"6.2 supercargado","potencia":"700 HP","interior":"Camel","documentacion":"Factura de agencia, único dueño"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0Ex563snP4pNVYYck4TQGfVSdQMvLbizQTunZ9jCrgagQASMBetQ2nituEjPS7dC6l',
      interval '48 days'
    ),
    (
      '44444444-4444-4444-4444-444444444409'::uuid,
      'ZER-009', 'Chevrolet', 'Cheyenne', 1989, '350', 299000, null::integer,
      'Gasolina', 'Automática',
      'Cheyenne con motor 350, transmisión automática y rines American Racing. Excelentes condiciones y lista para disfrutar.',
      false, 'cheyenne-1989',
      '{"body_shape":"Pickup","motor":"350","rines":"American Racing"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid02Zubcf7ZATT5n7QJHiqLvAqvzcoyxTaZoSozbsDvYMtRPCUshfkCZfTXso3CdsFXVl',
      interval '55 days'
    ),
    (
      '44444444-4444-4444-4444-444444444410'::uuid,
      'ZER-010', 'Chevrolet', 'Silverado', 2004, '5.3', 239000, null::integer,
      'Gasolina', 'Automática',
      'Silverado automática con motor 5.3, equipamiento eléctrico, aire acondicionado, llantas nuevas y rines de Cheyenne moderna. Excelente manejo.',
      false, 'silverado-2004',
      '{"body_shape":"Pickup","motor":"5.3","rines":"Cheyenne moderna","equipo":"Eléctrica y aire acondicionado"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0ptN9mo1aujza7MrAwCMxA1UjbfEvmYihffQjGFKB4TBsafYdnJBgNJPiSC71yyqPl',
      interval '60 days'
    ),
    (
      '44444444-4444-4444-4444-444444444411'::uuid,
      'ZER-011', 'Chevrolet', 'Corvette Z06', 2017, 'Convertible', 1190000, null::integer,
      'Gasolina', 'Automática',
      'Corvette Z06 convertible, importado por aduana, con transmisión automática y motor 6.2 supercargado.',
      false, 'corvette-z06-2017',
      '{"body_shape":"Convertible","motor":"6.2 supercargado","documentacion":"Importado por aduana"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0U6U4qwE9rSARtJJr4fpeAV6CsnM6Q2ZLHwNxA8JyvEfDCM2R2N4ZS74BZnNdzgR3l',
      interval '64 days'
    ),
    (
      '44444444-4444-4444-4444-444444444412'::uuid,
      'ZER-012', 'Dodge', 'Charger Daytona R/T', 2025, 'Daytona R/T', 1390000, null::integer,
      null, null,
      'Charger Daytona R/T prácticamente nuevo, impecable, potente, cómodo, con excelente manejo y listo para disfrutar.',
      false, 'charger-daytona-rt-2025',
      '{"body_shape":"Coupé","condition":"Prácticamente nuevo","notas":"Único en Monterrey según la publicación"}'::jsonb,
      'https://www.facebook.com/Autosantacruzclasics/posts/pfbid0HKZq12zdtELRk4Y2HpzHkN7nNavGhzXX5fqdgy3ZLZL7Fa2qPYjb1CRFBLDHeNQul',
      interval '68 days'
    )
) as seed(
  id, sku, marca, modelo, anio, version, precio, kilometraje,
  combustible, transmision, descripcion, destacado, slug, meta_tags,
  source_url, age
)
where lote.slug = 'demo-lote-norte';

-- Recrea tres meses de comportamiento simulado para las nuevas unidades.
insert into public.metricas (
  lote_id, inventario_id, fecha, canal,
  vistas_totales, interesados_whatsapp, clics
)
select
  inventory.lote_id,
  inventory.id,
  day::date,
  'web',
  5 + ((hashtext(inventory.id::text || day::text) & 2147483647) % 28),
  (hashtext('wa' || inventory.id::text || day::text) & 2147483647) % 4,
  2 + ((hashtext('click' || inventory.id::text || day::text) & 2147483647) % 11)
from public.inventario inventory
join public.lotes lote
  on lote.id = inventory.lote_id
 and lote.slug = 'demo-lote-norte'
cross join generate_series(current_date - 89, current_date - 1, interval '1 day') day
on conflict(lote_id, inventario_id, fecha, canal) do nothing;
