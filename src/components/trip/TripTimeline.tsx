import type { RouteLeg, RoutePoint } from '../../types';
import { formatDuration } from '../../lib/mapbox';

interface TripTimelineProps {
  route: RoutePoint[];
  routeLegs?: RouteLeg[];
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
}

export default function TripTimeline({
  route,
  routeLegs,
  totalDurationMinutes,
  totalDistanceKm,
}: TripTimelineProps) {
  if (!route || route.length === 0) {
    return <div className="text-gray-500 text-sm">Henüz rota belirlenmedi.</div>;
  }

  return (
    <div>
      {((totalDurationMinutes ?? 0) > 0 || (totalDistanceKm ?? 0) > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {(totalDurationMinutes ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
              <span>🚗</span> Toplam ~{formatDuration(totalDurationMinutes ?? 0)}
            </span>
          )}
          {(totalDistanceKm ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
              <span>📍</span> {totalDistanceKm} km
            </span>
          )}
        </div>
      )}

      <div className="relative pl-6 border-l-2 border-green-200 py-2">
        {route.map((point, index) => {
          const leg = routeLegs?.find((l) => l.fromOrder === point.order);
          return (
            <div key={point.id} className="mb-8 relative last:mb-0">
              <div className="absolute -left-[31px] bg-green-100 border-2 border-green-500 w-4 h-4 rounded-full" />
              <div className="text-xs text-green-600 font-bold mb-1">DURAK {index + 1}</div>
              <h4 className="text-lg font-bold text-gray-900 font-[Outfit]">{point.name}</h4>
              {point.resolvedName && point.resolvedName !== point.name && (
                <p className="text-xs text-gray-500 mt-0.5">{point.resolvedName}</p>
              )}

              {leg && (
                <div className="mt-3 ml-1 flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-px h-6 bg-gray-200" />
                  <span>
                    Sonraki durağa ~{formatDuration(leg.durationMinutes)} · {leg.distanceKm} km
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
