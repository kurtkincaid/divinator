# API Reference

This reference summarizes the public API. For each function, we include a short contract: inputs, outputs, error modes, and notes.

Note: All APIs are CommonJS exports from `index.js`. Unless noted, inputs are arrays of numbers and functions return arrays of outlier values.

## Version and constants

- version: string
- PI: BigNumber – high precision pi
- E: BigNumber – high precision e

## Outlier detection

- iqr(data: number[], multiplier=1.5): number[]
  - Returns values outside [Q1 - k*IQR, Q3 + k*IQR].
  - Errors: empty or invalid array.
  - Notes: sorts data; multiplier coerced to 1.5 if invalid.
- zscore(data: number[], threshold=3): number[]
  - Returns values with |(x-mean)/std| > threshold.
  - Errors: invalid threshold; empty/invalid array.
  - Edge: std=0 -> returns [].
- modifiedZscore(data: number[], threshold=3.5): number[]
  - |0.6745*(x-median)/MAD| > threshold.
  - Errors: invalid threshold; empty/invalid array.
- grubbsTest(data: number[]): number[]
  - Iteratively removes extremes based on critical value.
  - Errors: invalid array.
- localOutlierFactor(data: number[]|number[][], k=3, threshold=1.5): number[]|number[][]
  - LOF > threshold considered outlier. 1D auto-promoted to 2D and demoted on return.

- all(data: number[], opts?): number[]
  - opts: { iqr=1.5, zscore=3, modifiedZscore=3.5 }
  - Returns values flagged by all three detectors.

## IsolationForest (Functional API)

Isolation Forest is an unsupervised anomaly detection algorithm that isolates outliers by randomly partitioning the feature space. This implementation follows Liu et al. (2008) with optional Extended Isolation Forest support (Hariri et al., 2019).

### IsolationForest.train(X, options)

Builds an isolation forest from training data.

**Parameters:**
- `X` (Array<Array<number>>): Training data matrix [n_samples × n_features]
- `options` (Object, optional):
  - `nTrees` (number, default: 100): Number of isolation trees
  - `sampleSize` (number, default: 256): Subsample size per tree
  - `maxDepth` (number, default: ceil(log2(sampleSize))): Maximum tree depth
  - `method` (string, default: 'axis'): Split method - 'axis' or 'extended'
  - `extensionLevel` (number, default: null): Features per hyperplane (Extended mode)
  - `seed` (number, default: null): Random seed for reproducibility
  - `contamination` (number, default: null): Expected anomaly proportion [0, 0.5]

**Returns:** Model object

**Example:**
```javascript
const divinator = require('divinator');
const IsolationForest = divinator.IsolationForest;

// Classic mode
const X = [[1, 2], [3, 4], [5, 6], [100, 100]];
const model = IsolationForest.train(X, { seed: 42, nTrees: 100 });

// Extended mode with contamination threshold
const modelExtended = IsolationForest.train(X, {
    method: 'extended',
    seed: 42,
    contamination: 0.1
});
```

### IsolationForest.score(model, X)

Computes anomaly scores for data points.

**Parameters:**
- `model` (Object): Trained model from `train()`
- `X` (Array<Array<number>> | Array<number>): Data to score

**Returns:** Array<number> or number - Anomaly scores in [0, 1]; higher = more anomalous

**Example:**
```javascript
const scores = IsolationForest.score(model, [[2, 3], [100, 100]]);
console.log(scores); // [0.12, 0.89] - second point is anomaly
```

### IsolationForest.predict(model, X, options)

Classifies points as normal (1) or anomaly (-1).

**Parameters:**
- `model` (Object): Trained model
- `X` (Array<Array<number>> | Array<number>): Data to classify
- `options` (Object, optional):
  - `threshold` (number): Score threshold; >= threshold is anomaly

**Returns:** Array<number> or number - Labels: 1 (normal), -1 (anomaly)

**Example:**
```javascript
const predictions = IsolationForest.predict(model, [[2, 3], [100, 100]]);
console.log(predictions); // [1, -1]
```

### IsolationForest.pathLengths(model, X)

Diagnostic: returns average path lengths (lower = more anomalous).

**Parameters:**
- `model` (Object): Trained model
- `X` (Array<Array<number>> | Array<number>): Data to analyze

**Returns:** Array<number> or number - Average path lengths across trees

### IsolationForest.serialize(model) / IsolationForest.deserialize(json)

Save and restore models.

