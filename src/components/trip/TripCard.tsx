import React from 'react';
import { Link } from 'react-router-dom';
import { Trip } from '../../types';
import { Calendar, Star, Users, MapPin } from 'lucide-react';

interface TripCardProps {
  trip: Trip;
}

const CATEGORY_STYLES: Record<string, { badge: string; dot: string }> = {
  doğa:   { badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  tarih:  { badge: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500'   },
  şehir:  { badge: 'bg-blue-100 text-blue-800',       dot: 'bg-blue-500'    },
  deniz:  { badge: 'bg-cyan-100 text-cyan-800',       dot: 'bg-cyan-500'    },
  kış:    { badge: 'bg-slate-100 text-slate-700',     dot: 'bg-slate-500'   },
  macera: { badge: 'bg-orange-100 text-orange-800',   dot: 'bg-orange-500'  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          strokeWidth={0}
          fill={s <= Math.round(rating) ? '#f59e0b' : '#e5e7eb'}
        />
      ))}
      <span className="text-xs font-semibold text-amber-600 ml-0.5">{rating}</span>
    </div>
  );
}

export default function TripCard({ trip }: TripCardProps) {
  const style = CATEGORY_STYLES[trip.category] ?? {
    badge: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-400',
  };

  const participantPct = Math.min(
    (trip.currentParticipants / trip.maxParticipants) * 100,
    100
  );
  const isFull = trip.currentParticipants >= trip.maxParticipants;
  const isAlmostFull = participantPct >= 80 && !isFull;

  return (
    <Link
      to={`/gezi/${trip.id}`}
      className="trip-card group cursor-pointer"
      aria-label={`${trip.title} gezisine git`}
    >
      {/* ── Cover Image ── */}
      <div className="trip-card-image">
        <img src={trip.coverImageUrl} alt={trip.title} loading="lazy" />
        <div className="trip-card-image-overlay" />

        {/* Category badge */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <span className={`category-badge ${style.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} inline-block`} />
            {trip.category}
          </span>
        </div>

        {/* Status / Full badge */}
        {isFull && (
          <div className="absolute top-3.5 right-3.5 z-10">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Dolu
            </span>
          </div>
        )}
        {isAlmostFull && (
          <div className="absolute top-3.5 right-3.5 z-10">
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Az Yer Kaldı
            </span>
          </div>
        )}

        {/* Bottom overlay: date */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-1.5 text-white/90 text-xs font-medium">
          <Calendar size={12} />
          {new Date(trip.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 font-[Outfit] leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {trip.title}
        </h3>

        {/* Rating */}
        <StarRating rating={trip.rating} />

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 flex-1">
          {trip.description}
        </p>

        {/* Participant progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-gray-500 font-medium">
              <Users size={12} />
              {trip.currentParticipants} / {trip.maxParticipants} katılımcı
            </span>
            <span
              className={`font-bold text-xs ${
                isFull ? 'text-red-500' : isAlmostFull ? 'text-amber-500' : 'text-emerald-600'
              }`}
            >
              %{Math.round(participantPct)}
            </span>
          </div>
          <div className="participant-bar">
            <div
              className={`participant-fill ${
                isFull
                  ? 'bg-red-400'
                  : isAlmostFull
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-emerald-400 to-teal-400'
              }`}
              style={{ width: `${participantPct}%` }}
            />
          </div>
        </div>

        {/* Footer: organizer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={trip.organizerAvatar}
              alt={trip.organizerName}
              className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide leading-none mb-0.5">Organizatör</p>
              <p className="text-xs font-semibold text-gray-700 truncate">{trip.organizerName}</p>
            </div>
          </div>

          {trip.totalDistanceKm != null && (
            <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg flex-shrink-0">
              <MapPin size={11} />
              {trip.totalDistanceKm} km
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
