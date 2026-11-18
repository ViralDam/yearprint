-- Game function tests. Runs against the linked project inside one
-- transaction that is always rolled back, so it leaves nothing behind.
--
--   pnpm db:test
--
-- Creates throwaway fixtures (a published archive edition, a draft and a
-- future edition, a registered user and an anonymous guest), then calls the
-- API exactly as the app would, switching to the anon/authenticated roles.
-- Any failed assertion aborts the run with its message.

begin;

-- Fixtures (as the admin role) ------------------------------------------------

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'player-a@yearprint.test', false),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', null, true);

insert into public.editions (id, edition_no, publish_date, status) values
  ('00000000-0000-4000-8000-00000000e001', 990001, public.utc_today() - 9000, 'published'),
  ('00000000-0000-4000-8000-00000000e002', 990002, public.utc_today() - 9001, 'draft'),
  ('00000000-0000-4000-8000-00000000e003', 990003, public.utc_today() + 9000, 'published');

insert into public.edition_answers (edition_id, answer_year) values
  ('00000000-0000-4000-8000-00000000e001', 1984),
  ('00000000-0000-4000-8000-00000000e002', 1984),
  ('00000000-0000-4000-8000-00000000e003', 1984);

insert into public.sections (id, edition_id, slug, name, short_name, icon, cost, folio, description, sort) values
  ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000e001', 'politics', 'World & Politics', 'Politics', '🌍', 200, 'A4', 'Leaders.', 0),
  ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000e001', 'sports', 'Sports', 'Sports', '🏅', 100, 'C1', 'Results.', 1);

insert into public.items (id, edition_id, section_id, slot, kind, sort, headline, lead, body, price) values
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-00000000e001', null, 'lead', 'article', 0, 'Front lead', 'A coy lead.', null, null),
  ('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-00000000e001', null, 'front_ad', 'ad', 1, 'An advert', null, 'Buy now.', '$1'),
  ('00000000-0000-4000-8000-00000000f003', '00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000c001', null, 'article', 0, 'Politics one', 'Names, at last.', null, null),
  ('00000000-0000-4000-8000-00000000f004', '00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000c001', null, 'figures', 1, 'Figures', null, 'a\nb', null),
  ('00000000-0000-4000-8000-00000000f005', '00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000c002', null, 'article', 0, 'Sports one', 'A record.', null, null);

insert into public.item_reveals (item_id, why)
select id, 'WHY-' || headline from public.items
where edition_id = '00000000-0000-4000-8000-00000000e001';

-- Tests --------------------------------------------------------------------------

do $test$
declare
  player_a constant uuid := '00000000-0000-4000-8000-0000000000a1';
  guest_b constant uuid := '00000000-0000-4000-8000-0000000000b2';
  archive constant uuid := '00000000-0000-4000-8000-00000000e001';
  ed jsonb;
  st jsonb;
  r jsonb;
  play_a uuid;
  play_b uuid;
  n integer;
  err text;
