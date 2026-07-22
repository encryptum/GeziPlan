import { useState } from 'react';
import type { RoutePoint } from '../../types';

export interface RecommendationFormData {
  routePointOrder: number;
  type: 'mola' | 'konaklama';
  title: string;
  description: string;
  durationMinutes: number;
}

interface StopRecommendationFormProps {
  stops: RoutePoint[];
  onSubmit: (data: RecommendationFormData) => void;
}

export default function StopRecommendationForm({ stops, onSubmit }: StopRecommendationFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [routePointOrder, setRoutePointOrder] = useState(stops[0]?.order ?? 1);
  const [type, setType] = useState<'mola' | 'konaklama'>('mola');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationValue, setDurationValue] = useState(type === 'mola' ? '45' : '8');

  const handleTypeChange = (next: 'mola' | 'konaklama') => {
    setType(next);
    setDurationValue(next === 'mola' ? '45' : '8');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const durationMinutes =
      type === 'mola' ? Number(durationValue) : Number(durationValue) * 60;

    onSubmit({
      routePointOrder,
      type,
      title: title.trim(),
      description: description.trim(),
      durationMinutes,
    });

    setTitle('');
    setDescription('');
    setDurationValue(type === 'mola' ? '45' : '8');
    setIsOpen(false);
  };

  if (!stops.length) return null;

  return (
    <div className="mt-6 border-t border-gray-100 pt-6">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-green-200 text-green-700 font-semibold hover:bg-green-50 hover:border-green-300 transition"
        >
          <span className="text-lg">+</span>
          Mola veya Konaklama Önerisi Ekle
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 font-[Outfit]">Yeni Öneri</h4>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              İptal
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {(['mola', 'konaklama'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleTypeChange(option)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                  type === option
                    ? option === 'mola'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option === 'mola' ? '☕ Mola' : '🏨 Konaklama'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Durak</label>
              <select
                value={routePointOrder}
                onChange={(e) => setRoutePointOrder(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.order}>
                    {stop.order}. {stop.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                Süre {type === 'mola' ? '(dakika)' : '(saat)'}
              </label>
              <input
                type="number"
                min={type === 'mola' ? 10 : 1}
                max={type === 'mola' ? 240 : 72}
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              {type === 'mola' ? 'Mekan / Tesis' : 'Konaklama Yeri'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'mola' ? 'Örn: Ölüdeniz sahil kafesi' : 'Örn: Butterfly Valley kamp alanı'}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Not (opsiyonel)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Neden burayı öneriyorsunuz?"
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-sm"
          >
            Öneriyi Paylaş
          </button>
        </form>
      )}
    </div>
  );
}
