import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { ProfileRow } from '../lib/database.types';
import type { User } from '../types';

export function mapProfileToUser(profile: ProfileRow): User {
  return {
    id: profile.id,
    email: profile.email ?? '',
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    bio: profile.bio ?? '',
    createdAt: profile.created_at,
  };
}

export function mapAuthUserFallback(authUser: SupabaseUser): User {
  const meta = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    fullName: (meta.full_name as string) || (meta.name as string) || authUser.email?.split('@')[0] || 'Kullanıcı',
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
    bio: '',
    createdAt: authUser.created_at,
  };
}

export async function fetchProfile(userId: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfileToUser(data);
}

export async function ensureProfile(authUser: SupabaseUser): Promise<User> {
  const existing = await fetchProfile(authUser.id);
  if (existing) return existing;

  const fallback = mapAuthUserFallback(authUser);
  const supabase = getSupabase();
  const profileInsert = {
    id: authUser.id,
    email: authUser.email,
    full_name: fallback.fullName,
    avatar_url: fallback.avatarUrl,
  };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileInsert)
    .select('*')
    .single();

  if (error) throw error;
  return mapProfileToUser(data);
}
