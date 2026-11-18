// Renders one edition item: an article, an advert or a figures box.
import type { Item } from "@/lib/game/types";
import { AdLabel, Box, Byline, Caption, Continued, Greek, Kicker, Photo, WhyNote } from "./pieces";

export type HeadlineSize = "xl" | "lg" | "md" | "sm";

const HEADLINE: Record<HeadlineSize, string> = {
  xl: "text-[clamp(44px,10vw,74px)] tracking-[0.01em]",
  lg: "text-[clamp(24px,5vw,31px)]",
  md: "text-[clamp(20px,4.4vw,24px)]",
  sm: "text-[19px]",
};

interface ItemProps {
  item: Item;
  /** Reveal note; only passed once the edition is finished. */
  why?: string;
}

export function Article({
  item,
  why,
  size = "sm",
  isLead = false,
  imageSizes,
  preloadImage = false,
}: ItemProps & {
  size?: HeadlineSize;
  isLead?: boolean;
  imageSizes?: string;
  preloadImage?: boolean;
}) {
  const Heading = isLead ? "h2" : "h3";
  const shape = item.feature && !isLead ? "wide" : (item.image_variant ?? "standard");
  return (
    <article>
      {item.kicker && <Kicker>{item.kicker}</Kicker>}
      <Heading
        className={`mb-2 font-display leading-[1.04] font-black break-words ${HEADLINE[size]}`}
      >
        {item.headline}
      </Heading>
      {item.deck && (
        <p className="mb-2.5 font-display text-[clamp(19px,4.4vw,27px)] leading-[1.15] font-bold tracking-[0.02em] uppercase">
          {item.deck}
        </p>
      )}
      {item.image_path && (
        <figure className="mb-[7px]">
          <Photo
            path={item.image_path}
            alt={item.image_alt ?? ""}
            shape={shape}
            position={item.image_position}
            sizes={imageSizes}
            preload={preloadImage}
          />
          <Caption caption={item.caption} credit={item.credit} />
        </figure>
      )}
      {item.byline && <Byline>{item.byline}</Byline>}
      <p
        className={`m-0 text-justify leading-normal hyphens-auto ${isLead ? "drop-cap text-[17.5px]" : "text-base"}`}
      >
        {item.dateline && (
          <span className="font-sans text-[12.5px] font-extrabold tracking-[0.06em]">
            {item.dateline}
          </span>
        )}
        {item.lead}
      </p>
      <Greek lines={item.greek_lines} />
      {item.continued && <Continued>{item.continued}</Continued>}
      <WhyNote why={why ?? item.why} />
    </article>
  );
}

export function Ad({
  item,
  why,
  variant = "inside",
}: ItemProps & { variant?: "front" | "inside" }) {
  const front = variant === "front";
  return (
    <div
      className={`self-start p-3 text-center ${front ? "ad-hatch border-2 border-rule" : "border-[1.5px] border-rule bg-rule/3"}`}
    >
      <AdLabel />
      {item.image_path && (
        <Photo
          path={item.image_path}
          alt={item.image_alt ?? item.headline}
          shape="ad"
          className="mt-[7px]"
          sizes="(max-width: 700px) 100vw, 300px"
        />
      )}
      {item.image_path && item.credit && (
        <div className="mt-1 mb-[7px] text-left font-sans text-[9px] font-bold tracking-[0.12em] text-ink-faint uppercase">
          {item.credit}
        </div>
      )}
      <div
        className={`mt-1.5 mb-1 font-display leading-[1.1] font-black ${front ? "text-[22px]" : "text-[19px]"}`}
      >
        {item.headline}
      </div>
      <p className="m-0 text-sm leading-[1.45]">{item.body}</p>
      <div
        className={`mt-[5px] font-display font-black text-accent ${front ? "text-2xl" : "text-[21px]"}`}
      >
        {item.price}
      </div>
      <WhyNote why={why ?? item.why} />
    </div>
  );
}

export function Figures({ item, why }: ItemProps) {
  return (
    <Box title={item.headline} className="self-start">
      <p className="m-0 text-[15px] leading-[1.7] tabular-nums">
        {(item.body ?? "").split("\n").map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </p>
      <WhyNote why={why ?? item.why} />
    </Box>
  );
}

/** An item on an inside page: features span both columns. */
export function InsideItem({ item }: { item: Item }) {
  if (item.kind === "ad") return <Ad item={item} />;
  if (item.kind === "figures") return <Figures item={item} />;
  return (
    <div className={item.feature ? "col-span-full" : ""}>
      <Article
        item={item}
        size={item.feature ? "lg" : "sm"}
        imageSizes={item.feature ? "(max-width: 880px) 100vw, 800px" : undefined}
      />
    </div>
  );
}
