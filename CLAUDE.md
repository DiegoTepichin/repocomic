@../briefs/repocomic.md

# repocomic

## What it is

A command-line tool that turns a GitHub repository's activity into a comic-book style poster (PNG or SVG) that people want to share.

## Who it is for

Open source maintainers and developers who want to show off a project on social media or in a README.

## Scope (v0.1)

To be defined in `docs/PLAN.md` during the planning session.

Anything else is out of scope until v0.1 ships.

## Code standards

- TypeScript (strict), Node 20+, ESM. Lint and format with Biome. Tests with Vitest. No network calls in tests: use fixtures.
- Small functions, clear names, no dead code, no comments that restate the code.
- Configuration and secrets only through environment variables, documented in `.env.example`.
- Conventional Commits in English, one logical change per commit.
- README and docs describe only what exists and has been run.

## Commands

None yet. Add each command here once it exists and has been run.

## Structure

Not defined yet. Decided in `docs/PLAN.md`.
