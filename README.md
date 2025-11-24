# Divinator

Robust anomaly detection and statistical toolkit for Node.js: outliers, control-chart rules, normality tests, clustering, Poisson, moving averages, and more.

- Outlier detection: IQR, Z-Score, Modified Z-Score, Grubbs, LOF, consensus via all()
- Outlier detection: IQR, Z-Score, Modified Z-Score, Grubbs, LOF, consensus via all()
- **Isolation Forest**: Industry-standard anomaly detection
	- Classic axis-aligned splits (Liu et al., 2008)
	- Extended Isolation Forest with random hyperplanes (Hariri et al., 2019)
	- Deterministic training via seeding
	- Contamination-based auto-thresholding
	- Model serialization
- Control chart analysis: zone classification and pattern rules
- Normality tests: Shapiro-Wilk, Kolmogorov-Smirnov, Jarque-Bera, Anderson-Darling, Lilliefors (simulated CVs)
- Clustering: DBSCAN, OPTICS, k-means
- Distributions/utilities: Poisson PDF/CDF, sequence analysis, moving averages, constants (π, e)

See full API in docs/API_REFERENCE.md and development roadmap in docs/DEVELOPMENT_ROADMAP.md.

## Install

```powershell
npm install divinator --save
```

## Quick start

```js
const d = require('divinator');

const data = [1,2,3,4,5,6,7,8,9,100];

// Outliers (each returns an array of outlier values)
const iqrOut = d.iqr(data);                 // default multiplier 1.5
const zOut = d.zscore(data, 3);             // default threshold 3
const modZOut = d.modifiedZscore(data, 3.5);// default threshold 3.5

// Consensus: values flagged by all three
const consensus = d.all(data, { iqr: 1.5, zscore: 3, modifiedZscore: 3.5 });

// Control-chart and pattern analysis
const res = d.patterns(data);
console.log(res.mean, res.standardDeviation, res.outliers);

// Normality tests
const sw = d.shapiroWilk(data);
const ks = d.kolmogorovSmirnov(data);
const jb = d.jarqueBera(data);

// Clustering
const points = [[1,1],[1,2],[10,10],[10,11]];
const { clusters, noise } = d.dbscan(points, 2, 2);

// Moving averages
const xbar = d.xbar([1,2,3,4,5,6,7,8,9,10], { size: 5 });

console.log(d.version); // '3.2.0'
```

### A few words of caution

- Outlier algorithms surface candidates; you still need domain context to decide what’s “real”.
- Very small samples yield unreliable signals. Consider 30–40+ values as a loose minimum.

## API overview

This README shows basic usage. For details, inputs/outputs, and notes on error cases, see:

- docs/API_REFERENCE.md – complete function reference
- docs/GETTING_STARTED.md – basic workflows and examples
- docs/ARCHITECTURE.md – structure and design notes

## Contributing

PRs are welcome. Please read docs/CONTRIBUTING.md and docs/CODE_OF_CONDUCT.md. Run tests locally before opening a PR.

## Testing

Jest is used for the test suite.

```powershell
npm test
```

## License

Apache-2.0. See LICENSE.

