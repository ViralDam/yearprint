# Contributing to Yearprint

Thanks for taking a look. Bug reports, ideas and pull requests are all welcome.

## Before you start

- **For anything bigger than a small fix, open an issue first** so we can agree on the approach before you spend time on it.
- **Editions aren't in this repo.** Please don't open issues or PRs with edition content, answers or hints about upcoming papers, including spoilers for today's paper.
- **Security problems go through [SECURITY.md](SECURITY.md)**, not public issues.

## Development

Follow "Running it yourself" in the [README](README.md) to get a local site against your own Supabase project.

Before you open a pull request, run:

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
```

CI runs the same checks on every pull request.

- **Schema changes:** add a new file under `supabase/migrations/`. Don't edit an existing migration. Regenerate `src/lib/supabase/database.types.ts` with `pnpm db:types`, and cover new game functions in `supabase/tests/`.
- **Game rules:** `src/lib/game/rules.ts` mirrors the scoring in the SQL functions. Change both together and keep the unit tests passing.
- **Keep the server authoritative.** The client must never receive the answer, the reveal notes or an unpaid section before the game ends.

## Licence

By contributing, you agree that your contributions are licensed under the [AGPL-3.0](LICENSE), the same licence as the project.
