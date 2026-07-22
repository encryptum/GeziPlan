import { create } from 'zustand';
import type { ChangeRequest, CreateTripInput, StopRecommendation, Trip } from '../types';
import { mockTrips } from '../lib/mockData';
import { buildRouteFromCoordinates, MapboxError } from '../lib/mapbox';
import { isSupabaseConfigured } from '../lib/supabase';
import { safeGetItem, safeSetItem } from '../lib/storage';
import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, type AiProvider } from '../lib/aiProviders';
import {
  addStopRecommendationInDb,
  approveChangeRequestInDb,
  createChangeRequestInDb,
  createTripInDb,
  deleteRoutePointInDb,
  deleteStopRecommendationInDb,
  fetchTripByIdFromDb,
  fetchTripsFromDb,
  rejectChangeRequestInDb,
  updateRoutePointInDb,
  updateStopRecommendationInDb,
  updateTripAiSettingsInDb,
} from '../services/tripService';
import { joinTripInDb, leaveTripInDb } from '../services/participantService';
import { useAuthStore } from './authStore';

interface TripState {
  trips: Trip[];
  isLoading: boolean;
  lastError: string | null;
  fetchTrips: (force?: boolean) => Promise<void>;
  fetchTripById: (id: string) => Promise<Trip | null>;
  createTrip: (tripData: CreateTripInput) => Promise<Trip>;
  addStopRecommendation: (
    tripId: string,
    data: Omit<StopRecommendation, 'id' | 'createdAt' | 'suggestedById' | 'suggestedByName' | 'suggestedByAvatar'>
  ) => Promise<void>;
  updateStopRecommendation: (
    tripId: string,
    recommendationId: string,
    updates: Partial<Pick<StopRecommendation, 'title' | 'description' | 'durationMinutes' | 'type' | 'routePointOrder'>>
  ) => Promise<void>;
  deleteStopRecommendation: (tripId: string, recommendationId: string) => Promise<void>;
  updateRoutePoint: (tripId: string, pointId: string, updates: { name?: string; resolvedName?: string }) => Promise<void>;
  deleteRoutePoint: (tripId: string, pointId: string) => Promise<void>;
  createChangeRequest: (
    tripId: string,
    data: {
      targetType: 'route_point' | 'stop_recommendation';
      targetId: string;
      action: 'edit' | 'delete';
      payload: Record<string, unknown>;
      isAiRequest?: boolean;
    }
  ) => Promise<ChangeRequest | null>;
  approveChangeRequest: (tripId: string, changeRequestId: string) => Promise<void>;
  rejectChangeRequest: (tripId: string, changeRequestId: string) => Promise<void>;
  joinTrip: (tripId: string) => Promise<void>;
  leaveTrip: (tripId: string) => Promise<void>;
  updateTripAiSettings: (
    tripId: string,
    settings: { aiProvider: AiProvider; aiModel: string; aiRecommendationsEnabled: boolean }
  ) => Promise<void>;
  clearError: () => void;
}

