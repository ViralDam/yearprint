-- Accounts: profiles for permanent (non-guest) users, display-name rules, and
-- moving a guest's games into an existing account when the guest signs in.
--
-- * A profile is created automatically when a permanent user appears: a new
--   sign-up, or a guest converting to an account. Taken names get a numeric
--   suffix instead of failing the sign-up; the app checks availability first.
-- * Display names are 2–30 characters: letters, digits, spaces and . _ - '
-- * Guests never get a profile, so they never appear on the leaderboard.

-- ---------------------------------------------------------------------------
-- Display names
-- ---------------------------------------------------------------------------

-- The cleaned name, or null if it breaks the rules.
create function game.clean_display_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name is null then null
    when char_length(btrim(p_name)) between 2 and 30
      and btrim(p_name) ~ '^[[:alnum:] ._''-]+$'
      then regexp_replace(btrim(p_name), '\s+', ' ', 'g')
  end
$$;

create function game.is_guest(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.is_anonymous from auth.users u where u.id = p_user_id), true)
$$;

-- Creates the user's profile if missing, de-duplicating the name if needed.
create function game.ensure_profile(p_user_id uuid, p_requested text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := coalesce(game.clean_display_name(p_requested), 'Reader');
  candidate text := base;
  attempts integer := 0;
begin
  if exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;
  loop
    begin
      insert into public.profiles (id, display_name) values (p_user_id, candidate);
      return;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 20 then
        raise;
      end if;
      candidate := left(base, 25) || '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    end;
  end loop;
end
$$;

-- Fires when a user is created or stops being anonymous.
create function game.on_user_saved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(new.is_anonymous, false) then
    perform game.ensure_profile(new.id, new.raw_user_meta_data ->> 'display_name');
  end if;
  return new;
end
$$;

create trigger on_auth_user_saved
  after insert or update of is_anonymous on auth.users
  for each row execute function game.on_user_saved();

-- ---------------------------------------------------------------------------
-- Guest → existing account: one-time merge tickets
-- ---------------------------------------------------------------------------
-- Before signing a guest in to an existing account, the server asks for a
-- ticket *as the guest*; after sign-in it redeems it *as the account*. Only
-- the holder of the guest session can mint a ticket, so nobody can claim
-- another guest's games by knowing their id.

create table game.merge_tickets (
  token uuid primary key default gen_random_uuid(),
  guest_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Public API
-- ---------------------------------------------------------------------------

-- Lets the sign-up form check a name before submitting.
create function public.display_name_available(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select game.clean_display_name(p_name) is not null
    and not exists (
      select 1 from public.profiles p
      where lower(p.display_name) = lower(game.clean_display_name(p_name))
    )
$$;

-- Sets (or creates) the caller's display name. Returns the stored name.
create function public.set_display_name(p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := game.require_user();
  clean text := game.clean_display_name(p_name);
begin
  if game.is_guest(uid) then
    raise exception 'guests_have_no_profile';
  end if;
  if clean is null then
    raise exception 'display_name_invalid';
  end if;
  begin
    insert into public.profiles (id, display_name) values (uid, clean)
    on conflict (id) do update set display_name = excluded.display_name;
  exception when unique_violation then
    raise exception 'display_name_taken';
  end;
  return clean;
end
$$;

-- As a guest: a single-use token, valid for 10 minutes.
create function public.create_merge_ticket()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := game.require_user();
  t uuid;
begin
  if not game.is_guest(uid) then
    raise exception 'not_a_guest';
  end if;
  delete from game.merge_tickets where guest_id = uid or created_at < now() - interval '10 minutes';
  insert into game.merge_tickets (guest_id) values (uid) returning token into t;
  return t;
end
$$;

-- As the signed-in account: moves the guest's plays across, except for
-- editions the account has already played (the account's play wins).
-- Returns how many plays moved.
create function public.redeem_merge_ticket(p_token uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := game.require_user();
  guest uuid;
  moved integer;
begin
  if game.is_guest(uid) then
    raise exception 'not_signed_in';
  end if;

  delete from game.merge_tickets
  where token = p_token and created_at > now() - interval '10 minutes'
  returning guest_id into guest;
  if guest is null or guest = uid then
    return 0;
  end if;

  with moved_rows as (
    update public.plays p
    set user_id = uid
    where p.user_id = guest
      and not exists (
        select 1 from public.plays q where q.user_id = uid and q.edition_id = p.edition_id
      )
    returning 1
  )
  select count(*) into moved from moved_rows;
  return moved;
end
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on all functions in schema game from public, anon, authenticated;
revoke all on game.merge_tickets from public, anon, authenticated;

revoke all on function
  public.display_name_available(text),
  public.set_display_name(text),
  public.create_merge_ticket(),
  public.redeem_merge_ticket(uuid)
from public, anon, authenticated;

grant execute on function public.display_name_available(text) to anon, authenticated;
grant execute on function
  public.set_display_name(text),
  public.create_merge_ticket(),
  public.redeem_merge_ticket(uuid)
to authenticated;
