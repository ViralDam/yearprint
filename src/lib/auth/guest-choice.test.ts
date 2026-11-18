import { describe, expect, it } from "vitest";
import { isRecentGuestChoice } from "./guest-choice";

const now = Date.UTC(2026, 10, 12, 12);
const hour = 60 * 60 * 1000;

describe("isRecentGuestChoice", () => {
  it("accepts a choice made within the last day", () => {
    expect(isRecentGuestChoice(String(now - hour), now)).toBe(true);
    expect(isRecentGuestChoice(String(now - 23 * hour), now)).toBe(true);
  });

  it("rejects a choice a day old or more", () => {
    expect(isRecentGuestChoice(String(now - 24 * hour), now)).toBe(false);
    expect(isRecentGuestChoice(String(now - 30 * 24 * hour), now)).toBe(false);
  });

  it("rejects missing, old-style and malformed values", () => {
    expect(isRecentGuestChoice(undefined, now)).toBe(false);
    expect(isRecentGuestChoice("1", now)).toBe(false);
    expect(isRecentGuestChoice("abc", now)).toBe(false);
    expect(isRecentGuestChoice(String(now + hour), now)).toBe(false);
  });
});
