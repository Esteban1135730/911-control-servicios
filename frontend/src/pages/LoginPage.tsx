import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username.trim(), password);
      setSession(data.token, data.user);
      if (data.vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window) {
        localStorage.setItem('vapidPublicKey', data.vapidPublicKey);
      }
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <img src="/logo.jpeg" alt="911 Transportes Especiales S.A.S" />
        <h1 className="brand-font">Control de servicios</h1>
        <p>Ingresa para iniciar, cerrar y revisar jornadas de conductores.</p>
        <div className="field">
          <label>Usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p style={{ color: 'var(--danger)', marginTop: 0 }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Entrando…' : 'Ingresar'}
        </button>
        <p className="muted" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
          Demo: admin / Admin123! · conductor1 / Conductor123!
        </p>
      </form>
    </div>
  );
}
