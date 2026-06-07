const {
    euclideanDistance
} = require("./utils");
const {
    _regionQuery,
    _expandCluster
} = require("./cluster-utils");

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
function dbscan(dataset, eps = 2, minPts = 2) {
    const clusters = [];
    const visited = new Set();
    const noise = new Set();

    for (let i = 0; i < dataset.length; i++) {
        if (!visited.has(i)) {
            visited.add(i);
            const neighbors = _regionQuery(dataset, dataset[i], eps);
            if (neighbors.length < minPts) {
                noise.add(i);
            } else {
                let cluster = [];
                _expandCluster(i, neighbors, cluster, dataset, eps, minPts, visited, clusters);
                clusters.push([...new Set(cluster)]);
            }
        }
    }

    return {
        clusters,
        noise: Array.from(noise)
    };
}

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
function optics(dataset, eps = 2, minPts = 2) {
    const clusters = [];
    const visited = new Set();
    const noise = new Set();

    for (let i = 0; i < dataset.length; i++) {
        if (!visited.has(i)) {
            visited.add(i);
            const neighbors = _regionQuery(dataset, dataset[i], eps);
            if (neighbors.length < minPts) {
                noise.add(i);
            } else {
                let cluster = [];
                _expandCluster(i, neighbors, cluster, dataset, eps, minPts, visited, clusters);
                clusters.push([...(new Set(cluster))]);
            }
        }
    }

    return {
        clusters,
        noise: Array.from(noise)
    };
}

/**
 * Finds the k nearest neighbors to a given point in a dataset.
 *
 * @param {Array} data - The dataset, an array of points.
 * @param {Array} point - The point to find neighbors for.
 * @param {number} k - The number of nearest neighbors to find.
 * @returns {Array} An array of objects representing the k nearest neighbors, each with an index and distance property.
 */
function kNearestNeighbors(data, point, k) {
    return data
        .map((neighbor, index) => ({
            index,
            distance: euclideanDistance(point, neighbor)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(1, k + 1);
}

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
function reachabilityDistance(data, point, neighbor, k) {
    const neighbors = kNearestNeighbors(data, neighbor, k);
    const kDistance = neighbors[neighbors.length - 1].distance;
    return Math.max(kDistance, euclideanDistance(point, neighbor));
}

/**
 * Calculates the Local Reachability Density (LRD) of a given point in a dataset.
 *
 * @param {Array} data - The dataset containing all points.
 * @param {Object} point - The point for which to calculate the LRD.
 * @param {number} k - The number of nearest neighbors to consider.
 * @returns {number} - The Local Reachability Density of the given point.
 */
function localReachabilityDensity(data, point, k) {
    const neighbors = kNearestNeighbors(data, point, k);
    const reachabilityDistances = neighbors.map(neighbor =>
        reachabilityDistance(data, point, data[neighbor.index], k)
    );
    const sumReachabilityDistances = reachabilityDistances.reduce((sum, distance) => sum + distance, 0);
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
function localOutlierFactorScore(data, point, k) {
    const neighbors = kNearestNeighbors(data, point, k);
    const lrdPoint = localReachabilityDensity(data, point, k);
    const lrdRatios = neighbors.map(neighbor =>
        localReachabilityDensity(data, data[neighbor.index], k) / lrdPoint
    );
    const sumLrdRatios = lrdRatios.reduce((sum, ratio) => sum + ratio, 0);
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
function localOutlierFactor(data, k = 3, threshold = 1.5) {
    let arr = true;
    if (!Array.isArray(data[0])) {
        arr = false;
        data = data.map((val) => [0, val]);
    }
    const scores = data.map(point => localOutlierFactorScore(data, point, k));
    let anomalies = scores
        .map((score, index) => (score > threshold ? data[index] : null))
        .filter(point => point !== null);
    if (!arr) {
        anomalies = anomalies.map(val => val[1]);
    }
    return anomalies;
}

/**
 * Assigns data points to the nearest centroid to form clusters.
 *
 * @param {Array<Array<number>>} data - An array of data points, where each data point is an array of numbers.
 * @param {Array<Array<number>>} centroids - An array of centroids, where each centroid is an array of numbers.
 * @returns {Array<Array<Array<number>>>} An array of clusters, where each cluster is an array of data points.
 */
function assignClusters(data, centroids) {
    let clusters = new Array(centroids.length).fill().map(() => []);
    data.forEach(point => {
        let minDistance = Infinity;
        let clusterIndex = -1;
        centroids.forEach((centroid, index) => {
            let distance = euclideanDistance(point, centroid);
            if (distance < minDistance) {
                minDistance = distance;
                clusterIndex = index;
            }
        });
        clusters[clusterIndex].push(point);
    });
    return clusters;
}

/**
 * Updates the centroids of given clusters by calculating the mean of the points in each cluster.
 *
 * @param {Array<Array<Array<number>>>} clusters - An array of clusters, where each cluster is an array of points, and each point is an array of numbers.
 * @returns {Array<Array<number>>} - An array of new centroids, where each centroid is an array of numbers representing the mean of the points in the corresponding cluster.
 */
function updateCentroids(clusters) {
    return clusters.map(cluster => {
        let centroid = new Array(cluster[0].length).fill(0);
        cluster.forEach(point => {
            point.forEach((value, index) => {
                centroid[index] += value;
            });
        });
        return centroid.map(value => value / cluster.length);
    });
}

/**
 * Initializes centroids using naive sharding. This function divides the data into k shards and calculate the centroid of each shard.
 *
 * @param {Array<Array<number>>} data - The dataset, where each element is an array representing a data point.
 * @param {number} k - The number of centroids (clusters) to initialize.
 * @returns {Array<Array<number>>} An array of centroids, where each centroid is an array representing the mean position of a shard.
 */
function initializeCentroids(data, k) {
    let centroids = [];
    let shardSize = Math.floor(data.length / k);
    for (let i = 0; i < k; i++) {
        let start = i * shardSize;
        let end = (i + 1) * shardSize;
        if (i === k - 1) {
            end = data.length;
        }
        let shard = data.slice(start, end);
        let centroid = shard.reduce((acc, point) => {
            return acc.map((value, index) => value + point[index]);
        }, new Array(data[0].length).fill(0)).map(value => value / shard.length);
        centroids.push(centroid);
    }
    return centroids;
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
function kMeans(data, k = 3, maxIterations = 100) {
    let centroids = initializeCentroids(data, k);
    let clusters = [];
    for (let i = 0; i < maxIterations; i++) {
        clusters = assignClusters(data, centroids);
        let newCentroids = updateCentroids(clusters);
        if (JSON.stringify(newCentroids) === JSON.stringify(centroids)) {
            break;
        }
        centroids = newCentroids;
    }
    return {
        centroids,
        clusters
    };
}

module.exports = {
    dbscan,
    optics,
    kNearestNeighbors,
    reachabilityDistance,
    localReachabilityDensity,
    localOutlierFactor,
    assignClusters,
    updateCentroids,
    initializeCentroids,
    kMeans
};