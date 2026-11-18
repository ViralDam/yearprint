"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MAX_GUESSES } from "@/lib/game/rules";
import { useHud } from "./hud-context";

const NAV = [
  { href: "/play", label: "Play" },
  { href: "/how-to-play", label: "How to play" },
] as const;

/** `streak` and `account` are server-rendered and streamed in. */
export function Hud({ streak, account }: { streak: ReactNode; account: ReactNode }) {
  const pathname = usePathname();
  const { hud } = useHud();
  const onPlay = pathname === "/play";

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-b-[3px] border-double border-gold bg-hud px-4 py-2.5 font-sans text-hud-ink">
      <Link
        href="/"
        aria-label="Yearprint — home"
        className="font-display text-[19px] font-black tracking-[0.04em]"
      >
        YEAR<span className="text-gold">PRINT</span>
      </Link>
      <nav aria-label="Site" className="flex flex-wrap gap-0.5">
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-[3px] px-2.5 py-1.5 text-[13px] font-semibold tracking-[0.04em] hover:bg-hud-ink/10 hover:opacity-100 ${
                active ? "opacity-100 shadow-[inset_0_-2px_0_var(--gold)]" : "opacity-75"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      {onPlay && hud && (
        <div className="flex items-center gap-4" aria-live="polite">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold tracking-[0.16em] uppercase opacity-65">
              Score
            </span>
            <span
              key={hud.flashKey}
              className={`inline-block text-xl font-extrabold tabular-nums ${hud.flashKey ? "animate-flash" : ""}`}
            >
              {hud.score.toLocaleString("en-US")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-[0.16em] uppercase opacity-65">
              Guesses left
            </span>
            <span
              className="flex items-center gap-[5px]"
              role="img"
              aria-label={`${MAX_GUESSES - hud.guessesUsed} of ${MAX_GUESSES} guesses left`}
            >
              {Array.from({ length: MAX_GUESSES }, (_, i) => (
                <span
                  key={i}
                  className={`size-[13px] rounded-full border-2 border-hud-ink ${
                    i < hud.guessesUsed ? "bg-transparent opacity-45" : "bg-gold"
                  }`}
                />
              ))}
            </span>
          </div>
        </div>
      )}
      {/* On phones the play page's score row has no room for it; the results card shows the run. */}
      <span className={onPlay && hud ? "contents max-[639px]:hidden" : "contents"}>{streak}</span>
      {account}
    </header>
  );
}
