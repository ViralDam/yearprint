"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import type { PlayerStreak } from "@/lib/game/types";

/** What the play page shows in the sticky HUD: live score and guesses used. */
export interface HudState {
  score: number;
  guessesUsed: number;
  /** Bumped on every score change so the HUD can flash. */
  flashKey: number;
}

interface HudContextValue {
  hud: HudState | null;
  setHud: (hud: HudState | null) => void;
  /**
   * A fresher streak than the one the header was rendered with (set by the
   * results card after a game finishes), or null to use the server's.
   */
  streak: PlayerStreak | null;
  setStreak: (streak: PlayerStreak | null) => void;
}

const HudContext = createContext<HudContextValue | null>(null);

export function HudProvider({ children }: { children: ReactNode }) {
  const [hud, setHud] = useState<HudState | null>(null);
  const [streak, setStreak] = useState<PlayerStreak | null>(null);
  const value = useMemo(() => ({ hud, setHud, streak, setStreak }), [hud, streak]);
  return <HudContext value={value}>{children}</HudContext>;
}

export function useHud(): HudContextValue {
  const ctx = use(HudContext);
  if (!ctx) throw new Error("useHud must be used inside <HudProvider>");
  return ctx;
}
