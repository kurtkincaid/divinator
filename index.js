/*
    Filename: index.js
    Description: Divinator, diviner of secrets, detector of anomalies
    Author: Kurt Kincaid
    Last Updated: 2026-06-07
    Version: 3.4.0-dev-2

    -----
    Copyright © 2023–2026 Kurt Kincaid

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
    -----

    Request: If you use this module in an interesting way or in an
    interesting application, I would love to hear about it. I'm not
    asking to see your code or for you to divulge sensitive information;
    I would just like a general description of your use case. Please
    email me at kurt.kincaid<at>gmail.com and tell me about it.

    Also, any thoughts, comments, or recommendations are always welcome.

    Thanks!
*/

const crypto = require( "crypto" );
const ss = require( "simple-statistics" );
const jstat = require( "jstat" );
const BigNumber = require( "bignumber.js" );
BigNumber.config( {
    "CRYPTO": true,
    "DECIMAL_PLACES": 100,
    "ROUNDING_MODE": 4
} );
const ee = require( "events" ).EventEmitter;
const {
    euclideanDistance,
    validate
} = require( "./src/utils" );
const cluster = require( "./src/cluster" );
const stats = require( "./src/stats" );
const {
    jarqueBera
} = stats;

module.exports.version = "3.4.0-dev-2";
module.exports.shapiroWilk = stats.shapiroWilk;
module.exports.kolmogorovSmirnov = stats.kolmogorovSmirnov;
module.exports.jarqueBera = stats.jarqueBera;
module.exports.andersonDarling2 = stats.andersonDarling2;
module.exports.andersonDarling = stats.andersonDarling;
module.exports.lilliefors = stats.lilliefors;
module.exports.simulateLillieforsCriticalValues = stats.simulateLillieforsCriticalValues;

// Define the mathematical constant PI (π) as a BigNumber with high precision.
// This value is used in calculations requiring a precise representation of π.
const PI = new BigNumber( "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679" );

// Export the constant PI so it can be used in other modules.
module.exports.PI = PI;

// Define the mathematical constant E (Euler's number) as a BigNumber with high precision.
// Euler's number is the base of the natural logarithm and is widely used in mathematical and scientific computations.
const E = new BigNumber( "2.7182818284590452353602874713526624977572470936999595749669676277240766303535475945713821785251664274" );

// Export the constant E so it can be used in other modules.
module.exports.E = E;

/**
 * Calculates the outliers in a dataset using the Interquartile Range (IQR) method.
 *
 * The IQR method identifies outliers as data points that fall below the lower bound
 * or above the upper bound, which are calculated using the first and third quartiles.
 *
 * @param {number[]} data - The dataset to analyze.
 * @param {number} [val=1.5] - The multiplier for the IQR to define the bounds for outliers.
 *                             The default value of 1.5 is commonly used.
 * @returns {number[]} An array of outliers.
 */
function iqr( data, val = 1.5 ) {
    // Validate the input data to ensure it is an array of numbers
    const validatedData = validate( data );

    // Ensure the multiplier `val` is a finite number; default to 1.5 if invalid
    val = +val;
    if ( !Number.isFinite( val ) ) {
        val = 1.5;
    }

    // Sort the data in ascending order to calculate quartiles
    const sortedData = validatedData.slice().sort( ( a, b ) => a - b );

    // Calculate the first quartile (Q1), which is the median of the lower half of the data
    const q1 = sortedData[ Math.floor( sortedData.length / 4 ) ];

    // Calculate the third quartile (Q3), which is the median of the upper half of the data
    const q3 = sortedData[ Math.floor( sortedData.length * ( 3 / 4 ) ) ];

    // Calculate the interquartile range (IQR) as the difference between Q3 and Q1
    const iqr = q3 - q1;

    // Define the lower and upper bounds for outliers
    const lowerBound = q1 - val * iqr; // Lower bound is Q1 minus the IQR multiplier
    const upperBound = q3 + val * iqr; // Upper bound is Q3 plus the IQR multiplier

    // Filter the data to find values that are below the lower bound or above the upper bound
    return sortedData.filter( value => value < lowerBound || value > upperBound );
}

// Export the `iqr` function for use in other modules
module.exports.iqr = iqr;

/**
 * Calculates the modified Z-score for a given dataset using the median
 * absolute deviation (MAD) rather than the mean and standard deviation.
 * This method is more robust to outliers compared to the standard Z-score.
 *
 * @param {number[]} data - The input dataset to be analyzed.
 * @param {number} [threshold=3.5] - The threshold value for identifying outliers.
 *                                   Data points with a modified Z-score greater than this value
 *                                   are considered outliers. The default value of 3.5 is commonly used.
 * @returns {number[]} - An array of data points that are considered outliers based on the modified Z-score.
 * @throws {Error} - Throws an error if the threshold is not a finite number.
 */
function modifiedZscore( data, threshold = 3.5 ) {
    // Validate the input data to ensure it is an array of numbers
    const validatedData = validate( data );

    // Parse and validate the threshold value
    if ( threshold ) {
        threshold = parseFloat( threshold ); // Convert the threshold to a floating-point number
        if ( !Number.isFinite( threshold ) ) {
            // Throw an error if the threshold is not a finite number
            throw new Error( `A threshold factor was passed, but it was not a number.` );
        }
    }

    // Calculate the Median Absolute Deviation (MAD) of the dataset
    // MAD is the median of the absolute deviations from the dataset's median
    let mad = ss.medianAbsoluteDeviation( validatedData );

    // Calculate the median of the dataset
    let median = ss.median( validatedData );

    // Filter the dataset to find outliers
    // The modified Z-score formula is: 0.6745 * (x - median) / MAD
    // Data points with a modified Z-score greater than the threshold are considered outliers
    return validatedData.filter( x => Math.abs( 0.6745 * ( x - median ) / mad ) > threshold );
}

// Export the `modifiedZscore` function for use in other modules
module.exports.modifiedZscore = modifiedZscore;

/**
 * Calculates the z-scores for a given dataset and identifies outliers based on a specified threshold.
 *
 * The z-score measures how many standard deviations a data point is from the mean.
 * Data points with z-scores greater than the specified threshold are considered outliers.
 *
 * @param {number[]} data - The dataset to analyze.
 * @param {number} [threshold=3] - The z-score threshold to determine outliers. Default is 3.
 * @returns {number[]} An array of outliers that exceed the specified z-score threshold.
 * @throws {Error} Throws an error if the threshold is not a finite number.
 */
function zscore( data, threshold = 3 ) {
    // Validate the input data to ensure it is an array of numbers
    const validatedData = validate( data );

    // Parse and validate the threshold value
    if ( threshold ) {
        threshold = parseFloat( threshold ); // Convert the threshold to a floating-point number
        if ( !Number.isFinite( threshold ) ) {
            // Throw an error if the threshold is not a finite number
            throw new Error( 'A threshold factor was passed, but it was not a number.' );
        }
    }

    // Calculate the mean of the dataset
    const mean = ss.mean( validatedData );

    // Calculate the standard deviation of the dataset
    const std = ss.standardDeviation( validatedData );

    // Calculate the z-score for each data point and filter outliers
    // The z-score formula is: (x - mean) / std
    // Data points with absolute z-scores greater than the threshold are considered outliers
    return validatedData.filter( x => Math.abs( ( x - mean ) / std ) > threshold );
}

// Export the `zscore` function for use in other modules
module.exports.zscore = zscore;

/**
 * Combines results from multiple anomaly detection algorithms.
 * Returns an array of outliers that are detected by ALL specified methods.
 *
 * @param {number[]} data - The dataset to analyze.
 * @param {Object} [options={}] - Configuration object for algorithm parameters.
 * @param {number} [options.iqr=1.5] - IQR multiplier threshold.
 * @param {number} [options.zscore=3] - Z-score threshold.
 * @param {number} [options.modifiedZscore=3.5] - Modified Z-score threshold.
 * @returns {number[]} An array of outliers detected by all methods.
 */
function consensus( data, options = {} ) {
    // Validate the input data
    const validatedData = validate( data );

    // Extract options with defaults
    const {
        iqr: iqrThreshold = 1.5,
        zscore: zscoreThreshold = 3,
        modifiedZscore: modifiedZscoreThreshold = 3.5
    } = options;

    // Run each detection method
    const iqrOutliers = iqr( validatedData, iqrThreshold );
    const zscoreOutliers = zscore( validatedData, zscoreThreshold );
    const modifiedZscoreOutliers = modifiedZscore( validatedData, modifiedZscoreThreshold );

    // Find outliers that appear in ALL three methods
    const consensus = validatedData.filter( value =>
        iqrOutliers.includes( value ) &&
        zscoreOutliers.includes( value ) &&
        modifiedZscoreOutliers.includes( value )
    );

    return consensus;
}

// Export the `consensus` function for use in other modules
module.exports.consensus = consensus;

/*
    NOTES:
        Zone X:
            Below, when referencing control chart "zones," I have created Zone X, which is
            the name I have given to points that fall above or below Zone A. This is
            done to easily identify points outside of the 6 sigma range. There is no
            official "Zone X," so you will not find reference to this in standard
            control chart documentation.

        Control chart rules:
            The rule names I have used below (alpha, bravo, charlie, etc.) are arbitrary
            names I have assigned for internal categorization. These are not "official"
            names for these rules. As with Zone X described above, these names will not
            appear in standard control chart documentation.
*/

/**
 * Class representing a Zone.
 * A Zone is used to categorize data points into statistical ranges (zones) based on their
 * distance from the mean in terms of standard deviations.
 */
class Zone {
    constructor( data ) {
        const validated = validate( data );
        this.data = validated;
        this.mean = ss.mean( validated );
        this.std = ss.standardDeviation( validated );
        this.median = ss.median( validated );

        this.thresholds = {
            c: 1,
            b: 2,
            a: 3
        };

        this.zones = [ {
                name: 'C',
                min: this.mean - this.std,
                max: this.mean + this.std
            },
            {
                name: 'B',
                min: this.mean - this.std * 2,
                max: this.mean + this.std * 2
            },
            {
                name: 'A',
                min: this.mean - this.std * 3,
                max: this.mean + this.std * 3
            }
        ];

        this.dataZones = validated.map( ( value ) => this.whichDetail( value ) );
    }

