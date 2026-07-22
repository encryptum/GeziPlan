import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN') ?? Deno.env.get('VITE_MAPBOX_ACCESS_TOKEN');
const TURKEY_BBOX = '25.66,35.81,44.82,42.27';

const ALLOWED_PROVIDERS = ['gemini', 'openai', 'deepseek'] as const;
type AiProvider = (typeof ALLOWED_PROVIDERS)[number];

const ALLOWED_MODELS: Record<AiProvider, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};

const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TripContext {
  tripId: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  route: Array<{ order: number; name: string; latitude: number; longitude: number }>;
  routeLegs?: Array<{ fromStop: string; toStop: string; durationMinutes: number; distanceKm: number }>;
  stopRecommendations?: Array<{ type: string; title: string; atStopOrder: number }>;
  aiEnabled?: boolean;
  aiProvider?: string;
  aiModel?: string;
  scheduleSummary?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiRecommendation {
  type: string;
  title: string;
  description: string;
  rating?: number;
  priceLevel?: number;
  distance?: string;
  tags?: string[];
}

interface AiConfig {
  provider: AiProvider;
  model: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'chat') {
      const { messages, tripContext } = body as {
        messages: ChatMessage[];
        tripContext?: TripContext;
      };
      const result = await handleChat(messages ?? [], tripContext);
      return jsonResponse(result);
    }

    if (action === 'suggest_pois') {
      const { tripContext, routePointOrder, poiType } = body as {
        tripContext: TripContext;
        routePointOrder?: number;
        poiType?: 'restoran' | 'kafe' | 'mola';
      };
      if (!tripContext) return jsonResponse({ error: 'tripContext required' }, 400);
      const result = await handleSuggestPois(tripContext, routePointOrder, poiType ?? 'restoran');
      return jsonResponse(result);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('ai-assistant error:', error);
    return jsonResponse({ error: String(error) }, 500);
  }
});

function resolveAiConfig(tripContext?: TripContext): AiConfig {
  const rawProvider = tripContext?.aiProvider?.toLowerCase() ?? 'deepseek';
  const provider = ALLOWED_PROVIDERS.includes(rawProvider as AiProvider)
    ? (rawProvider as AiProvider)
    : 'deepseek';
  const modelList = ALLOWED_MODELS[provider];
  const model = tripContext?.aiModel && modelList.includes(tripContext.aiModel)
    ? tripContext.aiModel
    : DEFAULT_MODELS[provider];
  return { provider, model };
}

async function handleChat(messages: ChatMessage[], tripContext?: TripContext) {
  const aiConfig = resolveAiConfig(tripContext);
  const systemPrompt = buildSystemPrompt(tripContext);
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return { reply: 'Bir soru yazabilirsiniz.', recommendations: [] };
  }

  if (tripContext?.aiEnabled === false) {
    return {
      reply: 'Bu gezi için AI önerileri organizatör tarafından kapatılmış.',
      recommendations: [],
    };
  }

  const llmReply = await callLlm(systemPrompt, messages, aiConfig);
  if (llmReply) {
    return parseLlmResponse(llmReply);
  }

  return buildFallbackReply(lastUser.content, tripContext, aiConfig);
}

