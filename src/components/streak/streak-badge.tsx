"use client";

import Link from "next/link";
import { useHud } from "@/components/site/hud-context";
import { useCountdown } from "@/components/site/use-countdown";
import type { PlayerStreak } from "@/lib/game/types";
import { Flame } from "./flame";

/**
 * Header streak badge. Solid while the streak is safe; hollow, with the time
 * left until midnight UTC, while today's edition is still unplayed. Hidden
 * with no streak. The results card can hand it a fresher streak via the HUD
 * context, so it updates the moment a game finishes.
 */
export function StreakBadge({
  initial,
  isGuest,
}: {
  initial: PlayerStreak | null;
  isGuest: boolean;
}) {
  const { streak: fresh } = useHud();
  const countdown = useCountdown();
  const streak = fresh ?? initial;
  if (!streak || streak.current === 0) return null;

  const days = `${streak.current}-day streak`;
  const atRisk = streak.today_open;
  const label = atRisk
    ? `${days}. Play today's edition${countdown ? ` within ${countdown}` : ""} to keep it.`
    : `${days}. ${isGuest ? "Create an account to keep it." : "See your record."}`;
  const href = atRisk ? "/play" : isGuest ? "/signup" : "/account";

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-[5px] text-[12.5px] font-extrabold tabular-nums hover:bg-hud-ink/10 ${
        atRisk ? "border-dashed border-hud-ink/60 opacity-85" : "border-gold"
      }`}
    >
      <Flame className={atRisk ? "" : "text-gold"} />
      {streak.current}
      {atRisk && countdown && (
        <span className="hidden font-semibold opacity-80 min-[640px]:inline">
          {" "}
          · {countdown} left
        </span>
      )}
    </Link>
  );
}
