import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
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
      <main className="app-shell">
        <section className="auth-shell">
          <form className="form-card stack-md" onSubmit={handleLogin}>
            <div className="tenant-badge">
              <LockKeyhole size={18} />
              Acceso lote admin
            </div>
            <div className="stack-sm">
              <h1 className="heading-lg">Administra el inventario desde tu celular.</h1>
              <p className="muted">
                Ingresa con la cuenta asignada al lote para cargar autos y revisar KPIs.
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
