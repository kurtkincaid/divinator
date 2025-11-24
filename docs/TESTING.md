# Testing

Divinator uses Jest for unit tests.

## Run tests

```powershell
npm test
```

Watch mode:

```powershell
npm run test:watch
```

Coverage:

```powershell
npm run test:coverage
```

## What to test

- Happy paths for each exported function
- Error modes (invalid inputs, thresholds)
- Edge cases (empty arrays -> throw, zero stddev, small sample sizes)
- Statistical sanity checks on small reference datasets
- Performance sanity: micro-bench time budget for hot functions

## Adding new tests

- Use descriptive test names; prefer table-driven tests for variations
- Keep tests deterministic (seeded or fixed data) unless explicitly testing randomness
