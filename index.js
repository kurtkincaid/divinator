/*
    Filename: index.js
    Description: Divinator, diviner of secrets, detector of anomalies
    Author: Kurt Kincaid
    Last Updated: 2025-05-08T22:00:39.571Z
    Version: 3.1.0

    -----
    Copyright 2025 Kurt Kincaid

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
    interesting application, I would love to hear about it. Please
    email me at kurt.kincaid@gmail.com and tell me about it. Also,
    any thoughts, comments, or recommendations are always welcome.

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

module.exports.version = "3.1.0";

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

/*
    NOTES:
        Zone X:
            Below, when referencing control chart "zones," I have created Zone X, which
            is the name I have given to points that fall above or below Zone A. This is
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
    /**
     * Constructs a Zone instance.
     * @param {number[]} data - An array of numerical data points.
     */
    constructor( data ) {
        // Validate the input data and store it
        const _data = validate( data );
        this.data = _data;

        // Calculate statistical measures for the data
        this.mean = ss.mean( _data ); // Mean of the data
        this.std = ss.standardDeviation( _data ); // Standard deviation of the data
        this.median = ss.median( _data ); // Median of the data

        // Define zones A, B, and C based on standard deviations from the mean
        this.zones = [ "C", "B", "A" ].map( ( zone, index ) => {
            const factor = index + 1; // Factor increases with each zone
            return {
                name: zone, // Zone name
                max: this.mean + ( this.std * factor ), // Upper bound of the zone
                min: this.mean - ( this.std * factor ) // Lower bound of the zone
            };
        } );

        // Determine which zone each data point belongs to
        this.dataZones = _data.map( val => this.which( val ) );
    }

    /**
     * Determines the zone to which a given value belongs.
     * @param {number} val - The value to categorize.
     * @returns {string} - The name of the zone ("A", "B", "C", or "X").
     */
    which( val ) {
        // Iterate through the defined zones
        for ( const zone of this.zones ) {
            // Check if the value falls within the current zone's range
            if ( val >= zone.min && val < zone.max ) {
                return zone.name; // Return the zone name
            }
        }
        return "X"; // Return "X" if the value is outside all defined zones
    }
}

// Export the Zone class for use in other modules
module.exports.Zone = Zone;

// Define the probability object with probabilities for different sigma levels
const probability = {
    "A": 0.9973002039367482, // Probability for 3 sigma (99.73% of data falls within this range)
    "B": 0.9544997361036420, // Probability for 2 sigma (95.45% of data falls within this range)
    "C": 0.6826894921371215 // Probability for 1 sigma (68.27% of data falls within this range)
};
module.exports.probability = probability;

// Define the discrete probability object with probabilities for different sigma levels
const discrete = {
    // Probability for Zone A (3 sigma) minus Probability for Zone B (2 sigma)
    "A": probability[ "A" ] - probability[ "B" ], // Represents the probability of data falling in Zone A only
    // Probability for Zone B (2 sigma) minus Probability for Zone C (1 sigma)
    "B": probability[ "B" ] - probability[ "C" ], // Represents the probability of data falling in Zone B only
    // Probability for Zone C (1 sigma)
    "C": probability[ "C" ] // Represents the probability of data falling in Zone C only
};
module.exports.discrete = discrete;

// Define the control chart rules with their descriptions and probabilities
const rules = {
    // Rule Alpha: One or more points beyond Zone A (3 sigma)
    "alpha": "1+ points beyond Zone A (Prob. 0.00270)", // Indicates extreme outliers
    // Rule Bravo: 2 out of 3 consecutive points in Zone A or beyond (3 sigma)
    "bravo": "2 out of 3 consecutive points in Zone A or beyond (Prob. 0.00198)", // Indicates a potential trend or shift
    // Rule Charlie: 4 out of 5 consecutive points in Zone B or beyond (2 sigma)
    "charlie": "4 out of 5 consecutive points in Zone B or beyond (Prob. 0.00692)", // Indicates a moderate trend or shift
    // Rule Delta: 7 or more consecutive points on one side of the average
    "delta": "7+ consecutive points on one side of the average", // Indicates a sustained shift in the process
    // Rule Echo: 7 or more consecutive points trending up or down
    "echo": "7+ consecutive points trending up or down", // Indicates a consistent upward or downward trend
    // Rule Foxtrot: 8 or more consecutive points with no points in Zone C (1 sigma)
    "foxtrot": "8+ consecutive points with no points in Zone C (Prob. < 0.00010)", // Indicates a lack of variability
    // Rule Golf: 15 or more consecutive points in Zone C (1 sigma)
    "golf": "15+ consecutive points in Zone C (Prob. < 0.00326)", // Indicates very low variability
    // Rule Hotel: 14 or more consecutive points alternating up and down
    "hotel": "14+ consecutive points alternating up and down" // Indicates a systematic oscillation
};
module.exports.rules = rules;

/**
 * Analyzes statistical patterns in a dataset and detects various control chart patterns.
 *
 * @param {Object|Array} data - The input data, either as an object with a `data` property or as an array.
 * @param {boolean} _collapse - A flag indicating whether to collapse the result.
 * @returns {Object} The result object containing statistical measures, outliers, and detected patterns.
 *
 * @property {Array} 1sigma - Range within one standard deviation from the mean.
 * @property {Array} 2sigma - Range within two standard deviations from the mean.
 * @property {Array} 3sigma - Range within three standard deviations from the mean.
 * @property {Array} 4sigma - Range within four standard deviations from the mean.
 * @property {Array} 5sigma - Range within five standard deviations from the mean.
 * @property {number} jarqueBera - The Jarque-Bera test statistic.
 * @property {number} kurtosis - The kurtosis of the data.
 * @property {number} max - The maximum value in the data.
 * @property {number} mean - The mean of the data.
 * @property {number} median - The median of the data.
 * @property {number} medianAbsoluteDeviation - The median absolute deviation of the data.
 * @property {number} min - The minimum value in the data.
 * @property {number} mode - The mode of the data.
 * @property {Object} outliers - The outliers detected using different methods.
 * @property {number} pValue - The p-value associated with the Jarque-Bera test.
 * @property {number} sampleCorrelation - The sample correlation between the data and its indices.
 * @property {number} skewness - The skewness of the data.
 * @property {number} spread - The range of the data (max - min).
 * @property {number} standardDeviation - The standard deviation of the data.
 * @property {number} pValue - The z-score of the maximum value.
 * @property {number} zScoreMin - The z-score of the minimum value.
 * @property {Object} poisson - The Poisson distribution for each data point.
 * @property {Array} alpha - Indices of points beyond the control limits.
 * @property {Array} bravo - Indices of 2 out of 3 consecutive points in Zone A or Zone X.
 * @property {Array} charlie - Indices of 4 out of 5 consecutive points in Zone B, Zone A, or Zone X.
 * @property {Array} delta - Indices of 7+ consecutive points on one side of the mean.
 * @property {Array} echo - Indices of 7+ consecutive points trending up or down.
 * @property {Array} foxtrot - Indices of 8+ consecutive points with no points in Zone C.
 * @property {Array} golf - Indices of 15+ consecutive points in Zone C.
 * @property {Array} hotel - Indices of 14+ consecutive points alternating up and down.
 */
