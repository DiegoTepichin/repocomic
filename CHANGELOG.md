# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-26

First public release.

### Added

- `repocomic <owner/repo | URL>` writes a comic-book poster (1080 × 1350) or social card (1200 × 630) as PNG or SVG.
- Three themes: `classic`, `noir`, `pop`.
- Panels: masthead, cover with starburst, description bubble, heroes (contributors with avatars), powers (languages), saga (weekly commits), footer.
- `--save-json` / `--from-json` for offline rendering; `--offline` to skip avatars; `GITHUB_TOKEN` / `GH_TOKEN` support.
- Library API: `fetchRepoStats`, `renderPng`, `renderSvg`.
- Bundled Bangers and Comic Neue fonts (SIL OFL 1.1).

[1.0.0]: https://github.com/DiegoTepichin/repocomic/releases/tag/v1.0.0
