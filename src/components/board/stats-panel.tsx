import type { PlayerStats } from "@/lib/game/types";

const BARS = [
  { key: "1", label: "1 guess" },
  { key: "2", label: "2 guesses" },
  { key: "3", label: "3 guesses" },
  { key: "x", label: "Missed" },
] as const;

/** Played / win % / streaks, plus a small distribution by guesses used. */
export function StatsPanel({ stats }: { stats: PlayerStats }) {
  const figures = [
    { label: "Played", value: stats.played },
    { label: "Win %", value: stats.win_rate },
    { label: "Streak", value: stats.current_streak },
    { label: "Best streak", value: stats.max_streak },
  ];
  const max = Math.max(1, ...BARS.map((b) => stats.distribution[b.key]));

  return (
    <div>
      <dl className="m-0 grid grid-cols-4 gap-2 text-center">
        {figures.map((f) => (
          <div key={f.label}>
            <dd className="m-0 font-display text-[30px] leading-none font-black tabular-nums">
              {f.value}
            </dd>
            <dt className="mt-1 font-sans text-[10px] tracking-[0.12em] text-ink-soft uppercase">
              {f.label}
            </dt>
          </div>
        ))}
      </dl>
      <div className="mt-4 space-y-1.5" aria-label="Games by guesses used">
        {BARS.map((b) => {
          const n = stats.distribution[b.key];
          return (
            <div key={b.key} className="flex items-center gap-2 font-sans text-[12px]">
              <span className="w-[74px] shrink-0 text-ink-soft">{b.label}</span>
              <span className="h-[18px] flex-1">
                <span
                  className={`flex h-full min-w-[22px] items-center justify-end px-1.5 font-bold text-paper ${b.key === "x" ? "bg-ink-faint" : "bg-ink"}`}
                  style={{ width: `${(n / max) * 100}%` }}
                >
                  {n}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 mb-0 text-[13.5px] text-ink-soft italic">
        Average score {stats.average_score.toLocaleString("en-US")}. Streaks count daily editions
        finished on their own day, solved or not. Best winning run:{" "}
        {stats.best_win_streak.toLocaleString("en-US")}.
      </p>
    </div>
  );
}
