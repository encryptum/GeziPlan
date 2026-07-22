-- GeziPlan: Durak/mola değişiklik talepleri (organizatör onayı sistemi)

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  target_type text not null check (target_type in ('route_point', 'stop_recommendation')),
  target_id text not null,
  action text not null check (action in ('edit', 'delete')),
  payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by_id uuid references public.profiles (id) on delete set null,
  is_ai_request boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_id uuid references public.profiles (id) on delete set null
);

create index if not exists change_requests_trip_id_idx on public.change_requests (trip_id);
create index if not exists change_requests_status_idx on public.change_requests (status);

alter table public.change_requests enable row level security;

create policy "change_requests_select_public" on public.change_requests for select using (true);
create policy "change_requests_insert_auth" on public.change_requests for insert
  with check (auth.uid() = requested_by_id or requested_by_id is null);
create policy "change_requests_update_organizer" on public.change_requests for update
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );
create policy "change_requests_delete_organizer" on public.change_requests for delete
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );

-- Route point update/delete için RLS politikaları
create policy "route_points_update_organizer" on public.route_points for update
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );

-- Stop recommendation update/delete politikaları
create policy "stop_recommendations_update_organizer" on public.stop_recommendations for update
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );
create policy "stop_recommendations_delete_organizer" on public.stop_recommendations for delete
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );
