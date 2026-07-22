-- GeziPlan Faz C: AI istek günlüğü (rate limit / maliyet takibi)

create table if not exists public.ai_request_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  action text not null check (action in ('chat', 'suggest_pois')),
  tokens_estimate int,
  created_at timestamptz not null default now()
);

create index if not exists ai_request_log_user_created_idx
  on public.ai_request_log (user_id, created_at desc);

create index if not exists ai_request_log_created_idx
  on public.ai_request_log (created_at desc);

alter table public.ai_request_log enable row level security;

-- Kullanıcı sadece kendi kayıtlarını görebilir
create policy "ai_request_log_select_own" on public.ai_request_log
  for select using (auth.uid() = user_id);

-- Insert edge function service role ile yapılır; istemci insert yok
