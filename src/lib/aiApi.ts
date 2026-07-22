import { getSupabase, isSupabaseConfigured, normalizeSupabaseUrl } from './supabase';
import type { TripContext } from './tripContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  ? normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string)
  : undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiApiRecommendation {
  type: string;
  title: string;
  description: string;
  rating?: number;
  priceLevel?: number;
  distance?: string;
  tags?: string[];
}

export interface AiApiResponse {
  reply: string;
  recommendations?: AiApiRecommendation[];
  error?: string;
}

export function isAiProxyAvailable(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  let token = supabaseAnonKey!;
  if (isSupabaseConfigured()) {
    const { data } = await getSupabase().auth.getSession();
    if (data.session?.access_token) {
      token = data.session.access_token;
    }
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: supabaseAnonKey!,
  };
}

async function callAiProxy(payload: Record<string, unknown>): Promise<AiApiResponse | null> {
  if (!isAiProxyAvailable()) return null;

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorText = `AI servisi hatası (${res.status})`;
      try {
        const err = (await res.json()) as AiApiResponse;
        errorText = err.error ?? errorText;
      } catch {
        errorText = (await res.text()) || errorText;
      }
      if (res.status === 404) {
        errorText = 'ai-assistant function deploy edilmemiş. CLI: npx supabase functions deploy ai-assistant';
      }
      return { reply: errorText, recommendations: [] };
    }
    const data = (await res.json()) as AiApiResponse;
    return data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bağlantı hatası';
    return { reply: `AI servisine ulaşılamadı: ${msg}`, recommendations: [] };
  }
}

export async function proxyAiChat(
  messages: AiChatMessage[],
  tripContext?: TripContext
): Promise<AiApiResponse | null> {
  return callAiProxy({ action: 'chat', messages, tripContext });
}

export async function proxyAiSuggestPois(
  tripContext: TripContext,
  options?: { routePointOrder?: number; poiType?: 'restoran' | 'kafe' | 'mola' }
): Promise<AiApiResponse | null> {
  return callAiProxy({
    action: 'suggest_pois',
    tripContext,
    routePointOrder: options?.routePointOrder,
    poiType: options?.poiType ?? 'restoran',
  });
}
