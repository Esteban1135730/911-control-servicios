import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Driver = {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  active: boolean;
  hourlyRate?: number | null;
};

export function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    hourlyRate: '',
  });
  const [msg, setMsg] = useState('');

  const load = () => api<Driver[]>('/api/users?role=DRIVER').then(setDrivers);

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        role: 'DRIVER',
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      }),
    });
    setForm({ username: '', password: '', fullName: '', phone: '', hourlyRate: '' });
    setMsg('Conductor creado');
    await load();
  };

  const toggle = async (d: Driver) => {
    await api(`/api/users/${d.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !d.active }),
    });
    await load();
  };

  return (
    <div className="stack">
      <div>
        <h1 className="brand-font" style={{ marginBottom: 0 }}>Conductores</h1>
        <p className="muted">Alta y gestión de usuarios conductores</p>
      </div>

      <form className="card" onSubmit={create}>
        <h3 className="brand-font" style={{ marginTop: 0 }}>Nuevo conductor</h3>
        <div className="filters">
          <div className="field"><label>Nombre</label><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="field"><label>Usuario</label><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div className="field"><label>Contraseña</label><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="field"><label>Teléfono</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label>Tarifa/hora (opc.)</label><input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary">Crear</button>
        {msg && <p className="muted">{msg}</p>}
      </form>

      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Teléfono</th>
              <th>Tarifa/h</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.fullName}</td>
                <td>{d.username}</td>
                <td>{d.phone}</td>
                <td>{d.hourlyRate != null ? Number(d.hourlyRate).toLocaleString('es-CO') : '—'}</td>
                <td>{d.active ? 'Activo' : 'Inactivo'}</td>
                <td>
                  <button className="btn btn-ghost" onClick={() => toggle(d)}>
                    {d.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
