import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTenantTheme } from '../styles/themeContext.jsx';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { slug, tenant, isLoading: tenantLoading } = useTenantTheme();
  const [status, setStatus] = useState({
    isLoading: true,
    hasSession: false,
    hasAccess: false,
  });

  useEffect(() => {
    let ignore = false;

    async function verifyAccess() {
      if (tenantLoading) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !tenant?.id) {
        if (!ignore) {
          setStatus({ isLoading: false, hasSession: false, hasAccess: false });
        }
        return;
      }

      if (session.user.app_metadata?.platform_role === 'super_admin') {
        if (!ignore) {
          setStatus({
            isLoading: false,
            hasSession: true,
            hasAccess: true,
          });
        }
        return;
      }

      const { data, error } = await supabase
        .from('lote_usuarios')
        .select('role')
        .eq('lote_id', tenant.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!ignore) {
        setStatus({
          isLoading: false,
          hasSession: true,
          hasAccess: !error && Boolean(data),
        });
      }
    }

    verifyAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      verifyAccess();
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [slug, tenant?.id, tenantLoading]);

  if (tenantLoading || status.isLoading) {
    return <div className="loading-state">Validando acceso del lote...</div>;
  }

  if (!status.hasSession) {
    return <Navigate to={`/${slug}/admin/login`} state={{ from: location }} replace />;
  }

  if (!status.hasAccess) {
    return (
      <div className="panel-card stack-sm">
        <div className="tenant-badge">
          <ShieldCheck size={18} />
          Acceso restringido
        </div>
        <p className="muted">
          Tu cuenta está autenticada, pero no tiene permisos sobre este lote.
        </p>
      </div>
    );
  }

  return children;
}
