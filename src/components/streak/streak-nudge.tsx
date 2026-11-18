import Link from "next/link";
import { getMyStreak } from "@/lib/game/data";
import { Flame } from "./flame";

/** "Your run is waiting" on the landing page, while today's edition is unplayed. */
export async function StreakNudge() {
  const streak = await getMyStreak().catch(() => null);
  if (!streak || !streak.today_open || streak.current === 0) return null;
  return (
    <div className="mx-auto mt-5 flex max-w-[560px] items-center justify-center gap-2 rounded border-t-[3px] border-gold bg-hud px-4 py-2.5 font-sans text-[14.5px] text-hud-ink">
      <Flame className="text-gold" />
      <span>
        Your {streak.current}-day run is waiting on today&apos;s edition.{" "}
        <Link href="/play" className="font-extrabold whitespace-nowrap text-gold">
          Play →
        </Link>
      </span>
    </div>
  );
}
