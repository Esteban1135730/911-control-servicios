import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadExcel, whatsappAlert } from '../api/client';

type Item = {
  id: string;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  hoursWorked?: number | null;
  openHours?: number | null;
  alertOpen?: boolean;
  startLat: number;
  startLng: number;
  driver: { fullName: string; phone: string; id: string };
};

type Drivers = Array<{ id: string; fullName: string }>;

export function AdminServicesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [drivers, setDrivers] = useState<Drivers>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    driverId: '',
    status: '',
    from: '',
    to: '',
    q: '',
  });
  const [error, setError] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    params.set('pageSize', '50');
    const data = await api<{ items: Item[]; total: number }>(`/api/services?${params}`);
    setItems(data.items);
    setTotal(data.total);
  };

  useEffect(() => {
    api<Drivers>('/api/users?role=DRIVER').then(setDrivers).catch(() => undefined);
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 className="brand-font" style={{ marginBottom: 0 }}>Servicios</h1>
          <p className="muted">{total} registros con filtros actuales</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
            downloadExcel(params).catch((e) => setError(e.message));
          }}
        >
          Exportar Excel
        </button>
      </div>

      <div className="card">
        <div className="filters">
          <div className="field">
            <label>Conductor</label>
            <select value={filters.driverId} onChange={(e) => setFilters({ ...filters, driverId: e.target.value })}>
              <option value="">Todos</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Todos</option>
              <option value="OPEN">Abierto</option>
              <option value="IN_REVIEW">En revisión</option>
              <option value="APPROVED">Aprobado</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </div>
          <div className="field">
            <label>Desde</label>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div className="field">
            <label>Buscar</label>
            <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Nota, conductor…" />
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => load().catch((e) => setError(e.message))}>Aplicar filtros</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Conductor</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Horas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.driver.fullName}{' '}
                  {s.alertOpen && <span className="badge badge-ALERT">ALERTA</span>}
                </td>
                <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                <td>{new Date(s.startedAt).toLocaleString('es-CO')}</td>
                <td>{s.endedAt ? new Date(s.endedAt).toLocaleString('es-CO') : '—'}</td>
                <td>
                  {s.hoursWorked != null
                    ? Number(s.hoursWorked).toFixed(2)
                    : s.openHours != null
                      ? `${s.openHours.toFixed(2)} (abierto)`
                      : '—'}
                </td>
                <td className="row">
                  <Link to={`/admin/servicios/${s.id}`}>Ver</Link>
                  {s.status === 'OPEN' && (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={whatsappAlert(s.driver.phone, {
                        driverName: s.driver.fullName,
                        startedAt: s.startedAt,
                        openHours: s.openHours || 0,
                        lat: s.startLat,
                        lng: s.startLng,
                      })}
                    >
                      WhatsApp
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
