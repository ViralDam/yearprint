import { describe, expect, it } from "vitest";
import {
  applyGuess,
  applyUnfold,
  clampYear,
  guessesLeft,
  newProgress,
  RuleError,
  scoreBreakdown,
  shareText,
  verdict,
  type PlayProgress,
} from "./rules";
import type { SectionInfo } from "./types";

const section = (slug: string, cost: number, name = slug, short_name = name): SectionInfo => ({
  slug,
  name,
  short_name,
  cost,
  icon: "",
  folio: "",
  description: "",
});

// Prototype costs.
const SECTIONS = [
  section("politics", 200, "World & Politics", "Politics"),
  section("tech", 150, "Technology"),
  section("business", 125, "Business"),
  section("sports", 100, "Sports"),
  section("entertainment", 100, "Entertainment"),
  section("ads", 75, "Ads & Lifestyle", "Ads"),
];
const bySlug = (slug: string) => SECTIONS.find((s) => s.slug === slug)!;
const ANSWER = 2006;

function play(unfold: string[], guesses: number[]): PlayProgress {
  let state = newProgress();
  for (const slug of unfold) state = applyUnfold(state, bySlug(slug));
  for (const year of guesses) state = applyGuess(state, year, ANSWER).state;
  return state;
}

describe("unfolding", () => {
  it("charges a section's cost once", () => {
    let state = applyUnfold(newProgress(), bySlug("sports"));
    expect(state.score).toBe(900);
    state = applyUnfold(state, bySlug("sports"));
    expect(state.score).toBe(900);
    expect(state.unfolded).toEqual(["sports"]);
  });

  it("unfolding everything costs 750", () => {
    expect(
      play(
        SECTIONS.map((s) => s.slug),
        [],
      ).score,
    ).toBe(250);
  });

  it("never goes below zero", () => {
    expect(applyUnfold({ ...newProgress(), score: 50 }, bySlug("politics")).score).toBe(0);
  });
});

describe("guessing", () => {
  it("front-page first-guess hit keeps 1,000", () => {
    const state = play([], [2006]);
    expect(state).toMatchObject({ score: 1000, finished: true, won: true });
  });

  it("gives later/earlier hints and costs 100 per miss", () => {
    let state = newProgress();
    let r = applyGuess(state, 2000, ANSWER);
    expect(r.result).toBe("later");
    state = r.state;
    r = applyGuess(state, 2011, ANSWER);
    expect(r.result).toBe("earlier");
    expect(r.state.score).toBe(800);
    expect(guessesLeft(r.state)).toBe(1);
  });

  it("a hit after unfolds and misses banks what is left", () => {
    expect(play(["sports", "politics"], [2000, 2006])).toMatchObject({
      score: 600,
      finished: true,
      won: true,
    });
  });

  it("three misses finish the play at zero", () => {
    expect(play(["ads"], [1990, 2015, 2005])).toMatchObject({
      score: 0,
      finished: true,
      won: false,
    });
  });

  it("rejects years outside 1960–2020, repeats and guesses after the end", () => {
    const err = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as RuleError).code;
      }
    };
    expect(err(() => applyGuess(newProgress(), 1959, ANSWER))).toBe("year_out_of_range");
    expect(err(() => applyGuess(newProgress(), 2021, ANSWER))).toBe("year_out_of_range");
    expect(err(() => applyGuess(newProgress(), 2000.5, ANSWER))).toBe("year_out_of_range");
    expect(err(() => applyGuess(play([], [2000]), 2000, ANSWER))).toBe("already_guessed");
    expect(err(() => applyGuess(play([], [2006]), 2001, ANSWER))).toBe("play_finished");
    expect(err(() => applyUnfold(play([], [2006]), bySlug("ads")))).toBe("play_finished");
  });

  it("clamps slider years into range", () => {
    expect(clampYear(1900)).toBe(1960);
    expect(clampYear(2099)).toBe(2020);
    expect(clampYear(1999.6)).toBe(2000);
  });
});

describe("score breakdown", () => {
  const sum = (state: PlayProgress) =>
    scoreBreakdown(state, SECTIONS).reduce((n, row) => n + row.amount, 0);

  it("lists unfolds and misses and adds up to the score", () => {
    const state = play(["sports", "politics"], [2000, 2006]);
    expect(scoreBreakdown(state, SECTIONS)).toEqual([
      { label: "Starting points", amount: 1000 },
      { label: "Unfolded · Sports", amount: -100 },
      { label: "Unfolded · World & Politics", amount: -200 },
      { label: "Wrong guesses · 1 × 100", amount: -100 },
    ]);
    expect(sum(state)).toBe(state.score);
  });

  it("forfeits the remainder on a loss", () => {
    const state = play(["ads"], [1990, 2015, 2005]);
    expect(scoreBreakdown(state, SECTIONS).at(-1)).toEqual({
      label: "Out of guesses — remainder forfeited",
      amount: -625,
    });
    expect(sum(state)).toBe(0);
  });

  it("still adds up when deductions exceed 1,000", () => {
    const state = play(
      SECTIONS.map((s) => s.slug),
      [1990, 2015, 2005],
    );
    expect(sum(state)).toBe(0);
    expect(scoreBreakdown(state, SECTIONS).every((r, i) => i === 0 || r.amount <= 0)).toBe(true);
  });
});

describe("share text", () => {
  it("never prints a guessed year", () => {
    const text = shareText(play(["sports"], [2000, 2011, 2006]), SECTIONS, 1);
    expect(text).toBe("🗞️ YEARPRINT #1 — 700 pts\nPages: Front · Sports\nGuesses: ⬆️ ⬇️ 🎯");
    expect(text).not.toMatch(/19\d\d|20\d\d/);
  });

  it("adds the streak from two days up", () => {
    const p = play([], [2006]);
    expect(shareText(p, SECTIONS, 3, 1)).not.toMatch(/streak/);
    expect(shareText(p, SECTIONS, 3, 7)).toBe(
      "🗞️ YEARPRINT #3 — 1,000 pts\nPages: Front\nGuesses: 🎯\n🔥 7-day streak",
    );
  });

  it("says the paper got away on a loss", () => {
    expect(shareText(play([], [1990, 2015, 2005]), SECTIONS, 12)).toMatch(
      /^🗞️ YEARPRINT #12 — 0 pts · the paper got away/,
    );
  });
});

describe("verdict", () => {
  it("covers each ending", () => {
    expect(verdict(newProgress())).toBe("");
    expect(verdict(play([], [2006]))).toMatch(/first time/);
    expect(verdict(play([], [2000, 2006]))).toMatch(/front page alone, in 2 guesses/);
    expect(verdict(play(["ads"], [2006]))).toBe(
      "You dated the edition in 1 guess with 1 page unfolded.",
    );
    expect(verdict(play([], [1990, 2015, 2005]))).toMatch(/Three guesses gone/);
  });
});
