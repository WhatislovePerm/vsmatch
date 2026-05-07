import { useEffect, useRef } from 'react';
import maplibregl, {
  type Map as MlMap,
  type Marker as MlMarker,
  type StyleSpecification,
} from 'maplibre-gl';
import type { Court } from '../types';

interface Props {
  courts: Court[];
  selectedId: string | null;
  onSelect: (c: Court) => void;
}

const MOSCOW_CENTER: [number, number] = [37.52, 55.83]; // [lon, lat]

// Светлый минималистичный raster-стиль (Carto Positron на основе OSM).
// Никаких внешних style.json — всё инлайн, максимально надёжно.
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-positron': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'carto-positron',
      type: 'raster',
      source: 'carto-positron',
    },
  ],
};

export function CourtMap({ courts, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Map<string, { marker: MlMarker; el: HTMLDivElement }>>(new Map());
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Инициализация карты
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: MOSCOW_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    // Авто-resize при изменении размеров контейнера (фикс "0×0 при первом монтаже")
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Синхронизация маркеров
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const existing = markersRef.current;
      const incomingIds = new Set(courts.map((c) => c.id));

      for (const [id, { marker }] of existing) {
        if (!incomingIds.has(id)) {
          marker.remove();
          existing.delete(id);
        }
      }

      for (const c of courts) {
        const entry = existing.get(c.id);
        if (entry) {
          entry.el.className = markerClass(c, c.id === selectedId);
          continue;
        }

        const el = document.createElement('div');
        el.className = markerClass(c, c.id === selectedId);
        el.textContent = '⚽';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRef.current(c);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([c.lon, c.lat])
          .addTo(map);

        existing.set(c.id, { marker, el });
      }
    };

    if (map.loaded()) apply();
    else map.once('load', apply);
  }, [courts, selectedId]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function markerClass(c: Court, active: boolean): string {
  return [
    'court-marker',
    c.isFree ? 'court-marker--free' : 'court-marker--busy',
    active && 'court-marker--active',
  ]
    .filter(Boolean)
    .join(' ');
}
