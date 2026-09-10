create table public.daily_results (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  puzzle_date date not null,
  won boolean not null,
  attempts smallint not null check (attempts between 1 and 10),
  completed_at timestamptz not null default now(),
  primary key (user_id, puzzle_date),
  check (puzzle_date >= date '2026-01-01')
);

alter table public.daily_results enable row level security;

revoke all on table public.daily_results from anon, authenticated;
grant select on table public.daily_results to authenticated;
grant insert (puzzle_date, won, attempts) on table public.daily_results to authenticated;

create policy "Users can read their own daily results"
on public.daily_results
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own daily results"
on public.daily_results
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and puzzle_date <= (now() at time zone 'America/Santiago')::date
);
