import { useEffect, useState } from 'react';
import type { Trip } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import {
  AI_PROVIDERS,
  getDefaultModelForProvider,
  getModelLabel,
  getProviderLabel,
  type AiProvider,
} from '../../lib/aiProviders';

interface TripAiSettingsProps {
  trip: Trip;
}

export default function TripAiSettings({ trip }: TripAiSettingsProps) {
  const { user } = useAuthStore();
  const { updateTripAiSettings } = useTripStore();
  const isOrganizer = user?.id === trip.organizerId;

  const [provider, setProvider] = useState<AiProvider>(trip.aiProvider ?? 'gemini');
  const [model, setModel] = useState(trip.aiModel ?? 'gemini-2.0-flash');
  const [aiEnabled, setAiEnabled] = useState(trip.aiRecommendationsEnabled !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProvider(trip.aiProvider ?? 'gemini');
    setModel(trip.aiModel ?? 'gemini-2.0-flash');
    setAiEnabled(trip.aiRecommendationsEnabled !== false);
  }, [trip.id, trip.aiProvider, trip.aiModel, trip.aiRecommendationsEnabled]);

  if (!isOrganizer) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800 mb-1">AI Modeli</p>
        <p>
          {getProviderLabel(trip.aiProvider ?? 'gemini')} ·{' '}
          {getModelLabel(trip.aiProvider ?? 'gemini', trip.aiModel ?? 'gemini-2.0-flash')}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {trip.aiRecommendationsEnabled !== false ? 'AI önerileri açık' : 'AI önerileri kapalı'}
        </p>
      </div>
    );
  }

  const handleProviderChange = (next: AiProvider) => {
    setProvider(next);
    setModel(getDefaultModelForProvider(next));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateTripAiSettings(trip.id, { aiProvider: provider, aiModel: model, aiRecommendationsEnabled: aiEnabled });
      setMessage('AI ayarları kaydedildi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    provider !== (trip.aiProvider ?? 'gemini') ||
    model !== (trip.aiModel ?? 'gemini-2.0-flash') ||
    aiEnabled !== (trip.aiRecommendationsEnabled !== false);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold uppercase text-green-800 tracking-wide">AI Moderatör Ayarları</p>
          <p className="text-xs text-green-700 mt-0.5">Organizatör olarak provider ve model seçin</p>
        </div>
        <span className="text-[10px] font-bold bg-green-600 text-white px-2 py-1 rounded-full">MOD</span>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-700">Provider</span>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          >
            {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((key) => (
              <option key={key} value={key}>
                {AI_PROVIDERS[key].label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-700">Model</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          >
            {AI_PROVIDERS[provider].models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
          <span className="text-sm text-gray-700">AI önerileri</span>
          <button
            type="button"
            role="switch"
            aria-checked={aiEnabled}
            onClick={() => setAiEnabled((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition ${aiEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition transform ${
                aiEnabled ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </label>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-bold py-2 rounded-lg transition"
        >
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>

        {message && <p className="text-xs text-green-700">{message}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
