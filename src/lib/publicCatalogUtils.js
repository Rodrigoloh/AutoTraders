import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { demoCatalogContent } from './demoCatalogContent.js';

function buildDemoGallery(photoUrl) {
  const separator = photoUrl.includes('?') ? '&' : '?';
  const baseUrl = photoUrl.replace(/([?&])w=\d+/g, '$1w=1600');

  return [
    `${baseUrl}${separator}gallery=front`,
    `${baseUrl}${separator}gallery=side&fit=crop&crop=entropy`,
    `${baseUrl}${separator}gallery=rear&fit=crop&crop=center`,
    `${baseUrl}${separator}gallery=detail&fit=crop&crop=faces`,
  ];
}

function ensureMinimumGallery(auto, minimum = 4) {
  const images = Array.isArray(auto?.imagenes) ? auto.imagenes.filter(Boolean) : [];

  if (!images.length || images.length >= minimum) {
    return auto;
  }

  const completedImages = [...images];

  while (completedImages.length < minimum) {
    const source = images[completedImages.length % images.length];
    const separator = source.includes('?') ? '&' : '?';
    completedImages.push(`${source}${separator}gallery=${completedImages.length + 1}`);
  }

  return { ...auto, imagenes: completedImages };
}

const demoVehicleSeeds = [
  {
    marca: 'BMW',
    modelo: 'M2 Competition',
    version: 'Coupe Track Pack',
    precio: 1180000,
    kilometraje: 18500,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'Coupe',
      motor: '3.0 Turbo',
      traccion: 'Trasera',
      asientos: '4',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Audi',
    modelo: 'RS5 Sportback',
    version: 'Black Optic',
    precio: 1320000,
    kilometraje: 26400,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'Sportback',
      motor: '2.9 Turbo',
      traccion: 'Quattro',
      asientos: '5',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Mercedes-Benz',
    modelo: 'GLB 250',
    version: 'AMG Line',
    precio: 920000,
    kilometraje: 31200,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'SUV',
      motor: '2.0 Turbo',
      traccion: 'Integral',
      asientos: '7',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Ford',
    modelo: 'Mustang GT',
    version: 'Performance Package',
    precio: 1060000,
    kilometraje: 22800,
    combustible: 'Gasolina',
    transmision: 'Manual',
    meta_tags: {
      body_shape: 'Coupe',
      motor: '5.0 V8',
      traccion: 'Trasera',
      asientos: '4',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Porsche',
    modelo: '911 Carrera',
    version: 'Sport Chrono',
    precio: 2380000,
    kilometraje: 14200,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'Coupe',
      motor: '3.0 Twin Turbo',
      traccion: 'Trasera',
      asientos: '4',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Lamborghini',
    modelo: 'Huracán',
    version: 'EVO',
    precio: 6200000,
    kilometraje: 9800,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'Coupe',
      motor: '5.2 V10',
      traccion: 'Integral',
      asientos: '2',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'BMW',
    modelo: 'X5 M',
    version: 'Competition',
    precio: 2140000,
    kilometraje: 19600,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'SUV',
      motor: '4.4 V8 Twin Turbo',
      traccion: 'Integral',
      asientos: '5',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Audi',
    modelo: 'Q8',
    version: 'S line',
    precio: 1780000,
    kilometraje: 24100,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'SUV',
      motor: '3.0 Turbo',
      traccion: 'Quattro',
      asientos: '5',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Chevrolet',
    modelo: 'Corvette',
    version: 'Stingray',
    precio: 2450000,
    kilometraje: 11200,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'Coupe',
      motor: '6.2 V8',
      traccion: 'Trasera',
      asientos: '2',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=80',
    ),
  },
  {
    marca: 'Mercedes-Benz',
    modelo: 'AMG GT',
    version: '53 4MATIC+',
    precio: 2260000,
    kilometraje: 17300,
    combustible: 'Gasolina',
    transmision: 'Automática',
    meta_tags: {
      body_shape: 'Coupe',
      motor: '3.0 Turbo',
      traccion: 'Integral',
      asientos: '4',
    },
    imagenes: buildDemoGallery(
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=80',
    ),
  },
];

export function formatPrice(price, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));
}

export function primaryImage(auto) {
  if (Array.isArray(auto?.imagenes) && auto.imagenes.length > 0) {
    return auto.imagenes[0];
  }

  return demoCatalogContent.heroImage;
}

export function inferVehicleType(auto) {
  const haystack = [
    auto?.version,
    auto?.descripcion,
    auto?.modelo,
    auto?.meta_tags?.body_shape,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    haystack.includes('suv') ||
    haystack.includes('pickup') ||
    haystack.includes('camioneta') ||
    haystack.includes('crossover')
  ) {
    return 'SUV';
  }

  if (
    haystack.includes('amg') ||
    haystack.includes('m ') ||
    haystack.includes('gt') ||
    haystack.includes('sport') ||
    haystack.includes('deportivo') ||
    haystack.includes('coupe') ||
    haystack.includes('turbo')
  ) {
    return 'Deportivo';
  }

  return 'Sedán';
}

