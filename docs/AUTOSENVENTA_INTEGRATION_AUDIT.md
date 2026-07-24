# Auditoría e integración desde `Rodrigoloh/autosenventa`

## Garantía de sólo lectura

`autosenventa` se descargó en `C:\tmp\autosenventa-audit` únicamente para inspección. No se
crearon ramas, commits, pushes ni archivos dentro del repositorio fuente. La integración vive
exclusivamente en `Auto-traders`.

## Principios reutilizados

- RLS es la autoridad final; ocultar botones no se considera autorización.
- Los roles se leen de datos persistidos y nunca de valores enviados por el navegador.
- Las operaciones sensibles pasan por RPC `SECURITY DEFINER` con transiciones y validaciones.
- Los archivos privados no se guardan en un bucket público.
- Admin ve el alcance completo; staff sólo los recursos asignados.
- Las transiciones relevantes generan historial.

## Modelo final adaptado

La persona que quiere vender su auto no necesita una cuenta y no crea un anuncio. La ruta
`/:slug/vende-tu-auto` envía un formulario multipart a la Edge Function `create-sale-lead` con:

- nombre y al menos un teléfono o correo;
- canal de contacto preferido;
- marca, modelo, año, versión, kilometraje, precio esperado y ubicación;
- descripción del estado del vehículo;
- entre 1 y 8 imágenes JPG, PNG o WebP.

La función valida lote, campos, MIME, cantidad y tamaño. Crea un registro privado en
`sale_leads` y guarda las imágenes en el bucket privado `sale-lead-media`. Si una carga falla,
elimina los archivos y el registro incompleto. El formulario exige consentimiento y la función
limita cada huella de solicitud a cinco envíos por hora.

## Roles y alcance

- `lote_admin`: ve todos los vehículos, leads y métricas del lote; crea inventario y asigna
  vehículos/leads.
- `lote_staff`: ve y administra únicamente vehículos y leads donde
  `assigned_staff_id = auth.uid()`. Sus métricas quedan limitadas a esos vehículos por RLS.
- `lote_editor`: se conserva temporalmente con alcance equivalente a staff para no romper
  cuentas existentes.
- `lote_viewer`: no recibe permisos operativos nuevos.
- `super_admin`: conserva el control global existente.

La asignación usa los RPC `assign_inventory_staff` y `assign_sale_lead_staff`. Los campos de
asignación del inventario están protegidos por trigger para impedir cambios directos.

## Seguimiento del lead

Los estados permitidos son `new`, `reviewing`, `contacted`, `qualified`, `won`, `lost` y
`rejected`. `update_sale_lead_status` valida actor y transición, y registra el cambio en
`sale_lead_history`.

## Orden de despliegue

1. Aplicar `supabase/migrations/20260723190000_staff_assignments_and_sale_leads.sql`.
2. Configurar un valor aleatorio para el secreto `LEAD_RATE_LIMIT_SALT`.
3. Desplegar `create-sale-lead`, `invite-lote-user` y `update-lote-member`.
4. Desplegar el frontend.

El orden es obligatorio porque el frontend consulta columnas, tablas y RPC agregados por la
migración.

## Diferencias de stack

No se copiaron componentes de Next.js ni Server Actions: `autosenventa` usa Next.js/SSR y este
proyecto usa Vite/React. Se trasladó el modelo de seguridad y funcionamiento mediante código
compatible con Supabase y la estructura multi-tenant existente.
