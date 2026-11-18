-- Streaks count days played, not days won.
--
-- A day counts when the player finishes that day's edition on its own day
-- (a ranked play), whatever the score. Days with no published edition don't
-- break a run, and today's edition only breaks it once the day is over.
-- Archive plays never count. The old "consecutive wins" run lives on as
-- best_win_streak in get_my_stats().
--
-- Streaks are stored, not walked on every read, so the header can show one
-- on every page. A trigger on plays refreshes a player's row whenever one of
-- their ranked plays finishes, moves to another user (guest merge) or goes
-- away. Reads apply the decay: if a published edition came and went after
-- the run's last day, the current streak reads as 0. No midnight job needed.
-- Guests get streaks too (they're real anonymous users with plays).

create table game.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Length of the most recent run, as of last_date.
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= current_streak),
  -- Publish date of the last edition in the most recent run.
  last_date date,
  updated_at timestamptz not null default now()
);

revoke all on game.streaks from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

-- Recomputes a player's runs from scratch over the published editions.
create function game.refresh_streak(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cur integer;
  best integer;
  last date;
begin
  -- Plays are cascade-deleted with their user; don't recreate a row for them.
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    delete from game.streaks where user_id = p_user_id;
    return;
  end if;

  with e as (
    select
      ed.publish_date,
      row_number() over (order by ed.publish_date) as n,
      exists (
        select 1 from public.plays p
        where p.edition_id = ed.id and p.user_id = p_user_id and p.finished and p.ranked
      ) as done
    from public.editions ed
    where ed.status = 'published' and ed.publish_date <= public.utc_today()
  ),
  -- Gaps and islands: consecutive played editions share n - row_number().
  runs as (
    select count(*)::integer as len, max(publish_date) as last_date
    from (
      select publish_date, n - row_number() over (order by publish_date) as grp
      from e
      where done
    ) x
    group by grp
  )
  select
    coalesce(max(len), 0),
    coalesce((array_agg(len order by last_date desc))[1], 0),
    max(last_date)
  into best, cur, last
  from runs;

  insert into game.streaks (user_id, current_streak, best_streak, last_date, updated_at)
  values (p_user_id, cur, best, last, now())
  on conflict (user_id) do update
  set current_streak = excluded.current_streak,
      best_streak = excluded.best_streak,
      last_date = excluded.last_date,
      updated_at = excluded.updated_at;
end
$$;

-- Keeps game.streaks in step with plays.
create function game.on_play_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' and old.finished and old.ranked then
    perform game.refresh_streak(old.user_id);
  end if;
  if tg_op <> 'DELETE' and new.finished and new.ranked
     and (tg_op = 'INSERT'
          or new.user_id is distinct from old.user_id
          or not (old.finished and old.ranked)) then
    perform game.refresh_streak(new.user_id);
  end if;
  return null;
end
$$;

create trigger plays_refresh_streak
after insert or delete or update of finished, ranked, user_id, edition_id on public.plays
for each row execute function game.on_play_changed();

-- The player's streak as the app sees it, with the decay applied, plus the
-- last 7 UTC days for the results strip. Each day's status is one of:
-- won / lost (finished on the day; both count), open (today, not finished),
-- skipped (an edition the player didn't finish on its day), none (no edition).
create function game.streak_json(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s game.streaks;
  today date := public.utc_today();
  alive boolean;
  has_today boolean;
  recent jsonb;
begin
  select * into s from game.streaks where user_id = p_user_id;

  alive := s.last_date is not null and not exists (
    select 1 from public.editions ed
    where ed.status = 'published' and ed.publish_date > s.last_date and ed.publish_date < today
  );

  has_today := exists (
    select 1 from public.editions ed where ed.status = 'published' and ed.publish_date = today
  );

  select jsonb_agg(jsonb_build_object('date', d.day, 'status', d.status) order by d.day)
  into recent
  from (
    select
      g.day::date as day,
      case
        when ed.id is null then 'none'
        when p.won then 'won'
        when p.id is not null then 'lost'
        when g.day::date = today then 'open'
        else 'skipped'
      end as status
    from generate_series(today - 6, today, interval '1 day') as g(day)
    left join public.editions ed on ed.publish_date = g.day::date and ed.status = 'published'
    left join public.plays p
      on p.edition_id = ed.id and p.user_id = p_user_id and p.finished and p.ranked
  ) d;

  return jsonb_build_object(
    'current', case when alive then s.current_streak else 0 end,
    'best', coalesce(s.best_streak, 0),
    'played_today', coalesce(s.last_date = today, false),
    'today_open', has_today and coalesce(s.last_date, '-infinity'::date) < today,
    'recent', recent
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Public API
-- ---------------------------------------------------------------------------

-- The caller's streak (accounts and guests).
create function public.get_my_streak()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select game.streak_json(game.require_user())
$$;

-- Stats now take their streaks from game.streaks (days played). The loop
-- below only finds the best run of consecutive wins.
create or replace function public.get_my_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := game.require_user();
  streak jsonb := game.streak_json(uid);
  played integer;
  wins integer;
  avg_score integer;
  distribution jsonb;
  best_win_streak integer := 0;
  run integer := 0;
  first_row boolean := true;
  r record;
begin
  select
    count(*),
    count(*) filter (where p.won),
    coalesce(round(avg(p.score)), 0),
    jsonb_build_object(
      '1', count(*) filter (where p.won and cardinality(p.guesses) = 1),
      '2', count(*) filter (where p.won and cardinality(p.guesses) = 2),
      '3', count(*) filter (where p.won and cardinality(p.guesses) = 3),
      'x', count(*) filter (where not p.won)
    )
  into played, wins, avg_score, distribution
  from public.plays p
  where p.user_id = uid and p.finished;

  -- Walk the daily editions newest first.
  for r in
    select
      e.publish_date,
      coalesce(bool_or(p.won and p.ranked), false) as won,
      coalesce(bool_or(p.finished and p.ranked), false) as done
    from public.editions e
    left join public.plays p on p.edition_id = e.id and p.user_id = uid
    where e.status = 'published' and e.publish_date <= public.utc_today()
    group by e.publish_date
    order by e.publish_date desc
  loop
    if first_row then
      first_row := false;
      if r.publish_date = public.utc_today() and not r.done then
        continue;
      end if;
    end if;
    if r.won then
      run := run + 1;
      best_win_streak := greatest(best_win_streak, run);
    else
      run := 0;
    end if;
  end loop;

  return jsonb_build_object(
    'played', played,
    'wins', wins,
    'win_rate', case when played > 0 then round(100.0 * wins / played)::integer else 0 end,
    'average_score', avg_score,
    'current_streak', (streak ->> 'current')::integer,
    'max_streak', (streak ->> 'best')::integer,
    'best_win_streak', best_win_streak,
    'distribution', distribution
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Backfill and privileges
-- ---------------------------------------------------------------------------

select game.refresh_streak(u.user_id)
from (select distinct user_id from public.plays where finished and ranked) u;

revoke all on all functions in schema game from public, anon, authenticated;

revoke all on function public.get_my_streak() from public, anon, authenticated;
grant execute on function public.get_my_streak() to authenticated;
