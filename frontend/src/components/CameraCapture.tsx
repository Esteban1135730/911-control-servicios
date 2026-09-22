import { useEffect, useRef, useState } from 'react';
import { blobFromCanvas } from '../utils/geo';

type Props = {
  onCapture: (blob: Blob, previewUrl: string) => void;
};

export function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError('No se pudo abrir la cámara. Usa HTTPS o localhost y permite el permiso.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = async () => {
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

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div>
      <div className="camera-box">
        {preview ? <img src={preview} alt="Captura" /> : <video ref={videoRef} playsInline muted />}
      </div>
      {error && <p className="muted">{error}</p>}
      <div className="camera-actions">
        {!preview ? (
          <button type="button" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={!ready} onClick={capture}>
            Tomar foto (cámara en vivo)
          </button>
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
