import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, mapsLink, whatsappAlert } from '../api/client';
import { ServiceMap } from '../components/ServiceMap';

type Service = {
  id: string;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  hoursWorked?: number | null;
  openHours?: number | null;
  startLat: number;
  startLng: number;
  endLat?: number | null;
  endLng?: number | null;
  startNote?: string | null;
  endNote?: string | null;
  adminNotes?: string | null;
  startPhotoUrl: string;
  endPhotoUrl?: string | null;
  driver: { id: string; fullName: string; phone: string; hourlyRate?: number | null };
};

export function AdminServiceDetailPage() {
  const { id } = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState('IN_REVIEW');
  const [msg, setMsg] = useState('');

  const load = () =>
    api<Service>(`/api/services/${id}`).then((s) => {
      setService(s);
      setAdminNotes(s.adminNotes || '');
      setStatus(s.status === 'OPEN' ? 'IN_REVIEW' : s.status);
    });

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, [id]);

  const review = async (e: FormEvent) => {
    e.preventDefault();
    await api(`/api/services/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNotes }),
    });
    setMsg('Revisión guardada');
    await load();
  };

  if (!service) return <div className="card">{msg || 'Cargando…'}</div>;

  const amount =
    service.hoursWorked != null && service.driver.hourlyRate != null
      ? Number(service.hoursWorked) * Number(service.driver.hourlyRate)
      : null;

  return (
    <div className="stack">
      <Link to="/admin/servicios" className="muted">← Volver a servicios</Link>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 className="brand-font" style={{ marginBottom: 0 }}>{service.driver.fullName}</h1>
          <p className="muted">Detalle del servicio · <span className={`badge badge-${service.status}`}>{service.status}</span></p>
        </div>
        {service.status === 'OPEN' && (
          <a
            className="btn btn-success"
            target="_blank"
            rel="noreferrer"
            href={whatsappAlert(service.driver.phone, {
              driverName: service.driver.fullName,
              startedAt: service.startedAt,
              openHours: service.openHours || 0,
              lat: service.startLat,
              lng: service.startLng,
            })}
          >
            Avisar WhatsApp
          </a>
        )}
      </div>

      <div className="grid-kpis">
        <div className="kpi"><div className="label">Inicio</div><div className="value" style={{ fontSize: '1rem', color: 'var(--charcoal)', background: 'none' }}>{new Date(service.startedAt).toLocaleString('es-CO')}</div></div>
        <div className="kpi"><div className="label">Fin</div><div className="value" style={{ fontSize: '1rem', color: 'var(--charcoal)', background: 'none' }}>{service.endedAt ? new Date(service.endedAt).toLocaleString('es-CO') : 'En curso'}</div></div>
        <div className="kpi"><div className="label">Horas</div><div className="value">{service.hoursWorked != null ? Number(service.hoursWorked).toFixed(2) : (service.openHours?.toFixed(2) || '—')}</div></div>
        <div className="kpi"><div className="label">Monto est.</div><div className="value">{amount != null ? `$${amount.toLocaleString('es-CO')}` : '—'}</div></div>
      </div>

      <div className="card">
        <h3 className="brand-font" style={{ marginTop: 0 }}>Mapa inicio / fin</h3>
        <ServiceMap
          start={{ lat: service.startLat, lng: service.startLng, label: 'Inicio' }}
          end={service.endLat != null && service.endLng != null ? { lat: service.endLat, lng: service.endLng, label: 'Fin' } : null}
        />
        <div className="row" style={{ marginTop: '0.7rem' }}>
          <a target="_blank" rel="noreferrer" href={mapsLink(service.startLat, service.startLng)}>Abrir inicio en mapa</a>
          {service.endLat != null && service.endLng != null && (
            <a target="_blank" rel="noreferrer" href={mapsLink(service.endLat, service.endLng)}>Abrir fin en mapa</a>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="brand-font" style={{ marginTop: 0 }}>Evidencias fotográficas</h3>
        <div className="photo-grid">
          <div>
            <div className="muted">Inicio</div>
            <img src={service.startPhotoUrl} alt="Inicio" />
          </div>
          <div>
            <div className="muted">Cierre</div>
            {service.endPhotoUrl ? <img src={service.endPhotoUrl} alt="Cierre" /> : <p className="muted">Pendiente</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="brand-font" style={{ marginTop: 0 }}>Notas</h3>
        <p><strong>Inicio:</strong> {service.startNote || '—'}</p>
        <p><strong>Cierre:</strong> {service.endNote || '—'}</p>
      </div>

      {service.status !== 'OPEN' && (
        <form className="card" onSubmit={review}>
          <h3 className="brand-font" style={{ marginTop: 0 }}>Revisión administrativa</h3>
          <div className="field">
            <label>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="IN_REVIEW">En revisión</option>
              <option value="APPROVED">Aprobado</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </div>
          <div className="field">
            <label>Observaciones del servicio</label>
            <textarea rows={4} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary">Guardar revisión</button>
          {msg && <p className="muted">{msg}</p>}
        </form>
      )}
    </div>
  );
}
