"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { FrontPage, Masthead } from "@/components/paper/front-page";
import { useHud } from "@/components/site/hud-context";
import { startPlay, submitGuess, unfoldSection } from "@/lib/game/actions";
import { MAX_GUESSES, clampYear, newProgress } from "@/lib/game/rules";
import type { EditionPayload, GuessResult, Item, PlayState } from "@/lib/game/types";
import { capitalize, countNoun } from "@/lib/words";
import { FoldedSection } from "./folded-section";
import { GuessPanel, possibleRange } from "./guess-panel";
import { Results } from "./results";

type Busy = { kind: "unfold"; slug: string } | { kind: "guess" } | null;

export function PlayClient({
  edition,
  isToday,
  initial,
  isGuest,
}: {
  edition: EditionPayload;
  isToday: boolean;
  /** The player's saved state, or null if they haven't started. */
  initial: PlayState | null;
  /** No account yet: the results card offers to save the game to one. */
  isGuest: boolean;
}) {
  const [state, setState] = useState<PlayState | null>(initial);
  const [year, setYear] = useState(() => defaultYear(initial));
  const [lastResult, setLastResult] = useState<GuessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [, startTransition] = useTransition();
  const { setHud } = useHud();
  const flashKey = useRef(0);
  const lastScore = useRef<number | null>(null);
  /** Set when a guess finishes the play, so we scroll to the results once they render. */
  const scrollToResults = useRef(false);
  /** The play finished during this visit: the results card animates the streak. */
  const [justFinished, setJustFinished] = useState(false);

  const play = state?.play ?? null;
  const progress = play ?? newProgress();
  const reveal = state?.reveal ?? null;
  const finished = progress.finished;
  const locked = finished || busy !== null;

  // Feed the sticky HUD; flash the score whenever it changes.
  useEffect(() => {
    if (lastScore.current !== null && lastScore.current !== progress.score) flashKey.current++;
    lastScore.current = progress.score;
    setHud({
      score: progress.score,
      guessesUsed: progress.guesses.length,
      flashKey: flashKey.current,
    });
  }, [progress.score, progress.guesses.length, setHud]);
  useEffect(() => () => setHud(null), [setHud]);

  useEffect(() => {
    if (finished && scrollToResults.current) {
      scrollToResults.current = false;
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [finished]);

  /** Starts the play on first action (signing a guest in if needed). */
  async function ensurePlay(): Promise<PlayState | null> {
    if (state) return state;
    const res = await startPlay(edition.edition.id);
    if (!res.ok) {
      setError(res.message);
      return null;
    }
    setState(res.data);
    return res.data;
  }

  function unfold(slug: string) {
    setError(null);
    setBusy({ kind: "unfold", slug });
    startTransition(async () => {
      const current = await ensurePlay();
      if (current && !current.play.finished) {
        const res = await unfoldSection(current.play.id, slug);
        if (res.ok) {
          setState({
            ...current,
            play: res.data.play,
            sections: { ...current.sections, [slug]: res.data.section.items },
          });
        } else {
          setError(res.message);
        }
      }
      setBusy(null);
    });
  }

  function guess() {
    setError(null);
    setBusy({ kind: "guess" });
    startTransition(async () => {
      const current = await ensurePlay();
      if (current && !current.play.finished) {
        const res = await submitGuess(current.play.id, year);
        if (res.ok) {
          const next = { ...current, play: res.data.play, reveal: res.data.reveal };
          setState(next);
          setLastResult(res.data.result);
          setYear(defaultYear(next));
          if (res.data.reveal) {
            scrollToResults.current = true;
            setJustFinished(true);
          }
        } else {
          setError(res.message);
        }
      }
      setBusy(null);
    });
  }

  // Inside pages: what the player paid for, or everything once finished.
  const revealed = new Map(reveal?.sections.map((s) => [s.slug, s.items]));
  const itemsFor = (slug: string): Item[] | undefined =>
    finished ? revealed.get(slug) : state?.sections[slug];

  const lastGuess = progress.guesses.at(-1);
  const left = MAX_GUESSES - progress.guesses.length;
  const feedback = error ? (
    <span className="text-[#ffb3a3]" role="alert">
      {error}
    </span>
  ) : finished && reveal ? (
    progress.won ? (
      <>
        🎯 <b>Exactly right.</b>
      </>
    ) : (
      <>Out of guesses — the year was {reveal.answer_year}.</>
    )
  ) : lastResult && lastGuess ? (
    <>
      {lastGuess.result === "later" ? "⬆ Too early — the year is " : "⬇ Too late — the year is "}
      <b>{lastGuess.result === "later" ? "later" : "earlier"}</b> than {lastGuess.year}. (−100 pts,{" "}
      {left} {left === 1 ? "guess" : "guesses"} left)
    </>
  ) : null;

  return (
    <>
      {!isToday && (
        <div className="mx-auto mt-3.5 max-w-[880px] rounded border-t-[3px] border-gold bg-hud px-4 py-2.5 text-center font-sans text-sm text-hud-ink">
          No new edition today — you&apos;re reading Edition No. {edition.edition.edition_no}. Play
          it for fun; it won&apos;t count on the leaderboard.
        </div>
      )}

      {finished && reveal && play ? (
        <Results
          play={play}
          reveal={reveal}
          sections={edition.sections}
          editionNo={edition.edition.edition_no}
          isToday={isToday && play.ranked}
          isGuest={isGuest}
          justFinished={justFinished}
          onReview={() => document.getElementById("paper")?.scrollIntoView({ behavior: "smooth" })}
        />
      ) : (
        <div className="mx-auto mt-[18px] flex max-w-[880px] flex-wrap items-baseline gap-2 px-[18px] text-[15px] leading-normal">
          <span>
            <b className="font-semibold">
              Edition No. {edition.edition.edition_no} — {edition.edition.paper_name}.
            </b>{" "}
            1,000 points, 3 guesses. The front page is free; the folded sections inside cost points
            to unfold.
          </span>
          <Link href="/how-to-play" className="font-bold whitespace-nowrap text-accent">
            New here? How to play →
          </Link>
        </div>
      )}

      {/* The paper and the guess dock share a box, so the dock sticks to the
          screen's bottom while the paper scrolls and settles after it. */}
      <div>
        <div
          className="mx-auto mt-4 max-w-[880px] scroll-mt-36 px-3.5 min-[640px]:scroll-mt-16"
          id="paper"
        >
          <article className="newsprint p-[clamp(18px,4.5vw,40px)]">
            <Masthead edition={edition.edition} year={reveal?.answer_year} />
            <FrontPage
              edition={edition.edition}
              front={edition.front}
              sections={edition.sections}
              frontWhy={reveal?.front_why}
            />

            <div className="mt-7 mb-1 text-center">
              <div className="rule-text font-sans text-[11px] tracking-[0.28em] text-ink-soft uppercase">
                Inside This Edition
              </div>
              <p className="mt-1.5 text-[14.5px] text-ink-soft italic">
                {finished
                  ? "Every section is unfolded — read the real story behind each clue."
                  : foldedLine(edition.sections.length - progress.unfolded.length)}
              </p>
            </div>
            {edition.sections.map((section) => (
              <FoldedSection
                key={section.slug}
                section={section}
                items={itemsFor(section.slug)}
                paid={progress.unfolded.includes(section.slug)}
                busy={busy?.kind === "unfold" && busy.slug === section.slug}
                disabled={locked}
                onUnfold={() => unfold(section.slug)}
              />
            ))}
          </article>
        </div>

        {!finished && (
          <GuessPanel
            year={year}
            onYear={setYear}
            guesses={progress.guesses}
            finished={finished}
            busy={busy?.kind === "guess"}
            onGuess={guess}
            feedback={feedback}
          />
        )}
      </div>
      {error && finished && (
        <p role="alert" className="mx-auto mt-3 max-w-[880px] px-4 text-center text-accent">
          {error}
        </p>
      )}
    </>
  );
}

/** "Six folded sections remain…", counting down as the player unfolds. */
function foldedLine(folded: number): string {
  if (folded <= 0) return "Every section is unfolded — all that's left is to name the year.";
  if (folded === 1) return "One folded section remains. Unfold it if you dare — it costs points.";
  return `${capitalize(countNoun(folded, "folded section"))} remain. Unfold them in any order — bet on the knowledge you trust most. Each costs points.`;
}

/** Start the slider mid-way through whatever range the hints still allow. */
function defaultYear(state: PlayState | null): number {
  if (!state || state.play.guesses.length === 0) return 1990;
  const [low, high] = possibleRange(state.play.guesses);
  return low <= high ? clampYear(Math.round((low + high) / 2)) : 1990;
}
