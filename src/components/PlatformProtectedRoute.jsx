import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export function PlatformProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState({
    isLoading: true,
    hasSession: false,
    isSuperAdmin: false,
  });

  useEffect(() => {
    let ignore = false;

    async function verifyAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!ignore) {
          setStatus({ isLoading: false, hasSession: false, isSuperAdmin: false });
        }
        return;
      }

      const isSuperAdmin = session.user.app_metadata?.platform_role === 'super_admin';

      if (!ignore) {
        setStatus({ isLoading: false, hasSession: true, isSuperAdmin });
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
  }, []);

  if (status.isLoading) {
    return <div className="loading-state">Validando acceso de plataforma...</div>;
  }

  if (!status.hasSession) {
    return <Navigate to="/platform/login" state={{ from: location }} replace />;
  }

  if (!status.isSuperAdmin) {
    return (
      <div className="panel-card stack-sm">
        <div className="tenant-badge">
          <ShieldAlert size={18} />
          Acceso de plataforma restringido
        </div>
        <p className="muted">
          Tu cuenta existe, pero no tiene `app_metadata.platform_role = super_admin`.
        </p>
      </div>
    );
  }

  return children;
}
