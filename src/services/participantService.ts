import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Participant, User } from '../types';

interface ParticipantRow {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  member: { id: string; full_name: string; avatar_url: string | null } | null;
}

function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.member?.full_name ?? 'Katılımcı',
    avatarUrl: row.member?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
    role: row.role as Participant['role'],
    status: row.status as Participant['status'],
    joinedAt: row.joined_at,
  };
}

export async function fetchTripParticipants(tripId: string): Promise<Participant[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trip_participants')
    .select(`*, member:profiles!user_id (id, full_name, avatar_url)`)
    .eq('trip_id', tripId)
    .eq('status', 'confirmed')
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data as ParticipantRow[]).map(mapParticipant);
}

export async function joinTripInDb(tripId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('join_trip', { p_trip_id: tripId });
  if (error) throw error;
}

export async function leaveTripInDb(tripId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('leave_trip', { p_trip_id: tripId });
  if (error) throw error;
}

export function isUserParticipant(participants: Participant[], user: User | null, organizerId: string): boolean {
  if (!user) return false;
  if (user.id === organizerId) return true;
  return participants.some((p) => p.userId === user.id && p.status === 'confirmed');
}
