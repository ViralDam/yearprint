import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="newsprint mx-auto mt-[22px] max-w-[880px] p-[clamp(22px,5vw,44px)] text-center">
      <p className="mb-1.5 font-sans text-[11px] font-extrabold tracking-[0.3em] text-accent uppercase">
        Correction
      </p>
      <h1 className="mb-2.5 font-display text-[clamp(32px,7vw,46px)] leading-[1.02] font-black">
        The page you wanted didn&apos;t make this edition
      </h1>
      <p className="mx-auto max-w-[620px] text-[17px] leading-[1.55] text-ink-soft">
        It may have been moved, retired, or never set in type at all. Today&apos;s paper, though, is
        on the stands.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/play" className="btn-accent">
          Play today&apos;s edition
        </Link>
        <Link href="/" className="btn-outline">
          Front page
        </Link>
      </div>
    </div>
  );
}
