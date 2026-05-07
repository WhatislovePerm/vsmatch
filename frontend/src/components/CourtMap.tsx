import { useEffect, useRef, useState } from 'react';
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

// Стандартные OSM-тайлы — самые надёжные, бесплатные, работают везде.
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

export function CourtMap({ courts, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Map<string, { marker: MlMarker; el: HTMLDivElement }>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Инициализация карты
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MlMap;
    try {
      map = new maplibregl.Map({
        container,
        style: MAP_STYLE,
        center: MOSCOW_CENTER,
        zoom: 11,
        attributionControl: false,
      });
    } catch (e) {
      setMapError(`Не удалось создать карту: ${(e as Error).message}`);
      return;
    }

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('error', (e) => {
      console.error('[Map error]', e);
      const msg = (e?.error as Error | undefined)?.message ?? 'unknown error';
      setMapError(msg);
    });

    map.on('load', () => {
      // Лог чтобы видеть что карта точно дошла до load
      console.log('[Map] loaded');
      map.resize();
    });

    mapRef.current = map;

    // Авто-resize при изменении размеров контейнера (фикс "0×0 при первом монтаже")
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    // На всякий случай — после следующего тика
    const t = setTimeout(() => map.resize(), 100);

    return () => {
      clearTimeout(t);
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

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {mapError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] max-w-md px-4 py-3 rounded-[14px] bg-danger-bg border border-danger-line text-danger text-[12.5px] shadow-md">
          <div className="font-bold mb-1">Ошибка карты</div>
          <div className="break-words">{mapError}</div>
        </div>
      )}
    </div>
  );
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
