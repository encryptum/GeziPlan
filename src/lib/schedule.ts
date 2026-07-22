import { addMinutes, formatDurationHuman, parseTripDateTime } from './dateFormat';
import type { RoutePoint, Trip } from '../types';

export type ScheduleEntryKind =
  | 'departure'
  | 'travel'
  | 'stop'
  | 'arrival'
  | 'visit'
  | 'mola'
  | 'konaklama';

export interface ScheduleEntry {
  id: string;
  recId?: string;
  kind: ScheduleEntryKind;
  startAt: Date;
  endAt?: Date;
  durationMinutes?: number;
  title: string;
  subtitle?: string;
  description?: string;
  stopName?: string;
  stopOrder?: number;
  distanceKm?: number;
  suggestedBy?: { name: string; avatar: string };
}

export interface TripScheduleSummary {
  entries: ScheduleEntry[];
  departureAt: Date;
  estimatedArrivalAt: Date | null;
  totalTravelMinutes: number;
  totalBreakMinutes: number;
  totalStayMinutes: number;
}

export function buildTripSchedule(trip: Trip): TripScheduleSummary {
  const entries: ScheduleEntry[] = [];
  const startTime = trip.startTime ?? '08:00';
  let cursor = parseTripDateTime(trip.startDate, startTime);
  const departureAt = new Date(cursor);

  if (!trip.route.length) {
    return {
      entries,
      departureAt,
      estimatedArrivalAt: null,
      totalTravelMinutes: 0,
      totalBreakMinutes: 0,
      totalStayMinutes: 0,
    };
  }

  let totalTravelMinutes = 0;
  let totalBreakMinutes = 0;
  let totalStayMinutes = 0;

  for (let i = 0; i < trip.route.length; i++) {
    const point = trip.route[i];
    const isFirst = i === 0;
    const isLast = i === trip.route.length - 1;

    if (!isFirst) {
      const leg = trip.routeLegs?.find((l) => l.toOrder === point.order);
      if (leg) {
        const travelStart = new Date(cursor);
        cursor = addMinutes(cursor, leg.durationMinutes);
        totalTravelMinutes += leg.durationMinutes;
        entries.push({
          id: `travel-${point.order}`,
          kind: 'travel',
          startAt: travelStart,
          endAt: new Date(cursor),
          durationMinutes: leg.durationMinutes,
          title: 'Yolculuk',
          subtitle: `${trip.route[i - 1].name} → ${point.name}`,
          distanceKm: leg.distanceKm,
        });
      }
    }

    entries.push({
      id: `stop-${point.id}`,
      kind: isFirst ? 'departure' : isLast ? 'arrival' : 'stop',
      startAt: new Date(cursor),
      title: point.name,
      subtitle: isFirst ? 'Kalkış noktası' : isLast ? 'Varış noktası' : 'Durak',
      stopName: point.name,
      stopOrder: point.order,
      description: point.resolvedName,
    });

    const recs = (trip.stopRecommendations ?? [])
      .filter((r) => r.routePointOrder === point.order)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const rec of recs) {
      const recStart = new Date(cursor);
      cursor = addMinutes(cursor, rec.durationMinutes);
      if (rec.type === 'mola') totalBreakMinutes += rec.durationMinutes;
      else totalStayMinutes += rec.durationMinutes;

      entries.push({
        id: rec.id,
        recId: rec.id,
        kind: rec.type,
        startAt: recStart,
        endAt: new Date(cursor),
        durationMinutes: rec.durationMinutes,
        title: rec.title,
        description: rec.description,
        stopName: point.name,
        stopOrder: point.order,
        suggestedBy: { name: rec.suggestedByName, avatar: rec.suggestedByAvatar },
      });
    }

    if (!isFirst && !isLast && recs.length === 0) {
      const visitMinutes = 25;
      const visitStart = new Date(cursor);
      cursor = addMinutes(cursor, visitMinutes);
      totalBreakMinutes += visitMinutes;
      entries.push({
        id: `visit-${point.id}`,
        kind: 'visit',
        startAt: visitStart,
        endAt: new Date(cursor),
        durationMinutes: visitMinutes,
        title: 'Kısa gezi molası',
        subtitle: 'Fotoğraf & keşif',
        stopName: point.name,
        stopOrder: point.order,
      });
    }
  }

  return {
    entries,
    departureAt,
    estimatedArrivalAt: new Date(cursor),
    totalTravelMinutes,
    totalBreakMinutes,
    totalStayMinutes,
  };
}

export function getScheduleKindMeta(kind: ScheduleEntryKind): {
  label: string;
  icon: string;
  rowClass: string;
  badgeClass: string;
} {
  switch (kind) {
    case 'departure':
      return {
        label: 'Kalkış',
        icon: '🚀',
        rowClass: 'border-l-emerald-500 bg-emerald-50/40',
        badgeClass: 'bg-emerald-100 text-emerald-800',
      };
    case 'arrival':
      return {
        label: 'Varış',
        icon: '🏁',
        rowClass: 'border-l-rose-500 bg-rose-50/40',
        badgeClass: 'bg-rose-100 text-rose-800',
      };
    case 'travel':
      return {
        label: 'Yolculuk',
        icon: '🚗',
        rowClass: 'border-l-slate-400 bg-slate-50/60',
        badgeClass: 'bg-slate-100 text-slate-700',
      };
    case 'mola':
      return {
        label: 'Mola',
        icon: '☕',
        rowClass: 'border-l-amber-500 bg-amber-50/50',
        badgeClass: 'bg-amber-100 text-amber-800',
      };
    case 'konaklama':
      return {
        label: 'Konaklama',
        icon: '🏨',
        rowClass: 'border-l-indigo-500 bg-indigo-50/50',
        badgeClass: 'bg-indigo-100 text-indigo-800',
      };
    case 'visit':
      return {
        label: 'Gezi',
        icon: '📸',
        rowClass: 'border-l-sky-500 bg-sky-50/40',
        badgeClass: 'bg-sky-100 text-sky-800',
      };
    default:
      return {
        label: 'Durak',
        icon: '📍',
        rowClass: 'border-l-green-500 bg-green-50/30',
        badgeClass: 'bg-green-100 text-green-800',
      };
  }
}

export function formatEntryDuration(entry: ScheduleEntry): string {
  if (!entry.durationMinutes) return '—';
  return formatDurationHuman(entry.durationMinutes);
}

export function getStopsForRecommendations(route: RoutePoint[]): RoutePoint[] {
  return route.filter((_, index) => index < route.length - 1);
}