    sigma( value ) {
        if ( !Number.isFinite( this.std ) || this.std === 0 ) return 0;
        return ( value - this.mean ) / this.std;
    }

    side( value ) {
        if ( value > this.mean ) return '+';
        if ( value < this.mean ) return '-';
        return '0';
    }

    band( value ) {
        const absoluteSigma = Math.abs( this.sigma( value ) );
        if ( absoluteSigma > 3 ) return 'X';
        if ( absoluteSigma > 2 ) return 'A';
        if ( absoluteSigma > 1 ) return 'B';
        return 'C';
    }

    which( value ) {
        return this.whichDetail( value ).zone;
    }

    whichDetail( value ) {
        const side = this.side( value );
        const band = this.band( value );
        const sigma = this.sigma( value );

        return {
            value,
            sigma,
            absSigma: Math.abs( sigma ),
            side,
            zone: band,
            band,
            label: `${band}${side}`
        };
    }
}

module.exports.Zone = Zone;

const probability = {
    A: 0.9973002039367482,
    B: 0.9544997361036420,
    C: 0.6826894921371215
};

module.exports.probability = probability;

const discrete = {
    A: probability.A - probability.B,
    B: probability.B - probability.C,
    C: probability.C
};

module.exports.discrete = discrete;

// Define the control chart rules with their descriptions and probabilities
const rules = {
    alpha: {
        id: 'rule1',
        alias: 'alpha',
        family: 'WECO/Nelson',
        standard: 'WECO',
        title: 'One point beyond 3 sigma',
        description: '1 point beyond Zone A / outside control limits',
        indicates: 'A strong special-cause signal, sudden process upset, or extreme outlier.',
        category: 'special_cause',
        action: 'Investigate recent process changes, measurement error, assignable causes, or a one-off upset.',
        severity: 'high',
        window: 1
    },

    bravo: {
        id: 'rule2',
        alias: 'bravo',
        family: 'WECO/Nelson',
        standard: 'WECO',
        title: 'Two of three beyond 2 sigma on same side',
        description: '2 out of 3 consecutive points beyond 2 sigma on the same side of the centerline',
        indicates: 'A developing shift in the process mean or a moderate special-cause movement.',
        category: 'mean_shift',
        action: 'Check for recent drift, calibration change, setup change, raw-material shift, or operator/process adjustment.',
        severity: 'high',
        window: 3
    },

    charlie: {
        id: 'rule3',
        alias: 'charlie',
        family: 'WECO/Nelson',
        standard: 'WECO',
        title: 'Four of five beyond 1 sigma on same side',
        description: '4 out of 5 consecutive points beyond 1 sigma on the same side of the centerline',
        indicates: 'A sustained small shift in the process mean.',
        category: 'mean_shift',
        action: 'Investigate gradual drift, persistent bias, setup offset, or a process average that has moved from baseline.',
        severity: 'medium',
        window: 5
    },

    delta: {
        id: 'rule4_weco',
        alias: 'delta',
        family: 'WECO',
        standard: 'WECO',
        title: 'Eight on one side of centerline',
        description: '8 consecutive points on the same side of the centerline',
        indicates: 'A sustained shift or bias in the process mean.',
        category: 'mean_shift',
        action: 'Look for systematic bias, process recentering, equipment change, or a stable but shifted operating condition.',
        severity: 'medium',
        window: 8
    },

    delta9: {
        id: 'rule4_nelson',
        alias: 'delta9',
        family: 'Nelson',
        standard: 'Nelson',
        title: 'Nine on one side of centerline',
        description: '9 consecutive points on the same side of the centerline',
        indicates: 'A prolonged bias or sustained shift in the process average.',
        category: 'mean_shift',
        action: 'Investigate whether the process has settled into a new center or whether a long-lived assignable cause is present.',
        severity: 'medium',
        window: 9
    },

    echo: {
        id: 'rule5',
        alias: 'echo',
        family: 'Nelson',
        standard: 'Nelson',
        title: 'Six trending up or down',
        description: '6 consecutive points steadily increasing or steadily decreasing',
        indicates: 'A trend, drift, wear-out effect, warm-up effect, or progressive change over time.',
        category: 'trend',
        action: 'Check for tool wear, environmental drift, thermal effects, aging components, or cumulative process adjustments.',
        severity: 'medium',
        window: 6
    },

    hotel: {
        id: 'rule6',
        alias: 'hotel',
        family: 'Nelson',
        standard: 'Nelson',
        title: 'Fourteen alternating',
        description: '14 consecutive points alternating up and down',
        indicates: 'Systematic oscillation or overcorrection beyond what random noise would normally produce.',
        category: 'oscillation',
        action: 'Investigate over-control, alternating inputs, measurement artifacts, or periodic/manual adjustment behavior.',
        severity: 'medium',
        window: 14
    },

    golf: {
        id: 'rule7',
        alias: 'golf',
        family: 'Nelson',
        standard: 'Nelson',
        title: 'Fifteen within 1 sigma',
        description: '15 consecutive points within 1 sigma of the centerline',
        indicates: 'Unusually low variation, possible stratification, smoothing, or incorrect sigma estimation.',
        category: 'low_variation',
        action: 'Check subgrouping, data smoothing, aggregation effects, measurement resolution, or an underestimated control-limit model.',
        severity: 'low',
        window: 15
    },

    foxtrot: {
        id: 'rule8',
        alias: 'foxtrot',
        family: 'Nelson',
        standard: 'Nelson',
        title: 'Eight outside Zone C on both sides',
        description: '8 consecutive points with none in Zone C and with points on both sides of the centerline',
        indicates: 'Mixture, overdispersion, or unstable inputs causing excessive spread away from the center.',
        category: 'high_variation',
        action: 'Check for mixed populations, alternating sources, subgrouping problems, input instability, or process heterogeneity.',
        severity: 'medium',
        window: 8
    },

    india: {
        id: 'near_limit',
        alias: 'india',
        family: 'Custom',
        standard: 'Custom',
        title: 'Near control limit warning',
        description: '1 or more points at or beyond 2.5 sigma',
        indicates: 'An early warning that the process may be approaching a formal out-of-control condition.',
        category: 'early_warning',
        action: 'Monitor closely for follow-on rule violations and inspect recent changes before the process crosses control limits.',
        severity: 'info',
        window: 1
    },

    juliet: {
        id: 'cluster_high',
        alias: 'juliet',
        family: 'Custom',
        standard: 'Custom',
        title: 'Three of three beyond 1.5 sigma on same side',
        description: '3 consecutive points beyond 1.5 sigma on the same side',
        indicates: 'A concentrated same-side excursion suggesting an emerging shift in the mean.',
        category: 'mean_shift',
        action: 'Review whether the process is drifting in one direction and whether this should trigger earlier intervention.',
        severity: 'medium',
        window: 3
    },

    kilo: {
        id: 'mixture12',
        alias: 'kilo',
        family: 'Custom',
        standard: 'Custom',
        title: 'Twelve outside Zone C on both sides',
        description: '12 consecutive points with none in Zone C and with points on both sides; may suggest mixture/overdispersion',
        indicates: 'A stronger mixture or overdispersion pattern than the standard 8-point variant.',
        category: 'high_variation',
        action: 'Investigate mixed streams, alternating operating modes, subgrouping defects, or instability from multiple causes.',
        severity: 'info',
        window: 12
    },

    lima: {
        id: 'stratification20',
        alias: 'lima',
        family: 'Custom',
        standard: 'Custom',
        title: 'Twenty within 1 sigma',
        description: '20 consecutive points within 1 sigma; may suggest stratification, over-control, or artificial smoothing',
        indicates: 'Very low apparent variation that may reflect stratification, smoothing, or an overly constrained process.',
        category: 'low_variation',
        action: 'Check for data filtering, subgroup compression, averaging, measurement granularity, or inappropriate control-limit estimation.',
        severity: 'info',
        window: 20
    },

    mike: {
        id: 'same_side_cluster',
        alias: 'mike',
        family: 'Custom',
        standard: 'Custom',
        title: 'Five of six above 0.5 sigma on same side',
        description: '5 of 6 consecutive points beyond 0.5 sigma on the same side; early shift warning',
        indicates: 'A weak but persistent directional bias that may precede a clearer mean shift.',
        category: 'early_warning',
        action: 'Watch for confirming evidence from stronger shift rules or correlated anomalies in related metrics.',
        severity: 'info',
        window: 6
    }
};

module.exports.rules = rules;

const ruleProfiles = {
    weco: [ 'alpha', 'bravo', 'charlie', 'delta' ],
    nelson: [ 'alpha', 'delta9', 'echo', 'hotel', 'bravo', 'charlie', 'golf', 'foxtrot' ],
    anomaly: [ 'alpha', 'bravo', 'charlie', 'delta', 'delta9', 'echo', 'hotel', 'golf', 'foxtrot', 'india', 'juliet', 'kilo', 'lima', 'mike' ],
    conservative: [ 'alpha', 'bravo' ],
    all: Object.keys( rules )
};

module.exports.ruleProfiles = ruleProfiles;

function _buildIndexRange( startIndex, length ) {
    const indices = [];
    for ( let i = startIndex; i < startIndex + length; i++ ) {
        indices.push( i );
    }
    return indices;
}

function _allMatch( points, predicate ) {
    return points.length > 0 && points.every( predicate );
}

function _noneMatch( points, predicate ) {
    return points.every( ( point ) => !predicate( point ) );
}

function _countMatches( points, predicate ) {
    let count = 0;
    for ( const point of points ) {
        if ( predicate( point ) ) count++;
    }
    return count;
}

function _hasPositiveSide( points ) {
    return points.some( ( point ) => point.side === '+' );
}

function _hasNegativeSide( points ) {
    return points.some( ( point ) => point.side === '-' );
}

function _isSameSide( points ) {
    const sides = points.map( ( point ) => point.side ).filter( ( side ) => side !== '0' );
    return sides.length > 0 && sides.every( ( side ) => side === sides[ 0 ] );
}

