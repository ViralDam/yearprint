import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  id: string;
  /** Anonymous Supabase user: plays, but has no profile and never ranks. */
  isGuest: boolean;
  email: string | null;
  displayName: string | null;
}

/**
 * Who is looking at the page, or null with no session at all. Request-time
 * only, so render callers inside a <Suspense> boundary.
 */
export async function getViewer(): Promise<Viewer | null> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const isGuest = claims.is_anonymous === true;
  let displayName: string | null = null;
  if (!isGuest) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", claims.sub)
      .maybeSingle();
    displayName = profile?.display_name ?? null;
  }
  return {
    id: claims.sub,
    isGuest,
    email: typeof claims.email === "string" && claims.email ? claims.email : null,
    displayName,
  };
}
