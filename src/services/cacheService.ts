import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

async function readCache<T>(table: 'geocode_cache' | 'route_cache', key: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data } = await supabase.from(table).select('result').eq('cache_key', key).maybeSingle();
  return data?.result ? (data.result as T) : null;
}

async function writeCache<T>(table: 'geocode_cache' | 'route_cache', key: string, result: T): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabase();
  await supabase.from(table).upsert({
    cache_key: key,
    result: result as object,
    updated_at: new Date().toISOString(),
  });
}

export async function getGeocodeCache<T>(key: string): Promise<T | null> {
  return readCache<T>('geocode_cache', key);
}

export async function setGeocodeCache<T>(key: string, result: T): Promise<void> {
  await writeCache('geocode_cache', key, result);
}

export async function getRouteCache<T>(key: string): Promise<T | null> {
  return readCache<T>('route_cache', key);
}

export async function setRouteCache<T>(key: string, result: T): Promise<void> {
  await writeCache('route_cache', key, result);
}

export function buildGeocodeCacheKey(query: string, proximity?: { longitude: number; latitude: number }): string {
  const prox = proximity ? `@${proximity.longitude.toFixed(4)},${proximity.latitude.toFixed(4)}` : '';
  return `geo:${query.toLocaleLowerCase('tr-TR').trim()}${prox}`;
}

export function buildRouteCacheKey(coordinates: string): string {
  return `route:${coordinates}`;
}
