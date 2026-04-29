import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { demoCatalogContent } from './demoCatalogContent.js';

const demoVehicleSeeds = [
  {
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
    imagenes: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=80',
    ],
  },
  {
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
    imagenes: [
      'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=1400&q=80',
    ],
  },
  {
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
    imagenes: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80',
    ],
  },
  {
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
    imagenes: [
      'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1400&q=80',
    ],
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

export function expandDemoAutos(autos, targetCount = 6) {
  if (autos.length >= targetCount) {
    return autos;
  }

  const baseAuto = autos[0] ?? {
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
    descripcion:
      'Unidad demo generada para poblar la vitrina visual del lote y mostrar la experiencia completa.',
  };

  const expanded = [...autos];

  for (let index = autos.length; index < targetCount; index += 1) {
    const seed = demoVehicleSeeds[index % demoVehicleSeeds.length];

    expanded.push({
      ...baseAuto,
      ...seed,
      id: `${baseAuto.id}-demo-${index + 1}`,
      marca: index % 2 === 0 ? 'BMW' : index % 3 === 0 ? 'Mercedes-Benz' : 'Audi',
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

export function usePublicInventory(tenantId) {
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

      const { data, error } = await supabase
        .from('inventario')
        .select(
          'id, lote_id, marca, modelo, anio, version, precio, moneda, kilometraje, ciudad, estado, estatus, imagenes, meta_tags, combustible, transmision, descripcion',
        )
        .eq('lote_id', tenantId)
        .eq('estatus', 'disponible')
        .order('created_at', { ascending: false });

      if (!ignore) {
        setAutos(error ? [] : data ?? []);
        setLoadingAutos(false);
      }
    }

    loadAutos();

    return () => {
      ignore = true;
    };
  }, [tenantId]);

  const demoAutos = useMemo(() => expandDemoAutos(autos, 6), [autos]);

  const maxBudget = useMemo(() => {
    const prices = demoAutos.map((auto) => Number(auto.precio ?? 0)).filter(Boolean);

    if (!prices.length) {
      return 1200000;
    }

    return Math.ceil(Math.max(...prices) / 100000) * 100000;
  }, [demoAutos]);

  return { autos: demoAutos, loadingAutos, maxBudget };
}
