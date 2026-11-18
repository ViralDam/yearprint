-- Account tests: profiles, display names, guest conversion and merge tickets.
-- Runs in one transaction that is always rolled back.
--
--   pnpm db:test

begin;

do $test$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000a11c';
  bob constant uuid := '00000000-0000-4000-8000-0000000000b0';
  guest constant uuid := '00000000-0000-4000-8000-00000000065e';
  ed_a constant uuid := '00000000-0000-4000-8000-0000000ed00a';
  ed_b constant uuid := '00000000-0000-4000-8000-0000000ed00b';
  t uuid;
  n integer;
  name text;
  bob_name text;
  err text;
begin
  -- Fixtures (as admin) ---------------------------------------------------------
  insert into public.editions (id, edition_no, publish_date, status) values
    (ed_a, 990101, public.utc_today() - 9100, 'published'),
    (ed_b, 990102, public.utc_today() - 9101, 'published');

  -- A sign-up with a requested name gets a profile with that name.
  insert into auth.users (id, aud, role, email, is_anonymous, raw_user_meta_data)
  values (alice, 'authenticated', 'authenticated', 'alice@yearprint.test', false,
          '{"display_name": "  Alice   Ink "}');
  select display_name into name from public.profiles where id = alice;
  assert name = 'Alice Ink', 'sign-up creates a cleaned profile name, got ' || coalesce(name, 'null');

  -- A clashing name gets a suffix instead of failing the sign-up.
  insert into auth.users (id, aud, role, email, is_anonymous, raw_user_meta_data)
  values (bob, 'authenticated', 'authenticated', 'bob@yearprint.test', false,
          '{"display_name": "alice ink"}');
  select display_name into bob_name from public.profiles where id = bob;
  assert bob_name ~ '^alice ink-[0-9]{4}$', 'clashing name gets a suffix, got ' || coalesce(bob_name, 'null');

  -- Guests get no profile...
  insert into auth.users (id, aud, role, email, is_anonymous) values
    (guest, 'authenticated', 'authenticated', null, true);
  assert not exists (select 1 from public.profiles where id = guest), 'guests get no profile';

  -- ...until they convert to an account.
  update auth.users
  set is_anonymous = false, email = 'guest@yearprint.test',
      raw_user_meta_data = '{"display_name": "Former Guest"}'
  where id = guest;
  select display_name into name from public.profiles where id = guest;
  assert name = 'Former Guest', 'converting a guest creates its profile, got ' || coalesce(name, 'null');
  update auth.users set is_anonymous = true where id = guest;
  delete from public.profiles where id = guest;

  -- Anonymous visitor: name availability ------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  assert not public.display_name_available('ALICE INK'), 'taken names are unavailable (any case)';
  assert public.display_name_available('Fresh Name'), 'free names are available';
  assert not public.display_name_available('x'), 'too-short names are unavailable';
  assert not public.display_name_available('<script>'), 'odd characters are unavailable';
  begin
    perform public.set_display_name('Nope');
    raise exception 'anon set_display_name was allowed';
  exception when insufficient_privilege then null;
  end;

  -- Alice renames ------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  assert public.set_display_name('Alice Prints') = 'Alice Prints', 'rename works';
  assert public.set_display_name('ALICE PRINTS') = 'ALICE PRINTS', 'changing your own name''s case works';
  begin
    perform public.set_display_name(bob_name);
    raise exception 'taking another player''s name was allowed';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err in ('display_name_taken'), 'taken name rejected, got: ' || err;
  end;
  begin
    perform public.set_display_name('a');
    raise exception 'invalid name was allowed';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'display_name_invalid', 'invalid name rejected, got: ' || err;
  end;
  begin
    perform public.create_merge_ticket();
    raise exception 'an account minted a merge ticket';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'not_a_guest', 'accounts cannot mint tickets, got: ' || err;
  end;

  -- Guest plays two editions, then signs in as Alice --------------------------------
  perform set_config('role', 'postgres', true);
  insert into public.plays (user_id, edition_id, score) values
    (guest, ed_a, 700), (guest, ed_b, 400), (alice, ed_b, 900);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  begin
    perform public.set_display_name('Sneaky Guest');
    raise exception 'a guest set a display name';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'guests_have_no_profile', 'guests cannot set names, got: ' || err;
  end;
  t := public.create_merge_ticket();
  assert t is not null, 'a guest can mint a ticket';
  begin
    perform public.redeem_merge_ticket(t);
    raise exception 'a guest redeemed a ticket';
  exception when others then
    get stacked diagnostics err = message_text;
    assert err = 'not_signed_in', 'guests cannot redeem, got: ' || err;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  n := public.redeem_merge_ticket(t);
  assert n = 1, 'only the non-conflicting play moves, moved ' || n;
  select count(*) into n from public.plays where user_id = alice;
  assert n = 2, 'alice now has both editions';
  select score into n from public.plays where user_id = alice and edition_id = ed_b;
  assert n = 900, 'alice keeps her own play when both played';
  assert public.redeem_merge_ticket(t) = 0, 'tickets are single-use';

  -- Bob can't use a ticket he didn't get, and old tickets expire.
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  t := public.create_merge_ticket();
  perform set_config('role', 'postgres', true);
  update game.merge_tickets set created_at = now() - interval '11 minutes' where token = t;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  assert public.redeem_merge_ticket(t) = 0, 'expired tickets move nothing';
  assert public.redeem_merge_ticket(gen_random_uuid()) = 0, 'unknown tickets move nothing';

  begin
    perform 1 from game.merge_tickets;
    raise exception 'merge_tickets was readable';
  exception when insufficient_privilege then null;
  end;

  raise notice 'ALL ACCOUNT TESTS PASSED';
end
$test$;

select 'ALL ACCOUNT TESTS PASSED' as result;

rollback;
