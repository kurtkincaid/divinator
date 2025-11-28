# Tasks and Enhancements

This is the working backlog for Divinator. Check off items as they are completed; add new items as needed.

## High priority

- [ ] Version sync: update package.json to match exported version (currently index.js exports 3.2.0)
- [ ] API docs parity: ensure every export in index.js is documented in API_REFERENCE.md
- [ ] Add TypeScript typings (.d.ts) for public API
- [ ] Expand tests for: LOF, Grubbs, patterns() branches, lilliefors simulation bounds
- [ ] Benchmark harness: isolate IQR sort, LOF inner loop, kMeans iteration
- [ ] Validate Node 18/20 on Windows/macOS/Linux in CI

## Medium priority

- [ ] Options-object overloads for iqr/zscore/modifiedZscore (non-breaking)
- [ ] Internal modularization (src/*) while keeping index.js exports stable
- [ ] Add examples snippets to GETTING_STARTED and README for clustering and Poisson
- [ ] Publish coverage badge (once CI pipeline added)
- [ ] Add CONTRIBUTING PR checklist to PR template

## Low priority

- [ ] ESM + CJS dual build (rollup/tsup + preserve CJS default)
- [ ] Streaming/online z-score (incremental mean/std)
- [ ] Ensemble anomaly score (weighted voting + confidence)
- [ ] Mahalanobis distance and PCA-based outlier detection
- [ ] Simple JSON-to-chart spec for common visualizations

## Nice-to-have / ideas

- [ ] Optional WebAssembly kernels for hot math (investigate benefit first)
- [ ] Playground notebooks (Observable/Quarto/Jupyter) with reproducible examples
- [ ] Real-world datasets folder for regression testing

## Housekeeping

- [ ] Lint markdown in docs
- [ ] Ensure LICENSE header consistency in source files
- [ ] Link docs from README and npm package files
