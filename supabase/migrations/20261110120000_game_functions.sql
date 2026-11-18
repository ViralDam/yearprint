-- Server-authoritative game functions.
--
-- Rules (mirrored in src/lib/game/rules.ts — keep them in sync):
--   * a play starts at 1,000 points;
--   * unfolding a section costs that section's points, once;
--   * guesses are years from 1960 to 2020, at most 3, no repeats;
--   * a wrong guess costs 100 and says "later" or "earlier";
--   * an exact guess finishes the play and keeps the remaining score;
--   * a third miss finishes the play with a score of 0;
--   * the score never drops below 0.
--
-- Clients only ever call the public.* functions below. Helpers live in the
-- private `game` schema, which the API roles can't reach. Errors are raised
-- with short codes in the message (e.g. 'play_finished') for the app to map.

create schema game;
revoke all on schema game from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

-- One item as JSON for the client. Never includes the reveal note unless asked.
create function game.item_json(i public.items, with_why boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(
    (to_jsonb(i) - 'edition_id' - 'section_id')
    || case
         when with_why then jsonb_build_object(
           'why', (select r.why from public.item_reveals r where r.item_id = i.id)
         )
         else '{}'::jsonb
       end
  )
$$;

create function game.section_items(p_section_id uuid, with_why boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(game.item_json(i, with_why) order by i.sort), '[]'::jsonb)
  from public.items i
  where i.section_id = p_section_id
$$;

-- A play as the client sees it. Each guess carries the hint it earned.
create function game.play_json(p public.plays)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'edition_id', p.edition_id,
    'score', p.score,
    'guesses', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'year', g.year,
            'result', case
              when g.year = a.answer_year then 'hit'
              when g.year < a.answer_year then 'later'
              else 'earlier'
            end
          )
          order by g.ord
        )
        from unnest(p.guesses) with ordinality as g (year, ord)
      ),
      '[]'::jsonb
    ),
    'unfolded', to_jsonb(p.unfolded),
    'finished', p.finished,
    'won', p.won,
    'ranked', p.ranked,
    'started_at', p.started_at,
    'finished_at', p.finished_at
  )
  from public.edition_answers a
  where a.edition_id = p.edition_id
$$;

-- Everything held back until the end: the year, every note, every section.
create function game.reveal_json(p_edition_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'answer_year', (
      select a.answer_year from public.edition_answers a where a.edition_id = p_edition_id
    ),
    'front_why', (
      select coalesce(jsonb_object_agg(i.id, r.why), '{}'::jsonb)
      from public.items i
      join public.item_reveals r on r.item_id = i.id
      where i.edition_id = p_edition_id and i.section_id is null
    ),
    'sections', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('slug', s.slug, 'items', game.section_items(s.id, true))
          order by s.sort
        ),
        '[]'::jsonb
      )
      from public.sections s
      where s.edition_id = p_edition_id
    )
  )
$$;

-- Full state to resume a play: unfolded sections, or the reveal once finished.
create function game.play_state(p public.plays)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'play', game.play_json(p),
    'sections', case
      when p.finished then '{}'::jsonb
      else (
        select coalesce(jsonb_object_agg(s.slug, game.section_items(s.id, false)), '{}'::jsonb)
        from public.sections s
        where s.edition_id = p.edition_id and s.slug = any (p.unfolded)
      )
    end,
    'reveal', case when p.finished then game.reveal_json(p.edition_id) end
  )
$$;

create function game.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return auth.uid();
end
$$;

-- Locks the caller's own unfinished play for the rest of the transaction.
create function game.lock_open_play(p_play_id uuid)
returns public.plays
language plpgsql
volatile
set search_path = ''
as $$
declare
  p public.plays;
begin
  select * into p
  from public.plays
  where id = p_play_id and user_id = game.require_user()
  for update;

  if not found then
    raise exception 'play_not_found';
  end if;
  if p.finished then
    raise exception 'play_finished';
  end if;
  return p;
end
$$;

revoke all on all functions in schema game from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public API
-- ---------------------------------------------------------------------------

