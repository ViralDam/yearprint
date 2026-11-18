"use client";

import { useEffect, useState } from "react";
import { InsideItem } from "@/components/paper/items";
import type { Item, SectionInfo } from "@/lib/game/types";

/**
 * One inside section. Folded, it shows its name and price behind a two-tap
 * "Unfold → Pay N pts" button. Unfolded, it shows its stories.
 */
export function FoldedSection({
  section,
  items,
  paid,
  busy,
  disabled,
  onUnfold,
}: {
  section: SectionInfo;
  /** Present once unfolded (or revealed at the close). */
  items?: Item[];
  /** Whether the player paid for it (vs. revealed free at the end). */
  paid: boolean;
  busy: boolean;
  disabled: boolean;
  onUnfold: () => void;
}) {
  const [armed, setArmed] = useState(false);

  // Disarm the confirm step if the player doesn't follow through.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 8000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <section
      id={`sec-${section.slug}`}
      aria-labelledby={`sec-${section.slug}-title`}
      className="mt-[18px] border-t-[3px] border-double border-rule pt-3.5"
    >
      {items ? (
        <div className="animate-unfold">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5 border-b-[1.5px] border-rule pb-[7px]">
            <h3
              id={`sec-${section.slug}-title`}
              className="m-0 font-display text-[clamp(23px,5vw,30px)] font-black"
            >
              <span aria-hidden="true">{section.icon}</span> {section.name}
            </h3>
            <span className="font-sans text-[11px] font-bold tracking-[0.12em] text-ink-faint uppercase">
              {section.folio}
            </span>
            <span className="font-sans text-[11px] font-bold tracking-[0.1em] text-ink-faint uppercase">
              {paid ? `Unfolded · −${section.cost} pts` : "Revealed free at the close"}
            </span>
          </div>
          <div className="mt-4 grid gap-x-[26px] gap-y-6 min-[641px]:grid-cols-2">
            {items.map((item) => (
              <InsideItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-[1.5px] border-dashed border-rule/50 bg-rule/4 px-3.5 py-3">
          <span className="text-[22px]" aria-hidden="true">
            {section.icon}
          </span>
          <span id={`sec-${section.slug}-title`} className="font-display text-xl font-bold">
            {section.name}
          </span>
          <span className="min-w-[140px] flex-1 text-sm text-ink-soft italic">
            {section.description}
          </span>
          <span className="rounded-[2px] border-[1.5px] border-accent px-[7px] py-0.5 font-sans text-[13px] font-extrabold whitespace-nowrap text-accent">
            −{section.cost} pts
          </span>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              if (armed) {
                setArmed(false);
                onUnfold();
              } else {
                setArmed(true);
              }
            }}
            aria-label={
              armed
                ? `Confirm: pay ${section.cost} points to unfold ${section.name}`
                : `Unfold the ${section.name} page for ${section.cost} points`
            }
            className={`btn-ink !px-4 !py-[9px] !text-[13px] !tracking-[0.08em] ${armed ? "!bg-accent" : ""}`}
          >
            {busy ? "Unfolding…" : armed ? `Pay ${section.cost} pts` : "Unfold"}
          </button>
        </div>
      )}
    </section>
  );
}
