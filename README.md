# Yearprint

One paper. No date. Name its year.

Yearprint is a daily newspaper guessing game. Every day at 00:00 UTC a new edition goes live with its date torn off. You read the front page for free, spend points to unfold the inside sections, and get three guesses between 1960 and 2020. When the game ends, every section unfolds and every story shows the real history behind it.

This repository holds the site, the database schema and the game logic. The editions themselves (stories, photos and answers) are written and published separately and aren't part of this repo, so reading the code won't tell you tomorrow's year.

## How it works

- **The server decides everything.** Scoring, guesses and unfolds run in Postgres functions (`supabase/migrations`). The browser never receives the answer, the "why" notes or a section you haven't paid for until the game ends.
- **Row-level security** lets anonymous visitors read only editions that are published and dated today or earlier, and only their front pages. Answers sit in a table that clients can't read at all.
- **Edition photos** are served from a public storage bucket that can't be listed, under content-hash names, so you can't guess an image before you've unfolded it.
- **Accounts are optional.** Guests play with Supabase anonymous sign-in, and their game carries over when they sign up. Ranking on the daily leaderboard needs an account.

## Stack

- Next.js 16 (App Router, Cache Components, `src/proxy.ts` for session refresh)
- Tailwind CSS v4: design tokens live in `src/app/globals.css`
- Supabase: auth, Postgres, storage. The CLI is a dev dependency (`pnpm exec supabase`)
- pnpm and Node LTS

## Running it yourself

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a Supabase project, then copy the env template and fill in the URL and the **publishable** key:

   ```bash
   cp .env.example .env.local
   ```

3. Log the CLI in, link your project and apply the schema:

   ```bash
   pnpm exec supabase login
   ```

   ```bash
   pnpm db:link
   ```

   ```bash
   pnpm db:push
   ```

4. Run the dev server at http://localhost:3000:

   ```bash
   pnpm dev
   ```

A fresh database has no editions, so the site shows its "No edition on the stands" page. To play, add an edition of your own. The tables are `editions`, `sections`, `items`, `item_reveals` and `edition_answers` (see `supabase/migrations/20261110000000_game_schema.sql`), and `supabase/tests/game_functions.sql` shows a minimal set of fixtures.

## Scripts

| Script                         | What it does                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `pnpm dev` / `build` / `start` | Next.js                                                                         |
| `pnpm lint` / `typecheck`      | ESLint, TypeScript                                                              |
| `pnpm format` / `format:check` | Prettier (with Tailwind class sorting)                                          |
| `pnpm test`                    | Unit tests (Vitest) for the game rules                                          |
| `pnpm test:e2e`                | Playwright end-to-end tests (plays today's edition as a guest on the project)   |
| `pnpm db:link`                 | Link a hosted Supabase project                                                  |
| `pnpm db:push`                 | Apply `supabase/migrations` to the linked project                               |
| `pnpm db:types`                | Regenerate `src/lib/supabase/database.types.ts`                                 |
| `pnpm db:test`                 | Database tests on the linked project, each in a transaction that is rolled back |

## Supabase clients

- `@/lib/supabase/client`: Client Components
- `@/lib/supabase/server`: Server Components, Server Actions, Route Handlers. It reads cookies, so with Cache Components it must render inside `<Suspense>`.
- `src/proxy.ts`: refreshes the auth session on every request. It no-ops in development until `.env.local` exists.

## Continuous integration

| Workflow            | When                                        | What it does                                                       |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| **CI** (`ci.yml`)   | Every pull request and every push to `main` | Lint, format check, typecheck, unit tests, then a production build |
| **E2E** (`e2e.yml`) | By hand (Actions → E2E → Run workflow)      | The Playwright suite against the live project                      |

The build needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as repository **variables**. Both are public values. Without them (for example on pull requests from forks) CI skips the build step with a warning.

Set `NEXT_PUBLIC_SITE_URL` to the public domain. Share images, the sitemap and `robots.txt` use it for absolute links. On Netlify it falls back to the site's `URL`.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). If you find a way to read an answer or an unpaid section before the game ends, please report it privately as described in [SECURITY.md](SECURITY.md) instead of opening an issue.

## License

[GNU Affero General Public License v3.0](LICENSE). If you run a modified version of Yearprint as a public service, you must make your source code available to its users under the same licence.
