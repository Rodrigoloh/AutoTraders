-- Cambia únicamente la ruta pública del tenant; conserva su id y relaciones.
update public.lotes
set slug = 'zertuchecars'
where slug = 'demo-lote-norte';