async function handleSuggestPois(
  tripContext: TripContext,
  routePointOrder?: number,
  poiType: 'restoran' | 'kafe' | 'mola' = 'restoran'
) {
  const aiConfig = resolveAiConfig(tripContext);
  const point = pickRoutePoint(tripContext, routePointOrder);
  if (!point) {
    return {
      reply: 'Rota üzerinde öneri için uygun bir durak bulunamadı.',
      recommendations: [],
    };
  }

  const searchQuery = poiType === 'kafe' ? 'kafe' : poiType === 'mola' ? 'benzin istasyonu mola' : 'restoran';
  const pois = await searchNearbyPois(point.longitude, point.latitude, searchQuery, 8);

  if (!hasProviderKey(aiConfig.provider)) {
    const recommendations = pois.slice(0, 3).map((p, i) => mapPoiToRecommendation(p, poiType, i));
    return {
      reply: `${point.name} yakınında ${recommendations.length} ${poiType} önerisi:`,
      recommendations,
    };
  }

  const poiList = pois
    .map((p, i) => `${i + 1}. ${p.name} — ${p.address ?? 'adres yok'} (${p.distanceKm} km)`)
    .join('\n');

  const prompt = `Gezi: "${tripContext.title}" (${tripContext.category})
Durak: ${point.name} (sıra ${point.order})
İstenen: ${poiType}

Yakındaki mekanlar:
${poiList || 'Haritada sonuç bulunamadı — genel öneri ver.'}

En iyi 3 öneriyi seç ve JSON döndür:
{"reply":"kısa Türkçe özet","recommendations":[{"type":"${poiType}","title":"...","description":"neden önerildi","rating":4.5,"priceLevel":2,"distance":"~2 km","tags":["etiket"]}]}`;

  const raw = await callLlm(buildSystemPrompt(tripContext), [{ role: 'user', content: prompt }], aiConfig);
  if (raw) return parseLlmResponse(raw);

  return {
    reply: `${point.name} çevresinde öneriler:`,
    recommendations: pois.slice(0, 3).map((p, i) => mapPoiToRecommendation(p, poiType, i)),
  };
}

function buildSystemPrompt(tripContext?: TripContext): string {
  const base = `Sen GeziPlan uygulamasının Türkçe gezi asistanısın.
Kısa, samimi ve pratik cevaplar ver. Uydurma adres/telefon yazma.
Restoran/kafe önerirken mevcut rota ve saatlere uygun öner.
JSON istendiğinde SADECE geçerli JSON döndür, markdown kullanma.`;

  if (!tripContext) {
    return `${base}\n\nKullanıcı henüz bir gezi seçmedi; genel gezi planlama tavsiyeleri ver.`;
  }

  const routeText = tripContext.route
    .map((p) => `${p.order}. ${p.name}`)
    .join(' → ');

  const legsText = (tripContext.routeLegs ?? [])
    .map((l) => `${l.fromStop} → ${l.toStop}: ${l.durationMinutes} dk, ${l.distanceKm} km`)
    .join('\n');

  const stopsText = (tripContext.stopRecommendations ?? [])
    .map((s) => `- ${s.type}: ${s.title} (durak ${s.atStopOrder})`)
    .join('\n');

  return `${base}

## Aktif gezi bağlamı
Başlık: ${tripContext.title}
Kategori: ${tripContext.category}
Tarih: ${tripContext.startDate} – ${tripContext.endDate}${tripContext.startTime ? `, kalkış ${tripContext.startTime}` : ''}
Açıklama: ${tripContext.description}
Rota: ${routeText}
${legsText ? `Bacaklar:\n${legsText}` : ''}
${stopsText ? `Mevcut öneriler:\n${stopsText}` : 'Henüz mola/konaklama önerisi yok.'}
${tripContext.scheduleSummary ? `Program özeti:\n${tripContext.scheduleSummary}` : ''}`;
}

async function callLlm(
  systemPrompt: string,
  messages: ChatMessage[],
  aiConfig: AiConfig
): Promise<string | null> {
  if (!hasProviderKey(aiConfig.provider)) return null;

  if (aiConfig.provider === 'openai' && OPENAI_API_KEY) {
    return callOpenAiCompatible(
      'https://api.openai.com/v1/chat/completions',
      OPENAI_API_KEY,
      aiConfig.model,
      systemPrompt,
      messages
    );
  }

  if (aiConfig.provider === 'deepseek' && DEEPSEEK_API_KEY) {
    return callOpenAiCompatible(
      'https://api.deepseek.com/chat/completions',
      DEEPSEEK_API_KEY,
      aiConfig.model,
      systemPrompt,
      messages
    );
  }

  if (aiConfig.provider === 'gemini' && GEMINI_API_KEY) {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) {
      console.error(`Gemini ${aiConfig.model} error`, await res.text());
      return null;
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  return null;
}

async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string | null> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!res.ok) {
    console.error(`${endpoint} error`, await res.text());
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

function parseLlmResponse(raw: string): { reply: string; recommendations: AiRecommendation[] } {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        reply: String(parsed.reply ?? parsed.message ?? trimmed),
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch {
      // fall through
    }
  }
  return { reply: trimmed, recommendations: [] };
}

