import type { CreateTripInput, GeoPlace, PlannedWaypoint } from '../../types';
import TripDateBanner from './TripDateBanner';

interface TripCreateSummaryProps {
  formData: Pick<
    CreateTripInput,
    'title' | 'description' | 'category' | 'startDate' | 'startTime' | 'endDate' | 'maxParticipants' | 'aiRecommendationsEnabled'
  >;
  startPlace: GeoPlace;
  endPlace: GeoPlace;
  waypoints: PlannedWaypoint[];
}

export default function TripCreateSummary({
  formData,
  startPlace,
  endPlace,
  waypoints,
}: TripCreateSummaryProps) {
  const stops = [startPlace, ...waypoints, endPlace];

  return (
    <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 space-y-4">
      <h4 className="font-bold text-gray-900 font-[Outfit]">Yayımlamadan önce özet</h4>

      <TripDateBanner
        startDate={formData.startDate}
        startTime={formData.startTime}
        endDate={formData.endDate}
        compact
      />

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500 text-xs font-medium uppercase">Başlık</dt>
          <dd className="font-semibold text-gray-900">{formData.title}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs font-medium uppercase">Kategori</dt>
          <dd className="font-semibold text-gray-900 capitalize">{formData.category}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs font-medium uppercase">Katılımcı</dt>
          <dd className="font-semibold text-gray-900">En fazla {formData.maxParticipants} kişi</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs font-medium uppercase">AI</dt>
          <dd className="font-semibold text-gray-900">{formData.aiRecommendationsEnabled ? 'Açık' : 'Kapalı'}</dd>
        </div>
      </dl>

      <div>
        <dt className="text-gray-500 text-xs font-medium uppercase mb-2">Rota</dt>
        <ol className="space-y-1">
          {stops.map((stop, i) => (
            <li key={`${stop.name}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-gray-800 truncate">{stop.name.split(',')[0]}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
