function euclideanDistance( point1, point2 ) {
    return Math.sqrt(
        point1.reduce( ( sum, value, index ) => sum + Math.pow( value - point2[ index ], 2 ), 0 )
    );
}

function validate( data ) {
    if ( !data || !Array.isArray( data ) ) {
        throw new Error( "Please pass an array of numbers." );
    }
    if ( data.length === 0 ) {
        throw new Error( "Data array cannot be empty." );
    }
    const _data = data.map( parseFloat );
    if ( !_data.every( Number.isFinite ) ) {
        throw new Error( "Data included something other than numbers or number strings. Please pass an array of numbers." );
    }
    return _data;
}

module.exports = {
    euclideanDistance,
    validate
};
