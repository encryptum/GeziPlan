import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useTripStore } from '../store/tripStore';
import AppShell from '../components/layout/AppShell';
import {
  Map,
  Sparkles,
  MessageCircle,
  ArrowRight,
  Users,
  Route,
  Star,
  ChevronRight,
  Compass,
} from 'lucide-react';

/* ── Animated Counter ── */
function Counter({ end, suffix = '', duration = 1400 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className="stat-number animate-count-up">
      {count.toLocaleString('tr-TR')}{suffix}
    </span>
  );
}

/* ── Feature Data ── */
const FEATURES = [
  {
    icon: Map,
    title: 'Akıllı Rota',
    desc: 'Mapbox ile kalkış, duraklar ve varış arasında canlı rota önizlemesi. Mesafe ve süre otomatik hesaplanır.',
    gradient: 'from-emerald-500 to-teal-400',
    bgGradient: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-100',
    delay: '100',
  },
  {
    icon: Sparkles,
    title: 'GeziPlan AI',
    desc: 'Rota bağlamlı anlık öneriler, restoran & müze tavsiyeleri ve sohbet tabanlı gezi asistanı.',
    gradient: 'from-blue-500 to-indigo-400',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-100',
    delay: '200',
  },
  {
    icon: MessageCircle,
    title: 'Grup Sohbeti',
    desc: 'Katılımcılarla canlı mesajlaşma, geziye katılma ve organizatörle anlık iletişim.',
    gradient: 'from-amber-500 to-orange-400',
    bgGradient: 'from-amber-50 to-orange-50',
    borderColor: 'border-amber-100',
    delay: '300',
  },
];

/* ── Stats Data ── */
const STATS = [
  { end: 248, suffix: '+', label: 'Aktif Gezi' },
  { end: 1840, suffix: '+', label: 'Mutlu Gezgin' },
  { end: 47, suffix: '', label: 'Destinasyon' },
  { end: 4.9, suffix: '★', label: 'Ortalama Puan' },
];

/* ── Floating shapes for hero ── */
function FloatingShape({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full opacity-40 blur-3xl pointer-events-none ${className}`}
    />
  );
}

export default function HomePage() {
  const { trips, fetchTrips } = useTripStore();

  useEffect(() => {
    void fetchTrips(true);
  }, [fetchTrips]);

  const featuredTrips = trips.slice(0, 3);

  return (
    <AppShell>
      {/* ── HERO ── */}
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 hero-bg px-4 sm:px-6 lg:px-8 pt-16 pb-14 sm:pt-20 sm:pb-18 text-center overflow-hidden mb-10">
        {/* Floating decorative shapes */}
        <FloatingShape className="w-96 h-96 bg-emerald-300 -top-16 -left-20" />
        <FloatingShape className="w-72 h-72 bg-blue-300 -top-8 -right-16" />
        <FloatingShape className="w-56 h-56 bg-teal-200 bottom-0 right-1/4" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-full shadow-sm mb-6 animate-fade-in-up">
          <Star size={12} fill="currentColor" />
          Türkiye'yi birlikte keşfedin
          <Star size={12} fill="currentColor" />
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-[Outfit] leading-tight mb-5 animate-fade-in-up animation-delay-100 text-balance">
          Keşfet. Planla.{' '}
          <span className="gradient-text-animated">Paylaş.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in-up animation-delay-200 text-balance">
          Rotalarınızı haritada çizin, programı tablo halinde görün,
          AI ile öneri alın ve grubunuzla sohbet edin.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up animation-delay-300">
          <Link
            to="/kesfet"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/30 text-base"
          >
            <Compass size={18} />
            Gezileri Keşfet
          </Link>
          <Link
            to="/yeni-gezi"
            className="inline-flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-gray-800 font-bold px-8 py-3.5 rounded-2xl border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md text-base backdrop-blur-sm"
          >
            <Route size={18} />
            Gezi Oluştur
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in-up animation-delay-400">
          {['Ücretsiz', 'Kayıt zorunlu değil', 'Türkiye odaklı'].map((badge) => (
            <span
              key={badge}
              className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`stat-card animate-fade-in-up animation-delay-${(i + 1) * 100}`}
          >
            <Counter end={stat.end} suffix={stat.suffix} />
            <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* ── FEATURES ── */}
      <section className="mb-10">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Neden GeziPlan?</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-[Outfit] text-gray-900">
            Gezi planlamanın en akıllı yolu
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`feature-card bg-gradient-to-br ${f.bgGradient} border ${f.borderColor} animate-fade-in-up animation-delay-${(i + 1) * 100}`}
            >
              <div className={`feature-icon bg-gradient-to-br ${f.gradient} shadow-lg`}>
                <f.icon size={22} color="white" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-[Outfit] mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED TRIPS ── */}
      {featuredTrips.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Keşfet</p>
              <h2 className="text-xl sm:text-2xl font-extrabold font-[Outfit] text-gray-900">
                Öne Çıkan Geziler
              </h2>
            </div>
            <Link
              to="/kesfet"
              className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Tümünü Gör
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {featuredTrips.map((trip, i) => (
              <Link
                key={trip.id}
                to={`/gezi/${trip.id}`}
                className={`group relative rounded-2xl overflow-hidden aspect-[4/3] block animate-fade-in-up animation-delay-${(i + 1) * 100}`}
              >
                <img
                  src={trip.coverImageUrl}
                  alt={trip.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">{trip.category}</p>
                  <h3 className="font-bold text-base font-[Outfit] leading-tight line-clamp-2">{trip.title}</h3>
                  <p className="text-xs text-gray-300 mt-1 flex items-center gap-1">
                    <Users size={11} />
                    {trip.currentParticipants}/{trip.maxParticipants} katılımcı
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA BANNER ── */}
      <section className="relative bg-gradient-to-br from-emerald-600 to-teal-500 rounded-3xl p-8 sm:p-10 text-center text-white overflow-hidden shadow-xl shadow-emerald-600/20 mb-2">
        <div className="absolute inset-0 opacity-10">
          <FloatingShape className="w-64 h-64 bg-white -top-16 -right-16 blur-2xl" />
          <FloatingShape className="w-48 h-48 bg-white -bottom-8 -left-8 blur-2xl" />
        </div>
        <div className="relative">
          <p className="text-emerald-200 font-bold text-sm uppercase tracking-widest mb-3">Başlamaya Hazır mısın?</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-[Outfit] mb-3">
            İlk gezinizi hemen planlayın
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base mb-6 max-w-lg mx-auto">
            Adım adım rota oluşturun, canlı haritada önizleyin ve grubunuzu toplayın.
          </p>
          <Link
            to="/yeni-gezi"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 text-sm"
          >
            Hemen Başla
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
