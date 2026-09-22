import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { listJobs, syncJobs } from '../utils/offlineQueue';

type Service = {
  id: string;
  status: string;
  startedAt: string;
  hoursWorked?: number | null;
};

export function DriverHomePage() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<Service | null>(null);
  const [history, setHistory] = useState<Service[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [a, h, jobs] = await Promise.all([
      api<Service | null>('/api/services/mine/active'),
      api<Service[]>('/api/services/mine'),
      listJobs(),
    ]);
    setActive(a);
    setHistory(h);
    setPending(jobs.length);
  };

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (online && token && pending > 0) {
      syncJobs(token).then(async () => {
        setMsg('Cola offline sincronizada');
        await load();
      });
    }
  }, [online, token]);

  return (
    <div className="driver-home">
      <header className="topbar" style={{ margin: '0 -1rem 1rem', borderRadius: 0 }}>
        <div className="topbar-brand">
          <img src="/logo.jpeg" alt="911" />
          <div>
            <strong>{user?.fullName}</strong>
            <span>Conductor</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => { logout(); navigate('/login'); }}>Salir</button>
      </header>

      {!online && <div className="offline-banner">Sin conexión: las acciones se guardarán y se enviarán al volver la red.</div>}
      {pending > 0 && <div className="offline-banner">Pendientes por sincronizar: {pending}</div>}
      {msg && <div className="toast">{msg}</div>}

      <div className="hero-status">
        <h2 className="brand-font">{active ? 'Servicio en curso' : 'Sin servicio activo'}</h2>
        <p>
          {active
            ? `Iniciado ${new Date(active.startedAt).toLocaleString('es-CO')}`
            : 'Puedes iniciar un nuevo servicio con foto y ubicación.'}
        </p>
      </div>

      <div className="stack" style={{ marginTop: '1rem' }}>
        {!active ? (
          <Link className="btn btn-primary btn-block" to="/iniciar">Iniciar servicio</Link>
        ) : (
          <Link className="btn btn-primary btn-block" to={`/cerrar/${active.id}`}>Cerrar servicio</Link>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.2rem' }}>
        <h3 className="brand-font" style={{ marginTop: 0 }}>Últimos servicios</h3>
        {history.length === 0 && <p className="muted">Aún no hay registros.</p>}
        <div className="stack">
          {history.slice(0, 8).map((s) => (
            <div key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div>{new Date(s.startedAt).toLocaleString('es-CO')}</div>
                <small className="muted">{s.hoursWorked != null ? `${Number(s.hoursWorked).toFixed(2)} h` : 'En curso'}</small>
              </div>
              <span className={`badge badge-${s.status}`}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
