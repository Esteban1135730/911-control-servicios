const API_BASE = import.meta.env.VITE_API_URL || '';

export type User = {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  role: 'ADMIN' | 'DRIVER';
  hourlyRate?: number | null;
};

function getToken() {
  return localStorage.getItem('token') || '';
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { formData?: FormData } = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!options.formData && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.formData || options.body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error de red');
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res as unknown as T;
}

export async function login(username: string, password: string) {
  return api<{ token: string; user: User; vapidPublicKey: string | null }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function downloadExcel(params: URLSearchParams) {
  const token = getToken();
  return fetch(`${API_BASE}/api/admin/export/excel?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (res) => {
    if (!res.ok) throw new Error('No se pudo exportar');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `911-servicios.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function mapsLink(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export function whatsappAlert(phone: string, service: {
  driverName: string;
  startedAt: string;
  openHours: number;
  lat: number;
  lng: number;
}) {
  const clean = phone.replace(/\D/g, '');
  const withCountry = clean.startsWith('57') ? clean : `57${clean}`;
  const text = encodeURIComponent(
    `Hola ${service.driverName}, te escribe administración 911 Transportes Especiales.\n\n` +
      `Detectamos tu servicio AÚN ABIERTO.\n` +
      `Inicio: ${new Date(service.startedAt).toLocaleString('es-CO')}\n` +
      `Tiempo abierto: ${service.openHours.toFixed(2)} horas\n` +
      `Ubicación inicio: ${mapsLink(service.lat, service.lng)}\n\n` +
      `Por favor cierra el servicio si ya finalizaste. Gracias.`
  );
  return `https://wa.me/${withCountry}?text=${text}`;
}
