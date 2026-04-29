import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug, tenant } = useTenantTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const destination = location.state?.from?.pathname ?? `/${slug}/admin`;

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    navigate(destination, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>{tenant?.nombre ?? 'Lote'} | Admin</title>
      </Helmet>
      <main className="app-shell admin-shell">
        <section className="auth-shell">
          <form className="form-card stack-md auth-card-premium" onSubmit={handleLogin}>
            <BrandLogo
              src={demoCatalogContent.logos.header}
              alt={`${tenant?.nombre ?? 'Lote'} logo`}
              brand={tenant?.nombre ?? demoCatalogContent.brand.wordmark}
              submark="Acceso admin"
              className="admin-brand-image"
              compact
            />
            <div className="tenant-badge">
              <LockKeyhole size={18} />
              Acceso protegido del lote
            </div>
            <div className="stack-sm">
              <h1 className="heading-lg">Entra al dashboard del lote.</h1>
              <p className="muted">
                Usa la cuenta asignada al equipo para publicar autos, actualizar fichas y ordenar
                las imágenes visibles en la experiencia pública.
              </p>
            </div>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {errorMessage ? <div className="muted">{errorMessage}</div> : null}
            <button className="btn" disabled={isLoading} type="submit">
              <LogIn size={18} />
              {isLoading ? 'Entrando...' : 'Entrar al panel'}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
