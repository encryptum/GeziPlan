import { useState } from 'react';
import LocationSearch from '../map/LocationSearch';
import MapWaypointPicker from '../map/MapWaypointPicker';
import type { GeoPlace, PlannedWaypoint } from '../../types';

interface WaypointBuilderProps {
  waypoints: PlannedWaypoint[];
  onChange: (waypoints: PlannedWaypoint[]) => void;
  startPlace?: GeoPlace | null;
  endPlace?: GeoPlace | null;
  proximity?: { longitude: number; latitude: number };
}

type AddMode = 'search' | 'map';

export default function WaypointBuilder({
  waypoints,
  onChange,
  startPlace,
  endPlace,
  proximity,
}: WaypointBuilderProps) {
  const [mode, setMode] = useState<AddMode>('search');
  const [draftName, setDraftName] = useState('');
  const [draftPlace, setDraftPlace] = useState<GeoPlace | null>(null);

  const addWaypoint = (place: GeoPlace, source: PlannedWaypoint['source']) => {
    const exists = waypoints.some(
      (wp) =>
        wp.name === place.name ||
        (Math.abs(wp.longitude - place.longitude) < 0.001 &&
          Math.abs(wp.latitude - place.latitude) < 0.001)
    );
    if (exists) return;

    onChange([
      ...waypoints,
      {
        id: Math.random().toString(36).slice(2, 11),
        ...place,
        source,
      },
    ]);
    setDraftName('');
    setDraftPlace(null);
  };

  const removeWaypoint = (id: string) => {
    onChange(waypoints.filter((wp) => wp.id !== id));
  };

  const moveWaypoint = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= waypoints.length) return;
    const updated = [...waypoints];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    onChange(updated);
  };

  const handleSearchAdd = () => {
    if (draftPlace) {
      addWaypoint(draftPlace, 'search');
      return;
    }
    if (draftName.trim()) {
      // Manual text fallback place if geocoding wasn't selected
      const baseLat = proximity?.latitude ?? 39.0;
      const baseLon = proximity?.longitude ?? 35.0;
      addWaypoint(
        {
          name: draftName.trim(),
          longitude: baseLon + (Math.random() - 0.5) * 0.05,
          latitude: baseLat + (Math.random() - 0.5) * 0.05,
          address: 'Manuel Eklenen Durak',
        },
        'search'
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-700">Ziyaret Noktaları</label>
        <span className="text-xs font-medium text-gray-500">{waypoints.length} durak</span>
      </div>

      {waypoints.length > 0 && (
        <ol className="space-y-2">
          {waypoints.map((wp, index) => (
            <li
              key={wp.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gradient-to-r from-white to-gray-50/80 group"
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{wp.name.split(',')[0]}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{wp.name}</p>
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {wp.source === 'map' ? '📍 Haritadan' : '🔍 Arama'}
                </span>
              </div>
              <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveWaypoint(index, -1)}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  title="Yukarı"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === waypoints.length - 1}
                  onClick={() => moveWaypoint(index, 1)}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  title="Aşağı"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeWaypoint(wp.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="Sil"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {waypoints.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
          Henüz ziyaret noktası eklenmedi. Aşağıdan tek tek ekleyin.
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(
            [
              { id: 'search' as const, label: '🔍 İsimle Ekle', },
              { id: 'map' as const, label: '🗺️ Haritadan Seç', },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`flex-1 py-3 text-sm font-bold transition ${
                mode === tab.id
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {mode === 'search' ? (
            <div className="space-y-3">
              <LocationSearch
                label="Mekan ara"
                placeholder="Örn: Tuz Gölü, Göreme Müzesi..."
                value={draftName}
                onChange={setDraftName}
                onPlaceSelect={setDraftPlace}
                proximity={proximity}
                hint="Yazdıktan sonra listeden doğru mekanı seçin."
              />
              <button
                type="button"
                onClick={handleSearchAdd}
                disabled={!draftPlace && !draftName.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Durak Olarak Ekle
              </button>
            </div>
          ) : (
            <MapWaypointPicker
              waypoints={waypoints}
              startPlace={startPlace}
              endPlace={endPlace}
              onAdd={(place) => addWaypoint(place, 'map')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
