import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { Eye, EyeOff, MapPin, ArrowLeft, Mail, Lock, User, AlertCircle, Info } from 'lucide-react';

const BG_IMAGE = 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=900&auto=format&fit=crop&q=70';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, signUp, isLoading, authError, clearAuthError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    clearAuthError();
    setLocalError(null);

    const sitePassword = import.meta.env.VITE_SITE_PASSWORD || 'gezi123';
    if (password !== sitePassword) {
      setLocalError('Giriş şifresi hatalı. Lütfen yöneticinin belirlediği standart şifreyi girin.');
      return;
    }

    try {
      if (mode === 'login') {
        try {
          await login(email, password);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
            await signUp(email, password, email.split('@')[0]);
          } else {
            throw error;
          }
        }
      } else {
        await signUp(email, password, fullName || email.split('@')[0]);
      }
      navigate('/kesfet');
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_CONFIRMATION_REQUIRED') {
        alert('Kayıt başarılı! Lütfen e-postanızdaki onay linkine tıklayın, ardından giriş yapın.');
        setMode('login');
      }
    }
  };

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    clearAuthError();
    setLocalError(null);
  };

  const error = localError || authError;

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL — decorative image ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <img
          src={BG_IMAGE}
          alt="Türkiye manzarası"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/80 to-teal-600/60" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 text-white">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <MapPin size={20} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-xl font-[Outfit]">GeziPlan</span>
          </Link>

          {/* Middle tagline */}
          <div>
            <blockquote className="text-3xl font-extrabold font-[Outfit] leading-tight mb-4">
              "Türkiye'nin güzellikleri{' '}
              <span className="text-emerald-300">seni bekliyor.</span>"
            </blockquote>
            <p className="text-white/75 text-sm leading-relaxed max-w-xs">
              Binlerce güzergah, yüzlerce destinasyon ve aktif bir topluluk. Hepsi ücretsiz.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              '🗺️ Mapbox ile canlı rota önizlemesi',
              '🤖 AI asistan ile akıllı öneriler',
              '💬 Gerçek zamanlı grup sohbeti',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-white/85 font-medium">
                <span className="text-base">{f.split(' ').shift()}</span>
                <span>{f.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8 py-12 bg-white">
        {/* Back link */}
        <div className="w-full max-w-md mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors font-medium"
          >
            <ArrowLeft size={15} />
            Ana Sayfaya Dön
          </Link>
        </div>

        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-white">
              <MapPin size={18} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-xl font-[Outfit] bg-gradient-to-r from-emerald-700 to-blue-600 bg-clip-text text-transparent">
              GeziPlan
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-[Outfit] mb-2">
              {mode === 'login' ? 'Tekrar Hoş Geldin 👋' : 'Hesap Oluştur 🚀'}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === 'login' ? (
                <>
                  Hesabın yok mu?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                  >
                    Kayıt Ol
                  </button>
                </>
              ) : (
                <>
                  Zaten hesabın var mı?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                  >
                    Giriş Yap
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-700">
            <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
            <span>
              Giriş veya kayıt için yöneticinin belirlediği ortak şifreyi girmeniz gerekmektedir.
            </span>
          </div>

          {/* Supabase demo banner */}
          {!isSupabaseConfigured() && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-2.5 mb-5 font-medium">
              ⚠️ Supabase yapılandırılmadı — demo modunda çalışıyorsunuz.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-fade-in-up">
                <label className="block text-sm font-semibold text-gray-700" htmlFor="fullName">
                  Ad Soyad
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Adınız Soyadınız"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700" htmlFor="email">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700" htmlFor="password">
                Şifre
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl animate-fade-in-up">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/25 hover:-translate-y-0.5 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Giriş yapılıyor...' : 'Kayıt olunuyor...'}
                </>
              ) : (
                mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
