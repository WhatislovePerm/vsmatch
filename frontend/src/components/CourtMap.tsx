import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import type { Court } from '../types';

interface Props {
  courts: Court[];
  selectedId: string | null;
  onSelect: (c: Court) => void;
}

const MOSCOW_CENTER: [number, number] = [55.83, 37.52];

export function CourtMap({ courts, selectedId, onSelect }: Props) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={12} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {courts.map((c) => {
        const active = c.id === selectedId;
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lon]}
            radius={active ? 10 : 7}
            pathOptions={{
              color: active ? '#fff' : '#22c55e',
              weight: active ? 3 : 1,
              fillColor: active ? '#16a34a' : c.isFree ? '#22c55e' : '#ef4444',
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelect(c) }}
          />
        );
      })}
    </MapContainer>
  );
}