function _isEntirelyOnOneSide( points ) {
    return points.every( ( point ) => point.side !== '0' ) && _isSameSide( points );
}

function _isStrictlyIncreasing( values ) {
    for ( let i = 1; i < values.length; i++ ) {
        if ( !( values[ i ] > values[ i - 1 ] ) ) return false;
    }
    return true;
}

function _isStrictlyDecreasing( values ) {
    for ( let i = 1; i < values.length; i++ ) {
        if ( !( values[ i ] < values[ i - 1 ] ) ) return false;
    }
    return true;
}

function _isAlternating( values ) {
    if ( values.length < 3 ) return false;

    for ( let i = 2; i < values.length; i++ ) {
        const delta1 = values[ i - 1 ] - values[ i - 2 ];
        const delta2 = values[ i ] - values[ i - 1 ];

        if ( delta1 === 0 || delta2 === 0 ) return false;
        if ( Math.sign( delta1 ) === Math.sign( delta2 ) ) return false;
    }

    return true;
}

function _mergeSignalRanges( signalArrays ) {
    if ( !Array.isArray( signalArrays ) || !signalArrays.length ) return [];

    let flattened = [];

    for ( const entry of signalArrays ) {
        if ( Array.isArray( entry ) ) flattened = flattened.concat( entry );
        else flattened.push( entry );
    }

    flattened = [ ...new Set( flattened ) ].sort( ( a, b ) => a - b );

    if ( !flattened.length ) return [];

    const merged = [];
    let current = [ flattened[ 0 ] ];

    for ( let i = 1; i < flattened.length; i++ ) {
        if ( flattened[ i ] === current[ current.length - 1 ] + 1 ) {
            current.push( flattened[ i ] );
        }
        else {
            merged.push( current );
            current = [ flattened[ i ] ];
        }
    }

    merged.push( current );
    return merged;
}

function _detectRule( ruleName, classifiedPoints, data, mean ) {
    const ruleMetadata = rules[ ruleName ];
    if ( !ruleMetadata ) return [];

    const windowSize = ruleMetadata.window;
    const matches = [];

    for ( let startIndex = 0; startIndex <= classifiedPoints.length - windowSize; startIndex++ ) {
        const windowPoints = classifiedPoints.slice( startIndex, startIndex + windowSize );
        const windowValues = data.slice( startIndex, startIndex + windowSize );
        let isMatch = false;

        switch ( ruleName ) {
            case 'alpha':
                isMatch = _allMatch( windowPoints, ( point ) => point.absSigma > 3 );
                break;

            case 'bravo':
                isMatch =
                    _countMatches( windowPoints, ( point ) => point.sigma > 2 ) >= 2 ||
                    _countMatches( windowPoints, ( point ) => point.sigma < -2 ) >= 2;
                break;

            case 'charlie':
                isMatch =
                    _countMatches( windowPoints, ( point ) => point.sigma > 1 ) >= 4 ||
                    _countMatches( windowPoints, ( point ) => point.sigma < -1 ) >= 4;
                break;

            case 'delta':
                isMatch = _isEntirelyOnOneSide( windowPoints );
                break;

            case 'delta9':
                isMatch = _isEntirelyOnOneSide( windowPoints );
                break;

            case 'echo':
                isMatch = _isStrictlyIncreasing( windowValues ) || _isStrictlyDecreasing( windowValues );
                break;

            case 'hotel':
                isMatch = _isAlternating( windowValues );
                break;

            case 'golf':
                isMatch = _allMatch( windowPoints, ( point ) => point.absSigma <= 1 );
                break;

            case 'foxtrot':
                isMatch =
                    _noneMatch( windowPoints, ( point ) => point.absSigma <= 1 ) &&
                    _hasPositiveSide( windowPoints ) &&
                    _hasNegativeSide( windowPoints );
                break;

            case 'india':
                isMatch = _allMatch( windowPoints, ( point ) => point.absSigma >= 2.5 );
                break;

            case 'juliet':
                isMatch =
                    _countMatches( windowPoints, ( point ) => point.sigma > 1.5 ) === 3 ||
                    _countMatches( windowPoints, ( point ) => point.sigma < -1.5 ) === 3;
                break;

            case 'kilo':
                isMatch =
                    _noneMatch( windowPoints, ( point ) => point.absSigma <= 1 ) &&
                    _hasPositiveSide( windowPoints ) &&
                    _hasNegativeSide( windowPoints );
                break;

            case 'lima':
                isMatch = _allMatch( windowPoints, ( point ) => point.absSigma <= 1 );
                break;

            case 'mike':
                isMatch =
                    _countMatches( windowPoints, ( point ) => point.sigma > 0.5 ) >= 5 ||
                    _countMatches( windowPoints, ( point ) => point.sigma < -0.5 ) >= 5;
                break;
        }

        if ( isMatch ) {
            matches.push( {
                rule: ruleMetadata.id,
                alias: ruleMetadata.alias,
                family: ruleMetadata.family,
                standard: ruleMetadata.standard,
                title: ruleMetadata.title,
                description: ruleMetadata.description,
                indicates: ruleMetadata.indicates,
                category: ruleMetadata.category,
                action: ruleMetadata.action,
                severity: ruleMetadata.severity,
                start: startIndex,
                end: startIndex + windowSize - 1,
                indices: _buildIndexRange( startIndex, windowSize ),
                values: windowValues,
                labels: windowPoints.map( ( point ) => point.label ),
                zscores: windowPoints.map( ( point ) => point.sigma )
            } );
        }
    }

    return matches;
}

function _getActiveRuleNames( options ) {
    if ( !options ) return ruleProfiles.anomaly.slice();

    if ( Array.isArray( options.rules ) && options.rules.length ) {
        return options.rules.filter( ( ruleName ) => rules[ ruleName ] );
    }

    if ( options.profile && ruleProfiles[ options.profile ] ) {
        return ruleProfiles[ options.profile ].slice();
    }

    return ruleProfiles.anomaly.slice();
}

function _collapseDetailedSignals( detailedSignals ) {
    const groupedSignals = {};
    for ( const key of Object.keys( rules ) ) groupedSignals[ key ] = [];

    for ( const signal of detailedSignals ) {
        groupedSignals[ signal.alias ].push( signal.indices );
    }

    for ( const key of Object.keys( groupedSignals ) ) {
        groupedSignals[ key ] = _mergeSignalRanges( groupedSignals[ key ] );
    }

    return groupedSignals;
}

/**
 * Analyzes statistical patterns in a dataset and detects various control chart patterns.
 *
 * @param {Object|Array} data - The input data, either as an object with a `data` property or as an array.
 * @param {boolean} _collapse - A flag indicating whether to collapse the result.
 * @returns {Object} The result object containing statistical measures, outliers, and detected patterns.
 */
function patterns( input, opts ) {
    let data;
    if ( input && input.data ) data = input.data;
    else data = input;

    data = validate( data );

    let options = {};
    if ( typeof opts === 'boolean' ) options.collapse = opts;
    else if ( opts && typeof opts === 'object' ) options = opts;

    const mean = ss.mean( data );
    const standardDeviation = ss.standardDeviation( data );
    const median = ss.median( data );
    const min = ss.min( data );
    const max = ss.max( data );
    const skewness = ss.sampleSkewness( data );
    const kurtosis = ss.sampleKurtosis( data );
    const indexSeries = Array.from( {
        length: data.length
    }, ( _, index ) => index );

    const zoneAnalyzer = new Zone( data );
    const jarqueBeraResult = jarqueBera( data );

    const outliers = {
        zscore: zscore( data ),
        modifiedZscore: modifiedZscore( data ),
        iqr: iqr( data )
    };

    const activeRuleNames = _getActiveRuleNames( options );

    let detailedSignals = [];
    for ( const ruleName of activeRuleNames ) {
        detailedSignals = detailedSignals.concat(
            _detectRule( ruleName, zoneAnalyzer.dataZones, data, mean )
        );
    }

    const groupedSignals = _collapseDetailedSignals( detailedSignals );

    const result = {
        '1sigma': [ mean - standardDeviation, mean + standardDeviation ],
        '2sigma': [ mean - standardDeviation * 2, mean + standardDeviation * 2 ],
        '3sigma': [ mean - standardDeviation * 3, mean + standardDeviation * 3 ],
        '4sigma': [ mean - standardDeviation * 4, mean + standardDeviation * 4 ],
        '5sigma': [ mean - standardDeviation * 5, mean + standardDeviation * 5 ],
        jarqueBera: jarqueBeraResult,
        kurtosis,
        max,
        mean,
        median,
        medianAbsoluteDeviation: ss.medianAbsoluteDeviation( data ),
        min,
        mode: ss.modeSorted( data.slice().sort( ( a, b ) => a - b ) ),
        outliers,
        sampleCorrelation: ss.sampleCorrelation( data, indexSeries ),
        skewness,
        spread: max - min,
        standardDeviation,

        zScoreMax: ss.zScore( max, mean, standardDeviation ),
        zScoreMin: ss.zScore( min, mean, standardDeviation ),

        poisson: {},

        alpha: groupedSignals.alpha || [],
        bravo: groupedSignals.bravo || [],
        charlie: groupedSignals.charlie || [],
        delta: groupedSignals.delta || [],
        delta9: groupedSignals.delta9 || [],
        echo: groupedSignals.echo || [],
        foxtrot: groupedSignals.foxtrot || [],
        golf: groupedSignals.golf || [],
        hotel: groupedSignals.hotel || [],
        india: groupedSignals.india || [],
        juliet: groupedSignals.juliet || [],
        kilo: groupedSignals.kilo || [],
        lima: groupedSignals.lima || [],
        mike: groupedSignals.mike || [],

        zones: zoneAnalyzer.dataZones,
        ruleProfile: options.profile || 'anomaly',
        activeRules: activeRuleNames,
        rules,
        detailedSignals
    };

    for ( let i = 0; i < data.length; i++ ) {
        result.poisson[ data[ i ] ] = poisson( data[ i ], mean );
    }

    if ( options.collapse ) {
        const collapsedResult = collapse( result );
        collapsedResult.detailedSignals = detailedSignals;
        collapsedResult.activeRules = activeRuleNames;
        collapsedResult.ruleProfile = options.profile || 'anomaly';
        collapsedResult.rules = rules;
        return collapsedResult;
    }

    return result;
}

