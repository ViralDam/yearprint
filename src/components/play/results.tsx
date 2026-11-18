"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { boardNote, LeaderboardTable } from "@/components/board/leaderboard-table";
import { StatsPanel } from "@/components/board/stats-panel";
import { useHud } from "@/components/site/hud-context";
import { useCountdown } from "@/components/site/use-countdown";
import { StreakStrip } from "@/components/streak/streak-strip";
import { loadResultsExtras, type ResultsExtras } from "@/lib/game/actions";
import { scoreBreakdown, shareText, verdict } from "@/lib/game/rules";
import type { Play, Reveal, SectionInfo } from "@/lib/game/types";

export function Results({
  play,
  reveal,
  sections,
  editionNo,
  isToday,
  isGuest,
  justFinished,
  onReview,
}: {
  play: Play;
  reveal: Reveal;
  sections: SectionInfo[];
  editionNo: number;
  isToday: boolean;
  isGuest: boolean;
  /** The game ended during this visit (not a return to a finished one). */
  justFinished: boolean;
  onReview: () => void;
}) {
  const [shared, setShared] = useState(false);
  const countdown = useCountdown();
  const [extras, setExtras] = useState<ResultsExtras | null>(null);
  const { setStreak } = useHud();
  const streak = extras?.streak ?? null;
  // Only a play that counted today carries the streak into the share text.
  const text = shareText(
    play,
    sections,
    editionNo,
    isToday && streak?.played_today ? streak.current : 0,
  );
  const rows = scoreBreakdown(play, sections);

  // The streak, board and stats load once the game is over (they don't block
  // the card). Guests get the streak only. The fresh streak also goes to the
  // header badge, which was rendered before this game finished.
  useEffect(() => {
    let live = true;
    loadResultsExtras(play.edition_id).then((res) => {
      if (!live || !res.ok) return;
      setExtras(res.data);
      if (res.data.streak) setStreak(res.data.streak);
    });
    return () => {
      live = false;
    };
  }, [play.edition_id, play.finished_at, setStreak]);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Yearprint", text });
        return;
      } catch {
        // Cancelled or unsupported payload: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard blocked; the text is on screen to copy by hand.
    }
  }

  return (
    <div
      id="results"
      className="animate-rise mx-auto mt-[22px] max-w-[880px] scroll-mt-36 px-3.5 min-[640px]:scroll-mt-20"
    >
      <div className="newsprint px-[clamp(20px,4.5vw,36px)] py-[clamp(20px,4.5vw,36px)] text-center">
        <div className="font-sans text-[11px] font-extrabold tracking-[0.3em] text-accent uppercase">
          {play.won ? "Extra! Extra! You dated the edition" : "Stop Press — The Year Was"}
        </div>
        <div className="mt-1.5 mb-0.5 font-display text-[clamp(64px,16vw,110px)] leading-none font-black">
          {reveal.answer_year}
        </div>
        <p className="mb-1.5 text-[clamp(17px,4vw,21px)] text-ink-soft italic">{verdict(play)}</p>
        <div className="font-display text-[34px] font-black">
          {play.score.toLocaleString("en-US")}{" "}
          <small className="text-base font-bold text-ink-soft">points</small>
        </div>
        <div className="mx-auto mt-[18px] max-w-[520px] border-[1.5px] border-rule bg-paper-2 px-4 py-3.5 text-left font-sans text-[15px] leading-[1.65] whitespace-pre-line">
          {text}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={share} className="btn-ink">
            {shared ? "✓ Copied" : "Share result"}
          </button>
          <button type="button" onClick={onReview} className="btn-outline">
            Review the edition
          </button>
        </div>
        <p className="mt-3.5 text-sm text-ink-soft italic">
          The whole edition is now unfolded — every headline and advert carries a note naming the
          real event behind it.
          {countdown && <> The next edition arrives in {countdown} (midnight UTC).</>}
          {!isToday && <> This was a past edition, so it doesn&apos;t count on the leaderboard.</>}
        </p>
      </div>

      {streak && (
        <StreakStrip
          streak={streak}
          isGuest={isGuest}
          justFinished={justFinished}
          countdown={countdown}
        />
      )}

      {isGuest && (
        <div className="mt-[18px] rounded border-t-[3px] border-gold bg-hud px-5 py-4 text-center font-sans text-[14.5px] text-hud-ink">
          You played as a guest, so this score isn&apos;t on the leaderboard.{" "}
          <Link href="/signup" className="font-extrabold whitespace-nowrap text-gold">
            {play.ranked
              ? "Create an account and it joins the board →"
              : "Create an account to keep it →"}
          </Link>
        </div>
      )}

      <div className="mt-[18px] grid items-start gap-[18px] min-[701px]:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-[18px]">
          <div className="newsprint px-[clamp(16px,3.5vw,26px)] py-5 text-left">
            <h3 className="mb-3 font-display text-[21px] font-black">How your score was spent</h3>
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-3 border-b border-dotted border-rule/40 py-1.5 text-[15px]"
              >
                <span>{row.label}</span>
                <span
                  className={`font-bold whitespace-nowrap tabular-nums ${row.amount < 0 ? "text-accent" : ""}`}
                >
                  {row.amount < 0 ? "−" : ""}
                  {Math.abs(row.amount).toLocaleString("en-US")}
                </span>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-3 border-t-2 border-rule pt-2.5 font-display text-[19px] font-black">
              <span>Final score</span>
              <span className="tabular-nums">{play.score.toLocaleString("en-US")} pts</span>
            </div>
          </div>
          {extras?.stats && (
            <div className="newsprint px-[clamp(16px,3.5vw,26px)] py-5 text-left">
              <h3 className="mb-3 font-display text-[21px] font-black">Your record</h3>
              <StatsPanel stats={extras.stats} />
            </div>
          )}
        </div>
        <div className="newsprint px-[clamp(16px,3.5vw,26px)] py-5 text-left">
          <h3 className="mb-3 font-display text-[21px] font-black">
            {isToday ? "Today's leaderboard" : "This edition's leaderboard"}
          </h3>
          {isGuest ? (
            <p className="m-0 text-[15px] text-ink-soft italic">
              The board is for readers with an account.{" "}
              {play.ranked
                ? "Create one and your score takes its place on it, then see who you beat."
                : "Create one to see who topped this edition."}{" "}
              <Link href="/signup" className="font-bold text-accent not-italic">
                Create an account →
              </Link>{" "}
              or{" "}
              <Link href="/signin" className="font-bold text-accent not-italic">
                sign in
              </Link>
              .
            </p>
          ) : extras?.board ? (
            <>
              <LeaderboardTable board={extras.board} />
              <p className="mt-3 mb-0 text-sm text-ink-soft italic">{boardNote(extras.board)}</p>
            </>
          ) : extras ? (
            <p className="m-0 text-[15px] text-ink-soft italic">
              This edition&apos;s board isn&apos;t available.
            </p>
          ) : (
            <p className="m-0 text-[15px] text-ink-soft italic">Setting the type…</p>
          )}
        </div>
      </div>
    </div>
  );
}
