import { useEffect, useState } from 'react';
import type { GeoPlace, PlannedWaypoint } from '../../types';
import { buildRouteFromCoordinates, formatDuration, MapboxError } from '../../lib/mapbox';
import MapView from './MapView';

interface RoutePreviewPanelProps {
  startPlace: GeoPlace | null;
  endPlace: GeoPlace | null;
  waypoints: PlannedWaypoint[];
}

export default function RoutePreviewPanel({ startPlace, endPlace, waypoints }: RoutePreviewPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    route: Awaited<ReturnType<typeof buildRouteFromCoordinates>>['route'];
    routeGeometry: GeoJSON.LineString;
    totalDurationMinutes: number;
    totalDistanceKm: number;
    warnings?: string[];
  } | null>(null);

  useEffect(() => {
    if (!startPlace || !endPlace) {
      setPreview(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      void buildRouteFromCoordinates(startPlace, waypoints, endPlace)
        .then((data) => {
          setPreview({
            route: data.route,
            routeGeometry: data.routeGeometry,
            totalDurationMinutes: data.totalDurationMinutes,
            totalDistanceKm: data.totalDistanceKm,
            warnings: data.warnings,
          });
        })
        .catch((e) => {
          setPreview(null);
          setError(e instanceof MapboxError ? e.message : 'Rota önizlemesi oluşturulamadı.');
        })
        .finally(() => setIsLoading(false));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [startPlace, endPlace, waypoints]);

  if (!startPlace || !endPlace) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        Kalkış ve varış noktalarını seçince haritada canlı rota önizlemesi görünür.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-gray-800">Canlı Rota Önizlemesi</h4>
        {isLoading && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
            Hesaplanıyor...
          </span>
        )}
      </div>

      <div className="h-56 sm:h-72 rounded-xl overflow-hidden border border-gray-200 relative">
        {preview ? (
          <MapView route={preview.route} routeGeometry={preview.routeGeometry} />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-sm text-gray-500">
            {isLoading ? 'Rota çiziliyor...' : 'Önizleme bekleniyor'}
          </div>
        )}
      </div>

      {preview && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium bg-green-50 text-green-800 px-3 py-1.5 rounded-full">
            ~{formatDuration(preview.totalDurationMinutes)}
          </span>
          <span className="text-xs font-medium bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full">
            {preview.totalDistanceKm.toFixed(0)} km
          </span>
          <span className="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
            {preview.route.length} durak
          </span>
        </div>
      )}

      {preview?.warnings?.map((w) => (
        <p key={w} className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {w}
        </p>
      ))}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
