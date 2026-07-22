import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { ensureProfile, mapAuthUserFallback } from '../services/profileService';
import { mockUser } from '../lib/mockData';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  authError: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid path specified')) {
    return 'Supabase URL hatalı. .env dosyasında VITE_SUPABASE_URL=https://proje-id.supabase.co olmalı (/rest/v1 olmadan).';
  }
  if (message.includes('Invalid API key')) {
    return 'Supabase anahtarı hatalı. Dashboard → API → anon public key kullanın.';
  }
  return message;
}

async function loadUserFromSession(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;
  try {
    return await ensureProfile(session.user);
  } catch {
    return mapAuthUserFallback(session.user);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  authError: null,

  clearAuthError: () => set({ authError: null }),

  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ isInitialized: true });
      return;
    }

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const user = await loadUserFromSession(session);
    set({
      user,
      isAuthenticated: Boolean(user),
      isInitialized: true,
    });

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextUser = await loadUserFromSession(nextSession);
      set({
        user: nextUser,
        isAuthenticated: Boolean(nextUser),
      });
    });
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: true, authError: null });
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({ user: mockUser, isAuthenticated: true, isLoading: false });
      return;
    }

    set({ isLoading: true, authError: null });
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ isLoading: false, authError: translateAuthError(error.message) });
      throw error;
    }

    const user = await loadUserFromSession(data.session);
    set({ user, isAuthenticated: Boolean(user), isLoading: false });
  },

  signUp: async (email, password, fullName) => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: true, authError: null });
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({ user: { ...mockUser, email, fullName }, isAuthenticated: true, isLoading: false });
      return;
    }

    set({ isLoading: true, authError: null });
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      set({ isLoading: false, authError: translateAuthError(error.message) });
      throw error;
    }

    if (!data.session) {
      set({
        isLoading: false,
        authError: null,
      });
      throw new Error('EMAIL_CONFIRMATION_REQUIRED');
    }

    const user = await loadUserFromSession(data.session);
    set({ user, isAuthenticated: Boolean(user), isLoading: false });
  },

  loginWithGoogle: async () => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: true });
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({ user: mockUser, isAuthenticated: true, isLoading: false });
      return;
    }

    set({ isLoading: true, authError: null });
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/kesfet`,
      },
    });

    if (error) {
      set({ isLoading: false, authError: error.message });
      throw error;
    }
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await getSupabase().auth.signOut();
    }
    set({ user: null, isAuthenticated: false });
  },
}));
