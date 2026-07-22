import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { ChangeRequestRow, StopRecommendationRow, TripWithRelations } from '../lib/database.types';
import type { BuiltRoute } from '../lib/mapbox';
import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER } from '../lib/aiProviders';
import type { AiProvider } from '../lib/aiProviders';
import type { ChangeRequest, CreateTripInput, Participant, StopRecommendation, Trip, User } from '../types';

const TRIP_SELECT = `
  *,
  organizer:profiles!organizer_id (*),
  route_points (*),
  route_legs (*),
  stop_recommendations (
    *,
    suggester:profiles!suggested_by_id (*)
  ),
  change_requests (
    *,
    requester:profiles!requested_by_id (id, full_name, avatar_url)
  ),
  trip_participants (
    *,
    member:profiles!user_id (id, full_name, avatar_url)
  )
`;

interface ParticipantRow {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  member: { id: string; full_name: string; avatar_url: string | null } | null;
}

function mapParticipants(rows: ParticipantRow[] | undefined): Participant[] {
  return (rows ?? [])
    .filter((p) => p.status === 'confirmed')
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      fullName: row.member?.full_name ?? 'Katılımcı',
      avatarUrl: row.member?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
      role: row.role as Participant['role'],
      status: row.status as Participant['status'],
      joinedAt: row.joined_at,
    }));
}

function formatTimeFromDb(time: string | null | undefined): string | undefined {
  if (!time) return undefined;
  return time.slice(0, 5);
}

function mapTripRow(row: TripWithRelations): Trip {
  const route = [...(row.route_points ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((point) => ({
      id: point.id,
      name: point.name,
      resolvedName: point.resolved_name ?? undefined,
      latitude: point.latitude,
      longitude: point.longitude,
      order: point.sort_order,
    }));

  const routeLegs = (row.route_legs ?? []).map((leg) => ({
    fromOrder: leg.from_order,
    toOrder: leg.to_order,
    durationMinutes: leg.duration_minutes,
    distanceKm: Number(leg.distance_km),
  }));

  const stopRecommendations: StopRecommendation[] = (row.stop_recommendations ?? []).map((rec) => ({
    id: rec.id,
    routePointOrder: rec.route_point_order,
    type: rec.type as 'mola' | 'konaklama',
    title: rec.title,
    description: rec.description ?? undefined,
    durationMinutes: rec.duration_minutes,
    suggestedById: rec.suggested_by_id ?? '',
    suggestedByName: rec.suggester?.full_name ?? 'Kullanıcı',
    suggestedByAvatar: rec.suggester?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    createdAt: rec.created_at,
  }));

  const changeRequests: ChangeRequest[] = (row.change_requests ?? []).map((cr) => ({
    id: cr.id,
    tripId: cr.trip_id,
    targetType: cr.target_type as ChangeRequest['targetType'],
    targetId: cr.target_id,
    action: cr.action as ChangeRequest['action'],
    payload: (cr.payload as Record<string, unknown>) ?? {},
    status: cr.status as ChangeRequest['status'],
    requestedById: cr.requested_by_id ?? '',
    requestedByName: cr.requester?.full_name ?? (cr.is_ai_request ? 'AI Asistan' : 'Kullanıcı'),
    requestedByAvatar: cr.requester?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=requester',
    isAiRequest: cr.is_ai_request,
    createdAt: cr.created_at,
    resolvedAt: cr.resolved_at ?? undefined,
    resolvedById: cr.resolved_by_id ?? undefined,
  }));

  const geometry = row.route_geometry as GeoJSON.LineString | null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: formatTimeFromDb(row.start_time),
    organizerId: row.organizer_id,
    organizerName: row.organizer?.full_name ?? 'Organizatör',
    organizerAvatar:
      row.organizer?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=organizer',
    maxParticipants: row.max_participants,
    currentParticipants: row.current_participants,
    status: row.status as Trip['status'],
    category: row.category as Trip['category'],
    route,
    routeLegs: routeLegs.length ? routeLegs : undefined,
    routeGeometry: geometry ?? undefined,
    totalDurationMinutes: row.total_duration_minutes ?? undefined,
    totalDistanceKm: row.total_distance_km != null ? Number(row.total_distance_km) : undefined,
    startPoint: row.start_point ?? undefined,
    endPoint: row.end_point ?? undefined,
    stopRecommendations: stopRecommendations.length ? stopRecommendations : undefined,
    changeRequests: changeRequests.length ? changeRequests : undefined,
    pois: [],
    participants: mapParticipants(row.trip_participants as ParticipantRow[] | undefined),
    tags: row.tags ?? [],
    rating: Number(row.rating),
    aiRecommendationsEnabled: row.ai_recommendations_enabled,
    aiProvider: (row.ai_provider as AiProvider) ?? DEFAULT_AI_PROVIDER,
    aiModel: row.ai_model ?? DEFAULT_AI_MODEL,
    createdAt: row.created_at,
  };
}

export async function fetchTripsFromDb(): Promise<Trip[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as TripWithRelations[]).map(mapTripRow);
}

