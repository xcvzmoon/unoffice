# AGENTS

## Stack

- Single-package Bun repo. Use `bun` for install and scripts; `packageManager` is `bun@1.3.13`.
- Runtime is Nitro with `preset: 'bun'` and `serverDir: './server'` in `nitro.config.ts`.
- CI also installs Node from `.nvmrc` (`24`), so use Node 24 if you need a Node runtime outside Bun.

## Verify

- Main local checks match CI and pre-commit: `bun run fmt`, `bun run lint`, `bun run build`.
- There is no `test` script today. `bun run lint` is the closest thing to a typecheck because `oxlint` runs with `typeAware: true` and `typeCheck: true`.
- Pre-commit only runs `bun run fmt` then `bun run lint`; build failures are only caught if you run `bun run build` yourself or in CI.

## Layout

- Main server code lives under `server/`; Nitro route handlers live in `server/routes/**`.
- Current API entrypoint is `server/routes/api/index.ts`.
- `~/*` resolves from the repo root via `tsconfig.json`, so imports like `~/package.json` are intentional.

## Style Gotchas

- Formatting is controlled by `oxfmt.config.ts`: single quotes, no extra blank lines between import groups, and `package.json` key order is not auto-sorted.
- Linting is unusually strict. Easy misses from `oxlint.config.ts`: no `console` except `console.error`, no barrel files, no `async` endpoint handlers, and many array helpers are banned (`forEach`, `reduce`, `sort`, `reverse`).

## Generated And Local Files

- Do not hand-edit Nitro build output under `.output/`; regenerate it with `bun run build`.
- Local env files are ignored. Only verified example variable is `PORT` in `.env.example`.

## Editing Guidance

- Make the smallest correct change; do not expand work into repo-wide refactors.
- Read the touched file and nearby tests before editing.
- Prefer direct code in the existing style over new abstractions or dependencies.
- Do not switch naming or type style arbitrarily within the same file.
- Do not remove correct comments or documentation.
- For production-sensitive code, prefer reliability over clever abstractions.

## LLMS Links

- Nitro V3: https://nitro.build/llms.txt
- H3 V2: https://h3.dev/llms.txt
- Bun: https://bun.sh/llms.txt
- Effect: https://effect.website/llms.txt