module.exports.patterns = patterns;

/**
 * Collapses the arrays of numbers in the input object into sequences of consecutive numbers.
 *
 * @param {Object} p - The input object containing arrays of numbers.
 * @returns {Object} - The output object with collapsed sequences of numbers.
 *
 * @example
 * // Input:
 * const input = {
 *   a: [[1, 2, 3], [4, 5, 6]],
 *   b: [[10, 11], [12, 13]],
 *   _meta: "metadata"
 * };
 *
 * // Output:
 * const output = collapse(input);
 * // {
 * //   a: [[1, 2, 3, 4, 5, 6]],
 * //   b: [[10, 11, 12, 13]],
 * //   _meta: "metadata"
 * // }
 */
function collapse( p ) {
    let out = {}; // Initialize an empty object to store the output
    // Iterate over each key in the input object 'p'
    for ( let j of Object.keys( p ) ) {
        // If the key starts with an underscore, add it to the output as is
        if ( j.match( /^_/ ) ) {
            out[ j ] = p[ j ];
            continue;
        }
        // If the value associated with the key is an array and has elements
        if ( Array.isArray( p[ j ] ) && p[ j ].length ) {
            let c = []; // Initialize an empty array to concatenate elements
            // Concatenate all elements of the arrays within the array
            for ( let i = 0; i < p[ j ].length; i++ ) {
                if ( Array.isArray( p[ j ][ i ] ) ) {
                    c = c.concat( p[ j ][ i ] );
                }
                else {
                    c.push( p[ j ][ i ] );
                }
            }
            // Create a Set to remove duplicates and sort the elements numerically
            let z = new Set( c );
            z = [ ...z ].sort( ( a, b ) => a - b );
            let seq = []; // Initialize an array to store sequences
            let str = z[ 0 ].toString(); // Start the sequence with the first element
            let prev = z[ 0 ]; // Keep track of the previous element
            // Iterate over the sorted set to create sequences
            for ( let i = 1; i <= z.length; i++ ) {
                if ( z[ i ] === prev + 1 ) {
                    // If the current element is consecutive, add it to the sequence string
                    str += `:${z[i]}`;
                }
                else {
                    // If not consecutive, finalize the current sequence
                    str = str.replace( /^:/, "" ); // Remove leading colon if any
                    seq.push( str.split( ":" ).map( parseFloat ) ); // Convert sequence string to array of numbers

                    // Start a new sequence if there are more elements
                    if ( z[ i ] ) {
                        str = z[ i ].toString();
                    }
                }
                prev = z[ i ]; // Update the previous element
            }
            out[ j ] = seq; // Add the sequences to the output object
        }
        else {
            // If the value is not an array or is empty, add it to the output as is
            out[ j ] = p[ j ];
        }
    }
    return out; // Return the output object
}
module.exports.collapse = collapse;

/**
 * Calculates the moving average of an array with a specified window size.
 * The function adjusts the array length to be a multiple of the window size
 * by removing elements from the front or back, depending on the configuration.
 *
 * @param {number[]} inputArray - The array of numbers to calculate the moving average for.
 * @param {Object} options - Configuration object for the function.
 * @param {number} [options.size=5] - The window size for the moving average.
 * @param {boolean} [options.front=false] - If true, removes elements from the front of the array to make its length a multiple of the window size.
 * @param {number} [options.decimalPlaces=10] - The number of decimal places to round the average to.
 * @returns {number[]} An array of moving averages.
 */
const xbar2 = ( inputArray, options ) => {
    // Create a shallow copy of the input array to avoid modifying the original
    let adjustedArray = [ ...inputArray ];

    // Determine the window size for the moving average
    let windowSize;
    if ( options && options[ "size" ] ) {
        windowSize = options[ "size" ];
    }
    else {
        windowSize = 5; // Default window size is 5
    }

    // Determine whether to remove elements from the front or back of the array
    let removeFromFront;
    if ( options && options[ "front" ] ) {
        removeFromFront = options[ "front" ];
    }
    else {
        removeFromFront = false; // Default is to remove elements from the back
    }

    // Determine the number of decimal places for rounding
    let decimalPlaces = 10; // Default is 10 decimal places
    if ( options && options[ "d" ] ) {
        try {
            decimalPlaces = parseInt( options[ "d" ] );
        }
        catch {
            // If parsing fails, retain the default value
        }
    }

    // Calculate the remainder when the array length is divided by the window size
    let remainder = adjustedArray.length % windowSize;

    // If there is a remainder, adjust the array length to be a multiple of the window size
    if ( remainder ) {
        for ( let i = 0; i < remainder; i++ ) {
            if ( removeFromFront ) {
                adjustedArray.shift(); // Remove elements from the front
            }
            else {
                adjustedArray.pop(); // Remove elements from the back
            }
        }
    }

    // Initialize an array to store the moving averages
    let movingAverages = [];

    // Loop through the adjusted array in chunks of the specified window size
    for ( let i = 0; i < adjustedArray.length; i += windowSize ) {
        let sum = 0;

        // Calculate the sum of the current chunk
        for ( let j = i; j < i + windowSize; j++ ) {
            sum += adjustedArray[ j ];
        }

        // Calculate the average, round it to the specified number of decimal places, and add it to the result array
        movingAverages.push( parseFloat( ( sum / windowSize ).toFixed( decimalPlaces ) ) );
    }

    // Return the array of moving averages
    return movingAverages;
};

// Export the `xbar2` function for use in other modules
module.exports.xbar2 = xbar2;

/**
 * Calculates the moving average of an array with a specified window size.
 *
 * @param {number[]} arr - The array of numbers to calculate the moving average for.
 * @param {Object} [obj={}] - Optional configuration object.
 * @param {number} [obj.size=5] - The window size for the moving average.
 * @param {boolean} [obj.front=false] - If true, removes elements from the front of the array to make its length a multiple of the window size.
 * @param {number} [obj.d=10] - The number of decimal places to round the average to.
 * @returns {number[]} An array of moving averages.
 */
function xbar( arr, obj = {} ) {
    // Destructure the configuration object with default values
    const {
        size = 5, // Default window size is 5
            front = false, // Default is to remove elements from the end of the array
            d = 10 // Default is to round to 10 decimal places
    } = obj;

    // Create a copy of the input array to avoid modifying the original
    const _arr = [ ...arr ];

    // Parse the size and decimal places as integers
    const num = parseInt( size, 10 );
    const decimalPlaces = parseInt( d, 10 );

    // Adjust the array length to be a multiple of the window size
    const remainder = _arr.length % num;
    if ( remainder ) {
        // Remove elements from the front or end of the array based on the `front` flag
        _arr.splice( front ? 0 : -remainder, remainder );
    }

    // Initialize an array to store the moving averages
    const out = [];

    // Loop through the array in chunks of the specified window size
    for ( let i = 0; i < _arr.length; i += num ) {
        // Calculate the average of the current chunk
        const avg = _arr.slice( i, i + num ).reduce( ( sum, val ) => sum + val, 0 ) / num;

        // Round the average to the specified number of decimal places and add it to the output array
        out.push( parseFloat( avg.toFixed( decimalPlaces ) ) );
    }

    // Return the array of moving averages
    return out;
};

// Export the `xbar` function for use in other modules
module.exports.xbar = xbar;

// START Normality Tests

/**
 * Performs the Shapiro-Wilk test for normality on a given dataset.
 *
 * The Shapiro-Wilk test is a statistical test that checks whether a dataset
 * follows a normal distribution. It calculates a test statistic (W) and a p-value
 * to determine the likelihood that the data is normally distributed.
 *
 * @param {number[]} v - An array of numerical data points to test for normality.
 * @param {number} [alpha=0.05] - The significance level for the test. Default is 0.05.
 * @returns {Object} An object containing the test statistic (W) and the approximate p-value.
 * @property {number} testStatistic - The Shapiro-Wilk test statistic (W).
 * @property {number} pValue - The approximate p-value for the test statistic.
 * @throws {Error} If the input is not a valid array or if alpha is not between 0 and 1.
 */
// END Normality Tests

/**
 * Calculates the factorial of a given number using the Lanczos approximation.
 *
 * @param {number|string|BigNumber} z - The input value for which the factorial is to be calculated.
 *                                      It can be a number, string, or BigNumber.
 * @returns {BigNumber} - The factorial of the input value as a BigNumber.
 *
 * @description
 * This function uses the Lanczos approximation to compute the factorial of a given number.
 * The input value is first converted to a BigNumber object. The Lanczos approximation is
 * then applied using a series of coefficients to compute the factorial.
 *
 * The Lanczos approximation formula used is:
 *
 *     Γ(z) ≈ sqrt(2π) * (z + g + 0.5)^(z + 0.5) * e^-(z + g + 0.5) * A(z)
 *
 * where A(z) is a series sum of coefficients divided by (z + i).
 *
 * The function returns the factorial as a BigNumber to handle very large values.
 */
function factorial( z ) {
    // Convert the input value `z` to a BigNumber object for high-precision calculations
    z = new BigNumber( z );

    // Set the constant `g` used in the Lanczos approximation
    const g = 7;

    // Coefficients for the Lanczos approximation formula
    const C = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];

    // Initialize `x` with the first coefficient
    let x = new BigNumber( C[ 0 ] );

    // Sum the series using the coefficients and the input value `z`
    for ( let i = 1; i < g + 2; i++ ) {
        // Add the current term to `x`, dividing the coefficient by (z + i)
        x = x.plus( new BigNumber( C[ i ] ).div( z.plus( i ) ) );
    }

    // Calculate `t` as (z + g + 0.5), which is used in the formula
    let t = z.plus( g ).plus( 0.5 );

    // Return the factorial using the Lanczos approximation formula
    return PI.times( 2 ) // Multiply by the square root of 2π
        .sqrt()
        .times( Math.pow( t.toNumber(), z.plus( 0.5 ).toNumber() ) ) // Raise (z + g + 0.5) to the power of (z + 0.5)
        .times( Math.pow( E.toNumber(), -t.toNumber() ) ) // Multiply by e^-(z + g + 0.5)
        .times( x ); // Multiply by the sum of the series
}

