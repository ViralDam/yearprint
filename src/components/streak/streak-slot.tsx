import { getViewer } from "@/lib/auth/viewer";
import { getMyStreak } from "@/lib/game/data";
import { StreakBadge } from "./streak-badge";

/**
 * Server half of the header badge: the streak as of this request. Rendered
 * even without a session, so a first-time guest's badge can appear as soon
 * as their game finishes. A failed lookup just hides the badge.
 */
export async function StreakSlot() {
  const [viewer, streak] = await Promise.all([getViewer(), getMyStreak().catch(() => null)]);
  return <StreakBadge initial={streak} isGuest={!viewer || viewer.isGuest} />;
}