function patterns( data, _collapse ) {
    // Initialize data array
    let _data = [];
    if ( data.data ) {
        _data = data.data; // Extract data from the object if it has a `data` property
    }
    else {
        _data = data; // Use the input directly if it's an array
    }

    // Validate the data
    _data = validate( _data );

    // Calculate statistical measures
    let mean = ss.mean( _data ); // Mean of the data
    let std = ss.standardDeviation( _data ); // Standard deviation of the data
    let median = ss.median( _data ); // Median of the data
    let min = ss.min( _data ); // Minimum value in the data
    let max = ss.max( _data ); // Maximum value in the data
    let skewness = ss.sampleSkewness( _data ); // Skewness of the data
    let kurtosis = ss.sampleKurtosis( _data ); // Kurtosis of the data

    // Create an array of indices for the data points
    let ctr = [];
    for ( let i = 0; i < _data.length; i++ ) {
        ctr.push( i );
    }

    // Initialize Zone and perform the Jarque-Bera test for normality
    let z = new Zone( _data );
    let jb = jarqueBera( _data );

    // Calculate outliers using different methods
    const outliers = {
        "zscore": zscore( _data ), // Outliers based on z-score
        "modifiedZscore": modifiedZscore( _data ), // Outliers based on modified z-score
        "iqr": iqr( _data ) // Outliers based on interquartile range
    };

    // Initialize the result object with statistical measures and outliers
    let p = {
        "1sigma": [ mean - std, mean + std ], // Range within one standard deviation
        "2sigma": [ mean - std * 2, mean + std * 2 ], // Range within two standard deviations
        "3sigma": [ mean - std * 3, mean + std * 3 ], // Range within three standard deviations
        "4sigma": [ mean - std * 4, mean + std * 4 ], // Range within four standard deviations
        "5sigma": [ mean - std * 5, mean + std * 5 ], // Range within five standard deviations
        "jarqueBera": jb, // Jarque-Bera test statistic
        "kurtosis": kurtosis, // Kurtosis of the data
        "max": max, // Maximum value in the data
        "mean": mean, // Mean of the data
        "median": median, // Median of the data
        "medianAbsoluteDeviation": ss.medianAbsoluteDeviation( _data ), // Median absolute deviation
        "min": min, // Minimum value in the data
        "mode": ss.modeSorted( _data ), // Mode of the data
        "outliers": outliers, // Detected outliers
        "sampleCorrelation": ss.sampleCorrelation( _data, ctr ), // Sample correlation
        "skewness": skewness, // Skewness of the data
        "spread": max - min, // Range of the data
        "standardDeviation": std, // Standard deviation of the data
        "pValue": ss.zScore( max, mean, std ), // Z-score of the maximum value
        "zScoreMin": ss.zScore( min, mean, std ), // Z-score of the minimum value
        "poisson": {}, // Placeholder for Poisson distribution
        "alpha": [], // Points beyond control limits
        "bravo": [], // 2 out of 3 consecutive points in Zone A or beyond
        "charlie": [], // 4 out of 5 consecutive points in Zone B or beyond
        "delta": [], // 7+ consecutive points on one side of the mean
        "echo": [], // 7+ consecutive points trending up or down
        "foxtrot": [], // 8+ consecutive points with no points in Zone C
        "golf": [], // 15+ consecutive points in Zone C
        "hotel": [] // 14+ consecutive points alternating up and down
    };

    // Initialize an event emitter to handle pattern detection
    let emitter = new ee();
    emitter.on( "points", ( _pts, _me ) => {
        p[ _me ].push( _pts ); // Add detected points to the corresponding pattern
    } );

    // Analyze zones and detect patterns
    const zoneVals = z[ "zones" ];
    for ( let i = 0; i < zoneVals.length; i++ ) {
        // Detect various control chart patterns (e.g., alpha, bravo, charlie, etc.)
        // Each pattern is analyzed and detected based on specific rules
        // Detected points are emitted and added to the result object
        // Alpha: One or more points beyond the control limits (Zone "X")
        if ( z[ "zones" ][ i ] === "X" ) {
            // If the current point is in Zone "X" (beyond control limits), add its index to the "alpha" pattern
            p[ "alpha" ].push( i );
        }

        // Bravo: 2 out of 3 consecutive points in Zone A or Zone X
        let me = "bravo"; // Pattern name
        let pts = []; // Array to store indices of points being analyzed
        let _bravo = 0; // Counter for points in Zone A or Zone X
        for ( let j = i; j < i + 3; j++ ) {
            if ( z[ "zones" ][ j ] !== undefined ) {
                pts.push( j ); // Add the index to the points array
                if ( z[ "zones" ][ j ] === "A" || z[ "zones" ][ j ] === "X" ) {
                    _bravo++; // Increment the counter if the point is in Zone A or Zone X
                }
            }
        }
        if ( _bravo >= 2 && pts.length === 3 ) {
            // If 2 out of 3 consecutive points are in Zone A or Zone X, emit the "bravo" pattern
            emitter.emit( "points", pts, me );
        }

        // Charlie: 4 out of 5 consecutive points in Zone B, Zone A, or Zone X
        me = "charlie"; // Pattern name
        pts = []; // Reset points array
        let _charlie = 0; // Counter for points not in Zone C
        for ( let j = i; j < i + 5; j++ ) {
            if ( z[ "zones" ][ j ] !== undefined ) {
                pts.push( j ); // Add the index to the points array
                if ( z[ "zones" ][ j ] !== "C" ) {
                    _charlie++; // Increment the counter if the point is not in Zone C
                }
            }
        }
        if ( _charlie >= 4 && pts.length === 5 ) {
            // If 4 out of 5 consecutive points are not in Zone C, emit the "charlie" pattern
            emitter.emit( "points", pts, me );
        }

        // Delta: 7+ consecutive points on one side of the mean
        me = "delta"; // Pattern name
        pts = []; // Reset points array
        let _delta = 0; // Counter for consecutive points on one side of the mean
        let above; // Boolean to track whether the points are above or below the mean
        for ( let j = i; j < i + 7; j++ ) {
            if ( _data[ j ] !== undefined ) {
                pts.push( j ); // Add the index to the points array
                if ( pts.length === 1 ) {
                    above = _data[ j ] > mean; // Determine if the first point is above or below the mean
                }
                if ( above === true && _data[ j ] > mean ) {
                    _delta++; // Increment counter if the point is above the mean
                }
                if ( above === false && _data[ j ] < mean ) {
                    _delta++; // Increment counter if the point is below the mean
                }
            }
        }
        if ( _delta >= 7 ) {
            // If 7 or more consecutive points are on one side of the mean, emit the "delta" pattern
            emitter.emit( "points", pts, me );
        }

        // Echo: 7+ consecutive points trending up or down
        me = "echo"; // Pattern name
        pts = []; // Reset points array
        let _echo = 0; // Counter for consecutive points trending in the same direction
        let prev = 0; // Previous data point value
        let dir = ""; // Direction of the trend ("up" or "down")
        for ( let j = i; j < i + 7; j++ ) {
            if ( _data[ j ] !== undefined ) {
                if ( pts.length === 0 ) {
                    prev = _data[ j ]; // Set the first point as the previous value
                    pts.push( j ); // Add the index to the points array
                    _echo++;
                    continue;
                }
                if ( pts.length === 1 ) {
                    dir = _data[ j ] > prev ? "up" : "down"; // Determine the trend direction
                    prev = _data[ j ];
                    pts.push( j );
                    _echo++;
                    continue;
                }
                if ( dir === "up" && _data[ j ] > prev ) {
                    prev = _data[ j ]; // Continue the upward trend
                    pts.push( j );
                    _echo++;
                    continue;
                }
                if ( dir === "down" && _data[ j ] < prev ) {
                    prev = _data[ j ]; // Continue the downward trend
                    pts.push( j );
                    _echo++;
                    continue;
                }
            }
        }
        if ( _echo >= 7 ) {
            // If 7 or more consecutive points are trending up or down, emit the "echo" pattern
            emitter.emit( "points", pts, me );
        }

        // Foxtrot: 8+ consecutive points with no points in Zone C
        me = "foxtrot"; // Pattern name
        pts = []; // Reset points array
        let _foxtrot = 0; // Counter for points not in Zone C
        for ( let j = i; j < i + 8; j++ ) {
            if ( z[ "zones" ][ j ] !== undefined ) {
                pts.push( j ); // Add the index to the points array
                if ( z[ "zones" ][ j ] !== "C" ) {
                    _foxtrot++; // Increment the counter if the point is not in Zone C
                }
            }
        }
        if ( _foxtrot >= 8 ) {
            // If 8 or more consecutive points are not in Zone C, emit the "foxtrot" pattern
            emitter.emit( "points", pts, me );
        }

        // Golf: 15+ consecutive points in Zone C
        me = "golf"; // Pattern name
        pts = []; // Reset points array
        let golf = 0; // Counter for points in Zone C
        for ( let j = i; j < i + 15; j++ ) {
            if ( z[ "zones" ][ j ] !== undefined ) {
                pts.push( j ); // Add the index to the points array
                if ( z[ "zones" ][ j ] === "C" ) {
                    golf++; // Increment the counter if the point is in Zone C
                }
            }
        }
        if ( golf >= 15 ) {
            // If 15 or more consecutive points are in Zone C, emit the "golf" pattern
            emitter.emit( "points", pts, me );
        }

        // Hotel: 14+ consecutive points alternating up and down
        me = "hotel"; // Pattern name
        pts = []; // Reset points array
        let _hotel = 0; // Counter for alternating points
        prev = 0; // Previous data point value
        dir = ""; // Direction of the alternation ("up" or "down")
        for ( let j = i; j < i + 14; j++ ) {
            if ( _data[ j ] !== undefined ) {
                if ( pts.length === 0 ) {
                    pts.push( j ); // Add the first point
                    prev = _data[ j ];
                    _hotel++;
                    continue;
                }
                if ( _data[ j ] === prev ) {
                    break; // Break if the current point is equal to the previous point
                }
                if ( pts.length === 1 ) {
                    pts.push( j ); // Add the second point
                    dir = _data[ j ] > prev ? "up" : "down"; // Determine the alternation direction
                    prev = _data[ j ];
                    _hotel++;
                    continue;
                }
                if ( _data[ j ] > prev && dir === "down" ) {
                    dir = "up"; // Switch direction to "up"
                }
                else if ( _data[ j ] < prev && dir === "down" ) {
                    break; // Break if the alternation is not maintained
                }
                else if ( _data[ j ] < prev && dir === "up" ) {
                    dir = "down"; // Switch direction to "down"
                }
                else if ( _data[ j ] > prev && dir === "up" ) {
                    break; // Break if the alternation is not maintained
                }
                pts.push( j ); // Add the index to the points array
                prev = _data[ j ];
                _hotel++;
            }
        }
        if ( _hotel >= 14 ) {
            // If 14 or more consecutive points alternate up and down, emit the "hotel" pattern
            emitter.emit( "points", pts, me );
        }
    }

    // Calculate Poisson distribution for each data point
    for ( let i = 0; i < _data.length; i++ ) {
        p[ "poisson" ][ _data[ i ] ] = poisson( _data[ i ], mean );
    }

    // Return collapsed or full result based on the _collapse flag
    if ( _collapse ) {
        return collapse( p ); // Collapse the result for compact representation
    }
    else {
        return p; // Return the full result
    }
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
        if ( p[ j ] && p[ j ].length ) {
            let c = []; // Initialize an empty array to concatenate elements
            // Concatenate all elements of the arrays within the array
            for ( let i = 0; i < p[ j ].length; i++ ) {
                c = c.concat( p[ j ][ i ] );
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
 * @param {number[]} dataArray - An array of numerical data points to test for normality.
 * @param {number} [significanceLevel=0.05] - The significance level for the test. Default is 0.05.
 * @returns {Object} An object containing the test statistic (W) and the approximate p-value.
 * @property {number} testStatistic - The Shapiro-Wilk test statistic (W).
 * @property {number} pValue - The approximate p-value for the test statistic.
 * @throws {Error} If the input is not a valid array or if the significance level is not between 0 and 1.
 */
function shapiroWilk( dataArray, significanceLevel = 0.05 ) {
    /*
     * Based heavily on EZ Statistics (https://github.com/jhagelback/ez_statistics)
     */

    // Validate the input array to ensure it is an array of numbers
    if ( !Array.isArray( dataArray ) ) {
        throw new Error( "Input must be a valid array of numbers." );
    }

    // Validate the significance level to ensure it is between 0 and 1
    if ( significanceLevel < 0 || significanceLevel > 1 ) {
        throw new Error( "Significance level must be between 0 and 1." );
    }

    // Sample size of the dataset
    const sampleSize = dataArray.length;

    // Sort the array in ascending order for further calculations
    dataArray.sort( ( a, b ) => a - b );

    // Calculate the expected values of the order statistics (mi) for a standard normal distribution
    const expectedValues = [];
    for ( let i = 0; i < sampleSize; i++ ) {
        const percentile = ( ( i + 1 ) - 0.375 ) / ( sampleSize + 0.25 ); // Calculate the percentile
        expectedValues.push( jstat.normal.inv( percentile, 0, 1 ) ); // Inverse CDF of the standard normal distribution
    }

    // Calculate the sum of squares of the expected values (m)
    const sumOfSquares = expectedValues.reduce( ( acc, val ) => acc + Math.pow( val, 2 ), 0 );

    // Calculate the coefficients (ai) for the test statistic
    const scalingFactor = 1 / Math.sqrt( sampleSize ); // Scaling factor for the coefficients
    const coefficients = new Array( sampleSize ).fill( 0 ); // Initialize the coefficients array

    // Calculate the coefficients for the last two elements
    coefficients[ sampleSize - 1 ] = -2.70605 * Math.pow( scalingFactor, 5 ) +
        4.434685 * Math.pow( scalingFactor, 4 ) -
        2.071190 * Math.pow( scalingFactor, 3 ) -
        0.147981 * Math.pow( scalingFactor, 2 ) +
        0.221157 * scalingFactor +
        expectedValues[ sampleSize - 1 ] * Math.pow( sumOfSquares, -0.5 );

    coefficients[ sampleSize - 2 ] = -3.582633 * Math.pow( scalingFactor, 5 ) +
        5.682633 * Math.pow( scalingFactor, 4 ) -
        1.752461 * Math.pow( scalingFactor, 3 ) -
        0.293762 * Math.pow( scalingFactor, 2 ) +
        0.042981 * scalingFactor +
        expectedValues[ sampleSize - 2 ] * Math.pow( sumOfSquares, -0.5 );

    // Calculate the coefficients for the remaining elements
    for ( let i = 0; i < sampleSize - 2; i++ ) {
        const currentIndex = i + 1;
        if ( currentIndex === 1 ) {
            coefficients[ i ] = -coefficients[ sampleSize - 1 ];
        }
        else if ( currentIndex === 2 ) {
            coefficients[ i ] = -coefficients[ sampleSize - 2 ];
        }
        else {
            const epsilon = ( sumOfSquares - 2.0 * Math.pow( expectedValues[ sampleSize - 1 ], 2 ) -
                    2.0 * Math.pow( expectedValues[ sampleSize - 2 ], 2 ) ) /
                ( 1.0 - 2.0 * Math.pow( coefficients[ sampleSize - 1 ], 2 ) -
                    2.0 * Math.pow( coefficients[ sampleSize - 2 ], 2 ) );
            coefficients[ i ] = expectedValues[ i ] / Math.sqrt( epsilon );
        }
    }

    // Calculate the sample mean
    const sampleMean = jstat.mean( dataArray );

    // Calculate the W statistic
    let numerator = 0;
    let denominator = 0;
    for ( let i = 0; i < sampleSize; i++ ) {
        numerator += coefficients[ i ] * dataArray[ i ];
        denominator += Math.pow( dataArray[ i ] - sampleMean, 2 );
    }
    const testStatistic = Math.pow( numerator, 2 ) / Math.max( denominator, 0.0000001 ); // Avoid division by zero

    // Calculate the Z statistic for the W value
    const logSampleSize = Math.log( sampleSize );
    const meanLog = 0.0038915 * Math.pow( logSampleSize, 3 ) -
        0.083751 * Math.pow( logSampleSize, 2 ) -
        0.31082 * logSampleSize -
        1.5861;
    const power = 0.0030302 * Math.pow( logSampleSize, 2 ) -
        0.082676 * logSampleSize -
        0.4803;
    const standardDeviation = Math.pow( Math.E, power );
    const zStatistic = ( Math.log( 1.0 - testStatistic ) - meanLog ) / standardDeviation;

    // Calculate the p-value using the standard normal distribution
    const pValue = 1 - jstat.normal.cdf( zStatistic, 0, 1 );

    // Return the test statistic and p-value
    return {
        testStatistic,
        pValue
    };
}

// Export the `shapiroWilk` function for use in other modules
module.exports.shapiroWilk = shapiroWilk;

/**
 * Calculates the Kolmogorov-Smirnov D statistic and p-value for a given dataset.
 *
 * @param {number[]} data - An array of numerical data points.
 * @returns {Object} An object containing the test statistic and the critical values for different alpha levels.
 */
function kolmogorovSmirnov( data ) {
    // Get the number of data points
    const n = data.length;
    // Calculate the mean of the data
    const mean = ss.mean( data );
    // Calculate the standard deviation of the data
    const stdDev = ss.standardDeviation( data );
    // Sort the data in ascending order
    const sortedData = data.slice().sort( ( a, b ) => a - b );
    // Calculate the Kolmogorov-Smirnov D statistic
    const D = Math.max( ...sortedData.map( ( value, i ) => {
        // Calculate the cumulative distribution function (CDF) for the standard normal distribution
        const cdf = ss.cumulativeStdNormalProbability( ( value - mean ) / stdDev );
        // Calculate the maximum difference between the CDF and the empirical distribution function (EDF)
        return Math.max( cdf - i / n, ( i + 1 ) / n - cdf );
    } ) );
    // Calculate the critical values for different alpha levels
    const criticalValueAlpha05 = 1.36 / Math.sqrt( n ); // critical value for alpha = 0.05
    const criticalValueAlpha10 = 1.22 / Math.sqrt( n ); // critical value for alpha = 0.10
    const criticalValueAlpha01 = 1.63 / Math.sqrt( n ); // critical value for alpha = 0.01
    return {
        "testStatistic": D,
        "criticalValues": {
            "alpha05": criticalValueAlpha05,
            "alpha10": criticalValueAlpha10,
            "alpha01": criticalValueAlpha01
        }
    };
};
module.exports.kolmogorovSmirnov = kolmogorovSmirnov;

/**
 * Performs the Jarque-Bera normality test on an array of data.
 *
 * @param {number[]} data - The array of data to test.
 * @returns {Object} An object containing the Jarque-Bera statistic, p-value, skewness, and kurtosis.
 * @property {number} testStatistic - The Jarque-Bera statistic.
 * @property {number} pValue - The p-value of the test.
 */
function jarqueBera( data ) {
    // Sample size
    const n = data.length;
    // Calculate mean and standard deviation
    const mean = jstat.mean( data );
    const stdev = jstat.stdev( data, true );
    // Initialize sums for skewness and kurtosis calculations
    let sum3 = 0;
    let sum4 = 0;
    // Calculate the sums of the third and fourth powers of deviations from the mean
    for ( let i = 0; i < n; i++ ) {
        const deviation = data[ i ] - mean;
        sum3 += Math.pow( deviation, 3 );
        sum4 += Math.pow( deviation, 4 );
    }
    // Calculate skewness
    const skewness = ( n * sum3 ) / ( ( n - 1 ) * ( n - 2 ) * Math.pow( stdev, 3 ) );
    // Calculate kurtosis
    const kurtosis = ( n * ( n + 1 ) * sum4 ) / ( ( n - 1 ) * ( n - 2 ) * ( n - 3 ) * Math.pow( stdev, 4 ) ) - ( 3 * Math.pow( n - 1, 2 ) ) / ( ( n - 2 ) * ( n - 3 ) );
    // Calculate the Jarque-Bera statistic
    const testStatistic = ( n / 6 ) * ( Math.pow( skewness, 2 ) + ( Math.pow( kurtosis, 2 ) / 4 ) );
    // Calculate the p-value
    const pValue = 1 - jstat.chisquare.cdf( testStatistic, 2 );

    // Return the results
    return {
        testStatistic,
        pValue
    }
}
module.exports.jarqueBera = jarqueBera;

/**
 * Performs the Anderson-Darling test for normality on a given dataset.
 *
 * @param {number[]} data - An array of numerical data points to be tested.
 * @returns {number} The Anderson-Darling statistic for the given data.
 * @throws {Error} If the input is not a valid array with at least two elements.
 *
 * @example
 * const data = [1.2, 2.3, 3.4, 4.5, 5.6];
 * const result = andersonDarling(data);
 * console.log(result); // Output: Anderson-Darling statistic value
 */
function andersonDarling2( data ) {
    // Check if the input is a valid array with at least two elements
    if ( !Array.isArray( data ) || data.length < 2 ) {
        throw new Error( "Data must be an array with at least two elements." );
    }
    // Validate the data
    const validatedData = validate( data );
    // Sort the data in ascending order
    validatedData.sort( ( a, b ) => a - b );
    const n = validatedData.length;
    // Calculate the mean of the data
    const mean = ss.mean( validatedData );
    // Calculate the standard deviation of the data
    const stdDev = ss.standardDeviation( validatedData )
    // Standardize the data (convert to z-scores)
    const standardizedData = validatedData.map( value => ( value - mean ) / stdDev );
    // Define the cumulative distribution function (CDF) for the normal distribution
    const normalCDF = x => 0.5 * ( 1 + erf( x / Math.sqrt( 2 ) ) );
    // Define the error function (erf) used in the CDF calculation
    const erf = x => {
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs( x );
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const t = 1 / ( 1 + p * x );
        const y = 1 - ( ( ( ( ( a5 * t + a4 ) * t ) + a3 ) * t + a2 ) * t + a1 ) * t * Math.exp( -x * x );
        return sign * y;
    };
    // Calculate the Anderson-Darling statistic
    const A2 = -n - ( 1 / n ) * standardizedData.reduce( ( sum, value, i ) => {
        const Fi = normalCDF( value );
        const term1 = ( 2 * ( i + 1 ) - 1 ) * Math.log( Fi );
        const term2 = ( 2 * ( n - i ) - 1 ) * Math.log( 1 - Fi );
        return sum + term1 + term2;
    }, 0 );
    return {
        "testStatistic": A2,
        "significanceLevel": {
            "0.1": A2 < 1.933,
            "0.05": A2 < 2.492,
            "0.01": A2 < 3.857
        }
    }
}
module.exports.andersonDarling2 = andersonDarling2;

/**
 * Performs the Anderson-Darling normality test on an array of data.
 * NOTE: The true/false values return in "pValues" answer the question
 *       of "is this data likely to follow a normal distribution?"
 *
 * @param {number[]} data - The array of data to test.
 * @returns {Object} An object containing the Anderson-Darling statistic and p-values for different confidence levels.
 * @property {number} adStatistic - The Anderson-Darling statistic.
 * @property {Object} pValues - The p-values for confidence levels of 0.10, 0.05, and 0.01.
 */
function andersonDarling( data ) {
    const n = data.length;
    const sortedData = data.slice().sort( ( a, b ) => a - b );
    const mean = jstat.mean( sortedData );
    const stdDev = jstat.stdev( sortedData, true );
    const z = sortedData.map( x => ( x - mean ) / stdDev );
    const p = z.map( x => jstat.normal.cdf( x, 0, 1 ) );
    let A2 = -n;
    for ( let i = 0; i < n; i++ ) {
        A2 -= ( 2 * i + 1 ) * ( Math.log( p[ i ] ) + Math.log( 1 - p[ n - 1 - i ] ) ) / n;
    }
    A2 *= ( 1 + 4 / n - 25 / ( n * n ) );
    const pValues = {
        "0.1": A2 < 1.933,
        "0.05": A2 < 2.492,
        "0.01": A2 < 3.857
    };
    return {
        "testStatistic": A2,
        pValues
    };
}
module.exports.andersonDarling = andersonDarling;

/**
 * Performs the Lilliefors test for normality on a given dataset.
 * The Lilliefors test is a variation of the Kolmogorov-Smirnov test
 * that is used when the parameters of the normal distribution are estimated
 * from the data.
 *
 * @param {number[]} data - An array of numerical data points to be tested for normality.
 * @returns {Object} An object containing the test statistic `d` and a boolean `isNormal`
 * indicating whether the data is normally distributed at the 0.05 significance level.
 *
 * @property {number} d - The test statistic for the Lilliefors test.
 */
function lilliefors( data ) {
    const n = data.length;
    const mean = jstat.mean( data );
    const stdDev = jstat.stdev( data, true );
    const sortedData = data.slice().sort( ( a, b ) => a - b );
    const cdf = sortedData.map( x => jstat.normal.cdf( x, mean, stdDev ) );
    const dPlus = Math.max( ...cdf.map( ( p, i ) => ( i + 1 ) / n - p ) );
    const dMinus = Math.max( ...cdf.map( ( p, i ) => p - i / n ) );
    const d = Math.max( dPlus, dMinus );
    const criticalValues = {
        "0.01": simulateLillieforsCriticalValues( n, 0.01 ),
        "0.05": simulateLillieforsCriticalValues( n, 0.05 ),
        "0.10": simulateLillieforsCriticalValues( n, 0.10 )
        //        0.01: parseFloat( ( /* 1.63 */ 1.031 / Math.sqrt( n ) ).toFixed( 10 ) ),
        //        0.05: parseFloat( ( /* 1.36 */ 0.886 / Math.sqrt( n ) ).toFixed( 10 ) ),
        //        0.10: parseFloat( ( /* 1.22 */ 0.819 / Math.sqrt( n ) ).toFixed( 10 ) )
    };
    return {
        "testStatistic": d,
        criticalValues
    };
}
module.exports.lilliefors = lilliefors;

/**
 * Simulates critical values for the Lilliefors test using Monte Carlo simulation.
 *
 * @param {number} n - The sample size.
 * @param {number} alpha - The significance level (e.g., 0.05 for a 5% significance level).
 * @param {number} [numSimulations=10000] - The number of simulations to run (default is 10,000).
 * @returns {number} The critical value for the given sample size and significance level.
 */
function simulateLillieforsCriticalValues( n, alpha, numSimulations = 10000 ) {
    const criticalValues = [];
    // Run the specified number of simulations
    for ( let i = 0; i < numSimulations; i++ ) {
        // Generate a random sample from a standard normal distribution
        const sample = Array.from( {
            length: n
        }, () => jstat.normal.sample( 0, 1 ) );
        const mean = jstat.mean( sample );
        const stdDev = jstat.stdev( sample, true );
        // Define the cumulative distribution function (CDF) for the normal distribution
        const cdf = ( x ) => jstat.normal.cdf( x, mean, stdDev );
        // Sort the sample in ascending order
        const sortedSample = sample.slice().sort( ( a, b ) => a - b );
        let dPlus = 0;
        let dMinus = 0;
        // Calculate the D+ and D- statistics
        for ( let j = 0; j < n; j++ ) {
            const empiricalCDF = ( j + 1 ) / n;
            const theoreticalCDF = cdf( sortedSample[ j ] );
            dPlus = Math.max( dPlus, empiricalCDF - theoreticalCDF );
            dMinus = Math.max( dMinus, theoreticalCDF - j / n );
        }
        // Calculate the test statistic D
        const d = Math.max( dPlus, dMinus );
        criticalValues.push( d );
    }
    // Sort the critical values in ascending order
    criticalValues.sort( ( a, b ) => a - b );
    // Determine the critical value for the given significance level
    const criticalValue = criticalValues[ Math.floor( numSimulations * ( 1 - alpha ) ) ];
    return criticalValue;
}

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
function validate( data ) {
    // Check if data is provided and is an array
    if ( !data || !Array.isArray( data ) ) {
        // Throw an error if the input is not an array
        throw new Error( "Please pass an array of numbers." );
    }

    // Convert all elements in the array to floating-point numbers
    const _data = data.map( parseFloat );

    // Check if the array contains at least one finite number
    if ( !_data.some( Number.isFinite ) ) {
        // Throw an error if the array contains invalid elements
        throw new Error( "Data included something other than numbers or number strings. Please pass an array of numbers." );
    }

    // Return the validated and converted array
    return _data;
}

// Example usage:
// const validatedArray = validate(["1", "2", "3.5", "4"]);
// console.log(validatedArray); // Output: [1, 2, 3.5, 4]

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
class TreeNode {
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
class IsolationTree {
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
            return new TreeNode( null, null, null, null ); // Return a leaf node with no children
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
        return new TreeNode(
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
class IsolationForest {
    constructor( numTrees, heightLimit ) {
        this.numTrees = numTrees; // Set the number of trees in the forest
        this.heightLimit = heightLimit; // Set the maximum height of each tree
        this.trees = []; // Initialize an empty array to store the trees
    }
    fit( data ) {
        // Create the specified number of trees
        for ( let i = 0; i < this.numTrees; i++ ) {
            const sample = this.sampleData( data ); // Sample the data
            const tree = new IsolationTree( this.heightLimit ); // Create a new tree
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
module.exports.IsolationForest = IsolationForest;

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

/**
 * Calculates the Euclidean distance between two points in n-dimensional space.
 *
 * The Euclidean distance is the straight-line distance between two points in a multi-dimensional space.
 * It is calculated as the square root of the sum of the squared differences between corresponding coordinates.
 *
 * @param {number[]} point1 - The first point as an array of numbers (e.g., [x1, y1, z1]).
 * @param {number[]} point2 - The second point as an array of numbers (e.g., [x2, y2, z2]).
 * @returns {number} The Euclidean distance between the two points.
 *
 * @example
 * const point1 = [1, 2];
 * const point2 = [4, 6];
 * console.log(euclideanDistance(point1, point2)); // Output: 5
 */
function euclideanDistance( point1, point2 ) {
    // Calculate the sum of squared differences for each dimension
    return Math.sqrt(
        point1.reduce( ( sum, value, index ) => sum + Math.pow( value - point2[ index ], 2 ), 0 )
    );
}

/**
 * Performs DBSCAN (Density-Based Spatial Clustering of Applications with Noise) clustering algorithm on a given dataset.
 *
 * DBSCAN is a density-based clustering algorithm that groups points that are closely packed together
 * and marks points that are in low-density regions as noise. It uses two parameters:
 * - `eps`: The maximum distance between two points to be considered neighbors.
 * - `minPts`: The minimum number of points required to form a dense region (cluster).
 *
 * @param {Array} dataset - The dataset to be clustered, where each element is a point (e.g., [x, y]).
 * @param {number} [eps=2] - The maximum distance between two points to be considered as neighbors.
 * @param {number} [minPts=2] - The minimum number of points required to form a dense region (cluster).
 * @returns {Object} An object containing the clusters and noise points.
 * @returns {Array} clusters - An array of clusters, where each cluster is an array of point indices.
 * @returns {Array} noise - An array of point indices that are considered noise.
 */
function dbscan( dataset, eps = 2, minPts = 2 ) {
    const clusters = []; // Array to store the clusters
    const visited = new Set(); // Set to keep track of visited points
    const noise = new Set(); // Set to keep track of noise points

    /**
     * Finds all points within `eps` distance of a given point.
     * @param {Array<number>} point - The point to find neighbors for.
     * @returns {Array<number>} An array of indices of neighboring points.
     */
    function regionQuery( point ) {
        const neighbors = [];
        for ( let i = 0; i < dataset.length; i++ ) {
            if ( euclideanDistance( point, dataset[ i ] ) <= eps ) {
                neighbors.push( i ); // Add the index of the neighboring point
            }
        }
        return neighbors;
    }

    /**
     * Expands a cluster from a given point by recursively adding all density-reachable points.
     * @param {number} pointIdx - The index of the starting point.
     * @param {Array<number>} neighbors - The neighbors of the starting point.
     * @param {Array<number>} cluster - The cluster being expanded.
     */
    function expandCluster( pointIdx, neighbors, cluster ) {
        cluster.push( pointIdx ); // Add the initial point to the cluster
        for ( let i = 0; i < neighbors.length; i++ ) {
            const neighborIdx = neighbors[ i ];
            if ( !visited.has( neighborIdx ) ) {
                visited.add( neighborIdx ); // Mark the neighbor as visited
                const newNeighbors = regionQuery( dataset[ neighborIdx ] ); // Find neighbors of the neighbor
                if ( newNeighbors.length >= minPts ) {
                    neighbors = neighbors.concat( newNeighbors ); // Add new neighbors to the list
                }
            }
            // Add the neighbor to the cluster if it's not already part of any cluster
            if ( !clusters.some( cluster => cluster.includes( neighborIdx ) ) ) {
                cluster.push( neighborIdx );
            }
        }
    }

    // Main loop to iterate over all points in the dataset
    for ( let i = 0; i < dataset.length; i++ ) {
        if ( !visited.has( i ) ) {
            visited.add( i ); // Mark the point as visited
            const neighbors = regionQuery( dataset[ i ] ); // Find neighbors of the point
            if ( neighbors.length < minPts ) {
                noise.add( i ); // Mark the point as noise if it has fewer than `minPts` neighbors
            }
            else {
                let cluster = [];
                expandCluster( i, neighbors, cluster ); // Expand the cluster from the point
                clusters.push( [ ...new Set( cluster ) ] ); // Add the new cluster to the list of clusters
            }
        }
    }

    // Return the clusters and noise points
    return {
        clusters, // Array of clusters
        noise: Array.from( noise ) // Convert the noise set to an array
    };
}

// Export the DBSCAN function for use in other modules
module.exports.dbscan = dbscan;

/**
 * Performs the OPTICS (Ordering Points To Identify the Clustering Structure) clustering algorithm on a given dataset.
 *
 * @param {Array} dataset - The dataset to be clustered, where each element is a point represented as an array of coordinates.
 * @param {number} [eps=2] - The maximum distance between two points to be considered as neighbors.
 * @param {number} [minPts=2] - The minimum number of points required to form a dense region (cluster).
 * @returns {Object} An object containing the clusters and noise points.
 * @returns {Array} clusters - An array of clusters, where each cluster is an array of point indices.
 * @returns {Array} noise - An array of point indices that are considered noise.
 */
function optics( dataset, eps = 2, minPts = 2 ) {
    const clusters = []; // Array to store the clusters
    const visited = new Set(); // Set to keep track of visited points
    const noise = new Set(); // Set to keep track of noise points
    // Function to find all points within eps distance of a given point
    function regionQuery( point ) {
        const neighbors = [];
        for ( let i = 0; i < dataset.length; i++ ) {
            if ( euclideanDistance( point, dataset[ i ] ) <= eps ) {
                neighbors.push( i ); // Add the index of the neighboring point
            }
        }
        return neighbors;
    }
    // Function to expand the cluster from a given point
    function expandCluster( pointIdx, neighbors, cluster ) {
        cluster.push( pointIdx ); // Add the initial point to the cluster
        for ( let i = 0; i < neighbors.length; i++ ) {
            const neighborIdx = neighbors[ i ];
            if ( !visited.has( neighborIdx ) ) {
                visited.add( neighborIdx ); // Mark the neighbor as visited
                const newNeighbors = regionQuery( dataset[ neighborIdx ] );
                if ( newNeighbors.length >= minPts ) {
                    neighbors = neighbors.concat( newNeighbors ); // Add new neighbors to the list
                }
            }
            if ( !clusters.some( cluster => cluster.includes( neighborIdx ) ) ) {
                cluster.push( neighborIdx ); // Add the neighbor to the cluster
            }
        }
    }
    // Main loop to iterate over all points in the dataset
    for ( let i = 0; i < dataset.length; i++ ) {
        if ( !visited.has( i ) ) {
            visited.add( i ); // Mark the point as visited
            const neighbors = regionQuery( dataset[ i ] );
            if ( neighbors.length < minPts ) {
                noise.add( i ); // Mark the point as noise if it has fewer than minPts neighbors
            }
            else {
                let cluster = [];
                expandCluster( i, neighbors, cluster ); // Expand the cluster from the point
                clusters.push( [ ...( new Set( cluster ) ) ] ); // Add the new cluster to the list of clusters
            }
        }
    }
    // Return the clusters and noise points
    return {
        clusters,
        "noise": Array.from( noise ) // Convert noise into an array
    };
}
module.exports.optics = optics;

/**
 * Finds the k nearest neighbors to a given point in a dataset.
 *
 * @param {Array} data - The dataset, an array of points.
 * @param {Array} point - The point to find neighbors for.
 * @param {number} k - The number of nearest neighbors to find.
 * @returns {Array} An array of objects representing the k nearest neighbors, each with an index and distance property.
 */
function kNearestNeighbors( data, point, k ) {
    return data
        .map( ( neighbor, index ) => ( {
            index, // Index of the neighbor
            distance: euclideanDistance( point, neighbor ) // Distance from the point to the neighbor
        } ) )
        .sort( ( a, b ) => a.distance - b.distance ) // Sort neighbors by distance
        .slice( 1, k + 1 ); // Exclude the point itself and take the k nearest neighbors
}
module.exports.kNearestNeighbors = kNearestNeighbors;

/**
 * Calculates the reachability distance between a point and its neighbor.
 *
 * The reachability distance is defined as the maximum of the k-distance of the neighbor
 * and the actual distance between the point and the neighbor.
 *
 * @param {Array} data - The dataset containing all points.
 * @param {Object} point - The point for which the reachability distance is being calculated.
 * @param {Object} neighbor - The neighbor point.
 * @param {number} k - The number of nearest neighbors to consider.
 * @returns {number} - The reachability distance between the point and the neighbor.
 */
function reachabilityDistance( data, point, neighbor, k ) {
    // Find k-nearest neighbors of the neighbor
    const neighbors = kNearestNeighbors( data, neighbor, k );
    // Distance to the k-th nearest neighbor
    const kDistance = neighbors[ neighbors.length - 1 ].distance;
    // Maximum of k-distance and actual distance
    return Math.max( kDistance, euclideanDistance( point, neighbor ) );
}

/**
 * Calculates the Local Reachability Density (LRD) of a given point in a dataset.
 *
 * @param {Array} data - The dataset containing all points.
 * @param {Object} point - The point for which to calculate the LRD.
 * @param {number} k - The number of nearest neighbors to consider.
 * @returns {number} - The Local Reachability Density of the given point.
 */
function localReachabilityDensity( data, point, k ) {
    // Find k-nearest neighbors of the point
    const neighbors = kNearestNeighbors( data, point, k );
    // Calculate reachability distances
    const reachabilityDistances = neighbors.map( neighbor =>
        reachabilityDistance( data, point, data[ neighbor.index ], k )
    );
    // Sum of reachability distances
    const sumReachabilityDistances = reachabilityDistances.reduce( ( sum, distance ) => sum + distance, 0 );
    // Inverse of the average reachability distance
    return neighbors.length / sumReachabilityDistances;
}

/**
 * Calculates the Local Outlier Factor (LOF) score for a given point in a dataset.
 * The LOF score is a measure of the degree to which the point is an outlier.
 *
 * @param {Array} data - The dataset, an array of points where each point is an array of coordinates.
 * @param {Array} point - The point for which the LOF score is to be calculated, an array of coordinates.
 * @param {number} k - The number of nearest neighbors to consider.
 * @returns {number} - The LOF score for the given point.
 */
function localOutlierFactorScore( data, point, k ) {
    // Find k-nearest neighbors of the point
    const neighbors = kNearestNeighbors( data, point, k );
    // LRD of the point
    const lrdPoint = localReachabilityDensity( data, point, k );
    // Calculate LRD ratios
    const lrdRatios = neighbors.map( neighbor =>
        localReachabilityDensity( data, data[ neighbor.index ], k ) / lrdPoint
    );
    // Sum of LRD ratios
    const sumLrdRatios = lrdRatios.reduce( ( sum, ratio ) => sum + ratio, 0 );
    // Average of LRD ratios
    return sumLrdRatios / neighbors.length;
}

/**
 * Identifies anomalies in a dataset using the Local Outlier Factor (LOF) algorithm.
 *
 * @param {Array<number|Array<number>>} data - The dataset to analyze. Can be one-dimensional or two-dimensional.
 * @param {number} [k=3] - The number of nearest neighbors to consider.
 * @param {number} [threshold=1.5] - The threshold above which a point is considered an anomaly.
 * @returns {Array<number|Array<number>>} - An array of anomalies detected in the dataset.
 */
function localOutlierFactor( data, k = 3, threshold = 1.5 ) {
    // k = number of nearest neighbors to consider
    let arr = true;
    // Check if data is one-dimensional
    if ( !Array.isArray( data[ 0 ] ) ) {
        arr = false;
        // Convert one-dimensional data to two-dimensional
        data = data.map( ( val ) => {
            return [ 0, val ];
        } );
    }
    // Calculate the LOF scores for each point
    const scores = data.map( point => localOutlierFactorScore( data, point, k ) );
    // Identify anomalies based on a threshold
    let anomalies = scores
        .map( ( score, index ) => ( score > threshold ? data[ index ] : null ) ) // Identify points with LOF score above the threshold
        .filter( point => point !== null ); // Filter out non-anomalous points
    // Convert two-dimensional anomalies back to one-dimensional if needed
    if ( !arr ) {
        anomalies = anomalies.map( ( val ) => {
            return val[ 1 ];
        } );
    }
    return anomalies;
}
module.exports.localOutlierFactor = localOutlierFactor;

/**
 * Assigns data points to the nearest centroid to form clusters.
 *
 * @param {Array<Array<number>>} data - An array of data points, where each data point is an array of numbers.
 * @param {Array<Array<number>>} centroids - An array of centroids, where each centroid is an array of numbers.
 * @returns {Array<Array<Array<number>>>} An array of clusters, where each cluster is an array of data points.
 */
function assignClusters( data, centroids ) {
    // Initialize an array to hold the clusters
    let clusters = new Array( centroids.length ).fill().map( () => [] );
    // Assign each point to the nearest centroid
    data.forEach( point => {
        let minDistance = Infinity;
        let clusterIndex = -1;
        // Find the nearest centroid
        centroids.forEach( ( centroid, index ) => {
            let distance = euclideanDistance( point, centroid );
            if ( distance < minDistance ) {
                minDistance = distance;
                clusterIndex = index;
            }
        } );
        // Add the point to the corresponding cluster
        clusters[ clusterIndex ].push( point );
    } );
    // Return the clusters
    return clusters;
}

/**
 * Updates the centroids of given clusters by calculating the mean of the points in each cluster.
 *
 * @param {Array<Array<Array<number>>>} clusters - An array of clusters, where each cluster is an array of points, and each point is an array of numbers.
 * @returns {Array<Array<number>>} - An array of new centroids, where each centroid is an array of numbers representing the mean of the points in the corresponding cluster.
 */
function updateCentroids( clusters ) {
    // Calculate the new centroids
    return clusters.map( cluster => {
        let centroid = new Array( cluster[ 0 ].length ).fill( 0 );
        // Sum the points in the cluster
        cluster.forEach( point => {
            point.forEach( ( value, index ) => {
                centroid[ index ] += value;
            } );
        } );
        // Calculate the mean of the points in the cluster
        return centroid.map( value => value / cluster.length );
    } );
}

/**
 * Initializes centroids using naive sharding. This function divides the data into k shards and calculate the centroid of each shard.
 *
 * @param {Array<Array<number>>} data - The dataset, where each element is an array representing a data point.
 * @param {number} k - The number of centroids (clusters) to initialize.
 * @returns {Array<Array<number>>} An array of centroids, where each centroid is an array representing the mean position of a shard.
 */
function initializeCentroids( data, k ) {
    let centroids = []; // Array to store the centroids
    let shardSize = Math.floor( data.length / k ); // Calculate the size of each shard
    for ( let i = 0; i < k; i++ ) {
        let start = i * shardSize; // Start index of the current shard
        let end = ( i + 1 ) * shardSize; // End index of the current shard
        if ( i === k - 1 ) {
            end = data.length; // Ensure the last shard includes any remaining points
        }
        let shard = data.slice( start, end ); // Extract the current shard from the data

        // Calculate the centroid of the current shard
        let centroid = shard.reduce( ( acc, point ) => {
            return acc.map( ( value, index ) => value + point[ index ] );
        }, new Array( data[ 0 ].length ).fill( 0 ) ).map( value => value / shard.length );

        centroids.push( centroid ); // Add the calculated centroid to the centroids array
    }
    return centroids; // Return the array of centroids
}

/**
 * Performs k-means clustering on the given data.
 *
 * @param {Array} data - The dataset to be clustered, where each element is a point.
 * @param {number} [k=3] - The number of clusters to form.
 * @param {number} [maxIterations=100] - The maximum number of iterations to perform.
 * @returns {Object} An object containing the final centroids and clusters.
 * @returns {Array} centroids - The final centroids after clustering.
 * @returns {Array} clusters - The clusters with assigned points.
 */
function kMeans( data, k = 3, maxIterations = 100 ) {
    // Initialize the centroids
    let centroids = initializeCentroids( data, k );
    let clusters = [];
    // Iterate to update the centroids and clusters
    for ( let i = 0; i < maxIterations; i++ ) {
        // Assign points to the nearest centroids
        clusters = assignClusters( data, centroids );
        // Update the centroids
        let newCentroids = updateCentroids( clusters );
        // Stop if the centroids do not change
        if ( JSON.stringify( newCentroids ) === JSON.stringify( centroids ) ) {
            break;
        }
        // Update the centroids for the next iteration
        centroids = newCentroids;
    }
    // Return the final centroids and clusters
    return {
        centroids,
        clusters
    };
}
module.exports.kMeans = kMeans;

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
