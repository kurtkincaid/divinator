# Divinator

## Introduction

Anomaly Detection Using Z-Scores, Modified Z-Scores, and Interquartile Ranges.

This module implements anomaly detection (a.k.a. outlier detection or novelty detection) through the use of
the three algorithms mentioned above. Given an array of data (and an optional configuration parameter), the functions 
will return an array of true/false values, corresponding to the array of data that was passed. Thus, if index item #4 
in your data is an outlier, in the resulting array, the item at index #4 will be _true_, otherwise it will be _false_.

A fourth function, `all()`, passes your data to all three algorithms and the resulting array will contain _true_ values 
**if and only if** all three algorithms agree that the item is an outlier.

### A few words of caution

First, no method or algorithm is going to tell you conclusively that an item is an anomaly or outlier. Rather, these algorithms 
are intended to identify items that are _potentially_ outliers, given the data provided. Further investigation will always be 
required to make the final determination. 

Second, the value of anomaly detection breaks down if the data sample is too small. What constitues "too small" is left 
as an exercise for the reader. In my experience, I would consider a data sample of less than 30 - 40 values to not be sufficiently 
large to provide meaninful answers. That precise threshold, however, is up to you.

### Links

This document provides only a very brief description of each of the algorithms and is more focused on how to incorporate them 
into your code. For more information on the algorithms themselves, I refer you to the following entries.

* [Interquartile Range](https://www.statology.org/how-to-interpret-interquartile-range/)
* [Z-Score](https://www.statology.org/interpret-z-scores/)
* [Modified Z-Score](https://www.statology.org/modified-z-score/)

# Table of Contents
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
- [Input and Feedback](#input-and-feedback)

# Install

```sh
$ npm --save install divinator
```

# Usage

At the top of your script, load Divinator.

```js
const divinator = require( "divinator" );
```

## iqr

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

## zscore

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

## modifiedZscore

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

## all

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

## version

Simply returns the version number of the module.

```js
console.log( divinator.version );
```

# Input and Feedback

Any constructive feedback is welcome. If you have JavaScript implementations of other anomaly detection algorithms 
and would like to see them included, please let me know. (I tried coding Isolation Forest, but after several hours of 
frustration, I left it out.)