**Example:**
```javascript
const json = IsolationForest.serialize(model);
fs.writeFileSync('model.json', json);

const restoredModel = IsolationForest.deserialize(fs.readFileSync('model.json', 'utf8'));
```

---

## Legacy API (Deprecated)

### _IsolationForest (Class)

**Note:** This class-based implementation contains algorithmic deviations from the Liu et al. (2008) specification and will be removed in a future version. Use the functional `IsolationForest` API instead.

```javascript
// Legacy usage (not recommended)
const forest = new divinator._IsolationForest(numTrees, heightLimit);
forest.fit(data);
const score = forest.anomalyScore(point);
```

**Issues:**
- Incorrect normalization factor
- Missing path length adjustment for external nodes
- Sampling with replacement
- Non-deterministic (no seeding)

**Migration Guide:**

Old (deprecated):
```javascript
const divinator = require('divinator');
const forest = new divinator.IsolationForest(100, 10);
forest.fit(trainingData);
const score = forest.anomalyScore(testPoint);
```

New (recommended):
```javascript
const divinator = require('divinator');
const IsolationForest = divinator.IsolationForest;

const model = IsolationForest.train(trainingData, {
    nTrees: 100,
    seed: 42  // optional, for reproducibility
});
const score = IsolationForest.score(model, testPoint);
```

**Key Differences:**
1. **Functional vs Class-Based:** No `new` keyword; use `train()` instead of constructor + `fit()`
2. **Model as Data:** `train()` returns a plain object (model), not a class instance
3. **Determinism:** New API supports seeding for reproducible results
4. **Batch Operations:** `score()` and `predict()` accept arrays of points
5. **Correct Algorithm:** New implementation follows Liu et al. (2008) specification exactly
6. **Extended Mode:** Optional hyperplane-based splits for high-dimensional data

---

## Control charts and patterns

- Zone(data: number[]): Zone
  - which(x): 'A'|'B'|'C'|'X'
  - zones: 3 bands at 1σ, 2σ, 3σ around mean.
- patterns(data: number[]|{data:number[]}, collapse=false)
  - Returns stats summary and pattern hits (alpha..hotel), Poisson map, outliers.
- collapse(p: object): object
  - Collapses arrays of indices into consecutive sequences.
- probability, discrete, rules: constants for σ probabilities and rule text.

## Stats and tests

- shapiroWilk(data: number[], alpha=0.05): { testStatistic: number, pValue: number }
- kolmogorovSmirnov(data: number[]): { testStatistic: number, criticalValues: {alpha05:number,alpha10:number,alpha01:number} }
- jarqueBera(data: number[]): { testStatistic: number, pValue: number }
- andersonDarling(data: number[]): { testStatistic: number, pValues: { '0.1': boolean, '0.05': boolean, '0.01': boolean } }
- andersonDarling2(data: number[]): { testStatistic: number, significanceLevel: Record<string, boolean> }
- lilliefors(data: number[]): { testStatistic: number, criticalValues: Record<string, number> }

## Clustering

- dbscan(dataset: number[][], eps=2, minPts=2): { clusters: number[][], noise: number[] }
- optics(dataset: number[][], eps=2, minPts=2): { clusters: number[][], noise: number[] }
- kMeans(dataset: number[][], k=3, maxIterations=100): { centroids: number[][], clusters: number[][][] }

## Distributions and utilities

- poisson(x:number, mean:number, exp?:number): { lte, lt, eq, gt, gte, ne }
- poissonPdf(x:number, mean:number): BigNumber
- poissonCdf(x:number, mean:number): BigNumber
- factorial(z:number|string|BigNumber): BigNumber

- xbar(arr:number[], { size=5, front=false, d=10 }): number[]
- xbar2(arr:number[], { size=5, front=false, d=10 }): number[]

- sequenceAnalysis(arr:any[], clusterSize=4, threshold?): { sequences, partials, threshold, strictDuplicates }
- partialMatches(clusters:string[], threshold=0.75): Record<string, Record<string, {count:number, coeff:number}>>

- generateNormalData(mean=0, stdDev=1, quantity=20): number[]
- generateEvenData(mean=0, range=20, quantity=20): number[]
- getSecureRandomValue(): number

## Error messages

- "Please pass an array of numbers." – when input is not an array
- "Data array cannot be empty." – empty arrays
- "Data included something other than numbers…" – non-numeric content
- Threshold/multiplier errors – when passed value cannot be parsed to finite number

## Versioning

Divinator follows SemVer. New functionality in minor versions, breaking changes only in major versions.
