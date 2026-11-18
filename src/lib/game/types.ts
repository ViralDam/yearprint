// Shapes of the JSON returned by the game functions in
// supabase/migrations/*_game_functions.sql. Item fields that are null in the
// database are omitted (jsonb_strip_nulls), so they are optional here.

export type Slot = "lead" | "rail" | "row" | "bottom" | "front_ad";
export type ItemKind = "article" | "ad" | "figures";

export interface Item {
  id: string;
  kind: ItemKind;
  slot?: Slot;
  sort: number;
  feature: boolean;
  kicker?: string;
  headline: string;
  deck?: string;
  image_path?: string;
  image_alt?: string;
  image_position?: string;
  image_variant?: "wide" | "tall";
  caption?: string;
  credit?: string;
  byline?: string;
  dateline?: string;
  lead?: string;
  greek_lines?: number;
  continued?: string;
  /** Ad copy, or figures lines separated by "\n". */
  body?: string;
  price?: string;
  /** "The real story behind it". Only present in a reveal. */
  why?: string;
}

export interface Weather {
  title: string;
  date: string;
  temp: string;
  text: string;
}

export interface Edition {
  id: string;
  edition_no: number;
  publish_date: string;
  paper_name: string;
  motto: string;
  established: string;
  edition_label: string;
  price_label: string;
  edition_tag: string;
  pages_line: string;
  teaser_deck: string | null;
  weather: Weather | null;
  index_note: string | null;
}

/** A folded section as listed before it's unfolded: name and price only. */
export interface SectionInfo {
  slug: string;
  name: string;
  short_name: string;
  icon: string;
  cost: number;
  folio: string;
  description: string;
}

/** get_edition() */
export interface EditionPayload {
  edition: Edition;
  front: Item[];
  sections: SectionInfo[];
}

/** "later" means the answer is later than the guess. */
export type GuessResult = "hit" | "later" | "earlier";

export interface Guess {
  year: number;
  result: GuessResult;
}

export interface Play {
  id: string;
  edition_id: string;
  score: number;
  guesses: Guess[];
  unfolded: string[];
  finished: boolean;
  won: boolean;
  ranked: boolean;
  started_at: string;
  finished_at: string | null;
}

export interface Reveal {
  answer_year: number;
  /** Front-page item id → reveal note. */
  front_why: Record<string, string>;
  /** Every section with its items, reveal notes included. */
  sections: { slug: string; items: Item[] }[];
}

/** get_play() / start_play() */
export interface PlayState {
  play: Play;
  /** Unfolded section slug → its items (empty once finished; see reveal). */
  sections: Record<string, Item[]>;
  reveal: Reveal | null;
}

/** unfold_section() */
export interface UnfoldResult {
  play: Play;
  section: { slug: string; items: Item[] };
}

/** submit_guess() */
export interface GuessResponse {
  result: GuessResult;
  play: Play;
  reveal: Reveal | null;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
  guesses: number;
  pages: number;
  won: boolean;
  /** True for the caller's own row. */
  you: boolean;
}

/** get_leaderboard(): only for accounts that finished the edition, else null. */
export interface Leaderboard {
  total: number;
  rows: LeaderboardRow[];
  /** The caller's row, even outside the top rows. */
  you: LeaderboardRow | null;
  /** For a finished play not on the board (an archive play): its would-be rank. */
  would_be: number | null;
}

/** get_my_stats() */
export interface PlayerStats {
  played: number;
  wins: number;
  win_rate: number;
  average_score: number;
  /** Days played in a row (finished on the edition's own day, solved or not). */
  current_streak: number;
  max_streak: number;
  /** Longest run of consecutive daily editions solved. */
  best_win_streak: number;
  /** Wins by guesses used ("1", "2", "3") and losses ("x"). */
  distribution: Record<"1" | "2" | "3" | "x", number>;
}

/** How a day looks on the streak strip. Won and lost both count as played. */
export type StreakDayStatus = "won" | "lost" | "open" | "skipped" | "none";

/** get_my_streak(): days played in a row, with the decay already applied. */
export interface PlayerStreak {
  current: number;
  best: number;
  /** Today's edition is finished. */
  played_today: boolean;
  /** Today's edition exists and isn't finished yet: the streak is at risk. */
  today_open: boolean;
  /** The last 7 UTC days, oldest first. */
  recent: { date: string; status: StreakDayStatus }[];
}
