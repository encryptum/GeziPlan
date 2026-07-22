import { useEffect, useMemo, useRef } from 'react';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RoutePoint } from '../../types';
import { getMapboxToken, hasMapboxToken } from '../../lib/mapbox';

interface MapViewProps {
  route: RoutePoint[];
  routeGeometry?: GeoJSON.LineString;
}

const TURKEY_CENTER = { longitude: 35.2433, latitude: 38.9637, zoom: 5.2 };

function getMarkerColor(index: number, total: number): string {
  if (index === 0) return '#16a34a';
  if (index === total - 1) return '#dc2626';
  return '#2563eb';
}

export default function MapView({ route, routeGeometry }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const token = getMapboxToken();

  const routeFeature = useMemo(() => {
    if (!routeGeometry) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: routeGeometry,
    };
  }, [routeGeometry]);

  const initialView = useMemo(() => {
    if (route.length === 1) {
      return { longitude: route[0].longitude, latitude: route[0].latitude, zoom: 11 };
    }
    return TURKEY_CENTER;
  }, [route]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || route.length === 0) return;

    if (route.length === 1) {
      map.flyTo({ center: [route[0].longitude, route[0].latitude], zoom: 11, duration: 800 });
      return;
    }

    const lngs = route.map((p) => p.longitude);
    const lats = route.map((p) => p.latitude);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 60, duration: 800 }
    );
  }, [route, routeGeometry]);

  if (!hasMapboxToken()) {
    return (
      <div className="w-full h-full min-h-[280px] bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-3xl mb-3">🗺️</div>
          <h4 className="font-bold text-gray-900 font-[Outfit] mb-2">Harita yapılandırması gerekli</h4>
          <p className="text-sm text-gray-600">
            Proje kökünde <code className="text-xs bg-white px-1 py-0.5 rounded">.env</code> dosyasına{' '}
            <code className="text-xs bg-white px-1 py-0.5 rounded">VITE_MAPBOX_ACCESS_TOKEN</code> ekleyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={initialView}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {routeFeature && (
          <Source id="trip-route" type="geojson" data={routeFeature}>
            <Layer
              id="trip-route-outline"
              type="line"
              paint={{
                'line-color': '#ffffff',
                'line-width': 6,
                'line-opacity': 0.9,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id="trip-route-line"
              type="line"
              paint={{
                'line-color': '#16a34a',
                'line-width': 4,
                'line-opacity': 0.95,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        {route.map((point, index) => (
          <Marker
            key={point.id}
            longitude={point.longitude}
            latitude={point.latitude}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: getMarkerColor(index, route.length) }}
              >
                {index + 1}
              </div>
              <span className="mt-1 text-[10px] font-semibold text-gray-800 bg-white/90 px-1.5 py-0.5 rounded shadow-sm max-w-[120px] truncate">
                {point.name}
              </span>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
