import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { demoCatalogContent } from './demoCatalogContent.js';

function commonsImage(filePath) {
  return `https://upload.wikimedia.org/wikipedia/commons/${filePath}`;
}

function galleryKey(marca, modelo) {
  return `${marca ?? ''} ${modelo ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const demoModelGalleries = {
  'mazda cx-5': [
    'f/f8/Mazda_CX-5_%28KF%29_Facelift_1X7A0331_%282%29.jpg',
    'e/ec/2022_Mazda_CX-5_2.0_front.jpg',
    'f/f5/2022_Mazda_CX-5_2.0_back.jpg',
    '8/8e/2022_Mazda_CX-5_Preferred_%28facelift%29%2C_rear_6.21.22.jpg',
  ],
  'ford ranger': [
    'c/c1/2020_Ford_Ranger_Wildtrak_second_facelift_front.jpg',
    '1/16/2020_Ford_Ranger_Wildtrak_second_facelift_rear.jpg',
    'd/d5/20200526_Ford_Ranger_XLT.jpg',
    'd/de/2020_Ford_Ranger_Raptor_Front.jpg',
  ],
  'bmw m2 competition': [
    'f/f2/BMW_M2_at_the_2025_Adelaide_Grand_Final_Parade.jpg',
    '6/6f/BMW_M2_CS_%28G87%29_DSC_9730.jpg',
    '4/42/BMW_M2_CS_%28G87%29_DSC_9723.jpg',
    'e/ed/BMW_G87_M2_1X7A6997.jpg',
  ],
  'audi rs5 sportback': [
    '9/9f/Audi_RS5_Sportback_5F_FL_IMG_8131.jpg',
    '8/8f/Audi_RS5%2C_Binz_%28P1090702%29.jpg',
    'f/f1/Audi_RS5_Coup%C3%A9_8T_IMG_3030_%28cropped%29.jpg',
    'a/a1/Abt_Sportsline%2C_GIMS_2018%2C_Le_Grand-Saconnex_%281X7A1459%29.jpg',
  ],
  'mercedes-benz glb 250': [
    '3/38/Mercedes-AMG_GLB_35_4MATIC_%28X247%29_%282023%29_IMG_9649.jpg',
    '0/02/Mercedes-AMG_GLB_35_4MATIC_%28X247%29_%282023%29_IMG_9652.jpg',
    '8/88/MERCEDES-BENZ_GLB_China_%283%29.jpg',
    '2/2b/MERCEDES-BENZ_GLB_China.jpg',
  ],
  'ford mustang gt': [
    '5/5d/2018_Ford_Mustang_GT_5.0_Front.jpg',
    'b/b5/2018_Ford_Mustang_GT_5.0_Rear.jpg',
    '7/72/2024_Ford_Mustang_GT%2C_Kingsville%2C_Ontario%2C_2025-06-29.jpg',
    '4/44/Kissingen_Ford_GT_5.0_Mustang_0417RM0283.jpg',
  ],
  'porsche 911 carrera': [
    'b/b8/Porsche_992_Carrera_S_coupe_IMG_5838.jpg',
    '3/38/Porsche_992_Carrera_S_coupe_IMG_5832.jpg',
    '7/7e/Porsche_992_Carrera_S_coupe_IMG_5847.jpg',
    'c/c5/Porsche_992_Carrera_S_coupe_IMG_5843.jpg',
  ],
  'lamborghini huracan': [
    'a/ac/Lamborghini_Huracan_Performante%2C_IAA_2017%2C_Frankfurt_%281Y7A2827%29.jpg',
    '6/61/Lamborghini_Hurac%C3%A1n_Tecnica_1X7A7430.jpg',
    '3/3e/Lamborghini_Hurac%C3%A1n_Tecnica_1X7A7432.jpg',
    '6/68/Lamborghini_Huracan_STO_1X7A0297.jpg',
  ],
  'bmw x5 m': [
    '4/4e/BMW_X5_M_%28G05%29_1X7A7047.jpg',
    '3/31/BMW_X5_M_%2873885%29.jpg',
    '2/2b/BMW_X5_M_%28F15%29_China.jpg',
    '4/4b/BMW_X5_M_%28F15%29_China_%282%29.jpg',
  ],
  'audi q8': [
    '3/30/Audi_Q8%2C_Paris_Motor_Show_2018%2C_Paris_%281Y7A1776%29.jpg',
    '2/22/Audi_Q8_1X7A6004.jpg',
    'e/e8/Audi_Q8_Facelift_DSC_7380.jpg',
    'f/ff/Audi_Q8_Facelift_DSC_7381.jpg',
  ],
  'chevrolet corvette': [
    '4/4b/Chevrolet_Corvette_C8_IAA_2021_1X7A0156.jpg',
    '3/33/Chevrolet_Corvette_C8_IMG_8837.jpg',
    '2/2a/Prichsenstadt_Chevrolet_Corvette_C8-20230423-RM-164415.jpg',
    '1/17/Chevrolet_Corvette_C8_IMG_2537.jpg',
  ],
  'mercedes-benz amg gt': [
    '5/57/Mercedes-AMG_C192_1X7A0832.jpg',
    'f/fe/Mercedes-AMG_GT_63_S_%28Facelift%29_1X7A7353.jpg',
    '5/5a/Mercedes-AMG_GT_Black_Series_IMG_0324.jpg',
    'e/e5/Mercedes-AMG_GT_Black_Series_IMG_0331.jpg',
  ],
};

Object.keys(demoModelGalleries).forEach((key) => {
  demoModelGalleries[key] = demoModelGalleries[key].map(commonsImage);
});

function modelGallery(marca, modelo) {
  return demoModelGalleries[galleryKey(marca, modelo)] ?? [];
}

function ensureMinimumGallery(auto) {
  const curatedGallery = modelGallery(auto?.marca, auto?.modelo);

  if (curatedGallery.length) {
    return { ...auto, imagenes: curatedGallery };
  }

  const images = Array.isArray(auto?.imagenes) ? auto.imagenes.filter(Boolean) : [];
  return { ...auto, imagenes: images };
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
    imagenes: modelGallery('BMW', 'M2 Competition'),
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
    imagenes: modelGallery('Audi', 'RS5 Sportback'),
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
    imagenes: modelGallery('Mercedes-Benz', 'GLB 250'),
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
    imagenes: modelGallery('Ford', 'Mustang GT'),
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
    imagenes: modelGallery('Porsche', '911 Carrera'),
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
    imagenes: modelGallery('Lamborghini', 'Huracán'),
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
    imagenes: modelGallery('BMW', 'X5 M'),
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
    imagenes: modelGallery('Audi', 'Q8'),
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
    imagenes: modelGallery('Chevrolet', 'Corvette'),
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
    imagenes: modelGallery('Mercedes-Benz', 'AMG GT'),
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
