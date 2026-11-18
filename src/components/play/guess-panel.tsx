"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_GUESSES, MAX_YEAR, MIN_YEAR, clampYear } from "@/lib/game/rules";
import type { Guess } from "@/lib/game/types";

const ARROW = { hit: "🎯", later: "↑", earlier: "↓" } as const;

/** The range still possible given the hints so far. */
export function possibleRange(guesses: Guess[]): [number, number] {
  let low = MIN_YEAR;
  let high = MAX_YEAR;
  for (const g of guesses) {
    if (g.result === "later") low = Math.max(low, g.year + 1);
    if (g.result === "earlier") high = Math.min(high, g.year - 1);
  }
  return [low, high];
}

/**
 * The guess controls, docked to the bottom of the screen while the player
 * reads. It is `sticky`, not `fixed`: it keeps its own place after the paper,
 * so scrolling to the end always clears the last unfold bar, and it settles
 * there instead of covering anything.
 *
 * Collapsed it is one row: the year, ±, and "Send to press" (plus the slider
 * from 640px up). The year toggles the details: hints, past guesses, and the
 * slider on phones.
 */
export function GuessPanel({
  year,
  onYear,
  guesses,
  finished,
  busy,
  onGuess,
  feedback,
}: {
  year: number;
  onYear: (year: number) => void;
  guesses: Guess[];
  finished: boolean;
  busy: boolean;
  onGuess: () => void;
  feedback: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dock = useRef<HTMLElement>(null);
  const ids = useId();
  const sliderId = `${ids}-slider`;
  const detailsId = `${ids}-details`;

  const left = MAX_GUESSES - guesses.length;
  const [low, high] = possibleRange(guesses);
  const narrowed = guesses.length > 0 && low <= high;
  const repeat = guesses.some((g) => g.year === year);
  const locked = finished || busy;
  const set = (y: number) => onYear(clampYear(y));

  // Keep keyboard focus and in-page scrolling clear of the dock.
  useEffect(() => {
    const el = dock.current;
    if (!el) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--guess-dock-h", `${el.offsetHeight + 16}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--guess-dock-h");
    };
  }, []);

  return (
    <section
      ref={dock}
      aria-labelledby={`${ids}-title`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
      className="sticky bottom-[calc(env(safe-area-inset-bottom)+8px)] z-30 mx-auto mt-[22px] max-w-[880px] px-3.5"
    >
      <div className="rounded-md border-t-[3px] border-gold bg-hud px-[clamp(12px,3vw,22px)] py-2.5 text-hud-ink shadow-[0_-6px_28px_rgba(20,14,4,0.35),0_2px_8px_rgba(20,14,4,0.3)]">
        <h2 id={`${ids}-title`} className="sr-only">
          Name the year
        </h2>

        {open && (
          <div id={detailsId} className="animate-rise border-b border-hud-ink/20 pt-1 pb-2.5">
            <p className="m-0 text-[14px] leading-snug italic opacity-80">
              {guesses.length === 0
                ? `Pick a year between ${MIN_YEAR} and ${MAX_YEAR}, then send it to press. Three guesses — a wrong one costs 100 points and earns you a hint.`
                : low <= high
                  ? `From your hints, it's between ${low} and ${high}. ${left} ${left === 1 ? "guess" : "guesses"} left.`
                  : `${left} ${left === 1 ? "guess" : "guesses"} left.`}
            </p>
            {guesses.length > 0 && (
              <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0" aria-label="Your guesses">
                {guesses.map((g) => (
                  <li
                    key={g.year}
                    className={`rounded-full border px-3 py-0.5 font-sans text-sm font-bold tabular-nums ${
                      g.result === "hit"
                        ? "border-good bg-good text-white"
                        : "border-hud-ink/45 opacity-85"
                    }`}
                  >
                    {g.year} {ARROW[g.result]}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div
          className={`flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3 ${open ? "pt-2.5" : ""}`}
        >
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? detailsId : undefined}
            aria-label={`Year ${year}. ${open ? "Hide" : "Show"} the slider and hints`}
            onClick={() => setOpen((o) => !o)}
            className="group flex shrink-0 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-hud-ink/10"
          >
            <span className="flex flex-col">
              <output
                htmlFor={sliderId}
                className="font-display text-[30px] leading-none font-black text-gold tabular-nums sm:text-[36px]"
              >
                {year}
              </output>
              <span className="mt-0.5 font-sans text-[10.5px] font-semibold tracking-[0.1em] uppercase tabular-nums opacity-65">
                {narrowed ? `${low}–${high}` : `${MIN_YEAR}–${MAX_YEAR}`}
              </span>
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 12 12"
              className={`size-3 opacity-70 motion-safe:transition-transform ${open ? "" : "rotate-180"}`}
            >
              <path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          {/* Phones: its own row, only when open. 640px up: always inline. */}
          <div
            className={`order-last basis-full sm:order-none sm:block sm:min-w-[160px] sm:flex-1 sm:basis-auto ${
              open ? "" : "max-sm:hidden"
            }`}
          >
            <input
              id={sliderId}
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              step={1}
              value={year}
              disabled={locked}
              onChange={(e) => set(Number(e.target.value))}
              aria-label="Guess year"
              className="h-[30px] w-full accent-gold"
            />
            <div className="-mt-1 flex justify-between font-sans text-[10.5px] tracking-[0.1em] opacity-65">
              <span>{MIN_YEAR}</span>
              <span>{MAX_YEAR}</span>
            </div>
          </div>

          <div className="flex shrink-0 gap-1 sm:gap-1.5">
            {[
              { label: "−", delta: -1, aria: "One year earlier" },
              { label: "+", delta: 1, aria: "One year later" },
            ].map(({ label, delta, aria }) => (
              <button
                key={label}
                type="button"
                aria-label={aria}
                disabled={locked}
                onClick={() => set(year + delta)}
                className="size-9 rounded border border-hud-ink/40 text-xl leading-none font-extrabold hover:border-hud-ink disabled:opacity-40 sm:size-10"
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onGuess}
            disabled={locked || repeat}
            className="btn-accent min-w-0 flex-1 !px-2 !py-2.5 !text-[12.5px] !tracking-[0.03em] whitespace-nowrap sm:flex-none sm:!px-5 sm:!text-sm sm:!tracking-[0.05em]"
          >
            {/* Phones show the short form; screen readers always get the long one. */}
            {busy ? (
              <>
                Sending<span className="max-sm:sr-only"> to press</span>…
              </>
            ) : repeat ? (
              <>
                <span className="max-sm:sr-only">Already </span>guessed
                <span className="sr-only sm:not-sr-only"> {year}</span>
              </>
            ) : (
              <>
                Send to press<span className="sr-only sm:not-sr-only"> — guess {year}</span>
              </>
            )}
          </button>
        </div>

        {/* Always rendered (never display:none) so screen readers announce changes. */}
        <div
          className="text-center text-[14.5px] leading-snug font-semibold [&:not(:empty)]:mt-2"
          aria-live="polite"
        >
          {feedback}
        </div>
      </div>
    </section>
  );
}
