import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import MapView from '../components/map/MapView';
import ChatWindow from '../components/chat/ChatWindow';
import TripSchedule from '../components/trip/TripSchedule';
import TripJoinButton from '../components/trip/TripJoinButton';
import TripAiSettings from '../components/trip/TripAiSettings';
import { useAiUiStore } from '../store/aiUiStore';
import { getModelLabel, getProviderLabel } from '../lib/aiProviders';
import type { Trip } from '../types';

type MobileTab = 'ozet' | 'program' | 'harita' | 'sohbet';

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: 'ozet', label: 'Özet', icon: '📋' },
  { id: 'program', label: 'Program', icon: '🗓' },
  { id: 'harita', label: 'Harita', icon: '🗺' },
  { id: 'sohbet', label: 'Sohbet', icon: '💬' },
];

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { trips, fetchTrips, fetchTripById, addStopRecommendation, isLoading, lastError } = useTripStore();
  const openAiPanel = useAiUiStore((s) => s.open);
  const [mobileTab, setMobileTab] = useState<MobileTab>('ozet');

  useEffect(() => {
    void fetchTrips(true);
  }, [fetchTrips]);

  useEffect(() => {
    if (id) void fetchTripById(id);
  }, [id, fetchTripById]);

  const trip = trips.find((t) => t.id === id);
  const routeWarningFromNav = (location.state as { routeWarning?: boolean } | null)?.routeWarning;
  const showRouteWarning = routeWarningFromNav || trip?.routeLegs?.some((leg) => leg.distanceKm > 400);

  if (isLoading && !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          {lastError ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
              <p className="font-bold text-base mb-2">Gezi Yüklenirken Hata Oluştu</p>
              <p className="font-mono text-xs bg-white/50 p-3 rounded-lg border border-red-100 text-left break-all">{lastError}</p>
            </div>
          ) : (
            <h2 className="text-2xl font-bold mb-2">Gezi Bulunamadı</h2>
          )}
          <Link to="/kesfet" className="text-green-600 hover:underline font-medium">Gezileri Keşfet</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24 lg:pb-8">
      {/* Hero */}
      <div className="relative h-52 sm:h-64 md:h-80 w-full">
        <img src={trip.coverImageUrl} alt={trip.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute top-4 left-4 z-10">
          <Link
            to="/kesfet"
            className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 max-w-7xl mx-auto text-white">
          <div className="flex gap-2 mb-2">
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">{trip.category}</span>
            <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
              {trip.status === 'upcoming' ? 'Yaklaşan' : trip.status}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-[Outfit] mb-1">{trip.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-200">
            <span>
              📅 {new Date(trip.startDate).toLocaleDateString('tr-TR')}
              {trip.startTime && ` ${trip.startTime}`} – {new Date(trip.endDate).toLocaleDateString('tr-TR')}
            </span>
            <span>👥 {trip.currentParticipants}/{trip.maxParticipants}</span>
            {trip.totalDistanceKm != null && <span>🛣 ~{trip.totalDistanceKm} km</span>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {lastError && lastError.includes('Çevrimdışı mod') && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-pulse">
            <span>📶</span>
            <span className="font-semibold">{lastError}</span>
          </div>
        )}

        {showRouteWarning && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
            Bazı duraklar arası mesafe olağandışı görünüyor. Rotayı haritadan kontrol edin.
          </div>
        )}

        {/* Desktop: 2 kolon */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <OverviewSection trip={trip} openAiPanel={openAiPanel} />
            <TripAiSettings trip={trip} />
            <ProgramSection trip={trip} onAdd={(data) => addStopRecommendation(trip.id, data)} />
          </div>
          <div className="space-y-6 flex flex-col min-h-[700px]">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 min-h-[320px]">
              <MapView route={trip.route} routeGeometry={trip.routeGeometry} />
            </div>
            <div className="flex-1 min-h-[320px]">
              <ChatWindow tripId={trip.id} />
            </div>
          </div>
        </div>

        {/* Mobil: sekmeler */}
        <div className="lg:hidden">
          <div className="mb-4">
            {mobileTab === 'ozet' && <OverviewSection trip={trip} openAiPanel={openAiPanel} />}
            {mobileTab === 'ozet' && <div className="mt-4"><TripAiSettings trip={trip} /></div>}
            {mobileTab === 'program' && (
              <ProgramSection trip={trip} onAdd={(data) => addStopRecommendation(trip.id, data)} />
            )}
            {mobileTab === 'harita' && (
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 h-[calc(100vh-280px)] min-h-[360px]">
                <MapView route={trip.route} routeGeometry={trip.routeGeometry} />
              </div>
            )}
            {mobileTab === 'sohbet' && (
              <div className="h-[calc(100vh-280px)] min-h-[360px]">
                <ChatWindow tripId={trip.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobil alt sekme çubuğu */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 min-w-[68px] rounded-xl transition ${
                mobileTab === tab.id ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function OverviewSection({ trip, openAiPanel }: { trip: Trip; openAiPanel: (action?: 'restoran' | 'kafe' | 'mola' | 'konaklama') => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold font-[Outfit] mb-3">Gezi Hakkında</h3>
        <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{trip.description}</p>
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={trip.organizerAvatar} alt={trip.organizerName} className="w-11 h-11 rounded-full border-2 border-white shadow-sm" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-bold uppercase">Organizatör</p>
              <p className="font-bold text-gray-900 truncate">{trip.organizerName}</p>
            </div>
          </div>
          <TripJoinButton trip={trip} />
        </div>
        {trip.participants.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Katılımcılar</p>
            <div className="flex flex-wrap gap-2">
              {trip.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-full pl-1 pr-3 py-1">
                  <img src={p.avatarUrl} alt={p.fullName} className="w-6 h-6 rounded-full" />
                  <span className="text-xs font-medium text-gray-700">{p.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ✨ AI Asistanı & Hızlı Öneri Butonları */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-purple-50 p-5 sm:p-6 rounded-2xl shadow-sm border border-emerald-200/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold font-[Outfit] text-gray-900 flex items-center gap-2">
              <span>✨</span> GeziPlan AI Asistanı
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {trip.aiRecommendationsEnabled !== false
                ? `${getProviderLabel(trip.aiProvider ?? 'deepseek')} (${getModelLabel(trip.aiProvider ?? 'deepseek', trip.aiModel ?? 'deepseek-chat')}) aktif.`
                : 'AI kapalı.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAiPanel()}
            disabled={trip.aiRecommendationsEnabled === false}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            💬 AI Sohbeti Başlat
          </button>
        </div>

        {trip.aiRecommendationsEnabled !== false && (
          <div className="pt-2 border-t border-emerald-200/50">
            <p className="text-xs font-bold text-gray-700 mb-2.5">Hızlı Yapay Zeka Önerileri Alın:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => openAiPanel('konaklama')}
                className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-3 py-3 rounded-xl text-sm transition shadow-sm hover:shadow"
              >
                🏨 Konaklama & Otel Öner
              </button>
              <button
                type="button"
                onClick={() => openAiPanel('restoran')}
                className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-3 py-3 rounded-xl text-sm transition shadow-sm hover:shadow"
              >
                🍽️ Restoran & Yemek Öner
              </button>
              <button
                type="button"
                onClick={() => openAiPanel('mola')}
                className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-3 py-3 rounded-xl text-sm transition shadow-sm hover:shadow"
              >
                ☕ Mola & Kafe Öner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramSection({
  trip,
  onAdd,
}: {
  trip: Trip;
  onAdd: Parameters<typeof TripSchedule>[0]['onAddRecommendation'];
}) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold font-[Outfit] mb-4">Gezi Programı</h3>
      <TripSchedule trip={trip} onAddRecommendation={onAdd} />
    </div>
  );
}
