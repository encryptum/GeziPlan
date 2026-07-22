import type { RouteLeg, RoutePoint } from '../types';
import {
  buildGeocodeCacheKey,
  buildRouteCacheKey,
  getGeocodeCache,
  getRouteCache,
  setGeocodeCache,
  setRouteCache,
} from '../services/cacheService';
import { directMapboxFetch, proxyDirections, proxyGeocode, proxyReverseGeocode } from './mapboxApi';

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
const TURKEY_BBOX = '25.66,35.81,44.82,42.27';
const MAX_LEG_DISTANCE_KM = 400;

export function getMapboxToken(): string | undefined {
  return TOKEN?.trim() || undefined;
}

export function hasMapboxToken(): boolean {
  return Boolean(getMapboxToken());
}

interface GeocodingFeature {
  place_name: string;
  center: [number, number];
  relevance?: number;
}

/** Kısa / belirsiz aramalarda doğru POI'ye yönlendirme */
const PLACE_ALIASES: Record<string, string> = {
  'sart harabeleri': 'Sart Sardes antik kent Salihli Manisa',
  'sart harabesi': 'Sart Sardes antik kent Salihli Manisa',
  'sardes': 'Sart Sardes antik kent Salihli Manisa',
  'sardes antik kenti': 'Sart Sardes antik kent Salihli Manisa',
  'adnan menderes havalimanı': 'Izmir Adnan Menderes Airport Gaziemir',
  'adnan menderes havaalanı': 'Izmir Adnan Menderes Airport Gaziemir',
  'izmir havalimanı': 'Izmir Adnan Menderes Airport Gaziemir',
  'izmir havaalanı': 'Izmir Adnan Menderes Airport Gaziemir',
  adb: 'Izmir Adnan Menderes Airport Gaziemir',
};

function normalizeQuery(query: string): string {
  const trimmed = query.trim();
  const alias = PLACE_ALIASES[trimmed.toLocaleLowerCase('tr-TR')];
  return alias ?? trimmed;
}

interface Proximity {
  longitude: number;
  latitude: number;
}

interface GeocodingResponse {
  features: GeocodingFeature[];
}

interface DirectionsLeg {
  duration: number;
  distance: number;
}

interface DirectionsRoute {
  geometry: GeoJSON.LineString;
  legs: DirectionsLeg[];
}

interface DirectionsResponse {
  routes: DirectionsRoute[];
  code: string;
  message?: string;
}

export class MapboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MapboxError';
  }
}

function requireToken(): string {
  const token = getMapboxToken();
  if (!token) {
    throw new MapboxError(
      'Mapbox erişim anahtarı bulunamadı. Proje kökünde .env dosyasına VITE_MAPBOX_ACCESS_TOKEN ekleyin.'
    );
  }
  return token;
}

