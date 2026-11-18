-- Leaderboard and stats tests. Runs in one transaction that is always
-- rolled back. Real editions are hidden (drafted and moved out of the way)
-- for the duration, so streaks only see the fixtures.
--
--   pnpm db:test

begin;

do $test$
declare
  alice constant uuid := '00000000-0000-4000-8000-0000000a11ce';
  bob   constant uuid := '00000000-0000-4000-8000-000000000b0b';
  carol constant uuid := '00000000-0000-4000-8000-0000000ca201';
  dave  constant uuid := '00000000-0000-4000-8000-00000000da7e';
  eve   constant uuid := '00000000-0000-4000-8000-000000000e7e';
  guest constant uuid := '00000000-0000-4000-8000-0000000065e7';
  e0 constant uuid := '00000000-0000-4000-8000-0000000e0000';  -- today
  e1 constant uuid := '00000000-0000-4000-8000-0000000e0001';  -- yesterday
  e2 constant uuid := '00000000-0000-4000-8000-0000000e0002';
  e3 constant uuid := '00000000-0000-4000-8000-0000000e0003';
  e4 constant uuid := '00000000-0000-4000-8000-0000000e0004';
  draft constant uuid := '00000000-0000-4000-8000-0000000e00df';
  today constant date := public.utc_today();
  b jsonb;
  s jsonb;
