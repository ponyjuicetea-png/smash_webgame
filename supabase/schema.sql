-- Run this file in the new Supabase project's SQL Editor.
-- Anonymous users created by Supabase Auth use the authenticated Postgres role,
-- so auth.uid() protects each player's private saves without requiring an email.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 0 and 3),
  data jsonb not null,
  wave integer,
  level integer,
  class_id text,
  score integer,
  mode text,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score integer not null check (score between 0 and 9999999),
  wave integer not null check (wave between 1 and 15),
  class_id text not null,
  mode text not null check (mode in ('normal', 'daily', 'ngplus')),
  daily_seed text,
  duration_sec integer,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists scores_score_idx
  on public.scores (score desc);
create index if not exists scores_daily_idx
  on public.scores (daily_seed, score desc);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.scores enable row level security;
alter table public.achievements enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.saves to authenticated;
grant select on public.scores to anon, authenticated;
grant insert on public.scores to authenticated;
grant select, insert on public.achievements to authenticated;

drop policy if exists "profiles are publicly readable" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users manage own saves" on public.saves;
create policy "users manage own saves"
  on public.saves for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "scores are publicly readable" on public.scores;
create policy "scores are publicly readable"
  on public.scores for select
  using (true);

drop policy if exists "users insert own scores" on public.scores;
create policy "users insert own scores"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read own achievements" on public.achievements;
create policy "users read own achievements"
  on public.achievements for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own achievements" on public.achievements;
create policy "users insert own achievements"
  on public.achievements for insert
  to authenticated
  with check (auth.uid() = user_id);
