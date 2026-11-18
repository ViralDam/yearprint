// Small newspaper building blocks shared by the front page and inside pages.
import Image from "next/image";
import type { CSSProperties } from "react";
import { editionImageUrl } from "@/lib/game/images";

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-[5px] font-sans text-[10.5px] font-extrabold tracking-[0.22em] text-accent uppercase">
      {children}
    </p>
  );
}

const ASPECT = {
  standard: "aspect-[3/2]",
  wide: "aspect-[21/9]",
  tall: "aspect-[4/3.4]",
  ad: "aspect-[2/1]",
} as const;

export function Photo({
  path,
  alt,
  shape = "standard",
  position,
  sizes = "(max-width: 700px) 100vw, 420px",
  preload = false,
  className = "",
}: {
  path: string;
  alt: string;
  shape?: keyof typeof ASPECT;
  position?: string;
  sizes?: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${ASPECT[shape]} ${className}`}>
      <Image
        src={editionImageUrl(path)}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        className="photo"
        style={{ objectPosition: position ?? (shape === "tall" ? "center 22%" : "center") }}
      />
    </div>
  );
}

export function Caption({ caption, credit }: { caption?: string; credit?: string }) {
  if (!caption && !credit) return null;
  return (
    <figcaption className="border-b border-rule/30 px-px pt-[5px] pb-1.5 text-[12.5px] leading-[1.4] text-ink-soft">
      {caption}{" "}
      {credit && (
        <span className="font-sans text-[9.5px] font-bold tracking-[0.12em] text-ink-faint uppercase">
          {credit}
        </span>
      )}
    </figcaption>
  );
}

export function Byline({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-[7px] mb-1.5 font-sans text-[10.5px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
      {children}
    </p>
  );
}

/** Grey bars standing in for the rest of the column. */
export function Greek({ lines = 4 }: { lines?: number }) {
  return (
    <div aria-hidden="true">
      <div className="greek" style={{ "--lines": lines } as CSSProperties} />
      <div className="greek-end" />
    </div>
  );
}

export function Continued({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-[7px] font-sans text-[12.5px] tracking-[0.04em] text-ink-faint italic">
      {children}
    </p>
  );
}

/** "The real story behind it" — shown once the edition is finished. */
export function WhyNote({ why }: { why?: string }) {
  if (!why) return null;
  return (
    <div className="animate-rise mt-[9px] border-l-[3px] border-gold bg-gold/12 px-2.5 py-[7px] text-left text-sm leading-[1.45] italic">
      <b className="mb-0.5 block font-sans text-[10.5px] tracking-[0.14em] text-gold uppercase not-italic">
        The real story behind it
      </b>
      {why}
    </div>
  );
}

/** Small boxed panel with a caps title: weather, index, figures. */
export function Box({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-[1.5px] border-rule bg-paper-2 px-[13px] py-[11px] ${className}`}>
      <div className="mb-[7px] flex justify-between border-b border-rule/40 pb-[5px] font-sans text-[11px] font-extrabold tracking-[0.2em] uppercase">
        <span>{title}</span>
        {aside && <span>{aside}</span>}
      </div>
      {children}
    </div>
  );
}

export function AdLabel() {
  return (
    <div className="font-sans text-[9px] tracking-[0.3em] text-ink-faint uppercase">
      Advertisement
    </div>
  );
}
