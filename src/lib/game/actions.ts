"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, toGameError, type ActionResult } from "./errors";
import { MAX_YEAR, MIN_YEAR } from "./rules";
import type {
  GuessResponse,
  Leaderboard,
  PlayerStats,
  PlayerStreak,
  PlayState,
  UnfoldResult,
} from "./types";

// Server Actions are public POST endpoints: validate every input. All game
// rules are enforced again in Postgres; this only rejects junk early.
const editionId = z.uuid();
const playId = z.uuid();
const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);
const year = z.number().int().min(MIN_YEAR).max(MAX_YEAR);

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Guests play as Supabase anonymous users; sign one in on first action. */
async function ensureSession(supabase: Supabase): Promise<boolean> {
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) return true;
  const { error } = await supabase.auth.signInAnonymously();
  return !error;
}

/** Starts or resumes the player's single play of an edition. */
export async function startPlay(id: string): Promise<ActionResult<PlayState>> {
  if (!editionId.safeParse(id).success) return fail("invalid_input");
  const supabase = await createClient();
  if (!(await ensureSession(supabase))) return fail("guest_play_unavailable");

  const { data, error } = await supabase.rpc("start_play", { p_edition_id: id });
  if (error) return fail(toGameError(error));
  return { ok: true, data: data as unknown as PlayState };
}

/** Pays for a section and returns its items. */
export async function unfoldSection(
  play: string,
  section: string,
): Promise<ActionResult<UnfoldResult>> {
  if (!playId.safeParse(play).success || !slug.safeParse(section).success) {
    return fail("invalid_input");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unfold_section", {
    p_play_id: play,
    p_slug: section,
  });
  if (error) return fail(toGameError(error));
  return { ok: true, data: data as unknown as UnfoldResult };
}

/** Sends a guess to press. */
export async function submitGuess(
  play: string,
  guess: number,
): Promise<ActionResult<GuessResponse>> {
  if (!playId.safeParse(play).success) return fail("invalid_input");
  if (!year.safeParse(guess).success) return fail("year_out_of_range");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_guess", {
    p_play_id: play,
    p_year: guess,
  });
  if (error) return fail(toGameError(error));
  return { ok: true, data: data as unknown as GuessResponse };
}

export interface ResultsExtras {
  board: Leaderboard | null;
  stats: PlayerStats | null;
  streak: PlayerStreak | null;
}

/**
 * Board, stats and streak for the results card, loaded once finished. The
 * streak is for every player; the board and stats are for accounts only
 * (the database refuses the board to anyone who isn't an account that
 * finished this edition).
 */
export async function loadResultsExtras(id: string): Promise<ActionResult<ResultsExtras>> {
  if (!editionId.safeParse(id).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: true, data: { board: null, stats: null, streak: null } };
  const isAccount = claims.claims.is_anonymous !== true;

  const [streak, board, stats] = await Promise.all([
    supabase.rpc("get_my_streak"),
    isAccount ? supabase.rpc("get_leaderboard", { p_edition_id: id, p_limit: 20 }) : null,
    isAccount ? supabase.rpc("get_my_stats") : null,
  ]);
  if (streak.error) return fail(toGameError(streak.error));
  if (board?.error) return fail(toGameError(board.error));
  if (stats?.error) return fail(toGameError(stats.error));
  return {
    ok: true,
    data: {
      board: (board?.data ?? null) as unknown as Leaderboard | null,
      stats: (stats?.data ?? null) as unknown as PlayerStats | null,
      streak: streak.data as unknown as PlayerStreak,
    },
  };
}
