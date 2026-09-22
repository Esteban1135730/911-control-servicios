import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import { api, whatsappAlert } from '../api/client';

type Dashboard = {
  kpis: {
    openNow: number;
    closedToday: number;
    driversActive: number;
    hoursThisMonth: number;
    alertThresholdHours: number;
    alertsCount: number;
  };
  openServices: Array<{
    id: string;
    startedAt: string;
    openHours: number;
    alertOpen: boolean;
    startLat: number;
    startLng: number;
    driver: { id: string; fullName: string; phone: string };
  }>;
  charts: {
    last14Days: Array<{ day: string; count: number; hours: number }>;
    topDriversMonth: Array<{ fullName: string; hours: number; services: number }>;
  };
};

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Dashboard>('/api/admin/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="card">{error}</div>;
  if (!data) return <div className="card">Cargando dashboard…</div>;

  const days = data.charts.last14Days.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="stack">
      <div>
        <h1 className="brand-font" style={{ marginBottom: 0 }}>Dashboard</h1>
        <p className="muted">Vista operativa de 911 Transportes Especiales</p>
      </div>

      <div className="grid-kpis">
        <div className="kpi"><div className="label">Abiertos ahora</div><div className="value">{data.kpis.openNow}</div></div>
        <div className="kpi"><div className="label">Cerrados hoy</div><div className="value">{data.kpis.closedToday}</div></div>
        <div className="kpi"><div className="label">Conductores activos</div><div className="value">{data.kpis.driversActive}</div></div>
        <div className="kpi"><div className="label">Horas del mes</div><div className="value">{data.kpis.hoursThisMonth.toFixed(1)}</div></div>
      </div>

      {data.kpis.alertsCount > 0 && (
        <div className="card" style={{ borderColor: '#fecaca' }}>
          <h3 className="brand-font" style={{ marginTop: 0 }}>Alertas (&gt; {data.kpis.alertThresholdHours}h abiertos)</h3>
          <div className="stack">
            {data.openServices.filter((s) => s.alertOpen).map((s) => (
              <div key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{s.driver.fullName}</strong>
                  <div className="muted">{s.openHours.toFixed(2)} h · desde {new Date(s.startedAt).toLocaleString('es-CO')}</div>
                </div>
                <div className="row">
                  <Link className="btn btn-ghost" to={`/admin/servicios/${s.id}`}>Ver</Link>
                  <a
                    className="btn btn-success"
                    target="_blank"
                    rel="noreferrer"
                    href={whatsappAlert(s.driver.phone, {
                      driverName: s.driver.fullName,
                      startedAt: s.startedAt,
                      openHours: s.openHours,
                      lat: s.startLat,
                      lng: s.startLng,
                    })}
                  >
                    Avisar WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="brand-font" style={{ marginTop: 0 }}>Servicios y horas (14 días)</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="count" name="Servicios" stroke="#1e6fff" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="hours" name="Horas" stroke="#00c8f0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="brand-font" style={{ marginTop: 0 }}>Top conductores del mes (horas)</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data.charts.topDriversMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="fullName" hide={data.charts.topDriversMonth.length > 6} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" name="Horas" fill="#1e6fff" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 className="brand-font" style={{ margin: 0 }}>Servicios abiertos</h3>
          <Link to="/admin/servicios" className="btn btn-ghost">Ver todos</Link>
        </div>
        <div className="table-wrap" style={{ marginTop: '0.8rem' }}>
          <table>
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Inicio</th>
                <th>Horas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.openServices.map((s) => (
                <tr key={s.id}>
                  <td>{s.driver.fullName} {s.alertOpen && <span className="badge badge-ALERT">ALERTA</span>}</td>
                  <td>{new Date(s.startedAt).toLocaleString('es-CO')}</td>
                  <td>{s.openHours.toFixed(2)}</td>
                  <td><Link to={`/admin/servicios/${s.id}`}>Detalle</Link></td>
                </tr>
              ))}
              {data.openServices.length === 0 && (
                <tr><td colSpan={4} className="muted">No hay servicios abiertos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
