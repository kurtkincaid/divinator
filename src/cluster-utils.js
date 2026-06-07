const {
    euclideanDistance
} = require( './utils' );

function _regionQuery( dataset, point, eps ) {
    const neighbors = [];
    for ( let i = 0; i < dataset.length; i++ ) {
        if ( euclideanDistance( point, dataset[ i ] ) <= eps ) {
            neighbors.push( i );
        }
    }
    return neighbors;
}

function _expandCluster( pointIdx, neighbors, cluster, dataset, eps, minPts, visited, clusters ) {
    cluster.push( pointIdx );
    for ( let i = 0; i < neighbors.length; i++ ) {
        const neighborIdx = neighbors[ i ];
        if ( !visited.has( neighborIdx ) ) {
            visited.add( neighborIdx );
            const newNeighbors = _regionQuery( dataset, dataset[ neighborIdx ], eps );
            if ( newNeighbors.length >= minPts ) {
                neighbors = neighbors.concat( newNeighbors );
            }
        }
        if ( !clusters.some( cluster => cluster.includes( neighborIdx ) ) ) {
            cluster.push( neighborIdx );
        }
    }
}

module.exports = {
    _regionQuery,
    _expandCluster
};
