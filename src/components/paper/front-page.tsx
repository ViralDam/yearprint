import type { Edition, Item, SectionInfo } from "@/lib/game/types";
import { Ad, Article, Figures } from "./items";
import { Box } from "./pieces";

export function Masthead({ edition, year }: { edition: Edition; year?: number }) {
  return (
    <>
      <div className="border-b-4 border-double border-rule pb-3 text-center">
        <div className="flex justify-between gap-2 font-sans text-[11px] tracking-[0.3em] text-ink-soft uppercase">
          <span>{edition.established}</span>
          <span className="max-[480px]:hidden">{edition.edition_label}</span>
          <span>{edition.price_label}</span>
        </div>
        <h1 className="mt-2 mb-1.5 font-display text-[clamp(38px,9vw,68px)] leading-[0.95] font-black tracking-[0.01em]">
          {edition.paper_name}
        </h1>
        <div className="text-[clamp(14px,3.4vw,17px)] text-ink-soft italic">“{edition.motto}”</div>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b-[1.5px] border-rule py-[7px] font-sans text-xs tracking-[0.06em] uppercase">
        <span className="inline-block -rotate-[1.5deg] rounded-[2px] border-[1.5px] border-accent px-2 py-0.5 font-extrabold text-accent">
          {edition.edition_tag}
        </span>
        <span>
          Date of issue:{" "}
          {year ? (
            <span className="font-extrabold tracking-[0.2em] text-accent">{year}</span>
          ) : (
            <span className="redacted" aria-label="year redacted">
              ████
            </span>
          )}
        </span>
        <span>{edition.pages_line}</span>
      </div>
    </>
  );
}

const twoCol = "min-[701px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]";
const threeCol = "min-[701px]:grid-cols-3";
const bottomCols = "min-[701px]:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]";
const band = "mt-[22px] grid gap-[22px] border-t-[1.5px] border-rule pt-[18px]";

function FrontItem({ item, why, size }: { item: Item; why?: string; size: "md" | "sm" }) {
  if (item.kind === "ad") return <Ad item={item} why={why} variant="front" />;
  if (item.kind === "figures") return <Figures item={item} why={why} />;
  return <Article item={item} why={why} size={size} />;
}

/**
 * The free front page, laid out by slot: lead + rail (with weather), a row of
 * three, then a bottom band with the front advert and the index.
 */
export function FrontPage({
  edition,
  front,
  sections,
  frontWhy,
}: {
  edition: Edition;
  front: Item[];
  sections: SectionInfo[];
  /** Item id → reveal note, once the edition is finished. */
  frontWhy?: Record<string, string>;
}) {
  const bySlot = (slot: Item["slot"]) => front.filter((i) => i.slot === slot);
  const lead = bySlot("lead")[0];
  const why = (item: Item) => frontWhy?.[item.id];

  return (
    <>
      <div className={`grid gap-6 ${twoCol}`}>
        {lead && (
          <Article
            item={lead}
            why={why(lead)}
            size="xl"
            isLead
            preloadImage
            imageSizes="(max-width: 700px) 100vw, 520px"
          />
        )}
        <div className="flex flex-col gap-5 border-rule/35 max-[700px]:border-t max-[700px]:pt-[18px] min-[701px]:border-l min-[701px]:pl-[22px]">
          {bySlot("rail").map((item) => (
            <FrontItem key={item.id} item={item} why={why(item)} size="md" />
          ))}
          {edition.weather && (
            <Box title={edition.weather.title} aside={edition.weather.date}>
              <div className="font-display text-[30px] font-black">{edition.weather.temp}</div>
              <p className="mt-1 text-[13.5px] leading-[1.45]">{edition.weather.text}</p>
            </Box>
          )}
        </div>
      </div>

      {bySlot("row").length > 0 && (
        <div className={`${band} ${threeCol}`}>
          {bySlot("row").map((item) => (
            <FrontItem key={item.id} item={item} why={why(item)} size="sm" />
          ))}
        </div>
      )}

      <div className={`${band} items-start ${bottomCols}`}>
        {bySlot("bottom").map((item) => (
          <FrontItem key={item.id} item={item} why={why(item)} size="md" />
        ))}
        {bySlot("front_ad").map((item) => (
          <FrontItem key={item.id} item={item} why={why(item)} size="sm" />
        ))}
        <Box title="In This Edition">
          <p className="m-0 text-sm leading-[1.65]">
            {sections.map((s) => (
              <span key={s.slug} className="block">
                {s.name} — {s.folio.replace(/^Page\s+/i, "")}
              </span>
            ))}
          </p>
          {edition.index_note && (
            <p className="mt-[7px] text-sm leading-[1.5] italic">{edition.index_note}</p>
          )}
        </Box>
      </div>
    </>
  );
}
