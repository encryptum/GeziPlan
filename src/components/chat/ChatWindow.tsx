import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { safeGetItem, safeSetItem } from '../../lib/storage';
import { fetchChatMessages, sendChatMessage, subscribeToChatMessages } from '../../services/chatService';
import { mockMessages } from '../../lib/mockData';
import { sendAiMessage } from '../../services/aiService';
import { buildTripContext } from '../../lib/tripContext';

interface ChatWindowProps {
  tripId: string;
}

export default function ChatWindow({ tripId }: ChatWindowProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { trips } = useTripStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const trip = trips.find((t) => t.id === tripId);
  const tripContext = trip ? buildTripContext(trip) : undefined;

  useEffect(() => {
    let unsubscribe = () => {};

    const load = async () => {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchChatMessages(tripId);
          safeSetItem(`geziplan_chat_${tripId}`, JSON.stringify(data));
          setMessages(data);
          unsubscribe = subscribeToChatMessages(tripId, (msg) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              const next = [...prev, msg];
              safeSetItem(`geziplan_chat_${tripId}`, JSON.stringify(next));
              return next;
            });
          });
        } catch {
          const cached = safeGetItem(`geziplan_chat_${tripId}`);
          if (cached) {
            setMessages(JSON.parse(cached));
          } else {
            setMessages(mockMessages[tripId] ?? []);
          }
        }
      } else {
        setMessages(mockMessages[tripId] ?? []);
      }
    };

    void load();
    return () => unsubscribe();
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  const triggerAiResponse = async (userPrompt: string) => {
    setIsAiThinking(true);
    try {
      const history = messages.map((m) => ({
        id: m.id,
        role: m.senderId === 'geziplan_ai_bot' ? ('assistant' as const) : ('user' as const),
        content: m.content,
        timestamp: m.createdAt,
      }));
      const aiReply = await sendAiMessage(history, userPrompt, tripContext);

      const aiMsg: ChatMessage = {
        id: `ai-msg-${Date.now()}`,
        tripId,
        senderId: 'geziplan_ai_bot',
        senderName: 'GeziPlan AI 🤖',
        senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150&auto=format&fit=crop',
        content: aiReply.content,
        messageType: 'ai',
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured() && isAuthenticated && user) {
        try {
          await sendChatMessage(tripId, `[AI] ${aiReply.content}`, {
            id: 'geziplan_ai_bot',
            email: 'ai@geziplan.app',
            fullName: 'GeziPlan AI 🤖',
            avatarUrl: aiMsg.senderAvatar,
            bio: '',
            createdAt: new Date().toISOString(),
          });
        } catch {
          // fallback to local state
        }
      }

      setMessages((prev) => {
        const next = [...prev, aiMsg];
        safeSetItem(`geziplan_chat_${tripId}`, JSON.stringify(next));
        return next;
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSend = async (e?: React.FormEvent, forceAiPrompt?: string) => {
    e?.preventDefault();
    const contentToSend = forceAiPrompt ?? newMessage.trim();
    if (!contentToSend) return;

    const lower = contentToSend.toLowerCase();
    const isAiTagged = lower.includes('@ai') || forceAiPrompt != null;
    const isQuestion = lower.includes('?') || lower.includes('nerede') || lower.includes('öner') || lower.includes('otel') || lower.includes('mola');

    if (isSupabaseConfigured()) {
      if (!isAuthenticated || !user) return;
      setIsSending(true);
      try {
        const msg = await sendChatMessage(tripId, contentToSend, user);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          safeSetItem(`geziplan_chat_${tripId}`, JSON.stringify(next));
          return next;
        });
        setNewMessage('');
      } finally {
        setIsSending(false);
      }

      if (isAiTagged || isQuestion) {
        void triggerAiResponse(contentToSend);
      }
      return;
    }

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      tripId,
      senderId: user?.id || 'demo_user',
      senderName: user?.fullName || 'Demo Kullanıcı',
      senderAvatar: user?.avatarUrl || 'https://i.pravatar.cc/150?u=demo',
      content: contentToSend,
      messageType: 'text',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, newMsg];
      safeSetItem(`geziplan_chat_${tripId}`, JSON.stringify(next));
      return next;
    });
    setNewMessage('');

    if (isAiTagged || isQuestion) {
      void triggerAiResponse(contentToSend);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 font-[Outfit] flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Grup Sohbeti
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            🤖 AI Katılımcı Aktif
          </span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            {isSupabaseConfigured() ? 'Canlı' : 'Demo'}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-8">
            <p>Henüz mesaj yok. İlk mesajı siz yazın!</p>
            <p className="text-xs text-purple-600 mt-1">İpucu: AI asistanından yanıt almak için <b>@ai</b> yazabilir veya aşağıdaki AI butonunu kullanabilirsiniz.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isAi = msg.senderId === 'geziplan_ai_bot' || msg.messageType === 'ai' || msg.content.startsWith('[AI]');
          const isOwn = !isAi && (user ? msg.senderId === user.id : msg.senderName === 'Demo Kullanıcı');
          const cleanContent = msg.content.replace(/^\[AI\]\s*/, '');

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                <img src={msg.senderAvatar} alt={msg.senderName} className="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0" />
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 mx-1">
                    <span className="text-xs text-gray-600 font-bold">{msg.senderName}</span>
                    {isAi && (
                      <span className="bg-purple-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        AI Asistan
                      </span>
                    )}
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                      : isAi
                        ? 'bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-tl-none shadow-md shadow-purple-900/20 border border-purple-500/30'
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-none'
                  }`}>
                    {cleanContent}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">
                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isAiThinking && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                🤖
              </div>
              <div className="bg-purple-50 border border-purple-200 text-purple-900 px-4 py-2 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                GeziPlan AI yanıt hazırlıyor...
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => handleSend(e)} className="p-3 border-t border-gray-100 bg-white space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={
              isSupabaseConfigured() && !isAuthenticated
                ? 'Mesaj yazmak için giriş yapın...'
                : 'Mesajınız... (@ai ile AI katılır)'
            }
            disabled={isSupabaseConfigured() && !isAuthenticated}
            className="flex-1 min-w-0 bg-gray-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl px-4 py-2 text-sm outline-none transition disabled:opacity-60"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />

          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || (isSupabaseConfigured() && !isAuthenticated)}
            className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center w-10 h-10 flex-shrink-0 disabled:opacity-50 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (newMessage.trim()) {
              void handleSend(undefined, `@ai ${newMessage.trim()}`);
            } else {
              void handleSend(undefined, '@ai Rota ve mola önerisi verir misin?');
            }
          }}
          disabled={isSending || isAiThinking || (isSupabaseConfigured() && !isAuthenticated)}
          title="Yapay zekadan görüş / öneri iste"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
        >
          🤖 AI'ya Sor
        </button>
      </form>
    </div>
  );
}
