import { proxyAiChat, proxyAiSuggestPois, isAiProxyAvailable } from '../lib/aiApi';
import type { TripContext } from '../lib/tripContext';
import type { AIRecommendation, AIMessage } from '../types';

function mapRecommendations(
  items: Array<{
    type: string;
    title: string;
    description: string;
    rating?: number;
    priceLevel?: number;
    distance?: string;
    tags?: string[];
  }> = []
): AIRecommendation[] {
  return items.map((item, index) => ({
    id: `ai-${Date.now()}-${index}`,
    type: (item.type as AIRecommendation['type']) || 'mekan',
    title: item.title,
    description: item.description,
    rating: item.rating ?? 4.0,
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/400/240`,
    priceLevel: (item.priceLevel ?? 2) as AIRecommendation['priceLevel'],
    distance: item.distance,
    tags: item.tags ?? [],
  }));
}

export async function sendAiMessage(
  history: AIMessage[],
  userContent: string,
  tripContext?: TripContext
): Promise<AIMessage> {
  // AI Natural Language Command Execution Check
  const commandResult = await processNaturalLanguageTripCommand(userContent, tripContext);

  const messages = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userContent },
  ];

  if (!isAiProxyAvailable()) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: commandResult ?? '.env dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı olmalı.',
      timestamp: new Date().toISOString(),
    };
  }

  const result = await proxyAiChat(messages, tripContext);
  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    content: commandResult ? `${commandResult}\n\n${result?.reply ?? ''}` : (result?.reply ?? 'AI yanıt veremedi.'),
    recommendations: mapRecommendations(result?.recommendations),
    timestamp: new Date().toISOString(),
  };
}

async function processNaturalLanguageTripCommand(prompt: string, tripContext?: TripContext): Promise<string | null> {
  if (!tripContext?.tripId) return null;
  const lower = prompt.toLowerCase();
  const isChangeCmd = lower.includes('değiştir') || lower.includes('güncelle') || lower.includes('yerine') || lower.includes('yap');
  const isDeleteCmd = lower.includes('sil') || lower.includes('kaldır');

  if (!isChangeCmd && !isDeleteCmd) return null;

  const { useTripStore } = await import('../store/tripStore');
  const store = useTripStore.getState();
  const trip = store.trips.find((t) => t.id === tripContext.tripId);
  if (!trip) return null;

  const recs = trip.stopRecommendations ?? [];

  const durationMatch = prompt.match(/(\d+)\s*(dk|dakika)/i);
  const parsedDuration = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

  for (const rec of recs) {
    const titleLower = rec.title.toLowerCase();
    const isTarget = lower.includes(titleLower) || titleLower.split(' ').some((word) => word.length > 2 && lower.includes(word));

    if (isTarget) {
      if (isDeleteCmd && !isChangeCmd) {
        await store.createChangeRequest(trip.id, {
          targetType: 'stop_recommendation',
          targetId: rec.id,
          action: 'delete',
          payload: {},
          isAiRequest: true,
        });
        return `📋 "${rec.title}" durak kaydının silinmesi için organizatör onayına talep gönderildi.`;
      }

      const changeMatch = prompt.match(/(?:yerine|değiştir|yap|olarak)\s*([A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]{2,30}?)(?:\s*\d+\s*(?:dk|dakika)|$)/i) ||
                          prompt.match(/([A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]{2,30}?)\s*(?:olarak|\s+\d+\s*dk)/i);

      let newTitle = rec.title;
      if (changeMatch && changeMatch[1]) {
        const extracted = changeMatch[1].trim();
        if (extracted && !extracted.toLowerCase().includes('mola') && !extracted.toLowerCase().includes('konaklama')) {
          newTitle = extracted;
        }
      }

      const isHotel = lower.includes('otel') || lower.includes('konaklama');
      const newType = isHotel ? 'konaklama' : rec.type;
      const newDuration = parsedDuration ?? (rec.durationMinutes || 20);

      await store.createChangeRequest(trip.id, {
        targetType: 'stop_recommendation',
        targetId: rec.id,
        action: 'edit',
        payload: {
          title: newTitle !== rec.title ? newTitle : rec.title,
          durationMinutes: newDuration,
          type: newType,
        },
        isAiRequest: true,
      });

      return `📋 "${rec.title}" durağının "${newTitle}" (${newDuration} dk ${newType}) olarak değiştirilmesi için organizatör onayına talep gönderildi.`;
    }
  }

  const addMatch = prompt.match(/([A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]{2,25}?)\s*(?:mola|konaklama|ekle)/i);
  if (addMatch && addMatch[1]) {
    const title = addMatch[1].trim();
    const duration = parsedDuration ?? 20;
    const isHotel = lower.includes('otel') || lower.includes('konaklama');
    const routeOrder = trip.route[Math.floor(trip.route.length / 2)]?.order ?? 1;

    await store.addStopRecommendation(trip.id, {
      routePointOrder: routeOrder,
      title: title.length > 2 ? title : 'Özel Mola Noktası',
      type: isHotel ? 'konaklama' : 'mola',
      durationMinutes: duration,
      description: 'AI Tarafından İstek Üzerine Eklenen Durak',
    });

    return `✨ Harika! Programınıza "${title}" (${duration} dk ${isHotel ? 'konaklama' : 'mola'}) durağı eklendi.`;
  }

  return null;
}

export async function suggestPoisForTrip(
  tripContext: TripContext,
  poiType: 'restoran' | 'kafe' | 'mola',
  routePointOrder?: number
): Promise<AIMessage> {
  if (!isAiProxyAvailable()) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `${poiType} önerisi için Supabase yapılandırması eksik.`,
      timestamp: new Date().toISOString(),
    };
  }

  const result = await proxyAiSuggestPois(tripContext, { poiType, routePointOrder });
  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    content: result?.reply ?? `${poiType} önerisi alınamadı.`,
    recommendations: mapRecommendations(result?.recommendations),
    timestamp: new Date().toISOString(),
  };
}
