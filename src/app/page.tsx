import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { StreakNudge } from "@/components/streak/streak-nudge";
import { getCurrentEdition } from "@/lib/game/data";
import { editionImageUrl } from "@/lib/game/images";
import { MAX_YEAR, MIN_YEAR } from "@/lib/game/rules";
import { capitalize, countNoun, listNames } from "@/lib/words";

const UNFOLD_FALLBACK =
  "The folded sections inside carry the specifics: names, places and figures. Each section you unfold costs points.";

const STEPS = [
  {
    title: "Read the front page",
    body: "It's free — and it's coy. The headlines describe the year's biggest stories while withholding the names, places and numbers that would settle the question.",
  },
  {
    title: "Unfold for proof",
    body: (
      <Suspense fallback={UNFOLD_FALLBACK}>
        <UnfoldBlurb />
      </Suspense>
    ),
  },
  {
    title: "Name the year",
    body: `Three guesses, anywhere from ${MIN_YEAR} to ${MAX_YEAR}. A wrong guess costs 100 points but tells you earlier or later. Land the exact year and you bank every point you have left.`,
  },
];

/** Step 2, written for the current edition's actual sections. */
async function UnfoldBlurb() {
  const sections = (await getCurrentEdition())?.payload.sections ?? [];
  if (sections.length === 0) return UNFOLD_FALLBACK;
  return `${capitalize(countNoun(sections.length, "inside section"))} — ${listNames(
    sections.map((s) => s.name),
  )} — carry the specifics. Each section you unfold costs points.`;
}

export default function Home() {
  return (
    <div className="mx-auto max-w-[880px] px-[18px] pt-[34px] text-center">
      <p className="m-0 font-sans text-[11.5px] font-extrabold tracking-[0.34em] text-stage-dim uppercase">
        The Daily Guessing Game
      </p>
      <h1 className="mt-2.5 mb-1 font-display text-[clamp(56px,14vw,108px)] leading-[0.95] font-black tracking-[0.01em]">
        YEAR<span className="text-gold">PRINT</span>
      </h1>
      <p className="mb-3.5 font-display text-[clamp(20px,4.6vw,28px)] font-bold italic">
        One paper. No date. Name its year.
      </p>
      <p className="mx-auto max-w-[640px] text-[17px] leading-relaxed">
        Every morning, an edition of <i>The Daily Chronicle</i> arrives with its date torn off.
        Every story in it really happened — in one single year — but the Chronicle retells them in
        its own words and holds back the names that would give the year away. Read the clues, unfold
        the inside pages if you dare, and pin the year before your three guesses run out.
      </p>
      <div className="mt-6 mb-2.5 flex flex-wrap justify-center gap-3">
        <Link href="/play" className="btn-accent">
          Play today&apos;s edition
        </Link>
        <Link href="/how-to-play" className="btn-ghost">
          How to play
        </Link>
      </div>
      <Suspense fallback={null}>
        <StreakNudge />
      </Suspense>

      <Suspense fallback={<div className="mx-auto mt-[34px] aspect-[4/5] max-w-[540px]" />}>
        <MiniPaper />
      </Suspense>

      <div className="mx-auto mt-11 grid gap-[26px] border-t-[3px] border-double border-stage-ink pt-6 text-left min-[701px]:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title}>
            <div className="font-display text-[40px] leading-none font-black text-gold">
              {i + 1}
            </div>
            <h2 className="my-1.5 font-display text-xl font-black">{step.title}</h2>
            <p className="m-0 text-[15.5px] leading-[1.55]">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A teaser of the current edition's lead story, date torn off. */
async function MiniPaper() {
  const current = await getCurrentEdition();
  const edition = current?.payload.edition;
  const lead = current?.payload.front.find((i) => i.slot === "lead");
  if (!edition || !lead) return null;

  return (
    <Link
      href="/play"
      aria-label={`Play edition No. ${edition.edition_no} of ${edition.paper_name}`}
      className="newsprint mx-auto mt-[34px] block w-full max-w-[540px] -rotate-[0.6deg] px-[22px] pt-5 pb-[18px] text-left transition-transform hover:rotate-0"
    >
      <span className="flex justify-between gap-2 font-sans text-[9.5px] tracking-[0.24em] text-ink-soft uppercase">
        <span>{edition.established}</span>
        <span>{edition.edition_label}</span>
        <span>{edition.price_label}</span>
      </span>
      <span className="block border-b-4 border-double border-rule pt-1 pb-2 text-center font-display text-[clamp(28px,7vw,40px)] font-black">
        {edition.paper_name}
      </span>
      <span className="mb-3 flex items-center justify-between border-b-[1.5px] border-rule py-1.5 font-sans text-[11px] tracking-[0.06em] uppercase">
        <span>{edition.edition_tag}</span>
        <span>
          Date of issue:{" "}
          <span className="redacted" aria-label="year redacted">
            ████
          </span>
        </span>
      </span>
      {lead.image_path && (
        <span className="relative block aspect-[21/9]">
          <Image
            src={editionImageUrl(lead.image_path)}
            alt={lead.image_alt ?? ""}
            fill
            sizes="(max-width: 600px) 100vw, 500px"
            className="photo"
            style={{ objectPosition: "center 30%" }}
            preload
          />
        </span>
      )}
      <span className="mt-3 mb-1 block font-display text-[clamp(34px,8vw,48px)] leading-none font-black">
        {lead.headline}
      </span>
      {edition.teaser_deck && (
        <span className="block text-[16.5px] leading-[1.4] text-ink-soft italic">
          {edition.teaser_deck}
        </span>
      )}
      <span className="mt-3 block font-sans text-[12.5px] font-extrabold tracking-[0.1em] text-accent uppercase">
        Read the edition No. {edition.edition_no} →
      </span>
    </Link>
  );
}
