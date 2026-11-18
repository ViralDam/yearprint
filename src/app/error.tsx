"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as { digest?: string }).digest)
      : null;

  return (
    <div className="newsprint mx-auto mt-[22px] max-w-[880px] p-[clamp(22px,5vw,44px)] text-center">
      <p className="mb-1.5 font-sans text-[11px] font-extrabold tracking-[0.3em] text-accent uppercase">
        Stop the presses
      </p>
      <h1 className="mb-2.5 font-display text-[clamp(32px,7vw,46px)] leading-[1.02] font-black">
        The presses jammed
      </h1>
      <p className="mx-auto max-w-[620px] text-[17px] leading-[1.55] text-ink-soft">
        Something went wrong setting this page. Your game is saved — give it another go.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn-accent">
          Try again
        </button>
        <Link href="/" className="btn-outline">
          Front page
        </Link>
      </div>
      {digest && (
        <p className="mt-5 font-sans text-[11px] tracking-[0.1em] text-ink-faint uppercase">
          Reference: {digest}
        </p>
      )}
    </div>
  );
}
