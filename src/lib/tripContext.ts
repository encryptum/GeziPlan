import { buildTripSchedule } from './schedule';
import { formatDuration } from './mapbox';
import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, resolveAiConfig } from './aiProviders';
import type { Trip } from '../types';

export interface TripContext {
  tripId: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  startPoint?: string;
  endPoint?: string;
  route: Array<{
    order: number;
    name: string;
    resolvedName?: string;
    latitude: number;
    longitude: number;
  }>;
  routeLegs: Array<{
    fromStop: string;
    toStop: string;
    durationMinutes: number;
    distanceKm: number;
  }>;
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
  stopRecommendations: Array<{
    type: string;
    title: string;
    atStopOrder: number;
    durationMinutes: number;
    description?: string;
  }>;
  participantCount: number;
  maxParticipants: number;
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  scheduleSummary?: string;
}

export function buildTripContext(trip: Trip): TripContext {
  const schedule = buildTripSchedule(trip);
  const scheduleSummary = schedule.entries
    .slice(0, 12)
    .map((e) => {
      const time = e.startAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const dur = e.durationMinutes ? ` (${formatDuration(e.durationMinutes)})` : '';
      return `${time} — ${e.title}${dur}`;
    })
    .join('\n');

  const routeLegs = (trip.routeLegs ?? []).map((leg) => {
    const from = trip.route.find((p) => p.order === leg.fromOrder);
    const to = trip.route.find((p) => p.order === leg.toOrder);
    return {
      fromStop: from?.name ?? `Durak ${leg.fromOrder}`,
      toStop: to?.name ?? `Durak ${leg.toOrder}`,
      durationMinutes: leg.durationMinutes,
      distanceKm: leg.distanceKm,
    };
  });

  return {
    tripId: trip.id,
    title: trip.title,
    description: trip.description,
    category: trip.category,
    startDate: trip.startDate,
    endDate: trip.endDate,
    startTime: trip.startTime,
    startPoint: trip.startPoint,
    endPoint: trip.endPoint,
    route: trip.route.map((p) => ({
      order: p.order,
      name: p.name,
      resolvedName: p.resolvedName,
      latitude: p.latitude,
      longitude: p.longitude,
    })),
    routeLegs,
    totalDurationMinutes: trip.totalDurationMinutes,
    totalDistanceKm: trip.totalDistanceKm,
    stopRecommendations: (trip.stopRecommendations ?? []).map((r) => ({
      type: r.type,
      title: r.title,
      atStopOrder: r.routePointOrder,
      durationMinutes: r.durationMinutes,
      description: r.description,
    })),
    participantCount: trip.currentParticipants,
    maxParticipants: trip.maxParticipants,
    aiEnabled: trip.aiRecommendationsEnabled !== false,
    ...(() => {
      const ai = resolveAiConfig(trip.aiProvider ?? DEFAULT_AI_PROVIDER, trip.aiModel ?? DEFAULT_AI_MODEL);
      return { aiProvider: ai.provider, aiModel: ai.model };
    })(),
    scheduleSummary: scheduleSummary || undefined,
  };
}
