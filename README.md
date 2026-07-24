# Car Saler

Template mobile-first para lotes de autos con frontend en Vite/React y backend pensado para Supabase.

## Stack

- Vite + React
- Supabase Auth / Database / Storage
- Vercel para hosting del frontend

## Variables de entorno

Crea un archivo `.env.local` para desarrollo:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

En Vercel configura las mismas variables en:

- `Production`
- `Preview`
- `Development` si usarás `vercel env pull`

Compatibilidad:

- El cliente ahora prioriza `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY` queda solo como fallback legacy si ya lo tenías configurado

## Base de datos

Ejecuta en Supabase, en este orden:

1. [supabase/final_multi_tenant_lotes.sql](supabase/final_multi_tenant_lotes.sql)
2. [supabase/seed_demo_lote.sql](supabase/seed_demo_lote.sql)
3. [supabase/promote_superadmin.sql](supabase/promote_superadmin.sql) ajustando tu correo para habilitar `/platform`

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy en Vercel

Este proyecto usa React Router, así que incluye un `vercel.json` con rewrite global a `index.html` para que rutas como `/zertuchecars/admin` funcionen también al refrescar.

Configuración recomendada en Vercel:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Demo

- Catálogo: `/zertuchecars`
- Admin: `/zertuchecars/admin/login`
- Plataforma: `/platform/login`
- Usuario demo esperado en Supabase Auth: `demo-admin@carsaler.mx`

## Leads y alcance de staff

La ruta `/:slug/vende-tu-auto` permite que una persona envíe, sin crear una cuenta, sus
datos de contacto, información del vehículo y fotos privadas. Esto crea un lead para revisión;
no publica automáticamente un anuncio.

- `lote_admin` ve todos los vehículos, leads y métricas del lote.
- `lote_staff` sólo ve vehículos, leads y métricas que tenga asignados.
- `lote_editor` se conserva como rol heredado equivalente a staff.

Para desplegar esta función:

1. Aplica `supabase/migrations/20260723190000_staff_assignments_and_sale_leads.sql`.
2. Configura el secreto `LEAD_RATE_LIMIT_SALT` en Supabase.
3. Despliega `create-sale-lead`; `supabase/config.toml` desactiva la verificación JWT porque el
   formulario es público.
4. Despliega `invite-lote-user` y `update-lote-member`.
5. Despliega el frontend.

Consulta `docs/AUTOSENVENTA_INTEGRATION_AUDIT.md` para el modelo de seguridad y las decisiones
de adaptación.