// Export the `factorial` function for use in other modules
module.exports.factorial = factorial;

/**
 * Calculates the probability density function (PDF) of the Poisson distribution.
 *
 * The Poisson distribution is a discrete probability distribution that expresses
 * the probability of a given number of events occurring in a fixed interval of time
 * or space if these events occur with a known constant mean rate and independently
 * of the time since the last event.
 *
 * The formula for the Poisson PDF is:
 *
 *     P(X = x) = (λ^x * e^(-λ)) / x!
 *
 * where:
 * - `x` is the number of occurrences (non-negative integer),
 * - `λ` (mean) is the average number of occurrences,
 * - `e` is Euler's number (approximately 2.718),
 * - `x!` is the factorial of `x`.
 *
 * @param {number} x - The number of occurrences (non-negative integer).
 * @param {number} mean - The average number of occurrences (positive number).
 * @returns {BigNumber} The probability of observing exactly `x` occurrences.
 */
function poissonPdf( x, mean ) {
    // Calculate the Poisson probability using the formula:
    // (mean^x * e^(-mean)) / factorial(x)
    return new BigNumber( mean ** x ) // Raise the mean to the power of x
        .times( E.toNumber() ** -mean ) // Multiply by e^(-mean)
        .div( factorial( x ) ); // Divide by the factorial of x
}

// Export the `poissonPdf` function for use in other modules
module.exports.poissonPdf = poissonPdf;

/**
 * Computes the cumulative distribution function (CDF) for a Poisson distribution.
 *
 * @param {number} x - The value at which to evaluate the CDF. If x is less than 0, the function returns 0.
 * @param {number} mean - The mean (λ) of the Poisson distribution.
 * @returns {number} The CDF value for the given x and mean.
 *
 * @example
 * // Returns the CDF value for x = 3 and mean = 2
 * poissonCdf(3, 2);
 */
function poissonCdf( x, mean ) {
    // Initialize an empty array to store the Poisson probabilities
    let arr = [];
    // If x is less than 0, return 0 as the CDF value
    if ( x < 0 ) {
        return 0;
    }
    // Calculate the Poisson probability for each integer from 0 to x
    for ( let i = 0; i <= x; i++ ) {
        arr.push( poissonPdf( i, mean ) );
    }
    // Sum all the Poisson probabilities to get the CDF value
    return BigNumber.sum.apply( null, arr );
}
module.exports.poissonCdf = poissonCdf;

// exp = scientific notation exponent
const formatNumber = ( num, exp ) => exp ? num.toExponential( exp ) : num.toString();

/**
 * Calculates various Poisson probabilities for a given value, mean, and optional exponent.
 *
 * This function computes probabilities related to the Poisson distribution, including:
 * - The cumulative probability of observing `x` or fewer events (P(X ≤ x)).
 * - The cumulative probability of observing fewer than `x` events (P(X < x)).
 * - The probability of observing exactly `x` events (P(X = x)).
 * - The complementary probabilities for observing more than `x` events (P(X > x)),
 *   at least `x` events (P(X ≥ x)), and not exactly `x` events (P(X ≠ x)).
 *
 * @param {number} x - The value for which to calculate the Poisson probabilities.
 *                     Represents the number of occurrences (non-negative integer).
 * @param {number} mean - The mean (λ) of the Poisson distribution, representing the average number of occurrences.
 * @param {number} [exp] - An optional exponent for formatting the results. If not a number, it defaults to false.
 * @returns {Object} An object containing the following Poisson probabilities:
 *   - {number} lte - The cumulative distribution function (CDF) for P(X ≤ x).
 *   - {number} lt - The CDF for P(X < x).
 *   - {number} eq - The probability density function (PDF) for P(X = x).
 *   - {number} gt - The complementary probability for P(X > x).
 *   - {number} gte - The complementary probability for P(X ≥ x).
 *   - {number} ne - The complementary probability for P(X ≠ x).
 */
function poisson( x, mean, exp ) {
    // Check if `exp` is a number; if not, set it to false
    if ( typeof exp !== "number" ) {
        exp = false;
    }

    // Convert `exp` to an absolute integer value
    exp = Math.abs( parseInt( exp ) );

    // Validate the input data (ensures `x` and `mean` are valid numbers)
    let _data = validate( [ x, mean ] );

    // Calculate Poisson probabilities
    let results = {
        "lte": poissonCdf( _data[ 0 ], _data[ 1 ] ), // Cumulative distribution function (CDF) for P(X ≤ x)
        "lt": poissonCdf( _data[ 0 ] - 1, _data[ 1 ] ), // CDF for P(X < x)
        "eq": poissonPdf( _data[ 0 ], _data[ 1 ] ) // Probability density function (PDF) for P(X = x)
    };

    // Calculate complementary probabilities
    results.gt = new BigNumber( 1 ).minus( results.lte ); // P(X > x)
    results.gte = new BigNumber( 1 ).minus( results.lt ); // P(X ≥ x)
    results.ne = new BigNumber( 1 ).minus( results.eq ); // P(X ≠ x)

    // Format the results based on the `exp` value (e.g., scientific notation)
    for ( let key in results ) {
        results[ key ] = formatNumber( results[ key ], exp );
    }

    // Return the results as an object
    return results;
}

// Export the `poisson` function for use in other modules
module.exports.poisson = poisson;

/**
 * Validates that the input is an array of numbers or number strings.
 * Converts all elements to numbers and returns the converted array.
 * Throws an error if the input is not valid.
 *
 * @param {Array} data - The input data to validate.
 * @returns {Array} - The validated and converted array of numbers.
 * @throws {Error} - If the input is not an array or contains invalid elements.
 */

/**
 * Analyzes sequences in an array, identifying clusters of a specified size and their frequencies.
 * Optionally calculates partial matches based on a given threshold.
 *
 * @param {Array} arr - The input array to analyze.
 * @param {number} [clusterSize=4] - The size of the clusters to form from the array elements.
 * @param {number} [threshold] - The threshold for calculating partial matches.
 * @returns {Object} An object containing the analysis results:
 *   - {Object} sequences: An object with sequences as keys and their frequencies as values.
 *   - {Object} partials: An object with partial matches if a threshold is provided.
 *   - {number} threshold: The threshold value used for partial matches.
 *   - {number} strictDuplicates: The number of unique sequences that occur more than once.
 */
function sequenceAnalysis( arr, clusterSize = 4, threshold ) {
    // Initialize an empty array to store sequences and an object to count sequences
    let newArray = [];
    let sequences = {};
    let partials = {};

    // Iterate through the array to form clusters of the specified size
    for ( let i = 0; i < arr.length - clusterSize + 1; i++ ) {
        let temp = [];
        for ( let j = i; j < i + clusterSize; j++ ) {
            if ( j > arr.length - 1 ) {
                break; // Stop if the index exceeds the array length

            }
            temp.push( arr[ j ] ); // Add the current element to the temporary cluster
        }
        let p = temp.join( "," ); // Convert the cluster to a comma-separated string

        // Count the occurrences of each sequence
        if ( sequences[ p ] === undefined ) {
            sequences[ p ] = 1; // Initialize the count for a new sequence
        }
        else {
            sequences[ p ]++; // Increment the count for an existing sequence
        }
        newArray.push( p ); // Add the sequence to the new array
    }

    // Remove sequences that occur only once
    for ( let i in sequences ) {
        if ( sequences[ i ] === 1 ) {
            delete sequences[ i ]; // Remove sequences with a frequency of 1
        }
    }

    // Sort sequences by their frequency in descending order
    let keys = Object.keys( sequences ).sort( ( a, b ) => {
        if ( sequences[ b ] > sequences[ a ] ) {
            return 1;
        }
        else if ( sequences[ b ] === sequences[ a ] ) {
            return 0;
        }
        else {
            return -1;
        }
    } );

    // Create a sorted object of sequences and their counts
    let p = {};
    if ( keys.length ) {
        for ( let i = 0; i < keys.length; i++ ) {
            p[ keys[ i ] ] = sequences[ keys[ i ] ];
        }
    }

    // If a threshold is provided, calculate partial matches
    if ( threshold ) {
        partials = partialMatches( newArray, threshold );
    }

    // Return the analysis results
    return {
        "sequences": p, // Object with sequences and their frequencies
        "partials": partials, // Object with partial matches (if threshold is provided)
        "threshold": threshold, // The threshold value used for partial matches
        "strictDuplicates": Object.keys( sequences ).length // Number of unique sequences that occur more than once
    };
}

// Export the `sequenceAnalysis` function for use in other modules
module.exports.sequenceAnalysis = sequenceAnalysis;

/**
 * Function to find partial matches between clusters based on a similarity threshold
 * @param {Array<string>} clusters - Array of cluster strings, where each string represents a cluster of elements separated by commas
 * @param {number} threshold - Similarity threshold for partial matches (default is 0.75).
 *                              A higher threshold means stricter matching.
 * @returns {Object} - Object containing partial matches with their counts and similarity coefficients.
 *                     The structure is { cluster1: { cluster2: { count, coeff } } }.
 */
