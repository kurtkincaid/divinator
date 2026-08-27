'use strict';

/**
 * Percentile utilities using linear interpolation with:
 *
 *   rank = 1 + (n - 1) * p
 *
 * This is the same general convention used by many spreadsheet-style
 * percentile functions. Percentiles are expressed from 0 to 100.
 */

/**
 * Return the value at a requested percentile.
 *
 * @param {number[]} values Unsorted finite numeric values.
 * @param {number} percentile Requested percentile in [0, 100].
 * @returns {number} Interpolated percentile value.
 */
function percentile( values, percentile ) {
    validateValues( values );
    validatePercentile( percentile );

    const sorted = [ ...values ].sort( ( a, b ) => a - b );
    return percentileFromSorted( sorted, percentile );
}

/**
 * Return several requested percentile values at once.
 *
 * @param {number[]} values Unsorted finite numeric values.
 * @param {number[]} percentiles Requested percentiles, each in [0, 100].
 * @returns {Record<string, number>} A map such as { "25": 32.5, "99": 99.1 }.
 */
function percentiles( values, percentiles ) {
    validateValues( values );

    if ( !Array.isArray( percentiles ) || percentiles.length === 0 ) {
        throw new TypeError( 'percentiles must be a non-empty array.' );
    }

    const sorted = [ ...values ].sort( ( a, b ) => a - b );
    const result = {};

    for ( const p of percentiles ) {
        validatePercentile( p );
        result[ p ] = percentileFromSorted( sorted, p );
    }

    return result;
}

/**
 * A reusable distribution which can answer:
 * - "What value is at percentile P?"
 * - "At what percentile does this value fall?"
 */
class PercentileDistribution {
    /**
     * @param {number[]} values Unsorted finite numeric values.
     */
    constructor( values ) {
        validateValues( values );
        this.values = [ ...values ].sort( ( a, b ) => a - b );
    }

    /**
     * Return the interpolated value at percentile P.
     *
     * @param {number} percentile Requested percentile in [0, 100].
     * @returns {number}
     */
    valueAt( percentile ) {
        validatePercentile( percentile );
        return percentileFromSorted( this.values, percentile );
    }

    /**
     * Return percentile rank for an observed value.
     *
     * Uses an inclusive empirical-CDF-style definition:
     *
     *   percentile rank = count(values <= value) / n * 100
     *
     * @param {number} value A finite numeric observation.
     * @returns {number} A percentile from 0 to 100.
     */
    percentileOf( value ) {
        if ( !Number.isFinite( value ) ) {
            throw new TypeError( 'value must be a finite number.' );
        }

        const n = this.values.length;

        if ( value < this.values[ 0 ] ) {
            return 0;
        }

        if ( value >= this.values[ n - 1 ] ) {
            return 100;
        }

        const upperBound = firstIndexGreaterThan( this.values, value );
        return ( upperBound / n ) * 100;
    }

    /**
     * Return common anomaly-detection statistics.
     *
     * @returns {{
     *   p25: number,
     *   p75: number,
     *   p99: number,
     *   iqr: number
     * }}
     */
    summary() {
        const p25 = this.valueAt( 25 );
        const p75 = this.valueAt( 75 );

        return {
            p25,
            p75,
            p99: this.valueAt( 99 ),
            iqr: p75 - p25,
        };
    }

    /**
     * Calculate: P99 + (multiplier * IQR)
     *
     * @param {number} multiplier Signal-fluctuation multiplier n.
     * @returns {number} Upper alert threshold.
     */
    alertThreshold( multiplier = 1 ) {
        if ( !Number.isFinite( multiplier ) || multiplier < 0 ) {
            throw new TypeError( 'multiplier must be a finite number >= 0.' );
        }

        const {
            p99,
            iqr
        } = this.summary();
        return p99 + multiplier * iqr;
    }
}

function percentileFromSorted( sorted, percentile ) {
    if ( sorted.length === 1 ) {
        return sorted[ 0 ];
    }

    const p = percentile / 100;
    const zeroBasedIndex = ( sorted.length - 1 ) * p;

    const lowerIndex = Math.floor( zeroBasedIndex );
    const upperIndex = Math.ceil( zeroBasedIndex );
    const fraction = zeroBasedIndex - lowerIndex;

    if ( lowerIndex === upperIndex ) {
        return sorted[ lowerIndex ];
    }

    return (
        sorted[ lowerIndex ] +
        fraction * ( sorted[ upperIndex ] - sorted[ lowerIndex ] )
    );
}

/**
 * Return the first index whose value is greater than target.
 * This is an upper-bound binary search, so duplicated values count as <= target.
 */
function firstIndexGreaterThan( sorted, target ) {
    let low = 0;
    let high = sorted.length;

    while ( low < high ) {
        const middle = Math.floor( ( low + high ) / 2 );

        if ( sorted[ middle ] <= target ) {
            low = middle + 1;
        }
        else {
            high = middle;
        }
    }

    return low;
}

function validateValues( values ) {
    if ( !Array.isArray( values ) || values.length === 0 ) {
        throw new TypeError( 'values must be a non-empty array.' );
    }

    if ( !values.every( Number.isFinite ) ) {
        throw new TypeError( 'values must contain only finite numbers.' );
    }
}

function validatePercentile( percentile ) {
    if ( !Number.isFinite( percentile ) || percentile < 0 || percentile > 100 ) {
        throw new RangeError( 'percentile must be a finite number from 0 to 100.' );
    }
}

module.exports = {
    percentile,
    percentiles,
    PercentileDistribution,
};
