import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MlMap, Marker as MlMarker } from 'maplibre-gl';
import type { Court } from '../types';

interface Props {
  courts: Court[];
  selectedId: string | null;
  onSelect: (c: Court) => void;
}

const MOSCOW_CENTER: [number, number] = [37.52, 55.83]; // [lon, lat]

// OpenFreeMap Positron — светлый минималистичный стиль, без API-ключа, OSS.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

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
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: MOSCOW_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    return () => {
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
