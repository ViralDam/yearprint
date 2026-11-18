-- Yearprint game schema.
--
-- Golden rule: the client must never receive anything it hasn't paid for.
-- * Answers (edition_answers) and the "real story" notes (item_reveals) live
--   in their own tables with no client access at all.
-- * Clients can read only the front page of editions that are already live.
--   Inside-section items are handed out by game functions (Phase 2) when a
--   player unfolds a section.
-- * Players can read their own plays but never write them directly; every
--   write goes through security-definer game functions (Phase 2).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Editions roll over at midnight UTC.
create function public.utc_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'utc')::date
$$;

-- ---------------------------------------------------------------------------
-- Editions and their content
-- ---------------------------------------------------------------------------

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  edition_no integer not null unique check (edition_no > 0),
  publish_date date not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Masthead
  paper_name text not null default 'The Daily Chronicle',
  motto text not null default 'The News in Full, Every Morning',
  established text not null default 'Est. 1897',
  edition_label text not null default 'Late City Final',
  price_label text not null default 'Price 75¢',
  edition_tag text not null default 'Special Edition',
  pages_line text not null default '24 Pages · Printed in the Capital',
  -- Landing-page teaser deck under the lead headline ("… — but which year?")
  teaser_deck text,
  -- Front-page boxes: weather {title, date, temp, text}; index footnote
  weather jsonb check (weather is null or jsonb_typeof(weather) = 'object'),
  index_note text,
  created_at timestamptz not null default now()
);

comment on table public.editions is
  'One newspaper per day. Live when status = published and publish_date <= utc_today().';

-- Kept apart from editions so no policy or view can expose it by accident.
create table public.edition_answers (
  edition_id uuid primary key references public.editions (id) on delete cascade,
  answer_year smallint not null check (answer_year between 1960 and 2020)
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  short_name text not null,
  icon text not null,
  cost integer not null check (cost between 1 and 1000),
  folio text not null,
  description text not null,
  sort smallint not null,
  unique (edition_id, slug),
  unique (edition_id, sort),
  -- Target for the composite foreign key on items
  unique (id, edition_id)
);

-- Front-page items have a slot and no section; inside items have a section and no slot.
create table public.items (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  section_id uuid,
  slot text check (slot in ('lead', 'rail', 'row', 'bottom', 'front_ad')),
  kind text not null check (kind in ('article', 'ad', 'figures')),
  sort smallint not null default 0,
  feature boolean not null default false,
  kicker text,
  headline text not null,
  deck text,
  image_path text,
  image_alt text,
  image_position text,
  image_variant text check (image_variant in ('wide', 'tall')),
  caption text,
  credit text,
  byline text,
  dateline text,
  lead text,
  greek_lines smallint check (greek_lines between 0 and 12),
  continued text,
  body text,
  price text,
  foreign key (section_id, edition_id)
    references public.sections (id, edition_id) on delete cascade,
  constraint items_front_xor_section check ((section_id is null) = (slot is not null)),
  constraint items_article_has_lead check (kind <> 'article' or lead is not null),
  constraint items_image_has_alt check (image_path is null or image_alt is not null)
);

create index items_edition_section_sort_idx on public.items (edition_id, section_id, sort);
create index items_section_idx on public.items (section_id);

-- "The real story behind it" notes, revealed only when a play is finished.
create table public.item_reveals (
  item_id uuid primary key references public.items (id) on delete cascade,
  why text not null
);

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------

-- Only permanent (non-anonymous) accounts get a profile; created in Phase 4.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 30),
  created_at timestamptz not null default now()
);

create unique index profiles_display_name_ci_key on public.profiles (lower(display_name));

-- One play per user per edition (no replays).
create table public.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  edition_id uuid not null references public.editions (id) on delete cascade,
  score integer not null default 1000 check (score between 0 and 1000),
  guesses smallint[] not null default '{}' check (cardinality(guesses) <= 3),
  unfolded text[] not null default '{}',
  finished boolean not null default false,
  won boolean not null default false,
  -- False for archive plays started after the edition's day; they never rank.
  ranked boolean not null default true,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (user_id, edition_id),
  constraint plays_finished_at check (finished = (finished_at is not null)),
  constraint plays_won_implies_finished check (not won or finished)
);

create index plays_edition_board_idx on public.plays (edition_id, score desc)
  where finished and ranked;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.editions enable row level security;
alter table public.edition_answers enable row level security;
alter table public.sections enable row level security;
alter table public.items enable row level security;
alter table public.item_reveals enable row level security;
alter table public.profiles enable row level security;
alter table public.plays enable row level security;

-- Belt and braces: clients only ever read, and never these two tables.
revoke all on public.edition_answers, public.item_reveals from anon, authenticated;
revoke insert, update, delete, truncate
  on public.editions, public.sections, public.items, public.profiles, public.plays
  from anon, authenticated;
revoke all on public.plays from anon;

create policy "Live editions are public"
  on public.editions for select
  to anon, authenticated
  using (status = 'published' and publish_date <= (select public.utc_today()));

create policy "Sections of live editions are public"
  on public.sections for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.editions e
      where e.id = sections.edition_id
        and e.status = 'published'
        and e.publish_date <= (select public.utc_today())
    )
  );

-- Front page only. Inside items come from unfold_section() in Phase 2.
create policy "Front pages of live editions are public"
  on public.items for select
  to anon, authenticated
  using (
    section_id is null
    and exists (
      select 1 from public.editions e
      where e.id = items.edition_id
        and e.status = 'published'
        and e.publish_date <= (select public.utc_today())
    )
  );

create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users read their own plays"
  on public.plays for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Storage: edition images
-- ---------------------------------------------------------------------------
-- Public bucket so next/image can fetch by URL. There is no SELECT policy on
-- storage.objects, so the bucket can't be listed; object names are content
-- hashes, so an inside-page image can't be guessed before it's unfolded.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'edition-images',
  'edition-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
