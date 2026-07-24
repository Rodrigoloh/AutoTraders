import { Helmet } from 'react-helmet';
import { PublicSiteFooter } from '../components/PublicSiteFooter.jsx';
import { PublicSiteHeader } from '../components/PublicSiteHeader.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

const legalContent = {
  'aviso-de-privacidad': {
    title: 'Aviso de privacidad',
    intro:
      'Este aviso explica cómo se recopilan y utilizan los datos enviados al solicitar información, agendar una prueba o pedir una evaluación de venta.',
    sections: [
      {
        title: 'Datos que recopilamos',
        body:
          'Podemos recibir nombre, teléfono, correo, datos del vehículo, fotografías y cualquier información incluida voluntariamente en los formularios.',
      },
      {
        title: 'Finalidades',
        body:
          'Los datos se utilizan para responder solicitudes, evaluar vehículos, preparar propuestas, administrar leads y dar seguimiento comercial.',
      },
      {
        title: 'Conservación y seguridad',
        body:
          'La información se almacena con controles de acceso y se conserva únicamente durante el tiempo necesario para atender la solicitud y cumplir obligaciones aplicables.',
      },
      {
        title: 'Derechos y contacto',
        body:
          'Puedes solicitar acceso, rectificación, cancelación u oposición escribiendo al correo de contacto indicado en este sitio.',
      },
    ],
  },
  terminos: {
    title: 'Términos de uso',
    intro:
      'Al utilizar este sitio aceptas que la información del inventario es orientativa y puede cambiar sin previo aviso.',
    sections: [
      {
        title: 'Inventario y precios',
        body:
          'La disponibilidad, kilometraje, equipamiento, precio y condiciones finales deben confirmarse directamente con el lote antes de cualquier operación.',
      },
      {
        title: 'Solicitudes y apartados',
        body:
          'Enviar un formulario, mensaje o solicitud de evaluación no constituye una oferta vinculante, reserva confirmada ni contrato de compraventa.',
      },
      {
        title: 'Contenido',
        body:
          'Las fotografías demo son ilustrativas y algunas proceden de Wikimedia Commons bajo las licencias indicadas en sus archivos de origen. Las unidades reales deben verificarse mediante su ficha, inspección y documentación correspondiente.',
      },
    ],
  },
  cookies: {
    title: 'Política de cookies',
    intro:
      'El sitio puede utilizar almacenamiento técnico y medición básica para mantener sesiones y entender el rendimiento del inventario.',
    sections: [
      {
        title: 'Uso técnico',
        body:
          'El almacenamiento local permite conservar sesiones administrativas y preferencias necesarias para el funcionamiento de la plataforma.',
      },
      {
        title: 'Métricas',
        body:
          'Se pueden registrar vistas de fichas y clics de contacto de forma agregada para ayudar al lote a medir el interés en sus vehículos.',
      },
      {
        title: 'Control',
        body:
          'Puedes eliminar o bloquear cookies desde la configuración de tu navegador; algunas funciones administrativas podrían dejar de operar.',
      },
    ],
  },
};

export function LegalPage({ documentType }) {
  const { tenant, theme, slug } = useTenantTheme();
  const content = legalContent[documentType] ?? legalContent.terminos;
  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const footer = demoCatalogContent.footer;

  return (
    <>
      <Helmet>
        <title>{brandName} | {content.title}</title>
      </Helmet>
      <main className="site-shell">
        <section className="secondary-hero legal-hero">
          <PublicSiteHeader
            brandName={brandName}
            brandSubmark={demoCatalogContent.brand.submark}
            homeHref={`/${slug}`}
            inventoryHref={`/${slug}/inventario`}
            logoSrc={demoCatalogContent.logos.header}
            mode="secondary"
            sellHref={`/${slug}/vende-tu-auto`}
          />
        </section>

        <article className="legal-document edge-pad">
          <span className="eyebrow">Información legal</span>
          <h1 className="heading-lg">{content.title}</h1>
          <p className="legal-intro">{content.intro}</p>
          <div className="legal-section-grid">
            {content.sections.map((section) => (
              <section className="legal-section" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
          <p className="legal-updated">Última actualización: 23 de julio de 2026.</p>
        </article>

        <PublicSiteFooter
          {...footer}
          brandName={brandName}
          brandSubmark={demoCatalogContent.brand.submark}
          footerLogo={demoCatalogContent.logos.footer}
          slug={slug}
          variant="compact"
        />
      </main>
    </>
  );
}
