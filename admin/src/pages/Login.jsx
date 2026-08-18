import { useState } from 'react';
import { ArrowRight, Eye, Lock, Mail, Moon, SquareTerminal, Sun } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/useAuth.js';
import { useTheme } from '../lib/useTheme.js';

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!auth.booting && auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await auth.login(email, password);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <button className="theme-toggle" type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark"><SquareTerminal size={28} /></div>
        <h1 id="login-title">Portfolio CMS</h1>
        <p>Sign in to manage your professional presence</p>

        <form className="login-card" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">Email Address</label>
          <div className="field-control">
            <Mail size={20} />
            <input
              id="email"
              type="email"
              placeholder="xxx@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="password">Password</label>
          </div>
          <div className="field-control">
            <Lock size={20} />
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <Eye size={20} />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="primary-black" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login to Console'}
            <ArrowRight size={22} />
          </button>
        </form>
      </section>
    </main>
  );
}