export function buildBudgetOptions(maxBudget) {
  const values = Array.from(
    new Set([0, 200000, 400000, 600000, 800000, 1200000, maxBudget].filter((value) => value <= maxBudget)),
  ).sort((left, right) => left - right);

  return values.map((value) => ({
    value: String(value),
    label: value === 0 ? 'Sin mínimo' : formatPrice(value),
  }));
}

export function expandDemoAutos(autos, targetCount = 12) {
  const autosWithGalleries = autos.map((auto) => ensureMinimumGallery(auto));

  if (autosWithGalleries.length >= targetCount) {
    return autosWithGalleries;
  }

  const baseAuto = autosWithGalleries[0] ?? {
    id: 'demo-base',
    lote_id: 'demo',
    marca: 'BMW',
    modelo: 'M240i',
    anio: 2021,
    version: 'Demo Premium',
    precio: 980000,
    moneda: 'MXN',
    kilometraje: 22000,
    ciudad: 'Monterrey',
    estado: 'N.L.',
    estatus: 'disponible',
    imagenes: [demoCatalogContent.heroImage],
    meta_tags: {
      body_shape: 'Coupe',
      motor: '3.0 Turbo',
      traccion: 'Trasera',
      asientos: '4',
    },
    combustible: 'Gasolina',
    transmision: 'Automática',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    descripcion:
      'Unidad demo generada para poblar la vitrina visual del lote y mostrar la experiencia completa.',
  };

  const expanded = [...autosWithGalleries];

  for (let index = autosWithGalleries.length; index < targetCount; index += 1) {
    const seed = demoVehicleSeeds[index % demoVehicleSeeds.length];

    expanded.push({
      ...baseAuto,
      ...seed,
      id: `${baseAuto.id}-demo-${index + 1}`,
      created_at: new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      anio: (seed.anio ?? baseAuto.anio ?? 2021) - (index % 3),
      moneda: baseAuto.moneda ?? 'MXN',
      ciudad: baseAuto.ciudad ?? 'Monterrey',
      estado: baseAuto.estado ?? 'N.L.',
      estatus: 'disponible',
      descripcion:
        'Unidad demo fabricada para visualizar mejor el inventario. Puedes reemplazarla por autos reales desde el panel admin.',
    });
  }

  return expanded;
}

export function usePublicInventory(tenantId, { includeDemoAutos = false } = {}) {
  const [autos, setAutos] = useState([]);
  const [loadingAutos, setLoadingAutos] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadAutos() {
      if (!tenantId) {
        setAutos([]);
        setLoadingAutos(false);
        return;
      }

      setLoadingAutos(true);

      const [{ data, error }, { data: rankingData }] = await Promise.all([
        supabase
          .from('inventario')
          .select(
            'id, lote_id, marca, modelo, anio, version, precio, moneda, kilometraje, ciudad, estado, estatus, destacado, imagenes, meta_tags, combustible, transmision, descripcion, created_at',
          )
          .eq('lote_id', tenantId)
          .eq('estatus', 'disponible')
          .order('created_at', { ascending: false }),
        supabase.rpc('get_public_inventory_ranking', {
          p_lote_id: tenantId,
          p_limit: 12,
        }),
      ]);

      if (!ignore) {
        const ranking = new Map(
          (rankingData ?? []).map((entry, index) => [entry.inventario_id, index]),
        );
        const orderedAutos = [...(data ?? [])].sort((left, right) => {
          const leftRank = ranking.get(left.id) ?? Number.MAX_SAFE_INTEGER;
          const rightRank = ranking.get(right.id) ?? Number.MAX_SAFE_INTEGER;

          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }

          if (Boolean(left.destacado) !== Boolean(right.destacado)) {
            return left.destacado ? -1 : 1;
          }

          return new Date(right.created_at ?? 0) - new Date(left.created_at ?? 0);
        });

        setAutos(error ? [] : orderedAutos);
        setLoadingAutos(false);
      }
    }

    loadAutos();

    return () => {
      ignore = true;
    };
  }, [tenantId]);

  const visibleAutos = useMemo(
    () => (includeDemoAutos ? expandDemoAutos(autos, 12) : autos.map((auto) => ensureMinimumGallery(auto))),
    [autos, includeDemoAutos],
  );

  const maxBudget = useMemo(() => {
    const prices = visibleAutos.map((auto) => Number(auto.precio ?? 0)).filter(Boolean);

    if (!prices.length) {
      return 1200000;
    }

    return Math.ceil(Math.max(...prices) / 100000) * 100000;
  }, [visibleAutos]);

  return { autos: visibleAutos, loadingAutos, maxBudget };
}
