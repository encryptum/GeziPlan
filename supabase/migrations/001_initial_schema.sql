-- GeziPlan — Faz A: temel şema
-- Supabase SQL Editor'da veya CLI ile çalıştırın.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiller (auth.users ile eşleşir)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  avatar_url text default '',
  bio text default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', coalesce(new.raw_user_meta_data->>'picture', ''))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Geziler
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_image_url text,
  start_date date not null,
  end_date date not null,
  start_time time,
  category text not null check (category in ('doğa', 'tarih', 'şehir', 'deniz', 'kış', 'macera')),
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed', 'cancelled')),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  max_participants int not null default 10,
  current_participants int not null default 1,
  start_point text,
  end_point text,
  route_geometry jsonb,
  total_duration_minutes int,
  total_distance_km numeric(10, 1),
  tags text[] not null default '{}',
  rating numeric(3, 1) not null default 0,
  ai_recommendations_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists trips_organizer_id_idx on public.trips (organizer_id);
create index if not exists trips_status_idx on public.trips (status);
create index if not exists trips_category_idx on public.trips (category);

-- ---------------------------------------------------------------------------
-- Rota noktaları & bacaklar
-- ---------------------------------------------------------------------------
create table if not exists public.route_points (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  resolved_name text,
  latitude double precision not null,
  longitude double precision not null,
  sort_order int not null,
  unique (trip_id, sort_order)
);

create index if not exists route_points_trip_id_idx on public.route_points (trip_id);

create table if not exists public.route_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_order int not null,
  to_order int not null,
  duration_minutes int not null,
  distance_km numeric(10, 1) not null
);

create index if not exists route_legs_trip_id_idx on public.route_legs (trip_id);

-- ---------------------------------------------------------------------------
-- Mola / konaklama önerileri
-- ---------------------------------------------------------------------------
create table if not exists public.stop_recommendations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  route_point_order int not null,
  type text not null check (type in ('mola', 'konaklama')),
  title text not null,
  description text,
  duration_minutes int not null,
  suggested_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stop_recommendations_trip_id_idx on public.stop_recommendations (trip_id);

-- ---------------------------------------------------------------------------
-- Katılımcılar
-- ---------------------------------------------------------------------------
create table if not exists public.trip_participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'admin', 'member')),
  status text not null default 'confirmed' check (status in ('confirmed', 'pending', 'declined')),
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Sohbet (Faz B için hazır)
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  content text not null,
  message_type text not null default 'text',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.route_points enable row level security;
alter table public.route_legs enable row level security;
alter table public.stop_recommendations enable row level security;
alter table public.trip_participants enable row level security;
alter table public.chat_messages enable row level security;

-- Profiller: herkes okuyabilir, kullanıcı kendi profilini günceller
create policy "profiles_select_public" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Geziler: herkes okur; oluşturma/güncelleme organizatör
create policy "trips_select_public" on public.trips for select using (true);
create policy "trips_insert_authenticated" on public.trips for insert
  with check (auth.uid() = organizer_id);
create policy "trips_update_organizer" on public.trips for update
  using (auth.uid() = organizer_id);
create policy "trips_delete_organizer" on public.trips for delete
  using (auth.uid() = organizer_id);

-- Rota: gezi ile aynı erişim
create policy "route_points_select_public" on public.route_points for select using (true);
create policy "route_points_insert_organizer" on public.route_points for insert
  with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );
create policy "route_points_delete_organizer" on public.route_points for delete
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );

create policy "route_legs_select_public" on public.route_legs for select using (true);
create policy "route_legs_insert_organizer" on public.route_legs for insert
  with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );
create policy "route_legs_delete_organizer" on public.route_legs for delete
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );

-- Öneriler: herkes okur; giriş yapmış kullanıcı ekler
create policy "stop_recommendations_select_public" on public.stop_recommendations for select using (true);
create policy "stop_recommendations_insert_auth" on public.stop_recommendations for insert
  with check (auth.uid() = suggested_by_id);

-- Katılımcılar
create policy "trip_participants_select_public" on public.trip_participants for select using (true);
create policy "trip_participants_insert_auth" on public.trip_participants for insert
  with check (auth.uid() = user_id);

-- Sohbet
create policy "chat_messages_select_public" on public.chat_messages for select using (true);
create policy "chat_messages_insert_auth" on public.chat_messages for insert
  with check (auth.uid() = sender_id);
