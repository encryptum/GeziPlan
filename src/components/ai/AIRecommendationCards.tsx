import type { AIRecommendation } from '../../types';

interface AIRecommendationCardsProps {
  recommendations: AIRecommendation[];
}

const TYPE_LABELS: Record<string, string> = {
  restoran: 'Restoran',
  kafe: 'Kafe',
  mekan: 'Mekan',
  aktivite: 'Aktivite',
  rota: 'Rota',
  mola: 'Mola',
};

export default function AIRecommendationCards({ recommendations }: AIRecommendationCardsProps) {
  if (!recommendations.length) return null;

  return (
    <div className="mt-2 space-y-2 w-full">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="bg-white border border-green-100 rounded-xl overflow-hidden shadow-sm text-left"
        >
          <img src={rec.imageUrl} alt={rec.title} className="w-full h-24 object-cover" />
          <div className="p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 px-2 py-0.5 rounded">
                {TYPE_LABELS[rec.type] ?? rec.type}
              </span>
              {rec.rating > 0 && (
                <span className="text-xs text-amber-600 font-medium">★ {rec.rating.toFixed(1)}</span>
              )}
            </div>
            <p className="font-bold text-sm text-gray-900">{rec.title}</p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{rec.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {rec.distance && (
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{rec.distance}</span>
              )}
              {rec.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
