-- Leaderboard and player stats.
--
-- The board for an edition lists finished, ranked plays by players with a
-- profile (so never guests), ordered by: score (high first), then fewer
-- guesses, then fewer pages unfolded, then who finished first. Only display
-- names leave the database; the caller's own row is flagged with "you".
--
-- Streaks count consecutive daily editions won on their own day (ranked
-- plays). Today's edition only breaks a streak once it's finished.

create function public.get_leaderboard(p_edition_id uuid, p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with live as (
    select e.id
    from public.editions e
    where e.id = p_edition_id
      and e.status = 'published'
      and e.publish_date <= public.utc_today()
  ),
  board as (
    select
      p.user_id,
      pr.display_name,
      p.score,
      cardinality(p.guesses) as guesses,
      cardinality(p.unfolded) as pages,
      p.won,
      p.finished_at,
      row_number() over (
        order by p.score desc, cardinality(p.guesses), cardinality(p.unfolded), p.finished_at
      ) as rank
    from public.plays p
    join live on live.id = p.edition_id
    join public.profiles pr on pr.id = p.user_id
    where p.finished and p.ranked
  ),
  mine as (
    select p.*
    from public.plays p
    join live on live.id = p.edition_id
    where p.user_id = auth.uid() and p.finished
  )
  select case when exists (select 1 from live) then jsonb_build_object(
    'total', (select count(*) from board),
    'rows', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'rank', b.rank, 'name', b.display_name, 'score', b.score,
            'guesses', b.guesses, 'pages', b.pages, 'won', b.won,
            'you', b.user_id is not distinct from auth.uid()
          )
          order by b.rank
        )
        from board b
        where b.rank <= least(greatest(coalesce(p_limit, 50), 1), 100)
      ),
      '[]'::jsonb
    ),
    -- The caller's own row, even when it's outside the top rows.
    'you', (
      select jsonb_build_object(
        'rank', b.rank, 'name', b.display_name, 'score', b.score,
        'guesses', b.guesses, 'pages', b.pages, 'won', b.won, 'you', true
      )
      from board b
      where b.user_id = auth.uid()
    ),
    -- For a finished play that isn't on the board (a guest, or an archive
    -- play): the rank it would have had.
    'would_be', (
      select 1 + (
        select count(*)
        from board b
        where (b.score, -b.guesses, -b.pages)
            > (m.score, -cardinality(m.guesses), -cardinality(m.unfolded))
          or (
            (b.score, b.guesses, b.pages)
              = (m.score, cardinality(m.guesses), cardinality(m.unfolded))
            and b.finished_at < m.finished_at
          )
      )
      from mine m
      where not exists (select 1 from board b where b.user_id = auth.uid())
    )
  ) end
$$;

create function public.get_my_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := game.require_user();
  played integer;
  wins integer;
  avg_score integer;
  distribution jsonb;
  current_streak integer := 0;
  max_streak integer := 0;
  run integer := 0;
  counting boolean := true;
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
      -- Today's edition, not finished yet, doesn't break the streak.
      if r.publish_date = public.utc_today() and not r.done then
        continue;
      end if;
    end if;
    if r.won then
      run := run + 1;
      max_streak := greatest(max_streak, run);
    else
      if counting then
        current_streak := run;
        counting := false;
      end if;
      run := 0;
    end if;
  end loop;
  if counting then
    current_streak := run;
  end if;

  return jsonb_build_object(
    'played', played,
    'wins', wins,
    'win_rate', case when played > 0 then round(100.0 * wins / played)::integer else 0 end,
    'average_score', avg_score,
    'current_streak', current_streak,
    'max_streak', max_streak,
    'distribution', distribution
  );
end
$$;

revoke all on function
  public.get_leaderboard(uuid, integer),
  public.get_my_stats()
from public, anon, authenticated;

grant execute on function public.get_leaderboard(uuid, integer) to anon, authenticated;
grant execute on function public.get_my_stats() to authenticated;
