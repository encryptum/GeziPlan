export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      trips: {
        Row: {
          id: string;
          title: string;
          description: string;
          cover_image_url: string | null;
          start_date: string;
          end_date: string;
          start_time: string | null;
          category: string;
          status: string;
          organizer_id: string;
          max_participants: number;
          current_participants: number;
          start_point: string | null;
          end_point: string | null;
          route_geometry: Json | null;
          total_duration_minutes: number | null;
          total_distance_km: number | null;
          tags: string[];
          rating: number;
          ai_recommendations_enabled: boolean;
          ai_provider: string;
          ai_model: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'created_at' | 'rating' | 'current_participants' | 'status'> & {
          id?: string;
          rating?: number;
          current_participants?: number;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
      };
      route_points: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          resolved_name: string | null;
          latitude: number;
          longitude: number;
          sort_order: number;
        };
        Insert: Omit<Database['public']['Tables']['route_points']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['route_points']['Insert']>;
      };
      route_legs: {
        Row: {
          id: string;
          trip_id: string;
          from_order: number;
          to_order: number;
          duration_minutes: number;
          distance_km: number;
        };
        Insert: Omit<Database['public']['Tables']['route_legs']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['route_legs']['Insert']>;
      };
      stop_recommendations: {
        Row: {
          id: string;
          trip_id: string;
          route_point_order: number;
          type: string;
          title: string;
          description: string | null;
          duration_minutes: number;
          suggested_by_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stop_recommendations']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stop_recommendations']['Insert']>;
      };
      trip_participants: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          role: string;
          status: string;
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trip_participants']['Row'], 'id' | 'joined_at'> & {
          id?: string;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trip_participants']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          trip_id: string;
          sender_id: string | null;
          content: string;
          message_type: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      change_requests: {
        Row: {
          id: string;
          trip_id: string;
          target_type: string;
          target_id: string;
          action: string;
          payload: Json | null;
          status: string;
          requested_by_id: string | null;
          is_ai_request: boolean;
          created_at: string;
          resolved_at: string | null;
          resolved_by_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['change_requests']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['change_requests']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type TripRow = Database['public']['Tables']['trips']['Row'];
export type RoutePointRow = Database['public']['Tables']['route_points']['Row'];
export type RouteLegRow = Database['public']['Tables']['route_legs']['Row'];
export type StopRecommendationRow = Database['public']['Tables']['stop_recommendations']['Row'];
export type ChangeRequestRow = Database['public']['Tables']['change_requests']['Row'];

export type TripParticipantRow = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  member: ProfileRow | null;
};

export type TripWithRelations = TripRow & {
  organizer: ProfileRow | null;
  route_points: RoutePointRow[];
  route_legs: RouteLegRow[];
  stop_recommendations: (StopRecommendationRow & { suggester: ProfileRow | null })[];
  change_requests: (ChangeRequestRow & { requester: ProfileRow | null })[];
  trip_participants?: TripParticipantRow[];
};
