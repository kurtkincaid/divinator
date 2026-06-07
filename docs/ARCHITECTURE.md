# Architecture

Divinator is currently a single-file CommonJS module (`index.js`) exporting a broad set of functions. We are incrementally moving toward a modular layout without breaking the public API.

## Current state

- Single export surface via `index.js`
- Implementations grouped by topic: anomaly detection, control-chart rules, normality tests, clustering, distributions, utilities
- First modular refactor in progress: `src/utils.js`, `src/cluster-utils.js`, and `src/cluster.js` now house shared math, validation, and clustering helper logic
- Jest test suite in `tests/divinator.test.js`

## Target structure (non-breaking)

```text
src/
  anomaly/           # iqr, zscore, modifiedZscore, grubbs, lof, all
  charts/            # Zone, rules, patterns, collapse
  stats/             # tests (shapiro, ks, jb, anderson, lilliefors), summary utils
  cluster/           # dbscan, optics, kmeans
  dist/              # poisson, factorial, pdf/cdf helpers
  utils/             # validate, math constants, rng, helpers
index.js             # stable export surface
```

`index.js` will re-export from internal modules to keep the public API stable.

## Error handling philosophy

- Validate early; provide concise, actionable messages.
- Avoid throwing on statistically valid corner cases (e.g., stddev=0 -> empty outliers).

## Performance

- Avoid unnecessary allocations in hot loops (sorting once, map/reduce carefully)
- Prefer plain arrays and numeric operations
- Benchmarks: see `npm run benchmark` target and docs/PERFORMANCE.md when available

## Precision and randomness

- BigNumber used for specific high-precision math (constants, factorial)
- crypto RNG for secure randomness; Box-Muller for normal draws
