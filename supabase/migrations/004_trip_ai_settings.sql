-- GeziPlan: organizatör AI provider / model seçimi (gezi bazlı)

alter table public.trips
  add column if not exists ai_provider text not null default 'gemini'
    check (ai_provider in ('gemini', 'openai', 'deepseek')),
  add column if not exists ai_model text not null default 'gemini-2.0-flash';
