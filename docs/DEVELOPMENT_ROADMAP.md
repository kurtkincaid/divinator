# Divinator Development Roadmap

Last updated: 2025-08-29

This is a pragmatic, living roadmap to keep Divinator stable and useful while growing capabilities.

- Status: actively maintained
- Target runtimes: Node.js LTS (v18, v20+)
- Packaging: CJS today; ESM support planned

## Near-term goals (0–1 month)

- Stabilize public API and docs
  - Freeze current function names and argument shapes
  - Document contracts (inputs/outputs, errors, edge cases) in docs/API_REFERENCE.md
- Tighten tests
  - Add coverage for error branches and statistical edge cases (zero stddev, small n, heavy tails)
  - Keep CI green on Windows, macOS, Linux
- Performance guardrails
  - Add simple micro-bench for hot paths (IQR sort, zscore, modifiedZscore, LOF inner loops)
- Documentation reorg
  - This roadmap, Getting Started, API Reference, Architecture, Contributing, Code of Conduct, Security Policy

## Mid-term goals (1–3 months)

- API consistency and ergonomics
  - Options objects over positional params; sensible defaults
  - Consistent return shapes for all detectors
  - Input validation messages standardized
- Internals modularization (without breaking exports)
  - src/anomaly/* (iqr, zscore, mod z, grubbs, lof)
  - src/stats/* (tests, distributions, summary)
  - src/cluster/* (dbscan, optics, kmeans)
  - src/utils/* (math, validation, random)
- Types and editors
  - Publish TypeScript .d.ts typings
  - JSDoc improvements to power IntelliSense
- Benchmarks and profiling
  - Add benchmark.js suite and document repeatable methodology

## Longer-term goals (3–6 months)

- ESM dual-build + tree-shakable structure
- Streaming/online variants for detectors (sliding windows, incremental stats)
- Advanced features
  - Ensemble anomaly score with weights and confidence
  - Multivariate detectors (Mahalanobis, PCA based)
- Visualization helpers (optional)
  - Simple JSON specs that downstream apps can render to charts

## Quality and governance

- Test coverage target: ≥ 85% lines, ≥ 80% branches
- Security: dependency audits via npm audit + GitHub Advisories
- Versioning: SemVer; document breaking changes clearly
- CI: GitHub Actions matrix for Node 18/20 on win/mac/linux

## Risks and mitigations

- API churn: mitigate with deprecation notices and codemods where feasible
- Performance regressions: bench on PRs and flag >10% slowdowns
- Statistical correctness: cross-check with small reference datasets, cite formulas in code comments

## Milestones

1. 3.2.x line – docs, tests, minor fixes only
2. 3.3.0 – typings, options objects supported (backward compatible)
3. 3.4.0 – modular internal layout, keep index.js exports stable
4. 4.0.0 – ESM dual-build, breaking changes announced well in advance

## How we work

- Keep PRs small and focused; add/adjust tests alongside code
- Prefer clarity over micro-optimizations unless measured hot paths
- Document algorithm sources and assumptions inline

This roadmap evolves—update it as priorities shift and feedback arrives.
