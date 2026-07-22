import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { ChatMessage, User } from '../types';

const MESSAGE_SELECT = `
  *,
  sender:profiles!sender_id (id, full_name, avatar_url)
`;

interface ChatRow {
  id: string;
  trip_id: string;
  sender_id: string | null;
  content: string;
  message_type: string;
  created_at: string;
  sender: { id: string; full_name: string; avatar_url: string | null } | null;
}

function mapMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    tripId: row.trip_id,
    senderId: row.sender_id ?? '',
    senderName: row.sender?.full_name ?? 'Kullanıcı',
    senderAvatar: row.sender?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=chat',
    content: row.content,
    messageType: (row.message_type as ChatMessage['messageType']) ?? 'text',
    createdAt: row.created_at,
  };
}

export async function fetchChatMessages(tripId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('chat_messages')
    .select(MESSAGE_SELECT)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as ChatRow[]).map(mapMessage);
}

export async function sendChatMessage(tripId: string, content: string, user: User): Promise<ChatMessage> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      trip_id: tripId,
      sender_id: user.id,
      content,
      message_type: 'text',
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  return mapMessage(data as ChatRow);
}

export function subscribeToChatMessages(
  tripId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  if (!isSupabaseConfigured()) return () => undefined;

  const supabase = getSupabase();
  const channel = supabase
    .channel(`trip-chat-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      async () => {
        const messages = await fetchChatMessages(tripId);
        const latest = messages[messages.length - 1];
        if (latest) onMessage(latest);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
