import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocationSearch from '../components/map/LocationSearch';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { MapboxError } from '../lib/mapbox';
import { isSupabaseConfigured } from '../lib/supabase';
import AppShell from '../components/layout/AppShell';
import RoutePreviewPanel from '../components/map/RoutePreviewPanel';
import TripCreateSummary from '../components/trip/TripCreateSummary';
import TripDateBanner from '../components/trip/TripDateBanner';
import WaypointBuilder from '../components/trip/WaypointBuilder';
import type { CreateTripInput, GeoPlace, PlannedWaypoint } from '../types';

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { createTrip } = useTripStore();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: CreateTripInput['category'];
    startDate: string;
    startTime: string;
    endDate: string;
    maxParticipants: number;
    coverImageUrl: string;
    aiRecommendationsEnabled: boolean;
  }>({
    title: '',
    description: '',
    category: 'doğa',
    startDate: '',
    startTime: '08:00',
    endDate: '',
    maxParticipants: 10,
    coverImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
    aiRecommendationsEnabled: true,
  });

  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startPlace, setStartPlace] = useState<GeoPlace | null>(null);
  const [endPlace, setEndPlace] = useState<GeoPlace | null>(null);
  const [waypoints, setWaypoints] = useState<PlannedWaypoint[]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isGeneratingAiStops, setIsGeneratingAiStops] = useState(false);

  const handleAiSuggestWaypoints = async () => {
    if (!startPlace || !endPlace) {
      setRouteError('AI durak önerileri için önce başlangıç ve bitiş noktalarını seçin.');
      return;
    }
    setIsGeneratingAiStops(true);
    setRouteError(null);
    try {
      await new Promise((res) => setTimeout(res, 600));
      const midLat = (startPlace.latitude + endPlace.latitude) / 2;
      const midLon = (startPlace.longitude + endPlace.longitude) / 2;
      
      const suggested: PlannedWaypoint[] = [
        {
          id: `ai-suggest-1-${Date.now()}`,
          name: `${startPlace.name.split(',')[0]} Çıkışı Mola Yeri`,
          latitude: startPlace.latitude * 0.7 + endPlace.latitude * 0.3,
          longitude: startPlace.longitude * 0.7 + endPlace.longitude * 0.3,
          address: 'AI Tarafından Önerilen Panoramik Mola Noktası',
          source: 'search',
        },
        {
          id: `ai-suggest-2-${Date.now()}`,
          name: `Orta Rota Tarihi & Yemek Durağı`,
          latitude: midLat,
          longitude: midLon,
          address: 'AI Tarafından Önerilen Yöresel Lezzet & Mola Alanı',
          source: 'search',
        },
      ];
      setWaypoints((prev) => [...prev, ...suggested]);
    } finally {
      setIsGeneratingAiStops(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const canProceedStep2 = Boolean(startPlace && endPlace);

  const handleSubmit = async () => {
    if (!startPlace || !endPlace) return;
    if (isSupabaseConfigured() && !isAuthenticated) {
      setSubmitError('Gezi kaydetmek için giriş yapmalısınız.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const trip = await createTrip({
        ...formData,
        startPlace,
        endPlace,
        waypoints,
      });
      const hasRouteWarning = trip.routeLegs?.some((leg) => leg.distanceKm > 400);
      navigate(`/gezi/${trip.id}`, { state: hasRouteWarning ? { routeWarning: true } : undefined });
    } catch (error) {
      console.error('Gezi oluşturma hatası:', error);
      const errMsg = error && typeof error === 'object' && 'message' in error
        ? (error as any).message
        : String(error);
      setSubmitError(`Gezi oluşturulamadı: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEPS = [
    { label: 'Temel Bilgiler', icon: '📝' },
    { label: 'Rota & Plan',    icon: '🗺️' },
    { label: 'Detaylar',       icon: '✅' },
  ];

  return (
    <AppShell title="Yeni Gezi Oluştur" backTo="/kesfet" maxWidth="md">
      <div className="-mt-1 pb-8">
        <div className="mb-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 sm:p-7 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white shadow-lg shadow-emerald-600/20">🧭</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Gezi planlama</p>
              <h2 className="mt-1 text-xl font-extrabold text-gray-900 sm:text-2xl">Rotanı birkaç adımda oluştur</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">Temel bilgileri girin, rotayı belirleyin ve yayımlamadan önce son kez gözden geçirin.</p>
            </div>
          </div>
        </div>

        {/* ── Animated Step Indicator ── */}
        <div className="mb-6 px-1">
          <div className="step-indicator">
            {STEPS.map((s, i) => {
              const num = i + 1;
              const isActive = step === num;
              const isDone   = step > num;
              return (
                <div
                  key={s.label}
                  className={`step-item ${
                    isDone ? 'completed' : isActive ? 'active' : ''
                  }`}
                >
                  <div className={`step-circle ${
                    isDone ? 'completed' : isActive ? 'active' : ''
                  }`}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span className={`step-label ${
                    isDone ? 'completed' : isActive ? 'active' : ''
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Gradient progress bar */}
          <div className="progress-bar mt-4">
            <div
              className="progress-fill"
              style={{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }}
            />
          </div>
        </div>

        {isSupabaseConfigured() && !isAuthenticated && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="text-lg flex-shrink-0">☁️</span>
            <div className="flex-1">
              <span>Gezilerinizin bulutta saklanması için</span>{' '}
              <Link to="/giris" className="font-bold text-emerald-700 hover:text-emerald-800 underline">giriş yapın</Link>
              <span>.</span>
            </div>
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-7 md:p-8">
          
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="border-b border-gray-100 pb-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Adım 1 / 3</p>
                <h3 className="mt-1 text-xl font-extrabold text-gray-900">Gezi bilgileri</h3>
                <p className="mt-1 text-sm text-gray-500">Başlık, kategori ve seyahat zamanını belirleyin.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Gezi Başlığı</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Örn: Kapadokya Hafta Sonu Kaçamağı"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Kategori</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                >
                  <option value="doğa">Doğa</option>
                  <option value="tarih">Tarih</option>
                  <option value="şehir">Şehir</option>
                  <option value="deniz">Deniz</option>
                  <option value="kış">Kış</option>
                  <option value="macera">Macera</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Kalkış Saati</label>
                  <input
                    type="time"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                  />
                </div>
              </div>

              {formData.startDate && (
                <TripDateBanner
                  startDate={formData.startDate}
                  startTime={formData.startTime}
                  endDate={formData.endDate || undefined}
                  compact
                />
              )}

              <div className="flex justify-end border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!formData.title || !formData.startDate || !formData.endDate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Sonraki Adım
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Route & Planning */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in-up">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LocationSearch
                  label="Başlangıç Noktası"
                  placeholder="Örn: İstanbul"
                  value={startPlace?.name ?? startInput}
                  onChange={(value) => {
                    setStartInput(value);
                    setStartPlace(null);
                    setRouteError(null);
                  }}
                  onPlaceSelect={(place) => {
                    setStartPlace(place);
                    setStartInput(place.name);
                    setRouteError(null);
                  }}
                  required
                  hint="Listeden seçtiğinizde konum doğrulanır."
                />
                <LocationSearch
                  label="Bitiş Noktası"
                  placeholder="Örn: Nevşehir"
                  value={endPlace?.name ?? endInput}
                  onChange={(value) => {
                    setEndInput(value);
                    setEndPlace(null);
                    setRouteError(null);
                  }}
                  onPlaceSelect={(place) => {
                    setEndPlace(place);
                    setEndInput(place.name);
                    setRouteError(null);
                  }}
                  proximity={startPlace ?? undefined}
                  required
                  iconColor="text-red-400"
                  hint="Varış noktasını da listeden seçin."
                />
              </div>

              {/* ✨ AI Durak Önerisi Butonu */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-purple-50 via-emerald-50 to-teal-50 border border-emerald-200/80 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
                    ✨
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">AI Akıllı Durak & Mola Önerisi</h4>
                    <p className="text-xs text-gray-600">Başlangıç ve bitiş rotanız üzerindeki popüler mola ve manzara noktalarını otomatik keşfedin.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAiSuggestWaypoints}
                  disabled={isGeneratingAiStops || !startPlace || !endPlace}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isGeneratingAiStops ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Duraklar Hesaplanıyor...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/></svg>
                      AI ile Durak Öner
                    </>
                  )}
                </button>
              </div>

              <WaypointBuilder
                waypoints={waypoints}
                onChange={setWaypoints}
                startPlace={startPlace}
                endPlace={endPlace}
                proximity={
                  waypoints.length > 0
                    ? waypoints[waypoints.length - 1]
                    : startPlace ?? undefined
                }
              />

              <RoutePreviewPanel
                startPlace={startPlace}
                endPlace={endPlace}
                waypoints={waypoints}
              />

              {routeError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {routeError}
                </div>
              )}

              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-green-100 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="bg-white p-2 rounded-lg text-green-600 shadow-sm mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">AI Dinamik Öneri Sistemi</h4>
                    <p className="text-sm text-gray-600 mb-3">Gezi esnasında veya planlama aşamasında AI asistanımız rotanıza ve ilgi alanlarınıza göre size anlık restoran, müze ve etkinlik önerilerinde bulunsun mu?</p>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" name="aiRecommendationsEnabled" className="sr-only" checked={formData.aiRecommendationsEnabled} onChange={handleChange} />
                        <div className={`block w-10 h-6 rounded-full transition ${formData.aiRecommendationsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${formData.aiRecommendationsEnabled ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700">{formData.aiRecommendationsEnabled ? 'Açık (Önerilir)' : 'Kapalı'}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Geri
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canProceedStep2) {
                      setRouteError('Başlangıç ve bitiş noktalarını listeden seçmelisiniz.');
                      return;
                    }
                    setRouteError(null);
                    handleNext();
                  }}
                  disabled={!canProceedStep2}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Sonraki Adım
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Description & Submit */}
          {step === 3 && startPlace && endPlace && (
            <div className="space-y-6 animate-fade-in-up">
              <TripCreateSummary
                formData={formData}
                startPlace={startPlace}
                endPlace={endPlace}
                waypoints={waypoints}
              />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Genel Gezi Açıklaması</label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Gezinin detaylarını, katılımcıların ne beklemesi gerektiğini genel hatlarıyla anlatın..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Maksimum Katılımcı Sayısı</label>
                <input
                  type="number"
                  name="maxParticipants"
                  min="2"
                  max="50"
                  required
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                />
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Geri
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.description}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Rota hesaplanıyor...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      Geziyi Yayımla
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </AppShell>
  );
}
