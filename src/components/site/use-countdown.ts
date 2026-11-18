"use client";

import { useEffect, useState } from "react";

/** Time left until the next edition (midnight UTC), as "4h 12m" or "12m". */
export function untilNextEdition(now: number): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.ceil((next.getTime() - now) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Ticks every 30s; null until mounted so server and client markup match. */
export function useCountdown(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setLabel(untilNextEdition(Date.now()));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return label;
}
