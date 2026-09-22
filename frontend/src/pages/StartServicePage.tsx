import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CameraCapture } from '../components/CameraCapture';
import { useAuth } from '../context/AuthContext';
import { getCurrentPosition } from '../utils/geo';
import { enqueueJob } from '../utils/offlineQueue';

export function StartServicePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setError('La foto es obligatoria');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const pos = await getCurrentPosition();
      const clientAt = new Date().toISOString();
      const fd = new FormData();
      fd.append('lat', String(pos.coords.latitude));
      fd.append('lng', String(pos.coords.longitude));
      fd.append('accuracy', String(pos.coords.accuracy));
      if (note) fd.append('note', note);
      fd.append('clientStartedAt', clientAt);
      fd.append('photo', photo, 'start.jpg');

      if (!navigator.onLine) {
        await enqueueJob({
          id: crypto.randomUUID(),
          type: 'start',
          payload: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            note,
            clientAt,
          },
          photoBlob: photo,
          createdAt: clientAt,
        });
        navigate('/');
        return;
      }

      const res = await fetch('/api/services/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo iniciar');
      }
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-home">
      <Link to="/" className="muted">← Volver</Link>
      <h1 className="brand-font">Iniciar servicio</h1>
      <p className="muted">Foto en vivo + ubicación GPS obligatorias.</p>
      <form className="card stack" onSubmit={submit}>
        <CameraCapture onCapture={(blob) => setPhoto(blob)} />
        <div className="field">
          <label>Nota opcional</label>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cliente, ruta, observación…" />
        </div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading || !photo}>
          {loading ? 'Enviando…' : 'Confirmar inicio'}
        </button>
      </form>
    </div>
  );
}
