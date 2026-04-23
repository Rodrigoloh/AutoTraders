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
VITE_SUPABASE_ANON_KEY=your-anon-key
```

En Vercel configura las mismas variables en:

- `Production`
- `Preview`
- `Development` si usarás `vercel env pull`

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

Este proyecto usa React Router, así que incluye un `vercel.json` con rewrite global a `index.html` para que rutas como `/demo-lote-norte/admin` funcionen también al refrescar.

Configuración recomendada en Vercel:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Demo

- Catálogo: `/demo-lote-norte`
- Admin: `/demo-lote-norte/admin/login`
- Plataforma: `/platform/login`
- Usuario demo esperado en Supabase Auth: `demo-admin@carsaler.mx`
