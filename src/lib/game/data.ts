import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { EditionPayload, PlayerStats, PlayerStreak, PlayState } from "./types";

/**
 * Today's edition (midnight-UTC rollover), or a past one by number. Public
 * and identical for everyone, so it's cached. Expect up to a few minutes of
 * staleness right after midnight UTC.
 * Returns null when there is no live edition.
 */
export async function getEdition(editionNo?: number): Promise<EditionPayload | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("edition", `edition:${editionNo ?? "today"}`);

  const { data, error } = await createPublicClient().rpc("get_edition", {
    p_edition_no: editionNo,
  });
  if (error) throw new Error(`get_edition failed: ${error.message}`);
  return data as unknown as EditionPayload | null;
}

export interface CurrentEdition {
  payload: EditionPayload;
  /** False when no edition is dated today and this is the newest past one. */
  isToday: boolean;
}

/**
 * The edition the site should show: today's, or — when none is dated today —
 * the newest live one, so the stands are never empty. A past edition can
 * still be played, but its plays are unranked.
 */
export async function getCurrentEdition(): Promise<CurrentEdition | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("edition", "edition:current");

  const today = await getEdition();
  if (today) return { payload: today, isToday: true };

  // RLS only exposes live editions, so the newest row here is the latest live one.
  const { data, error } = await createPublicClient()
    .from("editions")
    .select("edition_no")
    .order("publish_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`latest edition lookup failed: ${error.message}`);
  if (!data) return null;

  const latest = await getEdition(data.edition_no);
  return latest ? { payload: latest, isToday: false } : null;
}

/** The caller's stats, or null for visitors without a session. */
export async function getMyStats(): Promise<PlayerStats | null> {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;
  const { data, error } = await supabase.rpc("get_my_stats");
  if (error) throw new Error(`get_my_stats failed: ${error.message}`);
  return data as unknown as PlayerStats;
}

/** The caller's streak (accounts and guests), or null for visitors without a session. */
export async function getMyStreak(): Promise<PlayerStreak | null> {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;
  const { data, error } = await supabase.rpc("get_my_streak");
  if (error) throw new Error(`get_my_streak failed: ${error.message}`);
  return data as unknown as PlayerStreak;
}

/**
 * The signed-in (or guest) player's state for an edition, or null when they
 * have no session or haven't started. Always read at request time (it changes
 * with every unfold and guess), so call it from inside a <Suspense> boundary.
 */
export async function getMyPlay(editionId: string): Promise<PlayState | null> {
  // Opt out of prerendering/prefetching explicitly: cookies alone can be
  // prefetched, and the Supabase client reads the clock.
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;

  const { data, error } = await supabase.rpc("get_play", { p_edition_id: editionId });
  if (error) throw new Error(`get_play failed: ${error.message}`);
  return data as unknown as PlayState | null;
}
