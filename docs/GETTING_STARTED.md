# Getting Started

Divinator is a Node.js library for anomaly detection and statistical analysis. This guide shows quick steps to install, run, and validate the library locally.

## Install

```powershell
npm install
npm test
```

To use Divinator in your project:

```powershell
npm install divinator --save
```

## Basic usage

```js
const d = require('divinator');

const data = [1,2,3,4,5,6,7,8,9,100];

console.log('IQR outliers:', d.iqr(data));
console.log('Z-score outliers:', d.zscore(data));
console.log('Modified Z-score outliers:', d.modifiedZscore(data));
console.log('Consensus:', d.all(data));
console.log('Version:', d.version);
```

## Anomaly Detection with Isolation Forest

Detect outliers in your data using the Isolation Forest algorithm:

```javascript
const divinator = require('divinator');
const IsolationForest = divinator.IsolationForest;

// Training data: mostly normal points with a few outliers
const data = [
	[1, 1], [1.5, 1.2], [1.2, 1.3],  // normal cluster
	[10, 10]                          // outlier
];

// Train model
const model = IsolationForest.train(data, {
	nTrees: 100,
	seed: 42,              // for reproducibility
	contamination: 0.1     // expect 10% anomalies
});

// Score new points
const scores = IsolationForest.score(model, [[1.1, 1.1], [9, 9]]);
console.log(scores); // [0.15, 0.85] - second is anomaly

// Classify with labels
const predictions = IsolationForest.predict(model, [[1.1, 1.1], [9, 9]]);
console.log(predictions); // [1, -1] - normal, anomaly
```

### Extended Isolation Forest

For high-dimensional data, use Extended mode:

```javascript
const model = IsolationForest.train(data, {
	method: 'extended',  // random hyperplane splits
	seed: 42
});
```

## Common patterns

- Inputs should be arrays of numbers (number strings are converted); empty arrays throw.
- Z-score/Modified Z-score thresholds must be numeric; invalid values throw.
- IQR multiplier defaults to 1.5 if invalid.
- Many functions return arrays of outlier values rather than indices.

## Next steps

- Browse docs/API_REFERENCE.md for function-by-function details.
- See docs/ARCHITECTURE.md to understand how things are organized.
- Contribute improvements with docs/CONTRIBUTING.md.
