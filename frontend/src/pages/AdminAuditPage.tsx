import { useEffect, useState } from 'react';
import { api } from '../api/client';

type Log = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  details?: unknown;
  user?: { fullName: string; username: string } | null;
};

export function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    api<Log[]>('/api/admin/audit?limit=100').then(setLogs);
  }, []);

  return (
    <div className="stack">
      <div>
        <h1 className="brand-font" style={{ marginBottom: 0 }}>Auditoría</h1>
        <p className="muted">Quién modificó qué y cuándo</p>
      </div>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.createdAt).toLocaleString('es-CO')}</td>
                <td>{l.user?.fullName || '—'}</td>
                <td>{l.action}</td>
                <td>{l.entity}</td>
                <td className="muted">{l.entityId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
