import { useEffect, useRef, useState } from 'react';
import { blobFromCanvas } from '../utils/geo';

type Props = {
  onCapture: (blob: Blob, previewUrl: string) => void;
};

/**
 * En HTTPS: cámara en vivo (getUserMedia).
 * En HTTP (demo VPS sin certificado): captura nativa del celular
 * con <input capture>, que sí abre la cámara sin HTTPS.
 */
export function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | 'native'>('live');
  const streamRef = useRef<MediaStream | null>(null);

  const secure = typeof window !== 'undefined' && window.isSecureContext;

  useEffect(() => {
    let cancelled = false;

    if (!secure || !navigator.mediaDevices?.getUserMedia) {
      setMode('native');
      setReady(true);
      setError('');
      return;
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMode('live');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setMode('native');
        setReady(true);
        setError('Cámara en vivo no disponible. Se usará la cámara nativa del celular.');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [secure]);

  const captureLive = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await blobFromCanvas(canvas);
    const url = URL.createObjectURL(blob);
    setPreview(url);
    onCapture(blob, url);
  };

  const onNativeFile = async (file: File | null) => {
    if (!file) return;
    const blob = file.slice(0, file.size, file.type || 'image/jpeg');
    const url = URL.createObjectURL(blob);
    setPreview(url);
    onCapture(blob, url);
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {!secure && (
        <div className="offline-banner">
          Estás en HTTP. La cámara en vivo del navegador requiere HTTPS.
          Por ahora se abre la <strong>cámara nativa</strong> del celular (sirve para la demo).
        </div>
      )}

      <div className="camera-box">
        {preview ? (
          <img src={preview} alt="Captura" />
        ) : mode === 'live' ? (
          <video ref={videoRef} playsInline muted />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#cbd5e1', padding: '1rem', textAlign: 'center' }}>
            Toca el botón para abrir la cámara del teléfono
          </div>
        )}
      </div>

      {error && <p className="muted">{error}</p>}

      {/* capture=environment fuerza cámara trasera en móviles; no abre galería en iOS/Android modernos */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => onNativeFile(e.target.files?.[0] || null)}
      />

      <div className="camera-actions">
        {!preview ? (
          mode === 'live' ? (
            <button type="button" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={!ready} onClick={captureLive}>
              Tomar foto (cámara en vivo)
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{ gridColumn: '1 / -1' }}
              disabled={!ready}
              onClick={() => inputRef.current?.click()}
            >
              Abrir cámara del celular
            </button>
          )
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={retake}>Volver a tomar</button>
            <button type="button" className="btn btn-success" disabled>Foto lista</button>
          </>
        )}
      </div>
    </div>
  );
}
