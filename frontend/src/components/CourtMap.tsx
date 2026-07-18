import { useEffect, useRef, useState } from 'react';
import maplibregl, {
  type Map as MlMap,
  type Marker as MlMarker,
  type StyleSpecification,
} from 'maplibre-gl';
import Supercluster from 'supercluster';
import type { Court } from '../types';
import { sportIconSvg } from './icons/sportIcons';

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
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

type ClusterProps = { cluster: true; cluster_id: number; point_count: number };
type PointProps = { courtId: string };

export function CourtMap({ courts, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<MlMarker[]>([]);
  const indexRef = useRef<Supercluster<PointProps> | null>(null);
  const courtsByIdRef = useRef<Map<string, Court>>(new Map());
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /** Полная перерисовка маркеров под текущий вьюпорт: кластеры + отдельные точки. */
  function renderMarkers() {
    const map = mapRef.current;
    const index = indexRef.current;
    if (!map || !index) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const b = map.getBounds();
    const clusters = index.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      Math.floor(map.getZoom()),
    );

    for (const feature of clusters) {
      const [lon, lat] = (feature.geometry as GeoJSON.Point).coordinates;
      const props = feature.properties as ClusterProps | PointProps;

      const wrapper = document.createElement('div');
      wrapper.className = 'court-marker-wrapper';

      if ('cluster' in props && props.cluster) {
        // ── Кластер: кружок с числом, клик = приближение ──
        const el = document.createElement('div');
        const n = props.point_count;
        el.className = `cluster-marker ${n >= 50 ? 'cluster-marker--lg' : n >= 10 ? 'cluster-marker--md' : ''}`;
        el.textContent = n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n);
        wrapper.appendChild(el);
        wrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          const zoom = index.getClusterExpansionZoom(props.cluster_id);
          map.easeTo({ center: [lon, lat], zoom: Math.min(zoom, 18), duration: 400 });
        });
      } else {
        // ── Одиночная площадка ──
        const court = courtsByIdRef.current.get((props as PointProps).courtId);
        if (!court) continue;
        const el = document.createElement('div');
        el.className = markerClass(court, court.id === selectedIdRef.current);
        el.innerHTML = sportIconSvg(court.sport, 17);
        wrapper.appendChild(el);
        wrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRef.current(court);
        });
      }

      markersRef.current.push(
        new maplibregl.Marker({ element: wrapper }).setLngLat([lon, lat]).addTo(map),
      );
    }
  }

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
      setMapError((e?.error as Error | undefined)?.message ?? 'unknown error');
    });

    map.on('load', () => {
      map.resize();
      renderMarkers();
    });
    map.on('moveend', renderMarkers);
    map.on('zoomend', renderMarkers);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    window.addEventListener('resize', () => map.resize());
    const timers = [50, 200, 500, 1000].map((ms) => setTimeout(() => map.resize(), ms));

    return () => {
      timers.forEach(clearTimeout);
      resizeObserver.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Перестройка индекса при смене списка площадок
  useEffect(() => {
    courtsByIdRef.current = new Map(courts.map((c) => [c.id, c]));

    const index = new Supercluster<PointProps>({ radius: 52, maxZoom: 15 });
    index.load(
      courts.map((c) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] },
        properties: { courtId: c.id },
      })),
    );
    indexRef.current = index;
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courts]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 court-map" style={{ width: '100%', height: '100%' }} />
      {mapError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] max-w-md px-4 py-3 rounded-[14px] bg-danger-bg border border-danger-line text-danger text-[12.5px] shadow-md">
          <div className="font-bold mb-1">Ошибка карты</div>
          <div className="break-words">{mapError}</div>
        </div>
      )}
    </>
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