function partialMatches( clusters, threshold = 0.75 ) {
    // Ensure the threshold is a valid number and parse it as a float
    threshold = parseFloat( threshold );
    if ( isNaN( threshold ) ) {
        threshold = 0.75; // Default to 0.75 if the threshold is invalid
    }

    // Object to store partial matches
    const partials = {};

    // Iterate over each cluster in the input array
    for ( let i = 0; i < clusters.length; i++ ) {
        const cluster1 = clusters[ i ]; // Current cluster
        const elements1 = cluster1.split( "," ); // Split the cluster into individual elements

        // Compare the current cluster with every other cluster in the array
        for ( let j = 0; j < clusters.length; j++ ) {
            if ( i === j ) continue; // Skip comparison with itself
            const cluster2 = clusters[ j ]; // Another cluster to compare with

            if ( cluster1 === cluster2 ) continue; // Skip if the clusters are identical

            const elements2 = cluster2.split( "," ); // Split the other cluster into individual elements
            const maxLength = Math.max( elements1.length, elements2.length ); // Determine the maximum length of the two clusters
            let sameCount = 0; // Counter for matching elements

            // Compare elements of both clusters
            for ( let k = 0; k < maxLength; k++ ) {
                if ( elements1[ k ] === elements2[ k ] ) {
                    sameCount++; // Increment the counter if elements match
                }
            }

            // Calculate the similarity coefficient as the ratio of matching elements to the maximum length
            const similarityCoeff = sameCount / maxLength;

            // If the similarity coefficient meets or exceeds the threshold, record the partial match
            if ( similarityCoeff >= threshold ) {
                // Initialize the nested structure for the current cluster if it doesn't exist
                if ( !partials[ cluster1 ] ) {
                    partials[ cluster1 ] = {};
                }

                // Initialize the structure for the compared cluster if it doesn't exist
                if ( !partials[ cluster1 ][ cluster2 ] ) {
                    partials[ cluster1 ][ cluster2 ] = {
                        count: 1, // Start the count at 1
                        coeff: parseFloat( similarityCoeff.toFixed( 3 ) ) // Store the similarity coefficient rounded to 3 decimal places
                    };
                }
                else {
                    // If the match already exists, increment the count
                    partials[ cluster1 ][ cluster2 ].count++;
                }
            }
        }
    }

    // Return the object containing all partial matches
    return partials;
}

// Export the function for use in other modules
module.exports.partialMatches = partialMatches;

/**
 * Represents a node in a decision tree.
 */
class _TreeNode {
    /**
     * Creates an instance of TreeNode.
     * @param {TreeNode|null} left - The left child node. Null if no left child exists.
     * @param {TreeNode|null} right - The right child node. Null if no right child exists.
     * @param {string} splitAttr - The attribute used for splitting the data at this node.
     * @param {number|string} splitValue - The value of the attribute used for splitting.
     */
    constructor( left, right, splitAttr, splitValue ) {
        this.left = left; // Reference to the left child node
        this.right = right; // Reference to the right child node
        this.splitAttr = splitAttr; // Attribute used for splitting the data
        this.splitValue = splitValue; // Value of the attribute used for splitting
    }
}

/**
 * Class representing an Isolation Tree.
 * An Isolation Tree is a binary tree used in anomaly detection. It recursively splits data
 * based on randomly selected attributes and values until a stopping condition is met.
 */
class _IsolationTree {
    /**
     * Create an Isolation Tree.
     * @param {number} heightLimit - The maximum height of the tree. Determines when to stop splitting.
     */
    constructor( heightLimit ) {
        this.heightLimit = heightLimit; // Set the maximum height of the tree
    }

    /**
     * Fit the Isolation Tree to the given data.
     * This method recursively splits the data into left and right subsets based on a randomly
     * selected attribute and value, creating a binary tree structure.
     *
     * @param {Array<Array<number>>} data - The dataset to fit the tree to. Each element is an array of numerical values.
     * @param {number} [currentHeight=0] - The current height of the tree during recursion. Defaults to 0.
     * @returns {TreeNode} The root node of the fitted tree.
     */
    fit( data, currentHeight = 0 ) {
        // Base case: Stop splitting if the current height exceeds the limit or if the data has 1 or fewer points
        if ( currentHeight >= this.heightLimit || data.length <= 1 ) {
            return new _TreeNode( null, null, null, null ); // Return a leaf node with no children
        }

        // Randomly select an attribute (column index) to split on
        const splitAttr = Math.floor( getSecureRandomValue() * data[ 0 ].length );

        // Determine the minimum and maximum values of the selected attribute in the dataset
        const min = Math.min( ...data.map( row => row[ splitAttr ] ) );
        const max = Math.max( ...data.map( row => row[ splitAttr ] ) );

        // Randomly select a split value within the range of the selected attribute
        const splitValue = getSecureRandomValue() * ( max - min ) + min;

        // Split the data into two subsets:
        // - Left subset: Points where the selected attribute's value is less than the split value
        // - Right subset: Points where the selected attribute's value is greater than or equal to the split value
        const left = data.filter( row => row[ splitAttr ] < splitValue );
        const right = data.filter( row => row[ splitAttr ] >= splitValue );

        // Recursively fit the left and right subsets, increasing the height by 1
        return new _TreeNode(
            this.fit( left, currentHeight + 1 ), // Fit the left subset
            this.fit( right, currentHeight + 1 ), // Fit the right subset
            splitAttr, // Store the attribute used for splitting
            splitValue // Store the value used for splitting
        );
    }
}

/**
 * Class representing an Isolation Forest.
 */
class _IsolationForest {
    constructor( numTrees, heightLimit ) {
        this.numTrees = numTrees; // Set the number of trees in the forest
        this.heightLimit = heightLimit; // Set the maximum height of each tree
        this.trees = []; // Initialize an empty array to store the trees
    }
    fit( data ) {
        // Create the specified number of trees
        for ( let i = 0; i < this.numTrees; i++ ) {
            const sample = this.sampleData( data ); // Sample the data
            const tree = new _IsolationTree( this.heightLimit ); // Create a new tree
            this.trees.push( tree.fit( sample ) ); // Fit the tree and add it to the forest
        }
    }
    sampleData( data ) {
        const sampleSize = Math.min( data.length, 256 ); // Determine the sample size (max 256)
        const sample = [];
        // Randomly sample data points
        for ( let i = 0; i < sampleSize; i++ ) {
            sample.push( data[ Math.floor( getSecureRandomValue() * data.length ) ] );
        }
        return sample;
    }
    pathLength( point, node, currentHeight = 0 ) {
        // Base case: if the node is a leaf, return the current height
        if ( !node.left && !node.right ) {
            return currentHeight;
        }
        // Recursively calculate the path length based on the split attribute and value
        if ( point[ node.splitAttr ] < node.splitValue ) {
            return this.pathLength( point, node.left, currentHeight + 1 );
        }
        else {
            return this.pathLength( point, node.right, currentHeight + 1 );
        }
    }
    anomalyScore( point ) {
        // Calculate the average path length for the point across all trees
        const avgPathLength = this.trees.reduce( ( sum, tree ) => sum + this.pathLength( point, tree ), 0 ) / this.numTrees;
        // Calculate the normalization factor
        const c = 2 * ( Math.log( this.numTrees - 1 ) + 0.5772156649 ) - ( 2 * ( this.numTrees - 1 ) / this.numTrees );
        // Calculate and return the anomaly score
        return Math.pow( 2, -avgPathLength / c );
    }
}
module.exports._IsolationForest = _IsolationForest;

/**
 * Performs Grubbs's test to detect outliers in a dataset.
 *
 * Grubbs's test is a statistical test used to identify outliers in a dataset.
 * It iteratively removes the most extreme value (based on the test statistic)
 * and recalculates the test statistic until no more outliers are detected.
 *
 * @param {number[]} data - The input array of numerical data.
 * @returns {number[]} - An array of detected outliers.
 *
 * @example
 * const data = [1, 2, 3, 4, 100];
 * const outliers = grubbsTest(data);
 * console.log(outliers); // [100]
 */
function grubbsTest( data ) {
    // Initialize an array to store detected outliers
    const outliers = [];

    // Create a copy of the input data to work with, so the original array is not modified
    let remainingData = [ ...data ];

    // Continue the test as long as there are more than 2 data points
    while ( remainingData.length > 2 ) {
        // Calculate the mean of the remaining data
        const mean = ss.mean( remainingData );

        // Calculate the standard deviation of the remaining data
        const stdDev = ss.standardDeviation( remainingData );

        // Calculate the test statistic for each data point
        // The test statistic is the absolute difference between the data point and the mean,
        // divided by the standard deviation
        const testStats = remainingData.map( x => Math.abs( x - mean ) / stdDev );

        // Calculate the critical value from the t-distribution
        // This value determines the threshold for identifying outliers
        const criticalValue = getCriticalValue( remainingData.length );

        // Identify the most extreme outlier based on the test statistics
        const maxStat = Math.max( ...testStats ); // Find the maximum test statistic
        const outlierIndex = testStats.indexOf( maxStat ); // Get the index of the maximum test statistic
        const outlier = remainingData[ outlierIndex ]; // Get the corresponding data point

        // If the most extreme value is not an outlier (test statistic <= critical value), exit the loop
        if ( maxStat <= criticalValue ) {
            break;
        }

        // Add the detected outlier to the outliers array
        outliers.push( outlier );

        // Remove the detected outlier from the remaining data
        remainingData.splice( outlierIndex, 1 );
    }

    // Return the array of detected outliers
    return outliers;
}

// Export the Grubbs's test function for use in other modules
module.exports.grubbsTest = grubbsTest;

/**
 * Calculates an approximation of the t-distribution critical value for large sample sizes.
 *
 * This function approximates the critical value for a two-tailed t-test with a significance level of 0.05.
 * It is used in statistical tests like Grubbs's test to determine whether a data point is an outlier.
 *
 * @param {number} n - The sample size (number of data points).
 * @returns {number} The approximated critical value for the given sample size.
 */
function getCriticalValue( n ) {
    // Approximation of the t-distribution critical value for large sample sizes
    const tCritical = 1.96; // Critical value for a 95% confidence interval (alpha = 0.05, two-tailed test)
    // Calculate the critical value using the formula:
    // (n - 1) * tCritical / sqrt(n * (n - 2))
    return ( n - 1 ) * tCritical / Math.sqrt( n * ( n - 2 ) );
}

// Cluster utilities are extracted to `src/cluster.js`.
// The exports below preserve the stable public API surface.
module.exports.dbscan = cluster.dbscan;
module.exports.optics = cluster.optics;
module.exports.kNearestNeighbors = cluster.kNearestNeighbors;
module.exports.reachabilityDistance = cluster.reachabilityDistance;
module.exports.localReachabilityDensity = cluster.localReachabilityDensity;
module.exports.localOutlierFactor = cluster.localOutlierFactor;
module.exports.assignClusters = cluster.assignClusters;
module.exports.updateCentroids = cluster.updateCentroids;
module.exports.initializeCentroids = cluster.initializeCentroids;
module.exports.kMeans = cluster.kMeans;

