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
    title: 'Seminuevos premium con entrega agil en Monterrey.',
    subtitle:
      'Una vitrina mas limpia para SUVs, sedanes y deportivos seleccionados, con contacto directo por WhatsApp y presentacion lista para cerrar desde celular o escritorio.',
    primaryCta: 'Ver inventario',
    secondaryCta: 'Hablar con asesor',
    stats: [
      { label: 'Atencion', value: 'WhatsApp directo' },
      { label: 'Operacion', value: 'MTY y area metro' },
      { label: 'Confianza', value: 'Revision y seguimiento' },
    ],
  },
  filters: {
    title: 'Encuentra tu siguiente auto',
    subtitle:
      'Filtra por marca, modelo y rango de precio. El demo esta orientado a un lote en Monterrey, pero puedes adaptar el copy a cualquier ciudad.',
    makeLabel: 'Marca',
    modelLabel: 'Modelo',
    priceLabel: 'Precio maximo',
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
    summaryTitle: 'Listo para apartar o agendar visita',
    reserveLabel: 'Solicitar cotizacion',
    viewLabel: 'Pedir video',
    detailItems: [
      'Revision visual y seguimiento comercial desde WhatsApp.',
      'Presentacion limpia para lotes con enfoque premium.',
      'Base editable para San Pedro, Monterrey o cualquier zona del area metropolitana.',
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
    address: 'Showroom demo, Monterrey, Nuevo Leon',
    hours: 'Lun a Sab · 9:30 a 19:00',
    mapLabel: 'Placeholder para mapa o embed',
    legal:
      'Demo visual para lotes de autos. Sustituye textos, logos y datos de contacto antes de publicarlo.',
  },
};
