// Error codes raised by the game functions (see the migration) plus a few
// app-side ones, with the copy shown to players.

export const GAME_ERRORS = {
  not_authenticated: "Your session has expired. Refresh the page to keep playing.",
  edition_not_found: "That edition isn't on the stands.",
  play_not_found: "We couldn't find your game for this edition. Refresh the page.",
  play_finished: "This edition is finished. A fresh one arrives at midnight UTC.",
  section_not_found: "That section isn't in this edition.",
  year_out_of_range: "Pick a year between 1960 and 2020.",
  already_guessed: "You've already sent that year to press.",
  guest_play_unavailable: "Guest play isn't available right now. Sign in to play.",
  invalid_input: "That request didn't make sense to the printers.",
  unknown: "The presses jammed. Please try again.",
} as const;

export type GameErrorCode = keyof typeof GAME_ERRORS;

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: GameErrorCode; message: string };

export function fail(error: GameErrorCode): { ok: false; error: GameErrorCode; message: string } {
  return { ok: false, error, message: GAME_ERRORS[error] };
}

/** Maps a PostgREST/Auth error to one of our codes. */
export function toGameError(error: { message?: string; code?: string } | null): GameErrorCode {
  const message = error?.message ?? "";
  if (message in GAME_ERRORS) return message as GameErrorCode;
  // 42501: insufficient_privilege (e.g. calling a game function while signed out).
  if (error?.code === "42501" || error?.code === "28000") return "not_authenticated";
  return "unknown";
}
