import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { NoEdition } from "@/components/paper/no-edition";
import { PaperSkeleton } from "@/components/paper/skeleton";
import { PlayClient } from "@/components/play/play-client";
import { PlayGate } from "@/components/play/play-gate";
import { GUEST_CHOICE_COOKIE, isRecentGuestChoice } from "@/lib/auth/guest-choice";
import { getViewer } from "@/lib/auth/viewer";
import { getCurrentEdition, getMyPlay } from "@/lib/game/data";

export const metadata: Metadata = { title: "Today's edition" };

export default function PlayPage() {
  return (
    <Suspense fallback={<PaperSkeleton />}>
      <Edition />
    </Suspense>
  );
}

async function Edition() {
  // The edition is cached and shared; the player's own state is per request.
  const current = await getCurrentEdition();
  if (!current) return <NoEdition />;
  const [initial, viewer, cookieStore] = await Promise.all([
    getMyPlay(current.payload.edition.id),
    getViewer(),
    cookies(),
  ]);
  // No account yet (no session, or an anonymous guest) and they haven't
  // chosen to play as a guest today: ask before they start reading.
  const showGate =
    (!viewer || viewer.isGuest) &&
    !isRecentGuestChoice(cookieStore.get(GUEST_CHOICE_COOKIE)?.value);
  return (
    <>
      <PlayClient
        edition={current.payload}
        isToday={current.isToday}
        initial={initial}
        isGuest={!viewer || viewer.isGuest}
      />
      {showGate && <PlayGate />}
    </>
  );
}
