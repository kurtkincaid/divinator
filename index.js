/*
    Filename: index.js
    Description: Divinator, diviner of secrets, anomaly detection
    Author: Kurt Kincaid
    Last Updated: 2023-02-10T10:56:07.734
    Copyright: Kurt Kincaid (c) 2023
    Version: 1.0.0
 */

const ss = require( "simple-statistics" );

module.exports.version = "1.0.0";

module.exports.iqr = ( data, factor ) => {
    let val = 1.5;
    let _data = validate( data );
    if ( factor ) {
        val = parseFloat( factor );
        if ( !val instanceof Number ) {
            throw Error( `A multiplication factor was passed, but it was not a number.` );
        }
    }
    let top = [];
    let bottom = [];
    let odd = false;
    if ( _data.length % 2 ) {
        odd = true;
    }
    let _sorted = JSON.parse( JSON.stringify( _data ) ).sort();
    bottom = _sorted.slice( 0, _sorted.length / 2 );
    top = _sorted.slice( _sorted.length / 2, _sorted.length );
    if ( odd ) {
        bottom.push( top[ 0 ] );
    }
    let _75th = ss.median( top );
    let _25th = ss.median( bottom );
    let iqr = _75th - _25th;
    factor = iqr * val;
    let resp = [];
    for ( let i = 0; i < data.length; i++ ) {
        if ( data[ i ] > _75th + factor ) {
            resp[ i ] = true;
        }
        else if ( data[ i ] < _25th - factor ) {
            resp[ i ] = true;
        }
        else {
            resp[ i ] = false;
        }
    }
    return resp;
};

module.exports.modifiedZscore = ( data, threshold ) => {
    let val = 0.6745;
    let _data = validate( data );
    if ( threshold ) {
        threshold = parseFloat( threshold );
        if ( !threshold instanceof Number ) {
            throw Error( `A threshold factor was passed, but it was not a number.` );
        }
    }
    else {
        threshold = 3.5;
    }
    let resp = [];
    let _mad = ss.medianAbsoluteDeviation( _data );
    let _median = ss.median( _data );
    for ( let i = 0; i < _data.length; i++ ) {
        let _z = Math.abs( val * ( _data[ i ] - _median ) / _mad );
        if ( _z > threshold ) {
            resp.push( true );
        }
        else {
            resp.push( false );
        }
    }
    return resp;
};

module.exports.zscore = ( data, threshold ) => {
    let _data = validate( data );
    if ( threshold ) {
        threshold = parseFloat( threshold );
        if ( !threshold instanceof Number ) {
            throw Error( `A threshold factor was passed, but it was not a number.` );
        }
    }
    else {
        threshold = 3;
    }
    let resp = [];
    let _mean = ss.mean( _data );
    let _std = ss.standardDeviation( _data );
    for ( let i = 0; i < _data.length; i++ ) {
        let _zscore = Math.abs( ( _data[ i ] - _mean ) / _std );
        if ( _zscore > threshold ) {
            resp.push( true );
        }
        else {
            resp.push( false );
        }
    }
    return resp;
};

module.exports.all = ( data, obj ) => {
    let resp = [];
    let iqr = [];
    let zscore = [];
    let modifiedZscore = [];
    if ( obj && obj[ "iqr" ] ) {
        iqr = module.exports.iqr( data, obj[ "iqr" ] );
    }
    else {
        iqr = module.exports.iqr( data )
    }
    if ( obj && obj[ "zscore" ] ) {
        zscore = module.exports.zscore( data, obj[ "zscore" ] );
    }
    else {
        zscore = module.exports.zscore( data );
    }
    if ( obj && obj[ "modifiedZscore" ] ) {
        modifiedZscore = module.exports.modifiedZscore( data, obj[ "modifiedZscore" ] );
    }
    else {
        modifiedZscore = module.exports.modifiedZscore( data );
    }
    for ( let i = 0; i < iqr.length; i++ ) {
        if ( iqr[ i ] && zscore[ i ] && modifiedZscore[ i ] ) {
            resp.push( true );
        }
        else {
            resp.push( false );
        }
    }
    return resp;
};

const validate = ( data ) => {
    if ( !data ) {
        throw Error( `No data was passed. Please pass an array of numbers.` );
    }
    if ( !data instanceof Array ) {
        throw Error( `The data passed to the function is not an array. Please pass an array of numbers.` );
    }
    let _data = data.map( parseFloat );
    if ( _data.includes( NaN ) ) {
        throw Error( `Data included something other than numbers or number strings. Please pass an array of numbers.` );
    }
    return _data;
};