export async function fetchTripByIdFromDb(id: string): Promise<Trip | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapTripRow(data as TripWithRelations);
}

export async function createTripInDb(
  input: CreateTripInput,
  routeData: BuiltRoute,
  organizer: User
): Promise<Trip> {
  const supabase = getSupabase();

  const tripInsert = {
      title: input.title,
      description: input.description,
      cover_image_url: input.coverImageUrl,
      start_date: input.startDate,
      end_date: input.endDate,
      start_time: input.startTime ? `${input.startTime}:00` : null,
      category: input.category,
      organizer_id: organizer.id,
      max_participants: input.maxParticipants,
      current_participants: 1,
      start_point: input.startPlace.name,
      end_point: input.endPlace.name,
      route_geometry: routeData.routeGeometry as unknown as Record<string, unknown>,
      total_duration_minutes: routeData.totalDurationMinutes,
      total_distance_km: routeData.totalDistanceKm,
      tags: input.waypoints.slice(0, 4).map((w) => w.name.split(',')[0].trim().toLowerCase()),
      ai_recommendations_enabled: input.aiRecommendationsEnabled,
      ai_provider: DEFAULT_AI_PROVIDER,
      ai_model: DEFAULT_AI_MODEL,
      status: 'upcoming' as const,
  };

  const { data: tripRow, error: tripError } = await supabase
    .from('trips')
    .insert(tripInsert)
    .select('id')
    .single();

  if (tripError) throw tripError;

  const tripId = tripRow.id;

  if (routeData.route.length > 0) {
    const pointsInsert = routeData.route.map((point) => ({
      trip_id: tripId,
      name: point.name,
      resolved_name: point.resolvedName ?? null,
      latitude: point.latitude,
      longitude: point.longitude,
      sort_order: point.order,
    }));
    const { error: pointsError } = await supabase
      .from('route_points')
      .insert(pointsInsert);
    if (pointsError) throw pointsError;
  }

  if (routeData.routeLegs.length > 0) {
    const legsInsert = routeData.routeLegs.map((leg) => ({
      trip_id: tripId,
      from_order: leg.fromOrder,
      to_order: leg.toOrder,
      duration_minutes: leg.durationMinutes,
      distance_km: leg.distanceKm,
    }));
    const { error: legsError } = await supabase
      .from('route_legs')
      .insert(legsInsert);
    if (legsError) throw legsError;
  }

  const participantInsert = {
    trip_id: tripId,
    user_id: organizer.id,
    role: 'organizer' as const,
    status: 'confirmed' as const,
  };
  const { error: participantError } = await supabase
    .from('trip_participants')
    .insert(participantInsert);
  if (participantError) throw participantError;

  const trip = await fetchTripByIdFromDb(tripId);
  if (!trip) throw new Error('Gezi oluşturuldu ancak okunamadı.');
  return trip;
}

export async function addStopRecommendationInDb(
  tripId: string,
  data: Omit<StopRecommendation, 'id' | 'createdAt' | 'suggestedById' | 'suggestedByName' | 'suggestedByAvatar'>,
  user: User
): Promise<StopRecommendation> {
  const supabase = getSupabase();

  const recommendationInsert = {
    trip_id: tripId,
    route_point_order: data.routePointOrder,
    type: data.type,
    title: data.title,
    description: data.description ?? null,
    duration_minutes: data.durationMinutes,
    suggested_by_id: user.id,
  };
  const { data: row, error } = await supabase
    .from('stop_recommendations')
    .insert(recommendationInsert)
    .select(`*, suggester:profiles!suggested_by_id (*)`)
    .single();

  if (error) throw error;

  const rec = row as StopRecommendationRow & { suggester: { full_name: string; avatar_url: string | null } | null };

  return {
    id: rec.id,
    routePointOrder: rec.route_point_order,
    type: rec.type as 'mola' | 'konaklama',
    title: rec.title,
    description: rec.description ?? undefined,
    durationMinutes: rec.duration_minutes,
    suggestedById: user.id,
    suggestedByName: rec.suggester?.full_name ?? user.fullName,
    suggestedByAvatar: rec.suggester?.avatar_url || user.avatarUrl,
    createdAt: rec.created_at,
  };
}

