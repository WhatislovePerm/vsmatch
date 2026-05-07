import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';
import type { Court } from '../types';

interface Props {
  courts: Court[];
  selectedId: string | null;
  onSelect: (c: Court) => void;
}

const MOSCOW_CENTER: [number, number] = [55.83, 37.52];

function makeIcon(isFree: boolean, active: boolean): L.DivIcon {
  const cls = [
    'court-marker__pin',
    isFree ? 'court-marker__pin--free' : 'court-marker__pin--busy',
    active && 'court-marker__pin--active',
  ]
    .filter(Boolean)
    .join(' ');

  // SVG ножка ("⚽")
  const html = `<div class="${cls}" aria-hidden="true">⚽</div>`;
  const size = active ? 36 : 28;
  return L.divIcon({
    className: 'court-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function CourtMap({ courts, selectedId, onSelect }: Props) {
  // Кэшируем иконки чтобы не плодить тонны DivIcon
  const icons = useMemo(() => {
    return {
      free: makeIcon(true, false),
      busy: makeIcon(false, false),
      freeActive: makeIcon(true, true),
      busyActive: makeIcon(false, true),
    };
  }, []);

  return (
    <MapContainer
      center={MOSCOW_CENTER}
      zoom={12}
      className="absolute inset-0"
      scrollWheelZoom
      zoomControl={true}
    >
      {/* Carto Voyager — светлые читаемые тайлы */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      {courts.map((c) => {
        const active = c.id === selectedId;
        const icon = c.isFree
          ? active ? icons.freeActive : icons.free
          : active ? icons.busyActive : icons.busy;
        return (
          <Marker
            key={c.id}
            position={[c.lat, c.lon]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(c) }}
          />
        );
      })}
    </MapContainer>
  );
}
