import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Building2, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const destination = location.state?.from?.pathname ?? '/platform';

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
        <title>Platform | Superadmin</title>
      </Helmet>
      <main className="app-shell">
        <section className="auth-shell">
          <form className="form-card stack-md" onSubmit={handleLogin}>
            <div className="tenant-badge">
              <Building2 size={18} />
              Platform access
            </div>
            <div className="stack-sm">
              <h1 className="heading-lg">Dashboard central de clientes y lotes.</h1>
              <p className="muted">
                Inicia sesión con tu cuenta `super_admin` para administrar todos los tenants.
              </p>
            </div>
            <div className="field">
              <label htmlFor="platform-email">Correo</label>
              <input
                id="platform-email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="field">
              <label htmlFor="platform-password">Contraseña</label>
              <input
                id="platform-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {errorMessage ? <div className="muted">{errorMessage}</div> : null}
            <button className="btn" disabled={isLoading} type="submit">
              <LogIn size={18} />
              {isLoading ? 'Entrando...' : 'Entrar a plataforma'}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
