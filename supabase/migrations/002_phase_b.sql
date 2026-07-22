-- GeziPlan Faz B: önbellek, sohbet realtime, geziye katıl

-- ---------------------------------------------------------------------------
-- Mapbox önbellek (geocoding + rota)
-- ---------------------------------------------------------------------------
create table if not exists public.geocode_cache (
  cache_key text primary key,
  result jsonb not null,
  hit_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_cache (
  cache_key text primary key,
  result jsonb not null,
  hit_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists geocode_cache_updated_idx on public.geocode_cache (updated_at desc);
create index if not exists route_cache_updated_idx on public.route_cache (updated_at desc);

alter table public.geocode_cache enable row level security;
alter table public.route_cache enable row level security;

create policy "geocode_cache_select" on public.geocode_cache for select using (true);
create policy "geocode_cache_insert" on public.geocode_cache for insert with check (true);
create policy "geocode_cache_update" on public.geocode_cache for update using (true);

create policy "route_cache_select" on public.route_cache for select using (true);
create policy "route_cache_insert" on public.route_cache for insert with check (true);
create policy "route_cache_update" on public.route_cache for update using (true);

-- ---------------------------------------------------------------------------
-- Geziye katıl / ayrıl
-- ---------------------------------------------------------------------------
create or replace function public.join_trip(p_trip_id uuid)
returns public.trip_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
  v_participant public.trip_participants%rowtype;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  select * into v_trip from public.trips where id = p_trip_id;
  if not found then
    raise exception 'Gezi bulunamadı';
  end if;

  if v_trip.organizer_id = v_user_id then
    raise exception 'Organizatör zaten gezide';
  end if;

  if v_trip.current_participants >= v_trip.max_participants then
    raise exception 'Gezi dolu';
  end if;

  if exists (
    select 1 from public.trip_participants
    where trip_id = p_trip_id and user_id = v_user_id and status = 'confirmed'
  ) then
    raise exception 'Bu geziye zaten katıldınız';
  end if;

  insert into public.trip_participants (trip_id, user_id, role, status)
  values (p_trip_id, v_user_id, 'member', 'confirmed')
  on conflict (trip_id, user_id) do update
    set status = 'confirmed', joined_at = now()
  returning * into v_participant;

  update public.trips
  set current_participants = (
    select count(*)::int from public.trip_participants
    where trip_id = p_trip_id and status = 'confirmed'
  )
  where id = p_trip_id;

  return v_participant;
end;
$$;

create or replace function public.leave_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  if exists (
    select 1 from public.trips where id = p_trip_id and organizer_id = v_user_id
  ) then
    raise exception 'Organizatör geziden ayrılamaz';
  end if;

  delete from public.trip_participants
  where trip_id = p_trip_id and user_id = v_user_id;

  update public.trips
  set current_participants = greatest(1, (
    select count(*)::int from public.trip_participants
    where trip_id = p_trip_id and status = 'confirmed'
  ))
  where id = p_trip_id;
end;
$$;

grant execute on function public.join_trip(uuid) to authenticated;
grant execute on function public.leave_trip(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: sohbet mesajları
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.chat_messages;

-- Katılımcı insert politikası (RPC dışında doğrudan insert için)
drop policy if exists "trip_participants_insert_auth" on public.trip_participants;
create policy "trip_participants_insert_auth" on public.trip_participants
  for insert with check (auth.uid() = user_id);
