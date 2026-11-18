"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlayerStreak, StreakDayStatus } from "@/lib/game/types";
import { Flame } from "./flame";

const DAY: Record<StreakDayStatus, { box: string; label: string }> = {
  won: { box: "border-ink bg-ink text-paper", label: "solved" },
  lost: { box: "border-accent bg-accent text-accent-ink", label: "played, not solved" },
  open: { box: "border-gold border-2 text-ink", label: "still open" },
  skipped: { box: "border-dashed border-ink-faint text-ink-faint", label: "missed" },
  none: { box: "border-transparent text-ink-faint", label: "no edition" },
};

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

function dayLabels(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    letter: d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" }),
    long: d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
  };
}

/**
 * "Your run" on the results card: the streak count and the last 7 days.
 * When the game has only just finished, the count ticks up from yesterday's.
 */
export function StreakStrip({
  streak,
  isGuest,
  justFinished,
  countdown,
}: {
  streak: PlayerStreak;
  isGuest: boolean;
  /** The play finished in this visit, so show the count going up. */
  justFinished: boolean;
  /** Time until the next edition, once mounted. */
  countdown: string | null;
}) {
  const ticks = justFinished && streak.played_today;
  const [shown, setShown] = useState(() =>
    ticks ? Math.max(0, streak.current - 1) : streak.current,
  );
  const target = streak.current;
  useEffect(() => {
    if (shown === target) return;
    const t = setTimeout(() => setShown(target), 700);
    return () => clearTimeout(t);
  }, [shown, target]);

  let note: string;
  if (streak.played_today) {
    note = `Best run: ${days(streak.best)}.${countdown ? ` Keep it going in ${countdown}, when the next edition arrives.` : ""}`;
  } else if (streak.today_open) {
    note =
      streak.current > 0
        ? `Today's edition is still open — finish it${countdown ? ` within ${countdown}` : ""} to keep the run.`
        : "Finish today's edition to start a run.";
  } else {
    note =
      streak.best > 0
        ? `Best run: ${days(streak.best)}.`
        : "Finish an edition on its day to start a run.";
  }

  return (
    <div className="newsprint mt-[18px] grid items-center gap-x-6 gap-y-3 px-[clamp(16px,3.5vw,26px)] py-4 text-left min-[640px]:grid-cols-[auto_minmax(0,1fr)]">
      <div className="text-center min-[640px]:text-left">
        <div className="font-sans text-[11px] font-extrabold tracking-[0.3em] text-accent uppercase">
          Your run
        </div>
        <div
          className="flex items-center justify-center gap-1.5 font-display text-[34px] leading-tight font-black tabular-nums min-[640px]:justify-start"
          aria-live="polite"
        >
          <Flame className="size-[26px] text-gold" />
          <span key={shown} className={ticks && shown === streak.current ? "animate-flash" : ""}>
            {days(shown)}
          </span>
        </div>
      </div>
      <div>
        <ol
          className="m-0 flex list-none justify-center gap-1.5 p-0 min-[640px]:justify-start"
          aria-label="The last 7 editions"
        >
          {streak.recent.map((d) => {
            const { letter, long } = dayLabels(d.date);
            const style = DAY[d.status];
            return (
              <li
                key={d.date}
                title={`${long}: ${style.label}`}
                className={`flex size-[30px] items-center justify-center border-[1.5px] font-sans text-[12px] font-bold ${style.box}`}
              >
                <span aria-hidden="true">{letter}</span>
                <span className="sr-only">
                  {long}: {style.label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 mb-0 text-center text-[14px] text-ink-soft italic min-[640px]:text-left">
          {note} Every edition you finish on its day counts, solved or not.
          {isGuest && streak.current > 0 && (
            <>
              {" "}
              <Link href="/signup" className="font-bold text-accent not-italic">
                Create an account to keep your run →
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
