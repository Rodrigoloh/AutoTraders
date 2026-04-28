// Edita este archivo para ajustar la demo publica en espanol y enfoque Monterrey.
// Logos placeholder:
// - public/branding/demo-lote/logo-light.svg
// - public/branding/demo-lote/logo-dark.svg
// Puedes reemplazarlos por PNG o SVG y mantener el mismo nombre/ruta.

export const demoCatalogContent = {
  logos: {
    header: '/branding/demo-lote/logo-light.svg',
    footer: '/branding/demo-lote/logo-dark.svg',
  },
  heroImage:
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1920&q=80',
  brand: {
    wordmark: 'Lote Demo MTY',
    submark: 'Seminuevos Premium',
  },
  nav: [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Inventario', href: '#inventario' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Contacto', href: '#contacto' },
  ],
  hero: {
    eyebrow: 'Monterrey, Nuevo Leon',
    title: 'Tu proximo auto deportivo esta en el Norte.',
    subtitle:
      'Una experiencia mobile-first para lotes premium en Monterrey: inventario limpio, contacto directo y mensajes comerciales listos para convertir visitas en citas.',
    primaryCta: 'Explorar inventario',
    secondaryCta: 'Hablar con asesor',
    stats: [
      { label: 'Atencion', value: 'WhatsApp directo' },
      { label: 'Operacion', value: 'MTY y area metro' },
      { label: 'Especialidad', value: 'SUV, sedan y deportivo' },
    ],
  },
  filters: {
    title: 'Encuentra tu siguiente auto',
    subtitle:
      'Usa un filtro corto, visual y directo. La intención es que en móvil se sienta rápido y premium, no como una tabla administrativa.',
    typeLabel: 'Tipo de vehículo',
    priceLabel: 'Presupuesto máximo',
    clearLabel: 'Limpiar filtros',
    priceOptions: [
      { label: 'Sin limite', value: 'all' },
      { label: 'Hasta $300,000', value: '300000' },
      { label: 'Hasta $500,000', value: '500000' },
      { label: 'Hasta $800,000', value: '800000' },
      { label: 'Hasta $1,200,000', value: '1200000' },
    ],
  },
  featured: {
    eyebrow: 'Unidad destacada',
    summaryTitle: 'Lista para apartar o agendar visita',
    reserveLabel: 'Reservar Ahora!',
    viewLabel: 'Pedir video',
    detailItems: [
      'Consignación directa y atención comercial inmediata.',
      'Presentación limpia con look premium para cerrar más citas.',
      'Base editable para San Pedro, Monterrey o cualquier zona del área metropolitana.',
    ],
  },
  trustSection: {
    title: 'Una experiencia mas moderna para vender mejor',
    cards: [
      {
        title: 'Inventario claro',
        body: 'Cards mas sobrias, informacion rapida y llamadas a la accion visibles sin saturar la pantalla.',
      },
      {
        title: 'Contacto inmediato',
        body: 'WhatsApp, telefono y correo visibles para cerrar leads desde el primer scroll.',
      },
      {
        title: 'Branding flexible',
        body: 'Deja logos, paleta y copies listos para cada cliente sin rehacer toda la plantilla.',
      },
    ],
  },
  editorialSections: [
    {
      title: 'Compra con confianza en MTY',
      body:
        'Presenta tu inventario con una narrativa mas limpia, enfocada en calidad, origen de unidades y atencion personalizada para compradores en Monterrey y San Pedro.',
    },
    {
      title: 'Tomamos tu auto a cuenta',
      body:
        'Deja espacio para mensajes de toma de seminuevos, consignacion, financiamiento o apartados segun el tipo de lote que quieras demostrar.',
    },
    {
      title: 'Contenido adaptable por cliente',
      body:
        'Este demo ya queda en espanol, pero puedes cambiar titulos, subtitulos y bloques completos desde este archivo o desde config_contenido del lote.',
    },
    {
      title: 'Visual mas premium',
      body:
        'El nuevo layout usa fondo oscuro con acentos cobre, paneles translcidos y jerarquia tipografica mas cercana a un lote high-end.',
    },
  ],
  footer: {
    title: 'Agenda una visita o solicita inventario por WhatsApp',
    body:
      'Usa este bloque como cierre para Monterrey: direccion, horarios, telefono, redes o un mapa embebido mas adelante.',
    address: 'Av. Constitución S/N (Frente a la Macroplaza), Monterrey, N.L.',
    hours: 'Lun a Sab · 9:30 a 19:00',
    mapLabel: 'Placeholder para mapa o embed',
    legal:
      'Demo visual para lotes de autos. Sustituye textos, logos y datos de contacto antes de publicarlo.',
  },
};
