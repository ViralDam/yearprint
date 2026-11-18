-- The leaderboard is no longer public (issue #6). An edition's board is only
-- handed to a signed-in account (not a guest) that has finished its own play
-- on that edition; everyone else gets null. Visitors with no session can't
-- call it at all.
--
-- The body is unchanged apart from the extra conditions on "live". The
-- would-be rank now only reaches accounts with an unranked (archive) play,
-- since guests never get a board.

create or replace function public.get_leaderboard(p_edition_id uuid, p_limit integer default 50)
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
      -- Only accounts that have finished this edition see its board.
      and not game.is_guest(auth.uid())
      and exists (
        select 1
        from public.plays p
        where p.edition_id = e.id and p.user_id = auth.uid() and p.finished
      )
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
    -- For a finished play that isn't on the board (an archive play): the
    -- rank it would have had.
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

revoke all on function public.get_leaderboard(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_leaderboard(uuid, integer) to authenticated;
