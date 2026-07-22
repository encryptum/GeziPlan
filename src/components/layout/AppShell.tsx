import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  Home,
  Compass,
  PlusCircle,
  LogOut,
  User,
  ChevronDown,
  MapPin,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  /** Üst başlık (opsiyonel — yoksa sadece nav) */
  title?: string;
  backTo?: string;
  /** Ana içerik genişliği */
  maxWidth?: 'md' | 'xl' | '7xl';
}

const NAV = [
  { to: '/', label: 'Ana Sayfa', icon: Home, match: (p: string) => p === '/' },
  { to: '/kesfet', label: 'Keşfet', icon: Compass, match: (p: string) => p.startsWith('/kesfet') || p.startsWith('/gezi') },
  { to: '/yeni-gezi', label: 'Oluştur', icon: PlusCircle, match: (p: string) => p.startsWith('/yeni-gezi') },
];

export default function AppShell({ children, title, backTo, maxWidth = '7xl' }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const maxClass =
    maxWidth === 'md' ? 'max-w-3xl' : maxWidth === 'xl' ? 'max-w-5xl' : 'max-w-7xl';

  /* Scroll efekti */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* Dışarı tıklayınca dropdown kapat */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* ── HEADER ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/97 shadow-md border-b border-gray-100'
            : 'bg-white/92 backdrop-blur-xl border-b border-gray-100/60'
        }`}
      >
        <div className={`${maxClass} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
            {/* Sol: Logo / Geri / Başlık */}
            <div className="flex items-center gap-3 min-w-0">
              {backTo && (
                <Link
                  to={backTo}
                  className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all flex-shrink-0"
                  aria-label="Geri"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </Link>
              )}
              <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
                <div className="brand-icon group-hover:scale-105 transition-transform">
                  <MapPin size={16} strokeWidth={2.5} />
                </div>
                {!title && (
                  <span className="font-bold text-lg font-[Outfit] bg-gradient-to-r from-emerald-700 to-blue-600 bg-clip-text text-transparent hidden sm:block">
                    GeziPlan
                  </span>
                )}
              </Link>
              {title && (
                <h1 className="font-bold text-lg sm:text-xl text-gray-900 font-[Outfit] truncate">
                  {title}
                </h1>
              )}
            </div>

            {/* Orta: Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1" role="navigation">
              {NAV.map((item) => {
                const isActive = item.match(location.pathname);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      size={15}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? 'text-emerald-600' : ''}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sağ: Kullanıcı */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAuthenticated && user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 px-2.5 py-1.5 rounded-xl transition-all duration-200"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                    />
                    <span className="hidden sm:inline max-w-[100px] truncate font-semibold">
                      {user.fullName.split(' ')[0]}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-[200] animate-fade-in-scale">
                      <div className="px-4 py-2.5 border-b border-gray-50">
                        <p className="text-xs text-gray-400 font-medium">Giriş yapıldı</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/kesfet"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <User size={15} />
                        Gezilerim
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Çıkış Yap
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/giris"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBİL ALT NAV ── */}
      <nav className="md:hidden bottom-nav" role="navigation" aria-label="Mobil navigasyon">
        <div className="flex justify-around py-2">
          {NAV.map((item) => {
            const isActive = item.match(location.pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={isActive ? 'text-emerald-600' : ''}
                />
                <span className="text-xs font-semibold tracking-tight">{item.label}</span>
              </Link>
            );
          })}
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 px-4 py-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-xl"
            >
              <LogOut size={22} strokeWidth={1.75} />
              <span className="text-xs font-semibold tracking-tight">Çıkış</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className={`${maxClass} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8`}>
        {children}
      </main>
    </div>
  );
}