function buildFallbackReply(userMessage: string, tripContext?: TripContext, aiConfig?: AiConfig) {
  const providerName = aiConfig?.provider ?? 'gemini';
  const keyHint =
    providerName === 'deepseek'
      ? 'DEEPSEEK_API_KEY'
      : providerName === 'openai'
        ? 'OPENAI_API_KEY'
        : 'GEMINI_API_KEY';

  const lower = userMessage.toLowerCase();
  if (tripContext) {
    const mid = tripContext.route[Math.floor(tripContext.route.length / 2)];
    if (lower.includes('mola') || lower.includes('yemek') || lower.includes('restoran') || lower.includes('kafe')) {
      return {
        reply: `AI anahtarı yapılandırılmamış (${keyHint}). "${mid?.name ?? 'rota'}" yakınında yerel restoranları haritadan arayabilirsiniz.`,
        recommendations: [],
      };
    }
    return {
      reply: `"${tripContext.title}" için ${providerName}/${aiConfig?.model ?? ''} seçili. Tam yanıt için Supabase'de ${keyHint} tanımlayın.`,
      recommendations: [],
    };
  }
  return {
    reply: 'GeziPlan AI\'ya hoş geldiniz! Bir gezi detay sayfasından sorarsanız rotanıza özel öneriler verebilirim.',
    recommendations: [],
  };
}

interface MapPoi {
  name: string;
  address?: string;
  distanceKm: string;
  longitude: number;
  latitude: number;
}

async function searchNearbyPois(
  longitude: number,
  latitude: number,
  query: string,
  limit: number
): Promise<MapPoi[]> {
  if (!MAPBOX_TOKEN) return [];

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('proximity', `${longitude},${latitude}`);
  url.searchParams.set('types', 'poi');
  url.searchParams.set('country', 'tr');
  url.searchParams.set('bbox', TURKEY_BBOX);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('language', 'tr');

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();

  return (data.features ?? []).map((f: { text: string; place_name: string; center: [number, number] }) => {
    const [lon, lat] = f.center;
    const dist = haversineKm(latitude, longitude, lat, lon);
    return {
      name: f.text || f.place_name.split(',')[0],
      address: f.place_name,
      distanceKm: dist.toFixed(1),
      longitude: lon,
      latitude: lat,
    };
  });
}

function mapPoiToRecommendation(poi: MapPoi, poiType: string, index: number): AiRecommendation {
  return {
    type: poiType,
    title: poi.name,
    description: poi.address ?? 'Rota yakınında önerilen mekan.',
    rating: 4.2 + (index % 3) * 0.2,
    priceLevel: 2,
    distance: `~${poi.distanceKm} km`,
    tags: ['harita', 'yakın'],
  };
}

function pickRoutePoint(tripContext: TripContext, routePointOrder?: number) {
  if (!tripContext.route.length) return null;
  if (routePointOrder != null) {
    return tripContext.route.find((p) => p.order === routePointOrder) ?? tripContext.route[0];
  }
  const mid = Math.floor(tripContext.route.length / 2);
  return tripContext.route[mid] ?? tripContext.route[0];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasProviderKey(provider: AiProvider): boolean {
  switch (provider) {
    case 'openai':
      return Boolean(OPENAI_API_KEY);
    case 'deepseek':
      return Boolean(DEEPSEEK_API_KEY);
    case 'gemini':
      return Boolean(GEMINI_API_KEY);
    default:
      return false;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
