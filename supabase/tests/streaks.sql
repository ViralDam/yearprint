-- Streak tests: days played, gaps with no edition, decay on read, archive
-- plays, finishing through submit_guess, guest merges and user deletion.
-- Runs in one transaction that is always rolled back. Real editions are
-- hidden (drafted and moved out of the way) for the duration.
--
--   pnpm db:test

begin;

do $test$
declare
  alice constant uuid := '00000000-0000-4000-8000-0000005a11ce';
  bob   constant uuid := '00000000-0000-4000-8000-000000050b0b';
  guest constant uuid := '00000000-0000-4000-8000-0000005065e7';
  e0 constant uuid := '00000000-0000-4000-8000-0000005e0000';  -- today
  e1 constant uuid := '00000000-0000-4000-8000-0000005e0001';  -- yesterday
  -- no edition two days ago
  e3 constant uuid := '00000000-0000-4000-8000-0000005e0003';
  e4 constant uuid := '00000000-0000-4000-8000-0000005e0004';
  e5 constant uuid := '00000000-0000-4000-8000-0000005e0005';
  e6 constant uuid := '00000000-0000-4000-8000-0000005e0006';
  today constant date := public.utc_today();
  s jsonb;
  play uuid;
  t uuid;
begin
  -- Fixtures (as admin) ---------------------------------------------------------
  update public.editions set status = 'draft', publish_date = publish_date + 100000
  where edition_no < 990000;

  insert into public.editions (id, edition_no, publish_date, status) values
    (e0, 990300, today,     'published'),
    (e1, 990301, today - 1, 'published'),
    (e3, 990303, today - 3, 'published'),
    (e4, 990304, today - 4, 'published'),
    (e5, 990305, today - 5, 'published'),
    (e6, 990306, today - 6, 'published');
  insert into public.edition_answers (edition_id, answer_year) values (e0, 1993);

  insert into auth.users (id, aud, role, email, is_anonymous, raw_user_meta_data) values
    (alice, 'authenticated', 'authenticated', 'alice@streak.test', false, '{"display_name":"Streak Alice"}'),
    (bob,   'authenticated', 'authenticated', 'bob@streak.test',   false, '{"display_name":"Streak Bob"}'),
    (guest, 'authenticated', 'authenticated', null, true, '{}');

  -- Alice: won e6, skipped e5, lost e4, won e3, (no edition), won e1, today open.
  insert into public.plays (user_id, edition_id, score, guesses, finished, won, ranked, finished_at) values
    (alice, e6, 1000, '{1993}',           true, true,  true, now()),
    (alice, e4,    0, '{1960,1970,1980}', true, false, true, now()),
    (alice, e3,  900, '{1980,1993}',      true, true,  true, now()),
    (alice, e1, 1000, '{1993}',           true, true,  true, now());

  -- Bob finished e3 only, then missed yesterday: his streak has lapsed.
  insert into public.plays (user_id, edition_id, score, guesses, finished, won, ranked, finished_at) values
    (bob, e3, 1000, '{1993}', true, true, true, now());

  -- The guest finished yesterday's and today's editions.
  insert into public.plays (user_id, edition_id, score, guesses, finished, won, ranked, finished_at) values
    (guest, e1, 1000, '{1993}', true, true, true, now()),
    (guest, e0, 1000, '{1993}', true, true, true, now());

  -- Visitors with no session can't ask --------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform public.get_my_streak();
    raise exception 'anon get_my_streak was allowed';
  exception when insufficient_privilege then null;
  end;

  -- Alice ---------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);

  s := public.get_my_streak();
  assert (s ->> 'current')::int = 3,
    'a loss counts, a day with no edition doesn''t break it, today open doesn''t either; got ' || s::text;
  assert (s ->> 'best')::int = 3, 'best, got ' || s::text;
  assert not (s ->> 'played_today')::boolean, 'not played today';
  assert (s ->> 'today_open')::boolean, 'today''s edition is waiting';
  assert (select string_agg(d ->> 'status', ',' order by d ->> 'date') from jsonb_array_elements(s -> 'recent') d)
         = 'won,skipped,lost,won,none,won,open',
    'last 7 days, got ' || (s -> 'recent')::text;

  -- An archive play of the skipped day doesn't repair the gap.
  perform set_config('role', 'postgres', true);
  insert into public.plays (user_id, edition_id, score, guesses, finished, won, ranked, finished_at)
  values (alice, e5, 1000, '{1993}', true, true, false, now());
  perform set_config('role', 'authenticated', true);
  s := public.get_my_streak();
  assert (s ->> 'best')::int = 3, 'archive plays never count, got ' || s::text;
  assert s -> 'recent' -> 1 ->> 'status' = 'skipped', 'an archive play stays skipped';

  -- Finishing today through the game functions extends the run.
  play := ((public.start_play(e0)) -> 'play' ->> 'id')::uuid;
  perform public.submit_guess(play, 1990);
  s := public.get_my_streak();
  assert (s ->> 'current')::int = 3, 'an unfinished play doesn''t count yet, got ' || s::text;
  perform public.submit_guess(play, 1993);
  s := public.get_my_streak();
  assert (s ->> 'current')::int = 4 and (s ->> 'best')::int = 4, 'finishing today extends it, got ' || s::text;
  assert (s ->> 'played_today')::boolean and not (s ->> 'today_open')::boolean, 'today is done';
  assert s -> 'recent' -> 6 ->> 'status' = 'won', 'today shows as won';
  assert (public.get_my_stats() ->> 'current_streak')::int = 4, 'stats agree with the streak';

  -- Bob: his run ended before yesterday's edition --------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  s := public.get_my_streak();
  assert (s ->> 'current')::int = 0 and (s ->> 'best')::int = 1, 'a missed edition breaks it on read, got ' || s::text;

  -- Guest -----------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  s := public.get_my_streak();
  assert (s ->> 'current')::int = 2, 'guests have streaks too, got ' || s::text;

  -- Bob plays today too, then signs the guest in: yesterday's play moves across,
  -- today's stays with the guest (Bob's own play wins the clash).
  perform set_config('role', 'postgres', true);
  insert into public.plays (user_id, edition_id, score, guesses, finished, won, ranked, finished_at)
  values (bob, e0, 0, '{1960,1970,1980}', true, false, true, now());
  perform set_config('role', 'authenticated', true);
  t := public.create_merge_ticket();

  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  assert (public.get_my_streak() ->> 'current')::int = 1, 'bob has today only before the merge';
  assert public.redeem_merge_ticket(t) = 1, 'one play moves';
  s := public.get_my_streak();
  assert (s ->> 'current')::int = 3 and (s ->> 'best')::int = 3, 'the merged play joins his run, got ' || s::text;

  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  assert (public.get_my_streak() ->> 'current')::int = 1, 'the guest keeps today';

  -- Deleting a user clears their streak row (and doesn't trip over the cascade).
  perform set_config('role', 'postgres', true);
  delete from auth.users where id = guest;
  assert not exists (select 1 from game.streaks where user_id = guest), 'deleted users leave no streak';

  raise notice 'ALL STREAK TESTS PASSED';
end
$test$;

select 'ALL STREAK TESTS PASSED' as result;

rollback;
