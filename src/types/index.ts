export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
}

import type { AiProvider } from '../lib/aiProviders';

export interface Trip {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  startDate: string;
  endDate: string;
  /** HH:mm — gezi kalkış saati */
  startTime?: string;
  stopRecommendations?: StopRecommendation[];
  changeRequests?: ChangeRequest[];
  organizerId: string;
  organizerName: string;
  organizerAvatar: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  category: 'doğa' | 'tarih' | 'şehir' | 'deniz' | 'kış' | 'macera';
  route: RoutePoint[];
  routeLegs?: RouteLeg[];
  routeGeometry?: GeoJSON.LineString;
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
  startPoint?: string;
  endPoint?: string;
  pois: POI[];
  participants: Participant[];
  tags: string[];
  rating: number;
  aiRecommendationsEnabled?: boolean;
  aiProvider?: AiProvider;
  aiModel?: string;
  createdAt: string;
}

export type { AiProvider };

export interface RoutePoint {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  /** Mapbox'un döndürdüğü tam adres — yanlış eşleşmeyi kontrol için */
  resolvedName?: string;
  order: number;
}

export interface RouteLeg {
  fromOrder: number;
  toOrder: number;
  durationMinutes: number;
  distanceKm: number;
}

export interface StopRecommendation {
  id: string;
  routePointOrder: number;
  type: 'mola' | 'konaklama';
  title: string;
  description?: string;
  durationMinutes: number;
  suggestedById: string;
  suggestedByName: string;
  suggestedByAvatar: string;
  createdAt: string;
}

export interface GeoPlace {
  name: string;
  longitude: number;
  latitude: number;
  address?: string;
}

export interface PlannedWaypoint extends GeoPlace {
  id: string;
  source: 'search' | 'map';
}

export interface CreateTripInput {
  title: string;
  description: string;
  category: Trip['category'];
  startDate: string;
  startTime: string;
  endDate: string;
  maxParticipants: number;
  coverImageUrl: string;
  startPlace: GeoPlace;
  endPlace: GeoPlace;
  waypoints: PlannedWaypoint[];
  aiRecommendationsEnabled: boolean;
}

export interface POI {
  id: string;
  tripId: string;
  name: string;
  description: string;
  category: 'tarihi' | 'turistik' | 'restoran' | 'kafe' | 'otel' | 'doğa' | 'müze' | 'alışveriş';
  latitude: number;
  longitude: number;
  rating: number;
  imageUrl: string;
  address: string;
  priceLevel: 1 | 2 | 3 | 4;
  aiRecommended: boolean;
  openingHours?: string;
  phone?: string;
  website?: string;
}

export interface Participant {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string;
  role: 'organizer' | 'admin' | 'member';
  status: 'confirmed' | 'pending' | 'declined';
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  messageType: 'text' | 'image' | 'location' | 'system' | 'ai';
  createdAt: string;
}

export interface AIRecommendation {
  id: string;
  poiId?: string;
  type: 'restoran' | 'kafe' | 'mekan' | 'aktivite' | 'rota';
  title: string;
  description: string;
  rating: number;
  imageUrl: string;
  priceLevel: 1 | 2 | 3 | 4;
  distance?: string;
  tags: string[];
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: AIRecommendation[];
  timestamp: string;
}

export interface ChangeRequest {
  id: string;
  tripId: string;
  targetType: 'route_point' | 'stop_recommendation';
  targetId: string;
  action: 'edit' | 'delete';
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  requestedById: string;
  requestedByName: string;
  requestedByAvatar: string;
  isAiRequest: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedById?: string;
}

export type TripCategory = Trip['category'];
export type POICategory = POI['category'];
