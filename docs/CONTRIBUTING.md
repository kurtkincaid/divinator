# Contributing

Thanks for considering contributing to Divinator!

## Development setup

```powershell
npm install
npm test
```

## Workflow

- Create a small, focused branch off the default branch.
- Add/adjust tests alongside code changes.
- Update docs if behavior changes.
- Submit a PR with a clear description and checkboxes for:
  - [ ] Tests added/updated
  - [ ] Docs updated
  - [ ] Benchmarks considered (if perf-sensitive)

## Code style

- Keep functions small and readable. Prefer clarity over cleverness.
- Use JSDoc for exported functions.
- Error messages should be concise and actionable.

## Commit messages

- Use conventional-ish messages: feat:, fix:, docs:, refactor:, perf:, test:, chore:

## Releasing

- Maintainers follow SemVer. Breaking changes only in major versions and must be well documented.
