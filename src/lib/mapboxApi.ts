import { getSupabase, isSupabaseConfigured, normalizeSupabaseUrl } from './supabase';
import { getMapboxToken } from './mapbox';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  ? normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string)
  : undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isMapboxProxyAvailable(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

async function callProxy<T>(payload: Record<string, unknown>): Promise<T | null> {
  if (!isMapboxProxyAvailable()) return null;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/mapbox-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey!,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface GeocodingProxyResponse {
  features: Array<{ place_name: string; center: [number, number]; relevance?: number }>;
}

export async function proxyGeocode(
  query: string,
  proximity?: { longitude: number; latitude: number },
  limit = 5
): Promise<GeocodingProxyResponse | null> {
  return callProxy<GeocodingProxyResponse>({ action: 'geocode', query, proximity, limit });
}

export async function proxyReverseGeocode(
  longitude: number,
  latitude: number
): Promise<GeocodingProxyResponse | null> {
  return callProxy<GeocodingProxyResponse>({ action: 'reverse', longitude, latitude });
}

interface DirectionsProxyResponse {
  routes: Array<{
    geometry: GeoJSON.LineString;
    legs: Array<{ duration: number; distance: number }>;
  }>;
  code: string;
  message?: string;
}

export async function proxyDirections(coordinates: string): Promise<DirectionsProxyResponse | null> {
  return callProxy<DirectionsProxyResponse>({ action: 'directions', coordinates });
}

export async function directMapboxFetch<T>(url: URL): Promise<T> {
  const token = getMapboxToken();
  if (!token) throw new Error('Mapbox token missing');
  url.searchParams.set('access_token', token);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox error ${res.status}`);
  return res.json() as Promise<T>;
}
