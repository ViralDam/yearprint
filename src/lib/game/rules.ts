// Game rules. The server (supabase/migrations/*_game_functions.sql) is the
// authority; this module mirrors it for display (breakdowns, share text) and
// for tests. Keep the two in sync.

import type { Guess, GuessResult, Play, SectionInfo } from "./types";

export const START_SCORE = 1000;
export const WRONG_GUESS_COST = 100;
export const MAX_GUESSES = 3;
export const MIN_YEAR = 1960;
export const MAX_YEAR = 2020;

export type PlayProgress = Pick<Play, "score" | "guesses" | "unfolded" | "finished" | "won">;

export type RuleErrorCode =
  "play_finished" | "year_out_of_range" | "already_guessed" | "section_not_found";

// No TS parameter properties here: the import script runs this file with
// Node's type stripping, which doesn't support them.
export class RuleError extends Error {
  readonly code: RuleErrorCode;
  constructor(code: RuleErrorCode) {
    super(code);
    this.code = code;
  }
}

export function newProgress(): PlayProgress {
  return { score: START_SCORE, guesses: [], unfolded: [], finished: false, won: false };
}

export function guessesLeft(play: Pick<Play, "guesses">): number {
  return MAX_GUESSES - play.guesses.length;
}

export function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
}

export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(year)));
}

export function compareGuess(year: number, answer: number): GuessResult {
  if (year === answer) return "hit";
  return year < answer ? "later" : "earlier";
}

/** Same as unfold_section(): pay once, never below zero. */
export function applyUnfold(
  state: PlayProgress,
  section: Pick<SectionInfo, "slug" | "cost">,
): PlayProgress {
  if (state.finished) throw new RuleError("play_finished");
  if (state.unfolded.includes(section.slug)) return state;
  return {
    ...state,
    unfolded: [...state.unfolded, section.slug],
    score: Math.max(0, state.score - section.cost),
  };
}

/** Same as submit_guess(). */
export function applyGuess(
  state: PlayProgress,
  year: number,
  answer: number,
): { state: PlayProgress; result: GuessResult } {
  if (state.finished) throw new RuleError("play_finished");
  if (!isValidYear(year)) throw new RuleError("year_out_of_range");
  if (state.guesses.some((g) => g.year === year)) throw new RuleError("already_guessed");

  const result = compareGuess(year, answer);
  const guesses: Guess[] = [...state.guesses, { year, result }];
  if (result === "hit") {
    return { result, state: { ...state, guesses, finished: true, won: true } };
  }
  const last = guesses.length >= MAX_GUESSES;
  return {
    result,
    state: {
      ...state,
      guesses,
      score: last ? 0 : Math.max(0, state.score - WRONG_GUESS_COST),
      finished: last,
      won: false,
    },
  };
}

export interface BreakdownRow {
  label: string;
  /** Positive for the starting points, negative for deductions. */
  amount: number;
}

/**
 * How the score was spent, for the results screen. Deductions are capped at
 * what was left, so the rows always add up to the final score.
 */
export function scoreBreakdown(play: PlayProgress, sections: SectionInfo[]): BreakdownRow[] {
  const rows: BreakdownRow[] = [{ label: "Starting points", amount: START_SCORE }];
  let left = START_SCORE;
  const deduct = (label: string, cost: number) => {
    const amount = Math.min(cost, left);
    left -= amount;
    rows.push({ label, amount: -amount });
  };

  for (const slug of play.unfolded) {
    const section = sections.find((s) => s.slug === slug);
    if (section) deduct(`Unfolded · ${section.name}`, section.cost);
  }
  const misses = play.guesses.filter((g) => g.result !== "hit").length;
  if (misses > 0) {
    deduct(`Wrong guesses · ${misses} × ${WRONG_GUESS_COST}`, misses * WRONG_GUESS_COST);
  }
  if (play.finished && !play.won && left > 0) {
    deduct("Out of guesses — remainder forfeited", left);
  }
  return rows;
}

const GUESS_EMOJI: Record<GuessResult, string> = { hit: "🎯", later: "⬆️", earlier: "⬇️" };

/**
 * Spoiler-free share text. Unlike the prototype it never prints the guessed
 * years, because the final 🎯 year would give the answer away to friends.
 */
/** Streaks shorter than this stay out of the share text. */
export const SHARE_STREAK_MIN = 2;

export function shareText(
  play: PlayProgress,
  sections: SectionInfo[],
  editionNo: number,
  /** Days played in a row, counting this play; shown from SHARE_STREAK_MIN up. */
  streak = 0,
): string {
  const head = play.won
    ? `🗞️ YEARPRINT #${editionNo} — ${play.score.toLocaleString("en-US")} pts`
    : `🗞️ YEARPRINT #${editionNo} — 0 pts · the paper got away`;
  const pages = [
    "Front",
    ...play.unfolded.map((slug) => sections.find((s) => s.slug === slug)?.short_name ?? slug),
  ];
  const guesses = play.guesses.map((g) => GUESS_EMOJI[g.result]).join(" ");
  const run = streak >= SHARE_STREAK_MIN ? `\n🔥 ${streak}-day streak` : "";
  return `${head}\nPages: ${pages.join(" · ")}\nGuesses: ${guesses}${run}`;
}

/** One-line verdict for the results screen. */
export function verdict(play: PlayProgress): string {
  if (!play.finished) return "";
  if (!play.won) {
    return "Three guesses gone — the edition keeps its secret no longer. Every clue is annotated.";
  }
  if (play.unfolded.length === 0 && play.guesses.length === 1) {
    return "Solved from the front page alone, first time. Ice cold.";
  }
  if (play.unfolded.length === 0) {
    return `Solved from the front page alone, in ${play.guesses.length} guesses.`;
  }
  const g = play.guesses.length;
  const u = play.unfolded.length;
  return `You dated the edition in ${g} ${g === 1 ? "guess" : "guesses"} with ${u} ${u === 1 ? "page" : "pages"} unfolded.`;
}
