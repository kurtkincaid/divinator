# Divinator

## Introduction

Anomaly Detection Using Z-Scores, Modified Z-Scores, Interquartile Ranges, and unexpected data patterns.

This module implements anomaly detection (a.k.a. outlier detection or novelty detection) through the use of
the methods mentioned above. Given an array of data (and an optional configuration parameter), the first three functions
will return an array of true/false values, corresponding to the array of data that was passed. Thus, if index item #4
in your data is an outlier, in the resulting array, the item at index #4 will be `true`, otherwise it will be `false`.

Another function, `all()`, passes your data to all three algorithms and the resulting array will contain `true` values
**if and only if** all three algorithms agree that the item is an outlier.

In addition to the methods described above, this module implements another method for finding potential anomalies, based on
unexpected patterns in the data. While the individual points themselves may not be anomalous, there can be patterns
within the data that are statistically unlikely. We find these patterns when the data is implemented as a process
[Control Chart](https://en.wikipedia.org/wiki/Control_chart). Control charts are displayed using "zones," with the following
definitions:

- Zone A - Within 3 standard deviations above or below the mean
- Zone B - Within 2 standard deviations above or below the mean
- Zone C - Within 1 standard deviation above or below the mean

With normal data, 99.7% of the data points should fall within 1 of these 3 zones. There are standard rules for identifying
patterns within this data, in particular the [Western Electric rules](https://en.wikipedia.org/wiki/Western_Electric_rules)
and the [Nelson rules](https://en.wikipedia.org/wiki/Nelson_rules). Internally, I have given a name to each of these rules
using the [NATO phoentic alphabet](https://en.wikipedia.org/wiki/NATO_phonetic_alphabet) and those rules are as follows:

- **alpha**: 1+ points beyond Zone A
- **bravo**: 2 out of 3 consecutive points in Zone A or beyond
- **charlie**: 4 out of 5 consecutive points in Zone B or beyond
- **delta**: 7+ consecutive points on one side of the average
- **echo**: 7+ consecutive points trending up or down
- **foxtrot**: 8+ consecutive points with no points in Zone C
- **golf**: 15+ consecutive points in Zone C
- **hotel**: 14+ consecutive points alternating up and down

The rule names and definitions are available as an object called `divinator.rules`.

## A few words of caution

First, no method or algorithm is going to tell you conclusively that an item or pattern is an anomaly or outlier. Rather, these algorithms
are intended to identify items that are _potentially_ outliers, given the data provided. Further investigation will always be
required to make the final determination. With more data, you may find that what initially appeared to be an anomaly is perfectly normal. To paraphrase Obi-Wan Kenobi, it depends upon your point of view.

Second, the value of anomaly detection breaks down if the data sample is too small. What constitues "too small" is left
as an exercise for the reader. In my experience, I would consider a data sample of less than 30-ish values to not be sufficiently
large to provide meaninful answers. That precise threshold, however, is up to you.

## Links

This document provides only a very brief description of each of the algorithms and is more focused on how to incorporate them
into your code. For more information on the algorithms themselves, I refer you to the following entries.

- [Interquartile Range](https://www.statology.org/how-to-interpret-interquartile-range/)
- [Z-Score](https://www.statology.org/interpret-z-scores/)
- [Modified Z-Score](https://www.statology.org/modified-z-score/)

## Table of Contents

- [Divinator](#divinator)
  - [Introduction](#introduction)
  - [A few words of caution](#a-few-words-of-caution)
  - [Links](#links)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Usage](#usage)
    - [iqr](#iqr)
    - [zscore](#zscore)
    - [modifiedZscore](#modifiedzscore)
    - [all](#all)
    - [version](#version)
    - [patterns](#patterns)
    - [xbar](#xbar)
  - [Input and Feedback](#input-and-feedback)

## Install

```sh
npm --save install divinator
```

## Usage

At the top of your script, load Divinator.

```js
const divinator = require( "divinator" );
```

### iqr

```js
divinator.iqr( <array>, <optional multiplication factor> );
```

The interquartile range (IQR) is used for measuring the degree of dispersion of your data. The IQR specifically
is the 75th percentile (Q3) minus the 25th percentile (Q1). Thus, IQR = Q3 - Q1. The middle 50% of your data
will fall between Q1 and Q3.

For the purpose of anomaly detection, a factor of 1.5 * IQR is used for our threshold, _t_. If a given value is less than
Q1 - _t_ or is greater than Q3 + _t_, that value is a possible anomaly. The default multiplier is 1.5, though a custom
value may be passed as a second parameter to the function.

```js
const divinator = require( "divinator" );

let data = [ 1, 2, 9, ...]; // Presumably a sizeable list of values. See word of caution, above.

let response1 = divinator.iqr( data, 1.75 );

// or to use the default multiplier value...

let response2 = divinator.iqr( data );

// result would look something like [ true, false, false, false, true ...]
```

### zscore

The z-score (also known as Standard Score) is the number of standard deviations above or below the mean for a given
data point in relation to the rest of the sample. Assuming a normal data distribution, ~ 99.7% of your data should
fall within 3 standard deviations of the mean. A value other than 3 may be passed as an optional second paramter.

```js
const divinator = require( "divinator" );

let data = [ 1, 2, 9, ...]; // Presumably a sizeable list of values. See word of caution, above.

let response1 = divinator.zscore( data, 3.1 );

// or to use the default value...

let response2 = divinator.zscore( data );

// result would look something like [ true, false, false, false, true ...]
```

### modifiedZscore

Similar to z-score, but uses Median Absolute Deviation (MAD) and median for its calculations. The default threshold
when using modifiedZscore is 3.5. As with the other functions, a value other than the default may be passed as a second
parameter to the function.

```js
const divinator = require( "divinator" );

let data = [ 1, 2, 9, ...]; // Presumably a sizeable list of values. See word of caution, above.

let response1 = divinator.modifiedZscore( data, 3.3 );

// or to use the default value...

let response2 = divinator.modifiedZscore( data );

// result would look something like [ true, false, false, false, true ...]
```

### all

This utility function will pass your data to all three algorithms and returns a single array of true/false
values. Values will be _true_ only if all three algorithms agree that the data point in question is a possible
outlier. Unlike the individual functions, custom parameters are passed as named entities in an option configuration
object. Any or all of the functions may be included; any functions not referenced in the configuration object will
use the default value.

```js
const divinator = require( "divinator" );

let data = [ 1, 2, 9, ...]; // Presumably a sizeable list of values. See word of caution, above.

let response1 = divinator.all( data, { "iqr": 1.7, "zscore": 3.2, "modifiedZscore": 3.4 } );

// or to use the default values...

let response2 = divinator.all( data );

// result would look something like [ true, false, false, false, true ...]
```

### version

Simply returns the version number of the module.

```js
console.log( divinator.version );
```

### patterns

Identifies patterns within the data that are statistically unlikely.

Example:

```js
const divinator = require( "divinator" );
let data = [
  42, 41, 45, 49, 44, 39, 47, 42, 69, 60, 59, 40, 39, 40, 18, 41, 48, 50, 48, 49, 44, 49, 66, 62,
  66, 43, 47, 43, 42, 45, 59, 61, 68, 45, 41, 42, 42, 37, 56, 61, 56, 44, 39, 63, 64, 62, 87, 38,
  42, 36, 34, 75, 72, 60, 37, 44, 43, 44, 48, 45
]
let patterns = divinator.patterns( data, false );

/*
Returns:

{
  _1sigma: [ 37.40287871208379, 61.330454621249544 ],
  _2sigma: [ 25.439090757500917, 73.29424257583241 ],
  _3sigma: [ 13.475302802918044, 85.25803053041528 ],
  _data: [
    42, 41, 45, 49, 44, 39, 47, 42, 69, 60, 59, 40,
    39, 40, 18, 41, 48, 50, 48, 49, 44, 49, 66, 62,
    66, 43, 47, 43, 42, 45, 59, 61, 68, 45, 41, 42,
    42, 37, 56, 61, 56, 44, 39, 63, 64, 62, 87, 38,
    42, 36, 34, 75, 72, 60, 37, 44, 43, 44, 48, 45
  ],
  _jarqueBera: 6.6957239576932714,
  _kurtosis: 0.8699358351721824,
  _max: 87,
  _mean: 49.36666666666667,
  _median: 45,
  _medianAbsoluteDeviation: 5,
  _min: 18,
  _mode: 42,
  _outliers: {
    zscore: [ 46 ],
    modifiedZscore: [ 14, 46, 51, 52 ],
    iqr: [ 46 ]
  },
  _pValue: 0.0351594454,
  _sampleCorrelation: 0.15340179284129074,
  _sampleCovariance: 32.32203389830509,
  _skewness: 0.6930911241966287,
  _spread: 69,
  _standardDeviation: 11.963787954582875,
  _zScoreMax: 3.1456035058626584,
  _zScoreMin: -2.6218006191468217,
  alpha: [ 46 ],
  bravo: [],
  charlie: [
    [ 42, 43, 44, 45, 46 ],
    [ 43, 44, 45, 46, 47 ],
    [ 48, 49, 50, 51, 52 ],
    [ 49, 50, 51, 52, 53 ],
    [ 50, 51, 52, 53, 54 ]
  ],
  delta: [
    [
      0, 1, 2, 3,
      4, 5, 6
    ],
    [
      1, 2, 3, 4,
      5, 6, 7
    ]
  ],
  echo: [],
  foxtrot: [],
  golf: [],
  hotel: []
}
*/
```

In the above output, we can see that point #46 fails the "alpha" test, which is any point beyond Zone A (that is, any point that is more than 3 standard deviations from the mean), there were no violations of the "bravo" rule, and there were several runs of 5 consecutive points that violated the "charlie" rule. You will notice that in this particular case, those strings of 5 points overlap. If you want any test violations that overlap to be collapsed into as few contiguous arrays as possible, you can pass `true` as the 2nd argument to the `patterns()` function, producing the following results when using the same data as above. Note that both "charlie" and "delta" have been collapsed.

```js
const divinator = require( "divinator" );
let data = [
  42, 41, 45, 49, 44, 39, 47, 42, 69, 60, 59, 40, 39, 40, 18, 41, 48, 50, 48, 49, 44, 49, 66, 62,
  66, 43, 47, 43, 42, 45, 59, 61, 68, 45, 41, 42, 42, 37, 56, 61, 56, 44, 39, 63, 64, 62, 87, 38,
  42, 36, 34, 75, 72, 60, 37, 44, 43, 44, 48, 45
]
let patterns = divinator.patterns( data, true );
/*
Returns:

{
  _1sigma: [ 37.40287871208379, 61.330454621249544 ],
  _2sigma: [ 25.439090757500917, 73.29424257583241 ],
  _3sigma: [ 13.475302802918044, 85.25803053041528 ],
  _data: [
    42, 41, 45, 49, 44, 39, 47, 42, 69, 60, 59, 40,
    39, 40, 18, 41, 48, 50, 48, 49, 44, 49, 66, 62,
    66, 43, 47, 43, 42, 45, 59, 61, 68, 45, 41, 42,
    42, 37, 56, 61, 56, 44, 39, 63, 64, 62, 87, 38,
    42, 36, 34, 75, 72, 60, 37, 44, 43, 44, 48, 45
  ],
  _jarqueBera: 6.6957239576932714,
  _kurtosis: 0.8699358351721824,
  _max: 87,
  _mean: 49.36666666666667,
  _median: 45,
  _medianAbsoluteDeviation: 5,
  _min: 18,
  _mode: 42,
  _outliers: { 
    zscore: [ 46 ],
    modifiedZscore: [ 14, 46, 51, 52 ],
    iqr: [ 46 ]
  },
  _pValue: 0.0351594454,
  _sampleCorrelation: 0.15340179284129074,
  _sampleCovariance: 32.32203389830509,
  _skewness: 0.6930911241966287,
  _spread: 69,
  _standardDeviation: 11.963787954582875,
  _zScoreMax: 3.1456035058626584,
  _zScoreMin: -2.6218006191468217,
  alpha: [ [ 46 ] ],
  bravo: [],
  charlie: [
    [
      42, 43, 44, 45, 46, 47,
      48, 49, 50, 51, 52, 53,
      54
    ]
  ],
  delta: [
    [
      0, 1, 2, 3,
      4, 5, 6, 7
    ]
  ],
  echo: [],
  foxtrot: [],
  golf: [],
  hotel: []
}
*/
```

**NOTE:** The default value for the 2nd parameter to the `patterns()` function is `false`. If this is the desired behavior, the 2nd parameter may be omitted.

### xbar

When your does not conform to a normal distribution, this function takes the data and breaks it into chunks of a specified number of members (default is 5), averages the values in each chunk, and returns an array of those averages. This technique is often used to take non-normal data and make it more normal.

Example:

```js
const divinator = require( "divinator" );
let data = [
  42, 41, 45, 49, 44, 39, 47, 42, 69, 60, 59, 40, 39, 40, 18, 41, 48, 50, 48, 49, 44, 49, 66, 62,
  66, 43, 47, 43, 42, 45, 59, 61, 68, 45, 41, 42, 42, 37, 56, 61, 56, 44, 39, 63, 64, 62, 87, 38,
  42, 36, 34, 75, 72, 60, 37, 44, 43, 44, 48, 45
];
let chunks = divinator.xbar( data, { "size": 3 } );
/*
Returns:

[
  42.6666666667,            44,
  52.6666666667,            53,
  32.3333333333, 46.3333333333,
             47,            59,
             52, 43.3333333333,
  62.6666666667, 42.6666666667,
             45, 53.6666666667,
  55.3333333333, 62.3333333333,
  37.3333333333,            69,
  41.3333333333, 45.6666666667
]
*/
```

This method requires that all chunks are of the same size. If the chunks would not be the same size, elements from the front or the back of the array are dropped until the chunks are of the same size. By default, they are dropped from the back of the array. This behavior can be modified by adding another property to the 2nd parameter passed to the function.

Example:

```js
const divinator = require( "divinator" );
let data = [
  42, 41, 45, 49, 44, 39, 47, 42, 69, 60, 59, 40, 39, 40, 18, 41, 48, 50, 48, 49, 44, 49, 66, 62,
  66, 43, 47, 43, 42, 45, 59, 61, 68, 45, 41, 42, 42, 37, 56, 61, 56, 44, 39, 63, 64, 62, 87, 38,
  42, 36, 34, 75, 72, 60, 37, 44, 43, 44, 48, 45
];
let chunks = divinator.xbar( data, { "size": 7, "front": true } );
/*
Returns:

[
  43.8571428571,
  49.8571428571,
  42.5714285714,
  53.7142857143,
  51.5714285714,
  48.2857142857,
  56.4285714286,
  51.1428571429
]
*/
```

## Input and Feedback

Any constructive feedback is welcome. If you have JavaScript implementations of other anomaly detection algorithms
and would like to see them included, please let me know.
