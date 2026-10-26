# Contributing

Thanks for your interest. Issues and pull requests are welcome, in English or Spanish.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- New themes and layouts are welcome. Include a rendered PNG in the pull request.

## Development setup

```bash
npm ci
npm run build
node dist/bin.js vercel/satori --offline   # render something
```

## Checks

All of these must pass before a pull request is merged (CI runs them too):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tests never call GitHub. To add a scenario, record the API responses into `test/fixtures/<name>/` (`repo.json`, `languages.json`, `contributors.json`, `commit_activity.json`, `release.json`) with `gh api` and use `recordedFetch`.

## Pull requests

- One logical change per pull request.
- Add or update tests for every behavior change.
- Update both READMEs if you change user-facing behavior.
- Use [Conventional Commits](https://www.conventionalcommits.org/) in English, for example `feat: add retro theme` or `fix: wrap long topics in the footer`.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