export async function updateStopRecommendationInDb(
  recommendationId: string,
  updates: Partial<Pick<StopRecommendation, 'title' | 'description' | 'durationMinutes' | 'type' | 'routePointOrder'>>
): Promise<void> {
  const supabase = getSupabase();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title != null) dbUpdates.title = updates.title;
  if (updates.description != null) dbUpdates.description = updates.description;
  if (updates.durationMinutes != null) dbUpdates.duration_minutes = updates.durationMinutes;
  if (updates.type != null) dbUpdates.type = updates.type;
  if (updates.routePointOrder != null) dbUpdates.route_point_order = updates.routePointOrder;

  const { error } = await supabase
    .from('stop_recommendations')
    .update(dbUpdates)
    .eq('id', recommendationId);

  if (error) throw error;
}

export async function deleteStopRecommendationInDb(recommendationId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('stop_recommendations')
    .delete()
    .eq('id', recommendationId);

  if (error) throw error;
}

export interface TripAiSettingsInput {
  aiProvider: AiProvider;
  aiModel: string;
  aiRecommendationsEnabled: boolean;
}

export async function updateTripAiSettingsInDb(
  tripId: string,
  settings: TripAiSettingsInput
): Promise<Trip> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('trips')
    .update({
      ai_provider: settings.aiProvider,
      ai_model: settings.aiModel,
      ai_recommendations_enabled: settings.aiRecommendationsEnabled,
    })
    .eq('id', tripId);

  if (error) throw error;

  const trip = await fetchTripByIdFromDb(tripId);
  if (!trip) throw new Error('Gezi güncellendi ancak okunamadı.');
  return trip;
}

export async function updateRoutePointInDb(
  tripId: string,
  pointId: string,
  updates: { name?: string; resolvedName?: string }
): Promise<void> {
  const supabase = getSupabase();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name != null) dbUpdates.name = updates.name;
  if (updates.resolvedName != null) dbUpdates.resolved_name = updates.resolvedName;

  const { error } = await supabase
    .from('route_points')
    .update(dbUpdates)
    .eq('id', pointId)
    .eq('trip_id', tripId);

  if (error) throw error;
}

export async function deleteRoutePointInDb(tripId: string, pointId: string): Promise<void> {
  const supabase = getSupabase();
  const { error: pointError } = await supabase
    .from('route_points')
    .delete()
    .eq('id', pointId)
    .eq('trip_id', tripId);

  if (pointError) throw pointError;
}

export async function createChangeRequestInDb(
  tripId: string,
  data: {
    targetType: 'route_point' | 'stop_recommendation';
    targetId: string;
    action: 'edit' | 'delete';
    payload: Record<string, unknown>;
    isAiRequest?: boolean;
  },
  user: User
): Promise<ChangeRequest> {
  const supabase = getSupabase();

  const insert = {
    trip_id: tripId,
    target_type: data.targetType,
    target_id: data.targetId,
    action: data.action,
    payload: data.payload as unknown as Record<string, unknown>,
    status: 'pending',
    requested_by_id: user.id,
    is_ai_request: data.isAiRequest ?? false,
  };

  const { data: row, error } = await supabase
    .from('change_requests')
    .insert(insert)
    .select(`*, requester:profiles!requested_by_id (id, full_name, avatar_url)`)
    .single();

  if (error) throw error;

  const cr = row as ChangeRequestRow & { requester: { full_name: string; avatar_url: string | null } | null };

  return {
    id: cr.id,
    tripId: cr.trip_id,
    targetType: cr.target_type as ChangeRequest['targetType'],
    targetId: cr.target_id,
    action: cr.action as ChangeRequest['action'],
    payload: (cr.payload as Record<string, unknown>) ?? {},
    status: cr.status as ChangeRequest['status'],
    requestedById: user.id,
    requestedByName: cr.requester?.full_name ?? user.fullName,
    requestedByAvatar: cr.requester?.avatar_url || user.avatarUrl,
    isAiRequest: cr.is_ai_request,
    createdAt: cr.created_at,
  };
}

export async function approveChangeRequestInDb(
  changeRequestId: string,
  resolverId: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('change_requests')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      resolved_by_id: resolverId,
    })
    .eq('id', changeRequestId);

  if (error) throw error;
}

export async function rejectChangeRequestInDb(
  changeRequestId: string,
  resolverId: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('change_requests')
    .update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
      resolved_by_id: resolverId,
    })
    .eq('id', changeRequestId);

  if (error) throw error;
}
