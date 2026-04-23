import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const defaultTheme = {
  brandName: 'Car Saler',
  primary: '#c44900',
  secondary: '#1b1f3b',
  accent: '#ffd166',
  surface: '#fffaf5',
  text: '#12131a',
  muted: '#61657a',
  logoUrl: '',
};

const ThemeContext = createContext({
  isLoading: true,
  theme: defaultTheme,
  tenant: null,
  slug: '',
  refreshTenant: async () => {},
});

function applyThemeVariables(theme) {
  const root = document.documentElement;

  root.style.setProperty('--brand-primary', theme.primary);
  root.style.setProperty('--brand-secondary', theme.secondary);
  root.style.setProperty('--brand-accent', theme.accent);
  root.style.setProperty('--brand-surface', theme.surface);
  root.style.setProperty('--brand-text', theme.text);
  root.style.setProperty('--brand-muted', theme.muted);
  root.style.setProperty(
    '--tenant-logo-url',
    theme.logoUrl ? `url("${theme.logoUrl}")` : 'none',
  );
}

function normalizeTheme(configEstetica) {
  const normalizedConfig = configEstetica ?? {};

  return {
    brandName: normalizedConfig.nombre_marca ?? defaultTheme.brandName,
    primary: normalizedConfig.color_primario ?? defaultTheme.primary,
    secondary: normalizedConfig.color_secundario ?? defaultTheme.secondary,
    accent: normalizedConfig.color_acento ?? defaultTheme.accent,
    surface: normalizedConfig.color_superficie ?? defaultTheme.surface,
    text: normalizedConfig.color_texto ?? defaultTheme.text,
    muted: normalizedConfig.color_muted ?? defaultTheme.muted,
    logoUrl: normalizedConfig.logo_url ?? '',
  };
}

export function ThemeProvider({ children }) {
  const { slug = '' } = useParams();
  const [tenant, setTenant] = useState(null);
  const [theme, setTheme] = useState(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenant = useCallback(async () => {
    if (!slug) {
      setTenant(null);
      setTheme(defaultTheme);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from('lotes')
      .select('id, nombre, slug, whatsapp, telefono, facebook_page_id, config_estetica')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.warn('Unable to load tenant theme.', error);
      setTenant(null);
      setTheme(defaultTheme);
      setIsLoading(false);
      return;
    }

    setTenant(data ?? null);
    setTheme(normalizeTheme(data?.config_estetica));
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  useEffect(() => {
    applyThemeVariables(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      isLoading,
      theme,
      tenant,
      slug,
      refreshTenant: fetchTenant,
    }),
    [isLoading, tenant, theme, slug, fetchTenant],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTenantTheme() {
  return useContext(ThemeContext);
}
