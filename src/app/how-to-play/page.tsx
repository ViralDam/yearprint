import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentEdition } from "@/lib/game/data";
import { MAX_GUESSES, MAX_YEAR, MIN_YEAR, START_SCORE, WRONG_GUESS_COST } from "@/lib/game/rules";
import { capitalize, countNoun } from "@/lib/words";

export const metadata: Metadata = { title: "How to play" };

// Shown if no edition is on the stands; matches the usual line-up.
const DEFAULT_SECTIONS = [
  {
    name: "World & Politics",
    cost: 200,
    description: "Elections, leaders, wars — the most direct page in the paper.",
  },
  {
    name: "Technology",
    cost: 150,
    description: "Launches and gadgets; product generations date an edition fast.",
  },
  {
    name: "Business",
    cost: 125,
    description: "Crashes, rescues, takeovers — and the year's prices in hard figures.",
  },
  {
    name: "Sports",
    cost: 100,
    description: "Finals, records and results that happened exactly once.",
  },
  {
    name: "Entertainment",
    cost: 100,
    description: "Openings, finales and farewells from the year's screens.",
  },
  {
    name: "Ads & Lifestyle",
    cost: 75,
    description: "The quietest clues in the paper: prices, wages and everyday tech.",
  },
];

const h3 =
  "mt-[30px] mb-2 border-t-[1.5px] border-rule pt-[18px] font-display text-[23px] font-black";
const p = "mb-2.5 text-base leading-[1.6]";

export default function HowToPlay() {
  return (
    <div className="newsprint mx-auto mt-[22px] max-w-[880px] p-[clamp(22px,5vw,44px)]">
      <p className="mb-1.5 text-center font-sans text-[11px] font-extrabold tracking-[0.3em] text-accent uppercase">
        For New Readers
      </p>
      <h1 className="mb-2.5 text-center font-display text-[clamp(32px,7vw,46px)] leading-[1.02] font-black">
        How to Play
      </h1>
      <p className="mx-auto mb-2 max-w-[620px] text-center text-[17px] leading-[1.55] text-ink-soft">
        Yearprint hands you a complete newspaper — front page, inside sections, adverts and all —
        with one thing removed: the date. Everything in it happened in a single year. Your job is to
        work out which.
      </p>

      <h2 className={h3}>1 · Start with the front page — it&apos;s free</h2>
      <p className={p}>
        The front page carries the year&apos;s biggest stories, but it plays coy: headlines describe
        events <i>without</i> the names, cities or figures that would give the year away. Each story
        shows its photograph, its headline, and the opening line or two. The wording, the photos,
        the prices and even the weather are all clues. Form a first hunch before you spend a single
        point.
      </p>

      <h2 className={h3}>2 · Unfold inside sections for stronger clues</h2>
      <Suspense fallback={<SectionsGuide sections={DEFAULT_SECTIONS} />}>
        <CurrentSectionsGuide />
      </Suspense>

      <h2 className={h3}>3 · Guess the year — you get {MAX_GUESSES}</h2>
      <p className={p}>
        Slide to any year between{" "}
        <b>
          {MIN_YEAR} and {MAX_YEAR}
        </b>{" "}
        and send it to press. An exact guess ends the game and banks your remaining points. A wrong
        guess costs <b>{WRONG_GUESS_COST} points</b> — but the paper tells you whether the true year
        is <b>earlier</b> or <b>later</b>, so every miss buys information. Run out of guesses and
        the edition gets away: you score 0.
      </p>

      <h2 className={h3}>4 · The scoring, in full</h2>
      <p className={p}>
        You start every edition with <b>{START_SCORE.toLocaleString("en-US")} points</b>. Unfolds
        and wrong guesses are deducted as you go. Solve it and whatever remains is your score for
        the day — solve it from the front page alone with a first-guess hit, and you keep the
        perfect {START_SCORE.toLocaleString("en-US")}. Each edition can be played once, and a new
        one arrives every day at midnight UTC.
      </p>

      <h2 className={h3}>Reading the clues like an editor</h2>
      <ul className="mt-1 mb-2.5 list-disc pl-5 text-base leading-[1.6] [&>li]:mb-1.5">
        <li>
          <b>Prices are timestamps.</b> What a television, a phone or an ounce of gold costs pins an
          era more precisely than most headlines.
        </li>
        <li>
          <b>Technology moves in generations.</b> A product described as brand new — or a rival
          described as dominant — tells you where you are in its timeline.
        </li>
        <li>
          <b>Records are unique.</b> A medal haul, a winning streak or a box-office record usually
          happened in exactly one year.
        </li>
        <li>
          <b>The front page lies by omission, never by invention.</b> Everything it says is true of
          the year — it just declines to say the names. The inside pages restore them.
        </li>
      </ul>

      <div className="mt-[30px] border-t-[3px] border-double border-rule pt-[22px] text-center">
        <Link href="/play" className="btn-accent inline-block">
          Play today&apos;s edition
        </Link>
      </div>
    </div>
  );
}

type CostRow = { name: string; cost: number; description: string };

/** The current edition's sections and prices. */
async function CurrentSectionsGuide() {
  const current = await getCurrentEdition();
  const sections = current?.payload.sections.length ? current.payload.sections : DEFAULT_SECTIONS;
  return <SectionsGuide sections={sections} />;
}

function SectionsGuide({ sections }: { sections: CostRow[] }) {
  const one = sections.length === 1;
  return (
    <>
      <p className={p}>
        {capitalize(countNoun(sections.length, "section"))} {one ? "is" : "are"} folded inside the
        paper. Unfold {one ? "it" : "them in any order"} — each costs points from your score, and
        the deeper pages are progressively less discreet: names, places, results and figures that
        narrow the year down. Bet on the knowledge you trust most.
      </p>
      <CostTable sections={sections} />
    </>
  );
}

function CostTable({ sections }: { sections: CostRow[] }) {
  return (
    <table className="mt-2.5 mb-1 w-full border-collapse text-[15px]">
      <thead>
        <tr className="font-sans text-[11px] tracking-[0.14em] uppercase">
          {["Section", "Cost", "What it gives you"].map((th) => (
            <th key={th} className="border-b-2 border-rule px-2 py-1.5 text-left font-normal">
              {th}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sections.map((s) => (
          <tr key={s.name} className="align-top">
            <td className="border-b border-rule/25 px-2 py-[7px]">{s.name}</td>
            <td className="border-b border-rule/25 px-2 py-[7px] font-bold whitespace-nowrap text-accent tabular-nums">
              −{s.cost} pts
            </td>
            <td className="border-b border-rule/25 px-2 py-[7px]">{s.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
