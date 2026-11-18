// Public Supabase settings. Both values are safe to expose to the browser;
// row-level security and the game's Postgres functions do the guarding.
// Must be read as literal `process.env.NEXT_PUBLIC_*` so Next inlines them.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export function supabaseEnv() {
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local for local dev, or in your " +
        "host's environment variables (e.g. Netlify) for deploys. They are inlined at " +
        "build time, so redeploy after setting them.",
    );
  }
  return { url, publishableKey };
}
