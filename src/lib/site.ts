/**
 * The site's public origin, for absolute URLs in metadata, the sitemap and
 * share images. Set NEXT_PUBLIC_SITE_URL to the real domain; Netlify also
 * provides URL at build time.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Yearprint";
export const SITE_DESCRIPTION =
  "One paper. No date. Name its year. A daily newspaper guessing game: read the front page, unfold the inside sections, and pin the year in three guesses.";
