/**
 * Remembers that a visitor chose "Play as a guest", so the play page stops
 * asking for a day. Written from the browser (when they pick it) and checked
 * on the server (to skip the gate).
 *
 * The value is the time of the choice, so the server enforces the day itself:
 * older cookies (including the year-long `1` ones from before) don't count.
 */
export const GUEST_CHOICE_COOKIE = "yp_guest";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Browser only: records the choice for one day. */
export function rememberGuestChoice(): void {
  document.cookie = `${GUEST_CHOICE_COOKIE}=${Date.now()}; path=/; max-age=${DAY_MS / 1000}; samesite=lax`;
}

/** True when the cookie records a guest choice made within the last day. */
export function isRecentGuestChoice(value: string | undefined, now = Date.now()): boolean {
  if (!value || !/^\d{13}$/.test(value)) return false;
  const age = now - Number(value);
  return age >= 0 && age < DAY_MS;
}