begin
  -- Fixtures (as admin) ---------------------------------------------------------
  update public.editions set status = 'draft', publish_date = publish_date + 100000
  where edition_no < 990000;

  insert into public.editions (id, edition_no, publish_date, status) values
    (e0, 990200, today,     'published'),
    (e1, 990201, today - 1, 'published'),
    (e2, 990202, today - 2, 'published'),
    (e3, 990203, today - 3, 'published'),
    (e4, 990204, today - 4, 'published'),
    (draft, 990205, today - 5, 'draft');

  insert into auth.users (id, aud, role, email, is_anonymous, raw_user_meta_data) values
    (alice, 'authenticated', 'authenticated', 'alice@lb.test', false, '{"display_name":"Alice"}'),
    (bob,   'authenticated', 'authenticated', 'bob@lb.test',   false, '{"display_name":"Bob"}'),
    (carol, 'authenticated', 'authenticated', 'carol@lb.test', false, '{"display_name":"Carol"}'),
    (dave,  'authenticated', 'authenticated', 'dave@lb.test',  false, '{"display_name":"Dave"}'),
    (eve,   'authenticated', 'authenticated', 'eve@lb.test',   false, '{"display_name":"Eve"}'),
    (guest, 'authenticated', 'authenticated', null, true, '{}');

  -- Yesterday's board.
  insert into public.plays (user_id, edition_id, score, guesses, unfolded, finished, won, ranked, finished_at) values
    (bob,   e1, 800, '{2006}',           '{sports,ads}', true, true,  true,  now() - interval '50 minutes'),
    (alice, e1, 800, '{2000,2006}',      '{sports}',     true, true,  true,  now() - interval '40 minutes'),
    (dave,  e1, 800, '{2011,2006}',      '{ads}',        true, true,  true,  now() - interval '30 minutes'),
    (carol, e1,   0, '{1990,2015,2005}', '{}',           true, false, true,  now() - interval '20 minutes'),
    (guest, e1, 900, '{2000,2006}',      '{}',           true, true,  true,  now() - interval '10 minutes'),
    (eve,   e1, 500, '{2006}',           '{politics,tech,ads}', true, true, false, now() - interval '5 minutes'),
    (alice, draft, 1000, '{2006}',       '{}',           true, true,  true,  now());

  -- Alice's run: won e4, won e3, lost e2, won e1, today not played yet.
  insert into public.plays (user_id, edition_id, score, guesses, unfolded, finished, won, ranked, finished_at) values
    (alice, e4, 1000, '{1993}',           '{}', true, true,  true, now()),
    (alice, e3,  900, '{1980,1993}',      '{}', true, true,  true, now()),
    (alice, e2,    0, '{1960,1970,1980}', '{}', true, false, true, now());

  -- Dave is part-way through today's edition.
  insert into public.plays (user_id, edition_id, score, guesses, unfolded, finished, won, ranked, finished_at) values
    (dave, e0, 900, '{1990}', '{}', false, false, true, null);

  -- Anonymous visitor: no board at all ------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  begin
    perform public.get_leaderboard(e1);
    raise exception 'anon get_leaderboard was allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.get_my_stats();
    raise exception 'anon get_my_stats was allowed';
  exception when insufficient_privilege then null;
  end;

  -- Alice ---------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);

  b := public.get_leaderboard(e1);
  assert (b ->> 'total')::int = 4, 'board has the 4 ranked account plays, got ' || (b ->> 'total');
  assert (select string_agg(r ->> 'name', ',' order by (r ->> 'rank')::int)
          from jsonb_array_elements(b -> 'rows') r) = 'Bob,Alice,Dave,Carol',
    'ordered by score, guesses, pages, finish time: ' || (b -> 'rows')::text;
  assert b::text not like '%' || bob::text || '%', 'no user ids leave the database';
  assert jsonb_typeof(b -> 'would_be') = 'null', 'a ranked player has no would-be rank';
  assert jsonb_array_length(public.get_leaderboard(e1, 2) -> 'rows') = 2, 'limit caps the rows';
  assert public.get_leaderboard(draft) is null, 'draft editions have no board, even when played';

  b := public.get_leaderboard(e1, 1);
  assert (b -> 'you' ->> 'rank')::int = 2, 'alice sees her own rank outside the top rows';
  assert not (b -> 'rows' -> 0 ->> 'you')::boolean, 'other rows are not flagged as you';
  assert (public.get_leaderboard(e1) -> 'rows' -> 1 ->> 'you')::boolean, 'her row is flagged as you';

  assert public.get_leaderboard(e0) is null, 'no board for an edition alice has not finished';

  s := public.get_my_stats();
  assert (s ->> 'played')::int = 5, 'played counts finished plays, got ' || (s ->> 'played');
  assert (s ->> 'wins')::int = 4, 'wins, got ' || (s ->> 'wins');
  assert (s ->> 'win_rate')::int = 80, 'win rate, got ' || (s ->> 'win_rate');
  assert (s ->> 'current_streak')::int = 4, 'a loss still counts as a day played, and today unplayed keeps the streak, got ' || (s ->> 'current_streak');
  assert (s ->> 'max_streak')::int = 4, 'best streak, got ' || (s ->> 'max_streak');
  assert (s ->> 'best_win_streak')::int = 2, 'best winning run, got ' || (s ->> 'best_win_streak');
  assert s -> 'distribution' = '{"1": 2, "2": 2, "3": 0, "x": 1}'::jsonb,
    'distribution by guesses, got ' || (s -> 'distribution')::text;

  -- Winning today extends the streak and opens today's board.
  perform set_config('role', 'postgres', true);
  insert into public.plays (user_id, edition_id, score, guesses, unfolded, finished, won, ranked, finished_at)
  values (alice, e0, 1000, '{1993}', '{}', true, true, true, now());
  perform set_config('role', 'authenticated', true);
  s := public.get_my_stats();
  assert (s ->> 'current_streak')::int = 5, 'playing today extends the streak, got ' || (s ->> 'current_streak');
  assert (s ->> 'best_win_streak')::int = 2, 'two wins in a row again, got ' || (s ->> 'best_win_streak');
  b := public.get_leaderboard(e0);
  assert (b ->> 'total')::int = 1 and (b -> 'you' ->> 'rank')::int = 1,
    'finishing today opens its board, got ' || coalesce(b::text, 'null');

  -- Dave hasn't finished today: no board yet, though yesterday's is open.
  perform set_config('request.jwt.claims', json_build_object('sub', dave, 'role', 'authenticated')::text, true);
  assert public.get_leaderboard(e0) is null, 'an unfinished play does not open the board';
  assert public.get_leaderboard(e1) is not null, 'a finished play does';

  -- Carol lost yesterday: that still counts as a day played, but not as a win.
  perform set_config('request.jwt.claims', json_build_object('sub', carol, 'role', 'authenticated')::text, true);
  s := public.get_my_stats();
  assert (s ->> 'current_streak')::int = 1 and (s ->> 'max_streak')::int = 1, 'a loss keeps a played streak';
  assert (s ->> 'best_win_streak')::int = 0, 'a loss is no winning run';

  -- Eve's archive play isn't ranked, but she gets a would-be rank.
  perform set_config('request.jwt.claims', json_build_object('sub', eve, 'role', 'authenticated')::text, true);
  b := public.get_leaderboard(e1);
  assert jsonb_typeof(b -> 'you') = 'null', 'an unranked play has no row';
  assert (b ->> 'would_be')::int = 4, 'eve''s unranked 500 would have been 4th, got ' || (b ->> 'would_be');

  -- Guest: finished yesterday's edition, but guests never see the board.
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  assert public.get_leaderboard(e1) is null, 'a guest gets no board';

  -- The guest signs up (same user, now permanent). Their play joins the board,
  -- even before the token is re-issued without is_anonymous.
  perform set_config('role', 'postgres', true);
  update auth.users set is_anonymous = false, email = 'guest@lb.test' where id = guest;
  perform set_config('role', 'authenticated', true);
  b := public.get_leaderboard(e1);
  assert (b ->> 'total')::int = 5, 'the converted guest joins the board, got ' || coalesce(b ->> 'total', 'null');
  assert (b -> 'you' ->> 'rank')::int = 1, 'their 900 takes first, got ' || (b -> 'you' ->> 'rank');

  raise notice 'ALL LEADERBOARD TESTS PASSED';
end
$test$;

select 'ALL LEADERBOARD TESTS PASSED' as result;

rollback;
