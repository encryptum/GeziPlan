import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIMessage } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { buildTripContext } from '../../lib/tripContext';
import { sendAiMessage, suggestPoisForTrip } from '../../services/aiService';
import { isAiProxyAvailable } from '../../lib/aiApi';
import { getModelLabel, getProviderLabel, type AiProvider } from '../../lib/aiProviders';
import { useAuthStore } from '../../store/authStore';
import { useAiUiStore } from '../../store/aiUiStore';
import { getTripIdFromPath } from '../../lib/tripRoute';
import TripAiSettings from '../trip/TripAiSettings';
import AIRecommendationCards from './AIRecommendationCards';

const WELCOME_GENERAL =
  'Merhaba! Ben GeziPlan AI. Bir gezi detay sayfasındayken rotanıza, molalara ve yemek önerilerine özel yardımcı olabilirim.';

function welcomeForTrip(title: string) {
  return `"${title}" gezisi için buradayım. Rota, mola, restoran veya konaklama hakkında sorabilirsiniz.`;
}

export default function AIAssistant() {
  const location = useLocation();
  const tripId = getTripIdFromPath(location.pathname);
  const { user } = useAuthStore();
  const { trips, fetchTripById } = useTripStore();
  const { isOpen, open, close, pendingAction, clearPendingAction } = useAiUiStore();
  const trip = tripId ? trips.find((t) => t.id === tripId) : undefined;
  const tripContext = trip ? buildTripContext(trip) : undefined;
  const isOrganizer = Boolean(trip && user?.id === trip.organizerId);
  const onTripPage = Boolean(tripId);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tripId) void fetchTripById(tripId);
  }, [tripId, fetchTripById]);

  useEffect(() => {
    const welcome = trip ? welcomeForTrip(trip.title) : WELCOME_GENERAL;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: welcome,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [trip?.id, trip?.title]);

  useEffect(() => {
    if (isOpen && pendingAction && tripContext) {
      const act = pendingAction;
      clearPendingAction();
      if (act === 'konaklama') {
        void sendUserMessage('Bu rota için en uygun konaklama ve otel alternatiflerini önerir misin?');
      } else {
        void handleQuickAction(act);
      }
    }
  }, [isOpen, pendingAction, tripContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendUserMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;
    if (tripContext && tripContext.aiEnabled === false) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await sendAiMessage(messages, content.trim(), tripContext);
      setMessages((prev) => [...prev, reply]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendUserMessage(input);
  };

  const handleQuickAction = async (poiType: 'restoran' | 'kafe' | 'mola') => {
    if (!tripContext || isTyping) return;
    const labels = { restoran: 'Yemek öner', kafe: 'Kafe öner', mola: 'Mola öner' };
    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: labels[poiType],
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    try {
      const reply = await suggestPoisForTrip(tripContext, poiType);
      setMessages((prev) => [...prev, reply]);
    } finally {
      setIsTyping(false);
    }
  };

  const aiDisabled = tripContext?.aiEnabled === false;
  const modelBadge = tripContext
    ? `${getProviderLabel(tripContext.aiProvider as AiProvider)} · ${getModelLabel(tripContext.aiProvider as AiProvider, tripContext.aiModel)}`
    : !isAiProxyAvailable()
      ? 'Demo'
      : 'Genel';

  return (
    <>
      <motion.button
        type="button"
        className={`fixed bottom-20 md:bottom-6 right-6 flex items-center gap-2 bg-gradient-to-tr from-green-600 to-emerald-500 text-white shadow-lg shadow-green-600/40 z-[200] hover:scale-105 transition-transform ${
          onTripPage ? 'pl-4 pr-5 py-3 rounded-full' : 'w-14 h-14 rounded-full justify-center'
        }`}
        onClick={() => open()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="AI asistan"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        {onTripPage && <span className="text-sm font-bold whitespace-nowrap">AI Asistan</span>}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-36 md:bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[210] overflow-hidden flex flex-col"
            style={{ height: '520px', maxHeight: 'calc(100vh - 120px)' }}
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold font-[Outfit] text-sm">GeziPlan AI</h3>
                  <p className="text-[10px] text-white/80 truncate">
                    {trip ? trip.title : 'GeziPlan AI'}
                  </p>
                  {trip && (
                    <p className="text-[9px] text-white/60 truncate">{modelBadge}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isOrganizer && trip && (
                  <button
                    type="button"
                    onClick={() => setShowSettings((v) => !v)}
                    className="text-white/80 hover:text-white transition p-1"
                    title="AI ayarları (Moderatör)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                )}
              <button
                type="button"
                onClick={close}
                className="text-white/80 hover:text-white transition p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              </div>
            </div>

            {showSettings && isOrganizer && trip && (
              <div className="p-3 border-b border-gray-100 bg-white max-h-64 overflow-y-auto">
                <TripAiSettings trip={trip} />
              </div>
            )}

            {tripContext && !aiDisabled && (
              <div className="px-3 py-2 bg-green-50 border-b border-green-100 flex gap-1.5 overflow-x-auto">
                {(['mola', 'restoran', 'kafe'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isTyping}
                    onClick={() => void handleQuickAction(type)}
                    className="text-xs whitespace-nowrap bg-white border border-green-200 text-green-800 px-3 py-1 rounded-full hover:bg-green-100 transition disabled:opacity-50"
                  >
                    {type === 'mola' ? '⏸ Mola' : type === 'restoran' ? '🍽 Yemek' : '☕ Kafe'}
                  </button>
                ))}
              </div>
            )}

            {aiDisabled && (
              <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs border-b border-amber-100">
                Bu gezi için AI önerileri kapalı.
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[90%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-green-600 text-white rounded-tr-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                      <div
                        className={`text-[10px] mt-1 text-right ${
                          msg.role === 'user' ? 'text-green-100' : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {msg.role === 'assistant' && msg.recommendations && (
                      <AIRecommendationCards recommendations={msg.recommendations} />
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-100">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={aiDisabled ? 'AI kapalı' : 'Rotanız hakkında sorun...'}
                  disabled={aiDisabled || isTyping}
                  className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500 rounded-full px-4 py-2 text-sm outline-none transition disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping || aiDisabled}
                  className="w-9 h-9 flex items-center justify-center bg-green-600 text-white rounded-full disabled:opacity-50 hover:bg-green-700 transition shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
