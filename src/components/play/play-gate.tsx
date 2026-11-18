"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { rememberGuestChoice } from "@/lib/auth/guest-choice";

/**
 * Shown over the paper to anyone without an account (once a day for guests):
 * create an account, sign in, or play as a guest. Escape counts as playing as
 * a guest.
 */
export function PlayGate() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
    };
  }, [open]);

  function playAsGuest() {
    rememberGuestChoice();
    ref.current?.close();
  }

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="play-gate-title"
      aria-describedby="play-gate-body"
      onClose={() => {
        rememberGuestChoice();
        setOpen(false);
      }}
      className="m-auto w-[calc(100%-32px)] max-w-[440px] bg-transparent p-0 backdrop:bg-[#14110c]/70 backdrop:backdrop-blur-[2px]"
    >
      <div className="newsprint p-[clamp(22px,5vw,32px)] text-center">
        <p className="m-0 font-sans text-[11px] font-extrabold tracking-[0.3em] text-ink-faint uppercase">
          Before you read
        </p>
        <h2
          id="play-gate-title"
          className="mt-1.5 mb-2 font-display text-[30px] leading-tight font-black"
        >
          Get your name in print
        </h2>
        <p
          id="play-gate-body"
          className="mx-auto mb-5 max-w-[340px] text-[15.5px] leading-normal text-ink-soft italic"
        >
          A free account keeps every score, tracks your streak and puts you on the daily
          leaderboard. It takes ten seconds.
        </p>
        <div className="grid gap-2.5">
          <Link href="/signup" className="btn-accent">
            Create a free account
          </Link>
          <Link href="/signin" className="btn-outline">
            Sign in
          </Link>
        </div>
        <button
          type="button"
          onClick={playAsGuest}
          className="mt-4 font-sans text-[13.5px] font-bold text-ink-soft underline underline-offset-[3px] hover:text-accent"
        >
          Play as a guest
        </button>
        <p className="mt-1 mb-0 text-[13px] leading-snug text-ink-faint italic">
          Guests play the full game but don&apos;t rank. You can save your game to an account later.
        </p>
      </div>
    </dialog>
  );
}
