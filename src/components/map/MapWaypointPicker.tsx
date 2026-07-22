import { useCallback, useMemo, useRef, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import type { MapMouseEvent, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapboxToken, hasMapboxToken, reverseGeocode, type GeoPlace } from '../../lib/mapbox';
import type { PlannedWaypoint } from '../../types';

interface MapWaypointPickerProps {
  waypoints: PlannedWaypoint[];
  startPlace?: GeoPlace | null;
  endPlace?: GeoPlace | null;
  onAdd: (place: GeoPlace) => void;
}

const TURKEY_CENTER = { longitude: 35.2433, latitude: 38.9637, zoom: 5.5 };

export default function MapWaypointPicker({
  waypoints,
  startPlace,
  endPlace,
  onAdd,
}: MapWaypointPickerProps) {
  const mapRef = useRef<MapRef>(null);
  const [isPicking, setIsPicking] = useState(true);
  const [pending, setPending] = useState<GeoPlace | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allMarkers = useMemo(() => {
    const items: Array<{ id: string; place: GeoPlace; color: string; label: string }> = [];
    if (startPlace) {
      items.push({ id: 'start', place: startPlace, color: '#16a34a', label: 'A' });
    }
    waypoints.forEach((wp, i) => {
      items.push({ id: wp.id, place: wp, color: '#2563eb', label: String(i + 1) });
    });
    if (endPlace) {
      items.push({ id: 'end', place: endPlace, color: '#dc2626', label: 'B' });
    }
    return items;
  }, [startPlace, endPlace, waypoints]);

  const handleMapClick = useCallback(async (event: MapMouseEvent) => {
    if (!isPicking) return;
    const { lng, lat } = event.lngLat;
    setIsResolving(true);
    setError(null);
    try {
      const place = await reverseGeocode(lng, lat);
      setPending(place);
    } catch {
      setError('Bu nokta için adres bulunamadı.');
      setPending(null);
    } finally {
      setIsResolving(false);
    }
  }, [isPicking]);

  const handleConfirm = () => {
    if (!pending) return;
    onAdd(pending);
    setPending(null);
  };

  if (!hasMapboxToken()) {
    return (
      <div className="h-64 rounded-xl bg-slate-100 flex items-center justify-center text-sm text-gray-600 p-4 text-center">
        Harita seçimi için Mapbox token gerekli.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {isPicking ? 'Haritada bir noktaya tıklayın' : 'Harita seçimi kapalı'}
        </p>
        <button
          type="button"
          onClick={() => setIsPicking((v) => !v)}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
            isPicking ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {isPicking ? 'Seçim aktif' : 'Seçimi aç'}
        </button>
      </div>

      <div
        className={`relative h-72 md:h-80 rounded-xl overflow-hidden border-2 transition ${
          isPicking ? 'border-green-400 cursor-crosshair' : 'border-gray-200'
        }`}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={getMapboxToken()}
          initialViewState={TURKEY_CENTER}
          mapStyle="mapbox://styles/mapbox/outdoors-v12"
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          {allMarkers.map((m) => (
            <Marker key={m.id} longitude={m.place.longitude} latitude={m.place.latitude} anchor="bottom">
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: m.color }}
              >
                {m.label}
              </div>
            </Marker>
          ))}

          {pending && (
            <Marker longitude={pending.longitude} latitude={pending.latitude} anchor="bottom">
              <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg bg-amber-500 flex items-center justify-center text-white animate-bounce">
                +
              </div>
            </Marker>
          )}
        </Map>

        {isResolving && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {pending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-800 uppercase mb-1">Seçilen nokta</p>
            <p className="text-sm font-medium text-gray-900 truncate">{pending.name}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Listeye Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
