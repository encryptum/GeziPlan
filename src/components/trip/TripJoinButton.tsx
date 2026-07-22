import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { isUserParticipant } from '../../services/participantService';

interface TripJoinButtonProps {
  trip: Trip;
}

export default function TripJoinButton({ trip }: TripJoinButtonProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { joinTrip, leaveTrip } = useTripStore();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrganizer = user?.id === trip.organizerId;
  const isJoined = isUserParticipant(trip.participants, user, trip.organizerId);
  const isFull = trip.currentParticipants >= trip.maxParticipants;

  const handleJoin = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await joinTrip(trip.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Katılım başarısız');
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeave = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await leaveTrip(trip.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ayrılma başarısız');
    } finally {
      setIsBusy(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <button
        type="button"
        disabled
        className="ml-auto bg-gray-200 text-gray-500 px-6 py-2 rounded-xl font-bold cursor-not-allowed"
      >
        Geziye Katıl
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        to="/giris"
        className="ml-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold shadow-sm transition"
      >
        Katılmak için Giriş Yap
      </Link>
    );
  }

  if (isOrganizer) {
    return (
      <span className="ml-auto text-xs font-bold uppercase tracking-wide text-green-700 bg-green-100 px-4 py-2 rounded-xl">
        Organizatörsünüz
      </span>
    );
  }

  if (isJoined) {
    return (
      <div className="ml-auto flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleLeave}
          disabled={isBusy}
          className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-xl font-bold transition disabled:opacity-50"
        >
          {isBusy ? 'Ayrılıyor...' : 'Geziden Ayrıl'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="ml-auto flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleJoin}
        disabled={isBusy || isFull}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-xl font-bold shadow-sm transition"
      >
        {isBusy ? 'Katılınıyor...' : isFull ? 'Gezi Dolu' : 'Geziye Katıl'}
      </button>
      {error && <span className="text-xs text-red-600 max-w-[200px] text-right">{error}</span>}
    </div>
  );
}