/**
 * Work in progress
 */

// Work in progress
class Outliers {
    constructor( data ) {
        const validatedData = validate( data );
        this.zscore = zscore( validatedData );
        this.modifiedZscore = modifiedZscore( validatedData );
        this.iqr = iqr( validatedData );
        this.grubbsTest = grubbsTest( validatedData );
        this.localOutlierFactor = localOutlierFactor( validatedData );
        this.validatedData = validatedData;
    }
    isAnomaly( val ) {
        if ( !Number.isFinite( val ) ) {
            throw new Error( "Non-numeric value passed" );
        }
        if ( !this.validatedData.includes( val ) ) {
            throw new Error( `Value "${val}" is not part of the dataset.` );
        }
        return {
            "zscore": this.zscore.includes( val ),
            "modifiedZscore": this.modifiedZscore.includes( val ),
            "iqr": this.iqr.includes( val ),
            "grubbsTest": this.grubbsTest.includes( val ),
            "localOutlierFactor": this.localOutlierFactor.includes( val )
        }
    }
}
module.exports.Outliers = Outliers;

/**
 * Generates an array of normally distributed random numbers using the Box-Muller transform.
 *
 * @param {number} [mean=0] - The mean (μ) of the normal distribution.
 * @param {number} [stdDev=1] - The standard deviation (σ) of the normal distribution.
 * @param {number} [quantity=20] - The number of random numbers to generate.
 * @returns {number[]} An array of normally distributed random numbers.
 */
function generateNormalData( mean = 0, stdDev = 1, quantity = 20 ) {
    let data = [];
    for ( let i = 0; i < quantity; i++ ) {
        let z = boxMullerTransform();
        let value = mean + z * stdDev;
        data.push( value );
    }
    return data;
}
module.exports.generateNormalData = generateNormalData;

/**
 * Generates a normally distributed random number using the Box-Muller transform.
 * @returns {number} A normally distributed random number.
 */
function boxMullerTransform() {
    // Generate two independent secure random values between 0 and 1
    let u1 = getSecureRandomValue();
    let u2 = getSecureRandomValue();
    // Variable to store the result
    let z0;
    // Use the Box-Muller transform to generate a normally distributed random number
    if ( getSecureRandomValue() > 0.5 ) {
        z0 = Math.sqrt( -2.0 * Math.log( u1 ) ) * Math.cos( 2.0 * PI.toNumber() * u2 );
    }
    else {
        z0 = Math.sqrt( -2.0 * Math.log( u1 ) ) * Math.sin( 2.0 * PI.toNumber() * u2 );
    }
    return z0;
}
module.exports.boxMullerTransform = boxMullerTransform;

/**
 * Generates an array of random evenly distributed data around a given mean.
 *
 * @param {number} [mean=0] - The mean (μ) of the distribution.
 * @param {number} [range=20] - The range around the mean (mean ± range)
 * @param {number} [quantity=20] - The number of data points to generate.
 * @returns {number[]} An array of evenly distributed data.
 */
function generateEvenData( mean = 0, range = 20, quantity = 20 ) {
    const step = range / ( quantity - 1 );
    let data = [];
    let start = mean - range / 2;
    for ( let i = 0; i < quantity; i++ ) {
        let randomStep = step * ( getSecureRandomValue() - 0.5 ); // Random value within ±step/2
        data.push( start + i * step + randomStep );
    }
    return data;
}
module.exports.generateEvenData = generateEvenData;

/**
 * Generates a cryptographically secure random value between 0 and 1.
 * @returns {number} A random value between 0 and 1.
 */
function getSecureRandomValue() {
    const buffer = crypto.randomBytes( 4 ); // Generate a random 4-byte buffer
    const randomInt = buffer.readUInt32BE( 0 ); // Convert the buffer to a 32-bit unsigned integer
    const MAX_UINT32 = 0xFFFFFFFF; // Maximum value for a 32-bit unsigned integer
    return randomInt / MAX_UINT32; // Normalize the integer to a value between 0 and 1
}

module.exports.getSecureRandomValue = getSecureRandomValue;

/**
 * Mulberry32 PRNG - deterministic random number generator.
 * Returns a function that generates random numbers in [0, 1).
 * @param {number} seed - Integer seed
 * @returns {Function} - RNG function producing uniform values in [0,1)
 */
function createSeededRNG( seed ) {
    // Ensure seed is a 32-bit integer
    seed = seed >>> 0;
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
        t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
        return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
    };
}

/**
 * Compute c(n) = 2*H(n-1) - 2*(n-1)/n where H(i) ~= ln(i) + EulerGamma.
 * @param {number} n
 * @returns {number}
 */
function _computeC( n ) {
    if ( n <= 1 ) return 0;
    const H = Math.log( n - 1 ) + 0.5772156649; // Euler-Mascheroni constant approximation
    return 2 * H - 2 * ( n - 1 ) / n;
}

/**
 * Sample without replacement using partial Fisher-Yates shuffle.
 * @param {Array<Array<number>>} data
 * @param {number} sampleSize
 * @param {Function} rng - Function returning uniform [0,1)
 * @returns {Array<Array<number>>}
 */
function _sampleWithoutReplacement( data, sampleSize, rng ) {
    const n = data.length;
    const size = Math.min( sampleSize, n );
    const indices = Array.from( {
        length: n
    }, ( _, i ) => i );
    for ( let i = 0; i < size; i++ ) {
        const j = i + Math.floor( rng() * ( n - i ) );
        [ indices[ i ], indices[ j ] ] = [ indices[ j ], indices[ i ] ];
    }
    return indices.slice( 0, size ).map( i => data[ i ] );
}

/**
 * Check variance for given feature index.
 * @param {Array<Array<number>>} data
 * @param {number} featureIdx
 * @returns {boolean}
 */
function _hasVariance( data, featureIdx ) {
    if ( data.length === 0 ) return false;
    const first = data[ 0 ][ featureIdx ];
    for ( let i = 1; i < data.length; i++ ) {
        if ( data[ i ][ featureIdx ] !== first ) return true;
    }
    return false;
}

/**
 * Validate input data shape and numeric contents.
 * Accepts 2D array or single point (1D) which is normalized to 2D.
 * @param {Array<Array<number>>|Array<number>} X
 * @param {number|null} expectedFeatures
 * @returns {{data:Array<Array<number>>, isSinglePoint:boolean}}
 */
function _validateInputData( X, expectedFeatures = null ) {
    if ( !Array.isArray( X ) || X.length === 0 ) {
        throw new Error( 'Input data must be a non-empty array' );
    }
    const isSinglePoint = typeof X[ 0 ] === 'number';
    const data = isSinglePoint ? [ X ] : X;
    const nFeatures = Array.isArray( data[ 0 ] ) ? data[ 0 ].length : 0;
    if ( nFeatures === 0 ) throw new Error( 'Data rows must contain at least one feature' );
    for ( let i = 0; i < data.length; i++ ) {
        if ( !Array.isArray( data[ i ] ) || data[ i ].length !== nFeatures ) {
            throw new Error( `Row ${i} has inconsistent length` );
        }
        for ( let j = 0; j < nFeatures; j++ ) {
            const v = data[ i ][ j ];
            if ( typeof v !== 'number' || !isFinite( v ) ) {
                throw new Error( `Invalid numeric value at row ${i}, col ${j}` );
            }
        }
    }
    if ( expectedFeatures !== null && nFeatures !== expectedFeatures ) {
        throw new Error( `Expected ${expectedFeatures} features, got ${nFeatures}` );
    }
    return {
        data,
        isSinglePoint
    };
}

/**
 * Build an Isolation Tree (classic axis-aligned) recursively.
 * Returns external node { size } or internal node { splitAttr, splitValue, left, right }.
 * @param {Array<Array<number>>} data
 * @param {number} currentHeight
 * @param {number} maxDepth
 * @param {string} method - currently only 'axis' supported in Session 2
 * @param {null|number} extensionLevel - ignored for axis in Session 2
 * @param {number} nFeatures
 * @param {Function} rng
 * @returns {Object}
 */
