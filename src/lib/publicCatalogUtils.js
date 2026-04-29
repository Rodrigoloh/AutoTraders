import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { demoCatalogContent } from './demoCatalogContent.js';

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

  const maxBudget = useMemo(() => {
    const prices = autos.map((auto) => Number(auto.precio ?? 0)).filter(Boolean);

    if (!prices.length) {
      return 1200000;
    }

    return Math.ceil(Math.max(...prices) / 100000) * 100000;
  }, [autos]);

  return { autos, loadingAutos, maxBudget };
}