async function fetchGeocoding(
  normalizedQuery: string,
  proximity?: Proximity,
  limit = 5
): Promise<GeocodingResponse> {
  const cacheKey = buildGeocodeCacheKey(normalizedQuery, proximity);
  const cached = await getGeocodeCache<GeocodingResponse>(cacheKey);
  if (cached) return cached;

  const proxyData = await proxyGeocode(normalizedQuery, proximity, limit);
  if (proxyData?.features) {
    await setGeocodeCache(cacheKey, proxyData);
    return proxyData;
  }

  const token = requireToken();
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedQuery)}.json`
  );
  url.searchParams.set('country', 'tr');
  url.searchParams.set('bbox', TURKEY_BBOX);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('language', 'tr');
  url.searchParams.set('types', 'poi,address,place,locality,neighborhood');
  if (proximity) {
    url.searchParams.set('proximity', `${proximity.longitude},${proximity.latitude}`);
  }

  const data = await directMapboxFetch<GeocodingResponse>(url);
  await setGeocodeCache(cacheKey, data);
  return data;
}

export async function geocodePlace(
  query: string,
  proximity?: Proximity
): Promise<{ name: string; longitude: number; latitude: number }> {
  const normalizedQuery = normalizeQuery(query);
  const data = await fetchGeocoding(normalizedQuery, proximity, 5);
  const feature = pickBestFeature(data.features, proximity);
  if (!feature) {
    throw new MapboxError(`"${query}" için sonuç bulunamadı.`);
  }

  const [longitude, latitude] = feature.center;
  return { name: feature.place_name, longitude, latitude };
}

function pickBestFeature(features: GeocodingFeature[], proximity?: Proximity): GeocodingFeature | undefined {
  if (!features.length) return undefined;
  if (!proximity) return features[0];

  let best = features[0];
  let bestScore = scoreFeature(features[0], proximity);

  for (const feature of features.slice(1)) {
    const score = scoreFeature(feature, proximity);
    if (score > bestScore) {
      best = feature;
      bestScore = score;
    }
  }

  return best;
}

function scoreFeature(feature: GeocodingFeature, proximity: Proximity): number {
  const [lon, lat] = feature.center;
  const distanceKm = haversineKm(proximity.latitude, proximity.longitude, lat, lon);
  const relevance = feature.relevance ?? 0.5;

  // Yakın + yüksek relevance = daha iyi eşleşme
  return relevance * 100 - Math.min(distanceKm, 800) * 0.08;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchPlaces(
  query: string,
  proximity?: Proximity
): Promise<Array<{ id: string; name: string; longitude: number; latitude: number }>> {
  if (!query.trim() || query.length < 2) return [];

  const normalizedQuery = normalizeQuery(query);
  let data: GeocodingResponse;
  try {
    data = await fetchGeocoding(normalizedQuery, proximity, 5);
  } catch {
    return [];
  }
  return data.features.map((feature, index) => {
    const [longitude, latitude] = feature.center;
    return {
      id: `${feature.place_name}-${index}`,
      name: feature.place_name,
      longitude,
      latitude,
    };
  });
}

export interface GeoPlace {
  name: string;
  longitude: number;
  latitude: number;
}

export interface BuiltRoute {
  route: RoutePoint[];
  routeLegs: RouteLeg[];
  routeGeometry: GeoJSON.LineString;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  warnings?: string[];
}

export async function reverseGeocode(longitude: number, latitude: number): Promise<GeoPlace> {
  const cacheKey = buildGeocodeCacheKey(`rev:${longitude.toFixed(5)},${latitude.toFixed(5)}`);
  const cached = await getGeocodeCache<GeocodingResponse>(cacheKey);
  let data: GeocodingResponse | null = cached;

  if (!data) {
    data = (await proxyReverseGeocode(longitude, latitude)) ?? null;
    if (!data) {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
      );
      url.searchParams.set('language', 'tr');
      url.searchParams.set('limit', '1');
      data = await directMapboxFetch<GeocodingResponse>(url);
    }
    await setGeocodeCache(cacheKey, data);
  }
  const feature = data.features[0];
  if (!feature) {
    return {
      name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      longitude,
      latitude,
    };
  }

  const [lon, lat] = feature.center;
  return { name: feature.place_name, longitude: lon, latitude: lat };
}

export async function buildRouteFromCoordinates(
  start: GeoPlace,
  waypoints: GeoPlace[],
  end: GeoPlace
): Promise<BuiltRoute> {
  const allPoints = [start, ...waypoints, end];
  const coordinates = allPoints.map((p) => `${p.longitude},${p.latitude}`).join(';');

  const routeCacheKey = buildRouteCacheKey(coordinates);
  let data: DirectionsResponse | null = await getRouteCache<DirectionsResponse>(routeCacheKey);

  if (!data) {
    data = (await proxyDirections(coordinates)) ?? null;
    if (!data) {
      const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`);
      url.searchParams.set('geometries', 'geojson');
      url.searchParams.set('overview', 'full');
      url.searchParams.set('steps', 'false');
      url.searchParams.set('language', 'tr');
      data = await directMapboxFetch<DirectionsResponse>(url);
    }
    await setRouteCache(routeCacheKey, data);
  }
  if (!data.routes?.length) {
    throw new MapboxError(data.message ?? 'Bu noktalar arasında sürüş rotası bulunamadı.');
  }

  const directionsRoute = data.routes[0];
  const route: RoutePoint[] = allPoints.map((point, index) => ({
    id: `rp-${index}`,
    name: point.name.split(',')[0].trim(),
    resolvedName: point.name,
    longitude: point.longitude,
    latitude: point.latitude,
    order: index + 1,
  }));

  const routeLegs: RouteLeg[] = directionsRoute.legs.map((leg, index) => ({
    fromOrder: index + 1,
    toOrder: index + 2,
    durationMinutes: Math.round(leg.duration / 60),
    distanceKm: Math.round((leg.distance / 1000) * 10) / 10,
  }));

  const totalDurationMinutes = routeLegs.reduce((sum, leg) => sum + leg.durationMinutes, 0);
  const totalDistanceKm = Math.round(routeLegs.reduce((sum, leg) => sum + leg.distanceKm, 0) * 10) / 10;

  const warnings = validateRouteLegs(route, routeLegs);

  return {
    route,
    routeLegs,
    routeGeometry: directionsRoute.geometry,
    totalDurationMinutes,
    totalDistanceKm,
    warnings: warnings.length ? warnings : undefined,
  };
}

function validateRouteLegs(route: RoutePoint[], legs: RouteLeg[]): string[] {
  const warnings: string[] = [];
  for (const leg of legs) {
    if (leg.distanceKm > MAX_LEG_DISTANCE_KM) {
      const from = route.find((p) => p.order === leg.fromOrder)?.name ?? `Durak ${leg.fromOrder}`;
      const to = route.find((p) => p.order === leg.toOrder)?.name ?? `Durak ${leg.toOrder}`;
      warnings.push(
        `${from} → ${to} arası ${leg.distanceKm} km görünüyor. Yanlış konum seçilmiş olabilir.`
      );
    }
  }
  return warnings;
}

/** Metin tabanlı — geriye dönük uyumluluk */
export async function buildRouteFromPlaces(
  startQuery: string,
  endQuery: string,
  waypointQueries: string[]
): Promise<BuiltRoute> {
  const start = await geocodePlace(startQuery);
  let previous: Proximity = { longitude: start.longitude, latitude: start.latitude };

  const waypoints: GeoPlace[] = [];
  for (const query of waypointQueries) {
    if (!query.trim()) continue;
    const point = await geocodePlace(query.trim(), previous);
    waypoints.push(point);
    previous = { longitude: point.longitude, latitude: point.latitude };
  }

  const end = await geocodePlace(endQuery, previous);
  return buildRouteFromCoordinates(start, waypoints, end);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} sa`;
}

export function parsePlacesInput(input: string): string[] {
  return input
    .split(/[\n,;]+/)
    .map((place) => place.trim())
    .filter(Boolean);
}