function _buildTree( data, currentHeight, maxDepth, method, extensionLevel, nFeatures, rng ) {
    // Base cases
    if ( currentHeight >= maxDepth || data.length <= 1 ) {
        return {
            size: data.length
        };
    }
    // Extended Isolation Forest: random hyperplanes
    if ( method === 'extended' ) {
        // Determine number of features used in hyperplane
        let k = extensionLevel == null ? nFeatures : Math.max( 1, Math.min( extensionLevel, nFeatures ) );
        // Choose k distinct feature indices using partial Fisher-Yates
        const all = Array.from( {
            length: nFeatures
        }, ( _, i ) => i );
        for ( let i = 0; i < k; i++ ) {
            const j = i + Math.floor( rng() * ( nFeatures - i ) );
            [ all[ i ], all[ j ] ] = [ all[ j ], all[ i ] ];
        }
        const selectedFeatures = all.slice( 0, k );

        // Generate normal vector via Box-Muller transform for standard normals
        const normalVector = [];
        for ( let i = 0; i < k; i++ ) {
            let u1 = rng();
            let u2 = rng();
            if ( u1 <= 1e-12 ) u1 = 1e-12; // avoid log(0)
            const z = Math.sqrt( -2 * Math.log( u1 ) ) * Math.cos( 2 * Math.PI * u2 );
            normalVector.push( z );
        }
        // Normalize vector; if degenerate zero-length (unlikely), fallback to axis
        let norm2 = 0;
        for ( let i = 0; i < k; i++ ) norm2 += normalVector[ i ] * normalVector[ i ];
        if ( norm2 === 0 ) {
            return _buildTree( data, currentHeight, maxDepth, 'axis', null, nFeatures, rng );
        }
        const norm = Math.sqrt( norm2 );
        for ( let i = 0; i < k; i++ ) normalVector[ i ] /= norm;

        // Project points onto the normal to get intercepts
        const intercepts = new Array( data.length );
        let minI = Infinity,
            maxI = -Infinity;
        for ( let r = 0; r < data.length; r++ ) {
            let dot = 0;
            const row = data[ r ];
            for ( let i = 0; i < k; i++ ) {
                dot += row[ selectedFeatures[ i ] ] * normalVector[ i ];
            }
            intercepts[ r ] = dot;
            if ( dot < minI ) minI = dot;
            if ( dot > maxI ) maxI = dot;
        }
        if ( minI === maxI ) {
            return {
                size: data.length
            };
        }
        const splitIntercept = rng() * ( maxI - minI ) + minI;
        const left = [];
        const right = [];
        for ( let r = 0; r < data.length; r++ ) {
            if ( intercepts[ r ] < splitIntercept ) left.push( data[ r ] );
            else right.push( data[ r ] );
        }
        if ( left.length === 0 || right.length === 0 ) {
            return {
                size: data.length
            };
        }
        return {
            normalVector,
            selectedFeatures,
            splitIntercept,
            left: _buildTree( left, currentHeight + 1, maxDepth, method, extensionLevel, nFeatures, rng ),
            right: _buildTree( right, currentHeight + 1, maxDepth, method, extensionLevel, nFeatures, rng )
        };
    }

    // Axis-aligned split
    let anyVariance = false;
    const candidateFeatures = [];
    for ( let f = 0; f < nFeatures; f++ ) {
        if ( _hasVariance( data, f ) ) {
            anyVariance = true;
            candidateFeatures.push( f );
        }
    }
    if ( !anyVariance ) {
        return {
            size: data.length
        };
    }
    const splitAttr = candidateFeatures[ Math.floor( rng() * candidateFeatures.length ) ];
    let min = Infinity,
        max = -Infinity;
    for ( let i = 0; i < data.length; i++ ) {
        const v = data[ i ][ splitAttr ];
        if ( v < min ) min = v;
        if ( v > max ) max = v;
    }
    if ( min === max ) {
        return {
            size: data.length
        }; // degeneracy fallback
    }
    const splitValue = rng() * ( max - min ) + min;
    const left = [];
    const right = [];
    for ( let i = 0; i < data.length; i++ ) {
        const row = data[ i ];
        if ( row[ splitAttr ] < splitValue ) left.push( row );
        else right.push( row );
    }
    if ( left.length === 0 || right.length === 0 ) {
        return {
            size: data.length
        }; // ineffective split fallback
    }
    return {
        splitAttr,
        splitValue,
        left: _buildTree( left, currentHeight + 1, maxDepth, method, extensionLevel, nFeatures, rng ),
        right: _buildTree( right, currentHeight + 1, maxDepth, method, extensionLevel, nFeatures, rng )
    };
}

/**
 * Compute path length for a point in a single tree.
 * @param {Array<number>} point
 * @param {Object} node
 * @param {number} currentHeight
 * @param {string} method
 * @returns {number}
 */
function _pathLength( point, node, currentHeight, method ) {
    if ( node.size !== undefined ) {
        return node.size > 1 ? currentHeight + _computeC( node.size ) : currentHeight;
    }
    // Extended node: compare projection against splitIntercept
    if ( node.normalVector && node.selectedFeatures ) {
        let dot = 0;
        for ( let i = 0; i < node.selectedFeatures.length; i++ ) {
            dot += point[ node.selectedFeatures[ i ] ] * node.normalVector[ i ];
        }
        if ( dot < node.splitIntercept ) {
            return _pathLength( point, node.left, currentHeight + 1, method );
        }
        else {
            return _pathLength( point, node.right, currentHeight + 1, method );
        }
    }
    // Axis-aligned node
    if ( point[ node.splitAttr ] < node.splitValue ) {
        return _pathLength( point, node.left, currentHeight + 1, method );
    }
    else {
        return _pathLength( point, node.right, currentHeight + 1, method );
    }
}

// Helper exports for testing (internal namespace)
module.exports._ifHelpers = {
    createSeededRNG,
    _computeC,
    _sampleWithoutReplacement,
    _hasVariance,
    _validateInputData,
    _buildTree,
    _pathLength
};

// ================= Functional Isolation Forest API (Session 3) =================
/**
 * Train an Isolation Forest (classic axis-aligned for Session 3).
 * @param {Array<Array<number>>} X - Training data [n_samples x n_features]
 * @param {Object} options
 * @returns {Object} model
 */
function train( X, options = {} ) {
    const {
        nTrees = 100,
            sampleSize = 256,
            maxDepth = null,
            method = 'axis', // extended added in later session
            extensionLevel = null,
            seed = null,
            contamination = null
    } = options;

    if ( nTrees < 1 ) throw new Error( 'nTrees must be >= 1' );
    if ( sampleSize < 2 ) throw new Error( 'sampleSize must be >= 2' );
    if ( method !== 'axis' && method !== 'extended' ) {
        throw new Error( "method must be 'axis' or 'extended'" );
    }

    const {
        data
    } = _validateInputData( X );
    const nFeatures = data[ 0 ].length;
    const actualMaxDepth = maxDepth !== null ? maxDepth : Math.ceil( Math.log2( sampleSize ) );
    const c_psi = _computeC( sampleSize );

    const baseRng = seed !== null ? createSeededRNG( seed ) : getSecureRandomValue;
    const trees = [];
    for ( let i = 0; i < nTrees; i++ ) {
        const treeRng = seed !== null ? createSeededRNG( seed + i ) : baseRng;
        const sample = _sampleWithoutReplacement( data, sampleSize, treeRng );
        const tree = _buildTree( sample, 0, actualMaxDepth, method, extensionLevel, nFeatures, treeRng );
        trees.push( tree );
    }

    let threshold = null;
    if ( contamination !== null ) {
        if ( contamination < 0 || contamination > 0.5 ) {
            throw new Error( 'contamination must be in [0, 0.5]' );
        }
        const scoresAll = score( {
            trees,
            sampleSize,
            c_psi,
            method,
            extensionLevel,
            nFeatures
        }, data );
        const sorted = scoresAll.slice().sort( ( a, b ) => b - a ); // descending
        const cutoffIndex = Math.floor( contamination * sorted.length );
        threshold = sorted[ cutoffIndex ];
    }

    return {
        trees,
        sampleSize,
        c_psi,
        method,
        extensionLevel,
        threshold,
        nFeatures
    };
}

/**
 * Compute anomaly scores for points.
 * @param {Object} model
 * @param {Array<Array<number>>|Array<number>} X
 * @returns {Array<number>|number}
 */
function score( model, X ) {
    const {
        trees,
        c_psi,
        method,
        nFeatures
    } = model;
    const {
        data,
        isSinglePoint
    } = _validateInputData( X, nFeatures );
    const scores = data.map( point => {
        const avgPath = trees.reduce( ( sum, tree ) => sum + _pathLength( point, tree, 0, method ), 0 ) / trees.length;
        return Math.pow( 2, -avgPath / c_psi );
    } );
    return isSinglePoint ? scores[ 0 ] : scores;
}

/**
 * Predict labels (1 normal, -1 anomaly) using threshold.
 * @param {Object} model
 * @param {Array<Array<number>>|Array<number>} X
 * @param {Object} options
 * @returns {Array<number>|number}
 */
function predict( model, X, options = {} ) {
    const threshold = options.threshold !== undefined ? options.threshold : model.threshold;
    if ( threshold === null ) throw new Error( 'No threshold available. Provide threshold or train with contamination.' );
    const s = score( model, X );
    const arr = Array.isArray( s ) ? s : [ s ];
    const labels = arr.map( v => v >= threshold ? -1 : 1 );
    return Array.isArray( s ) ? labels : labels[ 0 ];
}

/**
 * Return average path lengths (diagnostic).
 * @param {Object} model
 * @param {Array<Array<number>>|Array<number>} X
 * @returns {Array<number>|number}
 */
function pathLengths( model, X ) {
    const {
        trees,
        method,
        nFeatures
    } = model;
    const {
        data,
        isSinglePoint
    } = _validateInputData( X, nFeatures );
    const lengths = data.map( point => trees.reduce( ( sum, tree ) => sum + _pathLength( point, tree, 0, method ), 0 ) / trees.length );
    return isSinglePoint ? lengths[ 0 ] : lengths;
}

/**
 * Serialize model to JSON string for persistence.
 * @param {Object} model - Trained Isolation Forest model
 * @returns {string} JSON string representation
 */
function serialize( model ) {
    if ( !model || typeof model !== 'object' ) {
        throw new Error( 'Model must be an object' );
    }
    return JSON.stringify( model );
}

/**
 * Deserialize model from JSON string or object.
 * @param {string|Object} json - JSON string or parsed object
 * @returns {Object} Restored model ready for scoring
 */
function deserialize( json ) {
    let model;
    try {
        model = typeof json === 'string' ? JSON.parse( json ) : json;
    }
    catch ( err ) {
        throw new Error( `Failed to parse JSON: ${err.message}` );
    }

    if ( !model || typeof model !== 'object' ) {
        throw new Error( 'Deserialized value must be an object' );
    }

    // Validate required fields
    const required = [ 'trees', 'sampleSize', 'c_psi', 'method', 'nFeatures' ];
    for ( const field of required ) {
        if ( model[ field ] === undefined ) {
            throw new Error( `Missing required field: ${field}` );
        }
    }

    // Validate types
    if ( !Array.isArray( model.trees ) || model.trees.length === 0 ) {
        throw new Error( 'trees must be a non-empty array' );
    }
    if ( typeof model.sampleSize !== 'number' || model.sampleSize < 1 ) {
        throw new Error( 'sampleSize must be a positive number' );
    }
    if ( typeof model.c_psi !== 'number' || model.c_psi < 0 ) {
        throw new Error( 'c_psi must be a non-negative number' );
    }
    if ( model.method !== 'axis' && model.method !== 'extended' ) {
        throw new Error( "method must be 'axis' or 'extended'" );
    }
    if ( typeof model.nFeatures !== 'number' || model.nFeatures < 1 ) {
        throw new Error( 'nFeatures must be a positive number' );
    }

    return model;
}

// Export functional API (Session 5: serialization added)
module.exports.IsolationForest = {
    train,
    score,
    predict,
    pathLengths,
    serialize,
    deserialize
};
