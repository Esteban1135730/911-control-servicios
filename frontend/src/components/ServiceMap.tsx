import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Props = {
  start: { lat: number; lng: number; label?: string };
  end?: { lat: number; lng: number; label?: string } | null;
};

export function ServiceMap({ start, end }: Props) {
  const center: [number, number] = end
    ? [(start.lat + end.lat) / 2, (start.lng + end.lng) / 2]
    : [start.lat, start.lng];

  return (
    <div className="map-box">
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[start.lat, start.lng]} icon={icon}>
          <Popup>{start.label || 'Inicio'}</Popup>
        </Marker>
        {end && (
          <>
            <Marker position={[end.lat, end.lng]} icon={icon}>
              <Popup>{end.label || 'Fin'}</Popup>
            </Marker>
            <Polyline positions={[[start.lat, start.lng], [end.lat, end.lng]]} color="#1e6fff" />
          </>
        )}
      </MapContainer>
    </div>
  );
}