begin
  -- Anonymous visitor (not signed in) ----------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  ed := public.get_edition();
  assert ed is null or ed::text not like '%"why"%', 'today''s edition must not include reveal notes';
  assert ed is null or not (ed -> 'edition' ? 'answer_year'), 'today''s edition must not include the answer';

  ed := public.get_edition(990001);
  assert ed is not null, 'a published past edition is readable by number';
  assert (ed -> 'edition' ->> 'id')::uuid = archive, 'get_edition returns the requested edition';
  assert jsonb_array_length(ed -> 'front') = 2, 'front page has 2 items';
  assert jsonb_array_length(ed -> 'sections') = 2, 'section list has 2 sections';
  assert (ed -> 'sections' -> 0 ->> 'cost')::int = 200, 'section costs are listed';
  assert not (ed -> 'sections' -> 0 ? 'items'), 'section list carries no items';
  assert ed::text not like '%WHY-%', 'get_edition leaks no reveal notes';
  assert public.get_edition(990002) is null, 'draft editions are hidden';
  assert public.get_edition(990003) is null, 'future editions are hidden';

  begin
    perform public.start_play(archive);
    raise exception 'anon start_play was allowed';
  exception when insufficient_privilege then null;
  end;

  -- Player A (registered) ----------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', player_a, 'role', 'authenticated', 'is_anonymous', false)::text, true);

  assert public.get_play(archive) is null, 'no play before starting';

  st := public.start_play(archive);
  play_a := (st -> 'play' ->> 'id')::uuid;
  assert (st -> 'play' ->> 'score')::int = 1000, 'a play starts at 1000';
  assert not (st -> 'play' ->> 'ranked')::boolean, 'a play of a past edition is unranked';
  assert jsonb_typeof(st -> 'reveal') = 'null', 'no reveal before finishing';
  assert (public.start_play(archive) -> 'play' ->> 'id')::uuid = play_a, 'start_play resumes the same play';

  r := public.unfold_section(play_a, 'sports');
  assert (r -> 'play' ->> 'score')::int = 900, 'unfolding sports costs 100';
  assert jsonb_array_length(r -> 'section' -> 'items') = 1, 'unfold returns the section items';
  assert r::text not like '%WHY-%', 'unfold leaks no reveal notes';
  r := public.unfold_section(play_a, 'sports');
  assert (r -> 'play' ->> 'score')::int = 900, 'unfolding the same section again is free';

  begin
    perform public.unfold_section(play_a, 'nope');
    raise exception 'unknown section was allowed';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'section_not_found', 'unknown section rejected, got: ' || err;
  end;

  st := public.get_play(archive);
  assert st -> 'sections' ? 'sports', 'resumed state includes unfolded sections';
  assert not (st -> 'sections' ? 'politics'), 'resumed state excludes unpaid sections';
  assert st::text not like '%WHY-%', 'resumed state leaks no reveal notes';

  foreach n in array array[1959, 2021] loop
    begin
      perform public.submit_guess(play_a, n);
      raise exception 'year % was allowed', n;
    exception when others then
      get stacked diagnostics err = message_text;
      assert err = 'year_out_of_range', 'out-of-range year rejected, got: ' || err;
    end;
  end loop;

  r := public.submit_guess(play_a, 1970);
  assert r ->> 'result' = 'later', '1970 < 1984 says later';
  assert (r -> 'play' ->> 'score')::int = 800, 'a wrong guess costs 100';
  assert jsonb_typeof(r -> 'reveal') = 'null', 'no reveal after a miss';

  begin
    perform public.submit_guess(play_a, 1970);
    raise exception 'repeat guess was allowed';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'already_guessed', 'repeat guess rejected, got: ' || err;
  end;

  r := public.submit_guess(play_a, 1990);
  assert r ->> 'result' = 'earlier', '1990 > 1984 says earlier';
  assert (r -> 'play' ->> 'score')::int = 700, 'second miss costs 100';

  r := public.submit_guess(play_a, 1984);
  assert r ->> 'result' = 'hit', 'exact guess is a hit';
  assert (r -> 'play' ->> 'finished')::boolean and (r -> 'play' ->> 'won')::boolean, 'a hit wins and finishes';
  assert (r -> 'play' ->> 'score')::int = 700, 'a hit keeps the remaining score';
  assert jsonb_array_length(r -> 'play' -> 'guesses') = 3, 'all guesses recorded';
  assert r -> 'play' -> 'guesses' -> 0 ->> 'result' = 'later', 'guess hints recorded';
  assert (r -> 'reveal' ->> 'answer_year')::int = 1984, 'reveal names the year';
  assert (select count(*) from jsonb_object_keys(r -> 'reveal' -> 'front_why')) = 2, 'reveal has every front note';
  assert jsonb_array_length(r -> 'reveal' -> 'sections') = 2, 'reveal has every section';
  assert r -> 'reveal' -> 'sections' -> 0 -> 'items' -> 0 ->> 'why' = 'WHY-Politics one', 'reveal includes section notes';

  begin
    perform public.submit_guess(play_a, 2000);
    raise exception 'guess after finishing was allowed';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'play_finished', 'guess after finish rejected, got: ' || err;
  end;
  begin
    perform public.unfold_section(play_a, 'politics');
    raise exception 'unfold after finishing was allowed';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'play_finished', 'unfold after finish rejected, got: ' || err;
  end;

  st := public.get_play(archive);
  assert (st -> 'reveal' ->> 'answer_year')::int = 1984, 'finished state includes the reveal';

  select count(*) into n from public.plays;
  assert n = 1, 'a player sees only their own plays';

  begin
    update public.plays set score = 1000 where id = play_a;
    raise exception 'direct update of plays was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.edition_answers;
    raise exception 'edition_answers was readable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.item_reveals;
    raise exception 'item_reveals was readable';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.items where section_id is not null;
  assert n = 0, 'inside items are not readable directly';

  -- Guest B (anonymous sign-in) ---------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', guest_b, 'role', 'authenticated', 'is_anonymous', true)::text, true);

  begin
    perform public.unfold_section(play_a, 'politics');
    raise exception 'another user''s play was usable';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'play_not_found', 'other users'' plays are not found, got: ' || err;
  end;
  select count(*) into n from public.plays;
  assert n = 0, 'a guest cannot see other players'' plays';

  play_b := (public.start_play(archive) -> 'play' ->> 'id')::uuid;
  r := public.unfold_section(play_b, 'politics');
  assert (r -> 'play' ->> 'score')::int = 800, 'politics costs 200';
  perform public.submit_guess(play_b, 1960);
  perform public.submit_guess(play_b, 2020);
  r := public.submit_guess(play_b, 1983);
  assert (r -> 'play' ->> 'finished')::boolean, 'third miss finishes the play';
  assert not (r -> 'play' ->> 'won')::boolean, 'third miss loses';
  assert (r -> 'play' ->> 'score')::int = 0, 'losing scores 0';
  assert (r -> 'reveal' ->> 'answer_year')::int = 1984, 'losing still reveals the year';

  raise notice 'ALL GAME FUNCTION TESTS PASSED';
end
$test$;

select 'ALL GAME FUNCTION TESTS PASSED' as result;

rollback;
