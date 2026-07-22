import { formatDateLongTR, formatTimeTR, parseTripDateTime } from '../../lib/dateFormat';

interface TripDateBannerProps {
  startDate: string;
  startTime?: string;
  endDate?: string;
  estimatedArrivalAt?: Date | null;
  compact?: boolean;
}

export default function TripDateBanner({
  startDate,
  startTime = '08:00',
  endDate,
  estimatedArrivalAt,
  compact = false,
}: TripDateBannerProps) {
  const departure = parseTripDateTime(startDate, startTime);

  if (compact) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-4 text-white shadow-lg shadow-green-600/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">Kalkış</p>
            <p className="text-2xl font-bold font-[Outfit] tabular-nums">{formatTimeTR(departure)}</p>
            <p className="text-sm text-white/85 capitalize">{formatDateLongTR(departure)}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl">
            🗓️
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-6 md:p-8 text-white shadow-xl shadow-green-700/25">
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-teal-400/20 blur-xl" />

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-bold mb-2">Gezi Başlangıcı</p>
          <p className="text-4xl md:text-5xl font-extrabold font-[Outfit] tabular-nums leading-none mb-2">
            {formatTimeTR(departure)}
          </p>
          <p className="text-base md:text-lg text-white/90 capitalize font-medium">{formatDateLongTR(departure)}</p>
        </div>

        <div className="hidden md:flex justify-center">
          <div className="flex flex-col items-center gap-2 text-white/80">
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
            <span className="text-2xl">→</span>
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
          </div>
        </div>

        <div className="md:text-right space-y-3">
          {endDate && (
            <div className="inline-flex md:flex md:flex-col md:items-end gap-1 bg-white/10 backdrop-blur rounded-xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">Planlanan Bitiş Günü</p>
              <p className="font-bold capitalize">{formatDateLongTR(parseTripDateTime(endDate))}</p>
            </div>
          )}
          {estimatedArrivalAt && (
            <div className="inline-flex md:flex md:flex-col md:items-end gap-1 bg-white/15 backdrop-blur rounded-xl px-4 py-3 border border-white/20">
              <p className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">Tahmini Varış</p>
              <p className="font-bold tabular-nums">
                {formatTimeTR(estimatedArrivalAt)} · {estimatedArrivalAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
