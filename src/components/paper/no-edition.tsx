import Link from "next/link";

export function NoEdition() {
  return (
    <div className="newsprint mx-auto mt-[22px] max-w-[880px] p-[clamp(22px,5vw,44px)] text-center">
      <p className="mb-1.5 font-sans text-[11px] font-extrabold tracking-[0.3em] text-accent uppercase">
        Stop the presses
      </p>
      <h1 className="mb-2.5 font-display text-[clamp(32px,7vw,46px)] leading-[1.02] font-black">
        No edition on the stands
      </h1>
      <p className="mx-auto max-w-[620px] text-[17px] leading-[1.55] text-ink-soft">
        The printers haven&apos;t delivered an edition yet. A fresh one arrives every day at
        midnight UTC.
      </p>
      <Link href="/how-to-play" className="btn-accent mt-6 inline-block">
        Read how to play
      </Link>
    </div>
  );
}
