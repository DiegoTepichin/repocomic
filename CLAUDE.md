@../briefs/repocomic.md

# repocomic

## What it is

A command-line tool that turns a GitHub repository's activity into a comic-book style poster (PNG or SVG) that people want to share.

## Who it is for

Open source maintainers and developers who want to show off a project on social media or in a README.

## Scope

v1.0 scope and out-of-scope list live in `docs/PLAN.md`. Ideas beyond it go to GitHub issues.

## Code standards

- TypeScript (strict), Node 20+, ESM. Lint and format with Biome. Tests with Vitest. No network calls in tests: use fixtures.
- Small functions, clear names, no dead code, no comments that restate the code.
- Configuration and secrets only through environment variables, documented in `.env.example`.
- Conventional Commits in English, one logical change per commit.
- README and docs describe only what exists and has been run.

## Commands

- `npm ci`: install dependencies.
- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build`: the CI checks.
- `node dist/bin.js <owner/repo> [-t theme] [-f format] [-o file]`: run the built CLI (`GITHUB_TOKEN` optional).
- `npm pack`: check the published file list.

## Structure

- `src/`: `stats.ts` (types), `github.ts` (API client), `themes.ts`, `element.ts` (Satori element helper), `layout.ts` (poster and card), `render.ts` (fonts, avatars, SVG/PNG), `cli.ts` + `bin.ts`, `index.ts` (library API).
- `test/`: Vitest suites; recorded GitHub responses in `test/fixtures/{small,large}/`.
- `assets/fonts/`: bundled OFL fonts and their licences.
- `docs/`: `PLAN.md` and README example images in `docs/examples/`.