-- The edition to show: today's (UTC) by default, or a past one by number.
-- Front page without reveal notes, plus the folded sections' names and costs.
-- Returns null when there is no such live edition.
create function public.get_edition(p_edition_no integer default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'edition', to_jsonb(e) - 'status' - 'created_at',
    'front', (
      select coalesce(jsonb_agg(game.item_json(i, false) order by i.sort), '[]'::jsonb)
      from public.items i
      where i.edition_id = e.id and i.section_id is null
    ),
    'sections', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'slug', s.slug,
            'name', s.name,
            'short_name', s.short_name,
            'icon', s.icon,
            'cost', s.cost,
            'folio', s.folio,
            'description', s.description
          )
          order by s.sort
        ),
        '[]'::jsonb
      )
      from public.sections s
      where s.edition_id = e.id
    )
  )
  from public.editions e
  where e.status = 'published'
    and e.publish_date <= public.utc_today()
    and case
      when p_edition_no is null then e.publish_date = public.utc_today()
      else e.edition_no = p_edition_no
    end
$$;

-- The caller's play for an edition, or null if they haven't started one.
create function public.get_play(p_edition_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select game.play_state(p)
  from public.plays p
  where p.edition_id = p_edition_id and p.user_id = auth.uid()
$$;

-- Starts (or resumes) the caller's single play of a live edition.
-- Plays started after the edition's own day are unranked (archive plays).
create function public.start_play(p_edition_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := game.require_user();
  e public.editions;
  p public.plays;
begin
  select * into e
  from public.editions
  where id = p_edition_id
    and status = 'published'
    and publish_date <= public.utc_today();
  if not found then
    raise exception 'edition_not_found';
  end if;

  insert into public.plays (user_id, edition_id, ranked)
  values (uid, e.id, e.publish_date = public.utc_today())
  on conflict (user_id, edition_id) do nothing;

  select * into p from public.plays where user_id = uid and edition_id = e.id;
  return game.play_state(p);
end
$$;

-- Pays for a section (once) and returns its items, without reveal notes.
create function public.unfold_section(p_play_id uuid, p_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  p public.plays := game.lock_open_play(p_play_id);
  s public.sections;
begin
  select * into s from public.sections where edition_id = p.edition_id and slug = p_slug;
  if not found then
    raise exception 'section_not_found';
  end if;

  if not (p_slug = any (p.unfolded)) then
    update public.plays
    set unfolded = array_append(unfolded, p_slug),
        score = greatest(0, score - s.cost)
    where id = p.id
    returning * into p;
  end if;

  return jsonb_build_object(
    'play', game.play_json(p),
    'section', jsonb_build_object('slug', s.slug, 'items', game.section_items(s.id, false))
  );
end
$$;

-- Sends a guess to press. Returns the hint and, once finished, the reveal.
create function public.submit_guess(p_play_id uuid, p_year integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  p public.plays := game.lock_open_play(p_play_id);
  answer smallint;
  result text;
  last_guess boolean;
begin
  if p_year is null or p_year < 1960 or p_year > 2020 then
    raise exception 'year_out_of_range';
  end if;
  if p_year = any (p.guesses) then
    raise exception 'already_guessed';
  end if;

  select a.answer_year into answer from public.edition_answers a where a.edition_id = p.edition_id;
  last_guess := cardinality(p.guesses) + 1 >= 3;

  if p_year = answer then
    result := 'hit';
    update public.plays
    set guesses = array_append(guesses, p_year::smallint),
        won = true,
        finished = true,
        finished_at = now()
    where id = p.id
    returning * into p;
  else
    result := case when p_year < answer then 'later' else 'earlier' end;
    update public.plays
    set guesses = array_append(guesses, p_year::smallint),
        score = case when last_guess then 0 else greatest(0, score - 100) end,
        finished = last_guess,
        finished_at = case when last_guess then now() end
    where id = p.id
    returning * into p;
  end if;

  return jsonb_build_object(
    'result', result,
    'play', game.play_json(p),
    'reveal', case when p.finished then game.reveal_json(p.edition_id) end
  );
end
$$;

-- Supabase grants EXECUTE on new public functions to the API roles by
-- default; take it back and grant only what each role needs. Anonymous
-- (guest) sign-ins use the authenticated role.
revoke all on function
  public.get_edition(integer),
  public.get_play(uuid),
  public.start_play(uuid),
  public.unfold_section(uuid, text),
  public.submit_guess(uuid, integer)
from public, anon, authenticated;

grant execute on function public.get_edition(integer) to anon, authenticated;
grant execute on function
  public.get_play(uuid),
  public.start_play(uuid),
  public.unfold_section(uuid, text),
  public.submit_guess(uuid, integer)
to authenticated;