function getOrganizerForCreate() {
  const authUser = useAuthStore.getState().user;
  if (authUser) return authUser;
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo@geziplan.app',
    fullName: 'GeziPlan Kullanıcısı',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GeziPlan',
    bio: '',
    createdAt: new Date().toISOString(),
  };
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  isLoading: false,
  lastError: null,

  clearError: () => set({ lastError: null }),

  fetchTrips: async (force = false) => {
    if (!force && get().trips.length > 0 && !isSupabaseConfigured()) return;

    set({ isLoading: true, lastError: null });
    try {
      if (isSupabaseConfigured()) {
        try {
          const trips = await fetchTripsFromDb();
          safeSetItem('geziplan_trips_cache', JSON.stringify(trips));
          set({ trips, isLoading: false });
        } catch (dbError) {
          const cached = safeGetItem('geziplan_trips_cache');
          if (cached) {
            set({
              trips: JSON.parse(cached) as Trip[],
              isLoading: false,
              lastError: 'Çevrimdışı mod: Önbellekteki geziler yükleniyor.',
            });
          } else {
            throw dbError;
          }
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      set({ trips: mockTrips, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        lastError: error instanceof Error ? error.message : 'Geziler yüklenemedi.',
      });
    }
  },

  fetchTripById: async (id) => {
    if (!isSupabaseConfigured()) {
      return get().trips.find((t) => t.id === id) ?? null;
    }

    set({ isLoading: true, lastError: null });
    try {
      const trip = await fetchTripByIdFromDb(id);
      if (trip) {
        const cacheKey = `geziplan_trip_${id}`;
        safeSetItem(cacheKey, JSON.stringify(trip));

        set((state) => ({
          trips: state.trips.some((t) => t.id === id)
            ? state.trips.map((t) => (t.id === id ? trip : t))
            : [trip, ...state.trips],
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
      return trip;
    } catch (error) {
      const cacheKey = `geziplan_trip_${id}`;
      const cached = safeGetItem(cacheKey);
      if (cached) {
        const trip = JSON.parse(cached) as Trip;
        set((state) => ({
          trips: state.trips.some((t) => t.id === id)
            ? state.trips.map((t) => (t.id === id ? trip : t))
            : [trip, ...state.trips],
          isLoading: false,
          lastError: 'Çevrimdışı mod: Önbellekteki gezi detayları gösteriliyor.',
        }));
        return trip;
      }

      set({
        isLoading: false,
        lastError: error instanceof Error ? error.message : 'Gezi yüklenemedi.',
      });
      return null;
    }
  },

  createTrip: async (tripData) => {
    set({ isLoading: true, lastError: null });

    let routeData;
    try {
      routeData = await buildRouteFromCoordinates(
        tripData.startPlace,
        tripData.waypoints,
        tripData.endPlace
      );
    } catch (error) {
      const message =
        error instanceof MapboxError
          ? error.message
          : 'Rota oluşturulurken beklenmeyen bir hata oluştu.';
      set({ lastError: message, isLoading: false });
      throw error;
    }

    try {
      if (isSupabaseConfigured()) {
        const organizer = getOrganizerForCreate();
        if (!useAuthStore.getState().isAuthenticated) {
          throw new Error('Gezi oluşturmak için giriş yapmalısınız.');
        }
        const trip = await createTripInDb(tripData, routeData, organizer);
        set((state) => ({
          trips: [trip, ...state.trips],
          isLoading: false,
          lastError: null,
        }));
        return trip;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
      const organizer = getOrganizerForCreate();
      const newTrip: Trip = {
        id: Math.random().toString(36).slice(2, 11),
        title: tripData.title,
        description: tripData.description,
        category: tripData.category,
        startDate: tripData.startDate,
        startTime: tripData.startTime,
        endDate: tripData.endDate,
        stopRecommendations: [],
        coverImageUrl: tripData.coverImageUrl,
        maxParticipants: tripData.maxParticipants,
        startPoint: tripData.startPlace.name,
        endPoint: tripData.endPlace.name,
        status: 'upcoming',
        organizerId: organizer.id,
        organizerName: organizer.fullName,
        organizerAvatar: organizer.avatarUrl,
        currentParticipants: 1,
        route: routeData.route,
        routeLegs: routeData.routeLegs,
        routeGeometry: routeData.routeGeometry,
        totalDurationMinutes: routeData.totalDurationMinutes,
        totalDistanceKm: routeData.totalDistanceKm,
        pois: [],
        participants: [],
        tags: tripData.waypoints.slice(0, 4).map((w) => w.name.split(',')[0].trim().toLowerCase()),
        rating: 0,
        aiRecommendationsEnabled: tripData.aiRecommendationsEnabled,
        aiProvider: DEFAULT_AI_PROVIDER,
        aiModel: DEFAULT_AI_MODEL,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        trips: [newTrip, ...state.trips],
        isLoading: false,
        lastError: null,
      }));
      return newTrip;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gezi kaydedilemedi.';
      set({ lastError: message, isLoading: false });
      throw error;
    }
  },

  addStopRecommendation: async (tripId, data) => {
    const user = useAuthStore.getState().user;
    const fallbackUser = getOrganizerForCreate();

    if (isSupabaseConfigured() && user) {
      const recommendation = await addStopRecommendationInDb(tripId, data, user);
      set((state) => ({
        trips: state.trips.map((trip) =>
          trip.id === tripId
            ? {
                ...trip,
                stopRecommendations: [...(trip.stopRecommendations ?? []), recommendation],
              }
            : trip
        ),
      }));
      return;
    }

    const recommendation: StopRecommendation = {
      id: Math.random().toString(36).slice(2, 11),
      ...data,
      suggestedById: fallbackUser.id,
      suggestedByName: fallbackUser.fullName,
      suggestedByAvatar: fallbackUser.avatarUrl,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      trips: state.trips.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              stopRecommendations: [...(trip.stopRecommendations ?? []), recommendation],
            }
          : trip
      ),
    }));
  },

  updateStopRecommendation: async (tripId, recommendationId, updates) => {
    if (isSupabaseConfigured()) {
      try {
        await updateStopRecommendationInDb(recommendationId, updates);
      } catch (err) {
        console.warn('DB update recommendation error:', err);
      }
    }

    set((state) => ({
      trips: state.trips.map((trip) => {
        if (trip.id !== tripId) return trip;
        const updatedRecs = (trip.stopRecommendations ?? []).map((rec) =>
          rec.id === recommendationId ? { ...rec, ...updates } : rec
        );
        return { ...trip, stopRecommendations: updatedRecs };
      }),
    }));
  },

  deleteStopRecommendation: async (tripId, recommendationId) => {
    if (isSupabaseConfigured()) {
      try {
        await deleteStopRecommendationInDb(recommendationId);
      } catch (err) {
        console.warn('DB delete recommendation error:', err);
      }
    }

    set((state) => ({
      trips: state.trips.map((trip) => {
        if (trip.id !== tripId) return trip;
        const updatedRecs = (trip.stopRecommendations ?? []).filter((rec) => rec.id !== recommendationId);
        return { ...trip, stopRecommendations: updatedRecs };
      }),
    }));
  },

  updateRoutePoint: async (tripId, pointId, updates) => {
    if (isSupabaseConfigured()) {
      try {
        await updateRoutePointInDb(tripId, pointId, updates);
      } catch (err) {
        console.warn('DB update route point error:', err);
      }
    }

    set((state) => ({
      trips: state.trips.map((trip) => {
        if (trip.id !== tripId) return trip;
        const updatedRoute = trip.route.map((p) =>
          p.id === pointId
            ? { ...p, name: updates.name ?? p.name, resolvedName: updates.resolvedName ?? p.resolvedName }
            : p
        );
        return { ...trip, route: updatedRoute };
      }),
    }));
  },

  deleteRoutePoint: async (tripId, pointId) => {
    if (isSupabaseConfigured()) {
      try {
        await deleteRoutePointInDb(tripId, pointId);
      } catch (err) {
        console.warn('DB delete route point error:', err);
      }
    }

    set((state) => ({
      trips: state.trips.map((trip) => {
        if (trip.id !== tripId) return trip;
        const deletedPoint = trip.route.find((p) => p.id === pointId);
        if (!deletedPoint) return trip;
        const updatedRoute = trip.route
          .filter((p) => p.id !== pointId)
          .map((p) =>
            p.order > deletedPoint.order ? { ...p, order: p.order - 1 } : p
          );
        const updatedLegs = (trip.routeLegs ?? []).filter(
          (leg) => leg.fromOrder !== deletedPoint.order && leg.toOrder !== deletedPoint.order
        );
        return { ...trip, route: updatedRoute, routeLegs: updatedLegs.length ? updatedLegs : undefined };
      }),
    }));
  },

  createChangeRequest: async (tripId, data) => {
    const user = useAuthStore.getState().user;
    const fallbackUser = getOrganizerForCreate();
    const effectiveUser = user ?? fallbackUser;

    if (isSupabaseConfigured() && user) {
      try {
        const cr = await createChangeRequestInDb(tripId, data, user);
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId
              ? { ...trip, changeRequests: [...(trip.changeRequests ?? []), cr] }
              : trip
          ),
        }));
        return cr;
      } catch (err) {
        console.warn('DB create change request error:', err);
      }
    }

    const cr: ChangeRequest = {
      id: Math.random().toString(36).slice(2, 11),
      tripId,
      ...data,
      status: 'pending',
      requestedById: effectiveUser.id,
      requestedByName: effectiveUser.fullName,
      requestedByAvatar: effectiveUser.avatarUrl,
      isAiRequest: data.isAiRequest ?? false,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      trips: state.trips.map((trip) =>
        trip.id === tripId
          ? { ...trip, changeRequests: [...(trip.changeRequests ?? []), cr] }
          : trip
      ),
    }));
    return cr;
  },

  approveChangeRequest: async (tripId, changeRequestId) => {
    const user = useAuthStore.getState().user;
    const trip = get().trips.find((t) => t.id === tripId);
    const cr = trip?.changeRequests?.find((c) => c.id === changeRequestId);
    if (!trip || !cr) return;

    if (isSupabaseConfigured() && user) {
      try {
        await approveChangeRequestInDb(changeRequestId, user.id);
      } catch (err) {
        console.warn('DB approve change request error:', err);
      }
    }

    if (cr.targetType === 'route_point') {
      if (cr.action === 'edit') {
        const payload = cr.payload as { name?: string; resolvedName?: string };
        await get().updateRoutePoint(tripId, cr.targetId, payload);
      } else if (cr.action === 'delete') {
        await get().deleteRoutePoint(tripId, cr.targetId);
      }
    } else if (cr.targetType === 'stop_recommendation') {
      if (cr.action === 'edit') {
        const payload = cr.payload as Partial<Pick<StopRecommendation, 'title' | 'description' | 'durationMinutes' | 'type'>>;
        await get().updateStopRecommendation(tripId, cr.targetId, payload);
      } else if (cr.action === 'delete') {
        await get().deleteStopRecommendation(tripId, cr.targetId);
      }
    }

    set((state) => ({
      trips: state.trips.map((t) => {
        if (t.id !== tripId) return t;
        const updatedCrs = (t.changeRequests ?? []).map((c) =>
          c.id === changeRequestId
            ? { ...c, status: 'approved' as const, resolvedAt: new Date().toISOString(), resolvedById: user?.id }
            : c
        );
        return { ...t, changeRequests: updatedCrs };
      }),
    }));
  },

  rejectChangeRequest: async (tripId, changeRequestId) => {
    const user = useAuthStore.getState().user;

    if (isSupabaseConfigured() && user) {
      try {
        await rejectChangeRequestInDb(changeRequestId, user.id);
      } catch (err) {
        console.warn('DB reject change request error:', err);
      }
    }

    set((state) => ({
      trips: state.trips.map((t) => {
        if (t.id !== tripId) return t;
        const updatedCrs = (t.changeRequests ?? []).map((c) =>
          c.id === changeRequestId
            ? { ...c, status: 'rejected' as const, resolvedAt: new Date().toISOString(), resolvedById: user?.id }
            : c
        );
        return { ...t, changeRequests: updatedCrs };
      }),
    }));
  },

  joinTrip: async (tripId) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase gerekli');
    if (!useAuthStore.getState().isAuthenticated) throw new Error('Giriş yapmalısınız');
    await joinTripInDb(tripId);
    const trip = await fetchTripByIdFromDb(tripId);
    if (trip) {
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? trip : t)),
      }));
    }
  },

  leaveTrip: async (tripId) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase gerekli');
    if (!useAuthStore.getState().isAuthenticated) throw new Error('Giriş yapmalısınız');
    await leaveTripInDb(tripId);
    const trip = await fetchTripByIdFromDb(tripId);
    if (trip) {
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? trip : t)),
      }));
    }
  },

  updateTripAiSettings: async (tripId, settings) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase gerekli');
    const user = useAuthStore.getState().user;
    const trip = get().trips.find((t) => t.id === tripId);
    if (!user || !trip || user.id !== trip.organizerId) {
      throw new Error('Sadece organizatör AI ayarlarını değiştirebilir.');
    }
    const updated = await updateTripAiSettingsInDb(tripId, settings);
    set((state) => ({
      trips: state.trips.map((t) => (t.id === tripId ? updated : t)),
    }));
  },
}));
