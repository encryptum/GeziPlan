import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import TripCard from '../components/trip/TripCard';
import AppShell from '../components/layout/AppShell';
import { Plus, Wifi, WifiOff, Search } from 'lucide-react';

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'tümü',   label: 'Tümü',    icon: '🌍' },
  { id: 'doğa',   label: 'Doğa',    icon: '🌲' },
  { id: 'tarih',  label: 'Tarih',   icon: '🏛️' },
  { id: 'şehir',  label: 'Şehir',   icon: '🌆' },
  { id: 'deniz',  label: 'Deniz',   icon: '🏖️' },
  { id: 'kış',    label: 'Kış',     icon: '⛄' },
  { id: 'macera', label: 'Macera',  icon: '🧗' },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-5 skeleton w-3/4" />
        <div className="h-3.5 skeleton w-1/2" />
        <div className="h-3.5 skeleton w-2/3" />
        <div className="h-3 skeleton w-full mt-4" />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const { trips, isLoading, fetchTrips, lastError } = useTripStore();
  const [activeFilter, setActiveFilter] = useState('tümü');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void fetchTrips(true);
  }, [fetchTrips]);

  const isOffline = lastError?.includes('Çevrimdışı mod');

  const filteredTrips = trips
    .filter((t) => activeFilter === 'tümü' || t.category === activeFilter)
    .filter((t) =>
      search.trim() === '' ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <AppShell maxWidth="7xl">
      {/* ── HERO BANNER ── */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 mb-8 px-4 sm:px-6 lg:px-8 py-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-500 to-blue-500 opacity-90" />
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&auto=format&fit=crop&q=60"
            alt=""
            className="w-full h-full object-cover mix-blend-overlay opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-white">
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">
              {isOffline ? (
                <span className="flex items-center gap-1.5">
                  <WifiOff size={11} /> Çevrimdışı mod
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Wifi size={11} /> Canlı veriler
                </span>
              )}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-[Outfit] mb-1">
              Gezileri Keşfet
            </h1>
            <p className="text-emerald-100 text-sm">
              {filteredTrips.length > 0
                ? `${filteredTrips.length} harika gezi seni bekliyor`
                : 'Gezileri yüklüyor...'}
            </p>
          </div>

          <Link
            to="/yeni-gezi"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-2xl text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 self-start sm:self-auto flex-shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            Yeni Gezi
          </Link>
        </div>
      </div>

      {/* ── FILTERS + SEARCH ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Gezi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          />
        </div>

        {/* Category filters */}
        <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveFilter(cat.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex-shrink-0 ${
                activeFilter === cat.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESULTS INFO ── */}
      {!isLoading && (
        <p className="text-sm text-gray-400 font-medium mb-5">
          {filteredTrips.length} gezi listeleniyor
          {search && <span className="text-emerald-600"> · "{search}" için</span>}
        </p>
      )}

      {/* ── GRID ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredTrips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="text-6xl mb-4">🧭</div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2 font-[Outfit]">
            {search ? 'Arama sonucu bulunamadı' : 'Bu kategoride gezi yok'}
          </h3>
          <p className="text-gray-400 mb-6 text-sm max-w-xs mx-auto">
            {search
              ? `"${search}" ile eşleşen bir gezi bulunamadı.`
              : 'Bu kategoride henüz gezi oluşturulmamış.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => { setActiveFilter('tümü'); setSearch(''); }}
              className="inline-flex items-center gap-2 text-emerald-600 font-bold border border-emerald-200 px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition text-sm"
            >
              Tüm Gezileri Gör
            </button>
            <Link
              to="/yeni-gezi"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition text-sm shadow-sm"
            >
              <Plus size={15} />
              Gezi Oluştur
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
