const divinator = require( "./index.js" );

const cpu = [
    42,
    41,
    45,
    49,
    44,
    39,
    47,
    11,
    69,
    60,
    59,
    40,
    39,
    40,
    18,
    41,
    48,
    50,
    48,
    49,
    44,
    49,
    66,
    62,
    66,
    95,
    47,
    43,
    42,
    45,
    59,
    61,
    68,
    56,
    46,
    59
];

let x = divinator[ "iqr" ]( cpu );
let y = divinator[ "zscore" ]( cpu );
let z = divinator[ "modifiedZscore" ]( cpu );
let q = divinator[ "all" ]( cpu );

console.log( "Index\tValue\tIQR\tZ\tmodZ\tAll" );
for ( let i = 0; i < cpu.length; i++ ) {
    console.log( `${i}.\t${cpu[ i ]}\t${x[ i ]}\t${y[ i ]}\t${z[ i ]}\t${q[ i ]}` );
}
