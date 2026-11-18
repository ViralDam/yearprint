import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated cookies to both the server render and the browser.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured && process.env.NODE_ENV !== "production") {
    // Lets the app boot locally before .env.local exists.
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Must run before anything else touches the response: it triggers the
  // token refresh whose cookies setAll() writes above.
  await supabase.auth.getClaims();

  return response;
}
