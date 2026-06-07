const ss = require("simple-statistics");
const jstat = require("jstat");

function shapiroWilk(v, alpha = 0.05) {
    if (!Array.isArray(v)) {
        throw new Error("Parameter is not a valid array");
    }
    if (alpha < 0 || alpha > 1) {
        throw new Error("Alpha must be between 0 and 1");
    }
    const n = v.length;
    v = v.slice().sort((a, b) => a - b);
    const mi = [];
    for (let i = 0; i < n; i++) {
        const p = ((i + 1) - 0.375) / (n + 0.25);
        mi.push(jstat.normal.inv(p, 0, 1));
    }
    let m = mi.reduce((acc, val) => acc + Math.pow(val, 2), 0);
    const u = 1 / Math.sqrt(n);
    const ai = new Array(n).fill(0);
    ai[n - 1] = -2.70605 * Math.pow(u, 5) + 4.434685 * Math.pow(u, 4) - 2.071190 * Math.pow(u, 3) -
        0.147981 * Math.pow(u, 2) + 0.221157 * u + mi[n - 1] * Math.pow(m, -0.5);
    ai[n - 2] = -3.582633 * Math.pow(u, 5) + 5.682633 * Math.pow(u, 4) - 1.752461 * Math.pow(u, 3) -
        0.293762 * Math.pow(u, 2) + 0.042981 * u + mi[n - 2] * Math.pow(m, -0.5);
    for (let i = 0; i < n - 2; i++) {
        const ci = i + 1;
        if (ci === 1) {
            ai[i] = -ai[n - 1];
        } else if (ci === 2) {
            ai[i] = -ai[n - 2];
        } else {
            const eps = (m - 2.0 * Math.pow(mi[n - 1], 2) - 2.0 * Math.pow(mi[n - 2], 2)) /
                (1.0 - 2.0 * Math.pow(ai[n - 1], 2) - 2.0 * Math.pow(ai[n - 2], 2));
            ai[i] = mi[i] / Math.sqrt(eps);
        }
    }
    const mean = jstat.mean(v);
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < n; i++) {
        sumA += ai[i] * v[i];
        sumB += Math.pow(v[i] - mean, 2);
    }
    const W = Math.pow(sumA, 2) / Math.max(sumB, 0.0000001);
    const logN = Math.log(n);
    const mLog = 0.0038915 * Math.pow(logN, 3) - 0.083751 * Math.pow(logN, 2) - 0.31082 * logN - 1.5861;
    const pwr = 0.0030302 * Math.pow(logN, 2) - 0.082676 * logN - 0.4803;
    const std = Math.pow(Math.E, pwr);
    const Z = (Math.log(1.0 - W) - mLog) / std;
    const P = 1 - jstat.normal.cdf(Z, 0, 1);
    return {
        testStatistic: W,
        pValue: P
    };
}

function kolmogorovSmirnov(data) {
    const n = data.length;
    const mean = ss.mean(data);
    const stdDev = ss.standardDeviation(data);
    const sortedData = data.slice().sort((a, b) => a - b);
    const D = Math.max(...sortedData.map((value, i) => {
        const cdf = ss.cumulativeStdNormalProbability((value - mean) / stdDev);
        return Math.max(cdf - i / n, (i + 1) / n - cdf);
    }));
    return {
        testStatistic: D,
        criticalValues: {
            alpha05: 1.36 / Math.sqrt(n),
            alpha10: 1.22 / Math.sqrt(n),
            alpha01: 1.63 / Math.sqrt(n)
        }
    };
}

function jarqueBera(data) {
    const n = data.length;
    const mean = jstat.mean(data);
    const stdev = jstat.stdev(data, true);
    let sum3 = 0;
    let sum4 = 0;
    for (let i = 0; i < n; i++) {
        const deviation = data[i] - mean;
        sum3 += Math.pow(deviation, 3);
        sum4 += Math.pow(deviation, 4);
    }
    const skewness = (n * sum3) / ((n - 1) * (n - 2) * Math.pow(stdev, 3));
    const kurtosis = (n * (n + 1) * sum4) / ((n - 1) * (n - 2) * (n - 3) * Math.pow(stdev, 4)) - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    const testStatistic = (n / 6) * (Math.pow(skewness, 2) + (Math.pow(kurtosis, 2) / 4));
    return {
        testStatistic,
        pValue: 1 - jstat.chisquare.cdf(testStatistic, 2)
    };
}

function andersonDarling2(data) {
    if (!Array.isArray(data) || data.length < 2) {
        throw new Error("Data must be an array with at least two elements.");
    }
    const validatedData = require("./utils").validate(data);
    validatedData.sort((a, b) => a - b);
    const n = validatedData.length;
    const mean = ss.mean(validatedData);
    const stdDev = ss.standardDeviation(validatedData);
    const standardizedData = validatedData.map(value => (value - mean) / stdDev);
    const normalCDF = x => 0.5 * (1 + erf(x / Math.sqrt(2)));
    const erf = x => {
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const t = 1 / (1 + p * x);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
    };
    const A2 = -n - (1 / n) * standardizedData.reduce((sum, value, i) => {
        const Fi = normalCDF(value);
        const term1 = (2 * (i + 1) - 1) * Math.log(Fi);
        const term2 = (2 * (n - i) - 1) * Math.log(1 - Fi);
        return sum + term1 + term2;
    }, 0);
    return {
        testStatistic: A2,
        significanceLevel: {
            "0.1": A2 < 1.933,
            "0.05": A2 < 2.492,
            "0.01": A2 < 3.857
        }
    };
}

function andersonDarling(data) {
    const n = data.length;
    const sortedData = data.slice().sort((a, b) => a - b);
    const mean = jstat.mean(sortedData);
    const stdDev = jstat.stdev(sortedData, true);
    const z = sortedData.map(x => (x - mean) / stdDev);
    const p = z.map(x => jstat.normal.cdf(x, 0, 1));
    let A2 = -n;
    for (let i = 0; i < n; i++) {
        A2 -= (2 * i + 1) * (Math.log(p[i]) + Math.log(1 - p[n - 1 - i])) / n;
    }
    A2 *= (1 + 4 / n - 25 / (n * n));
    const pValues = {
        "0.1": A2 < 1.933,
        "0.05": A2 < 2.492,
        "0.01": A2 < 3.857
    };
    return {
        testStatistic: A2,
        pValues
    };
}

function lilliefors(data) {
    const n = data.length;
    const mean = jstat.mean(data);
    const stdDev = jstat.stdev(data, true);
    const sortedData = data.slice().sort((a, b) => a - b);
    const cdf = sortedData.map(x => jstat.normal.cdf(x, mean, stdDev));
    const dPlus = Math.max(...cdf.map((p, i) => (i + 1) / n - p));
    const dMinus = Math.max(...cdf.map((p, i) => p - i / n));
    const d = Math.max(dPlus, dMinus);
    const criticalValues = {
        "0.01": simulateLillieforsCriticalValues(n, 0.01),
        "0.05": simulateLillieforsCriticalValues(n, 0.05),
        "0.10": simulateLillieforsCriticalValues(n, 0.10)
    };
    return {
        testStatistic: d,
        criticalValues
    };
}

function simulateLillieforsCriticalValues(n, alpha, numSimulations = 10000) {
    const criticalValues = [];
    for (let i = 0; i < numSimulations; i++) {
        const sample = Array.from({ length: n }, () => jstat.normal.sample(0, 1));
        const mean = jstat.mean(sample);
        const stdDev = jstat.stdev(sample, true);
        const sortedSample = sample.slice().sort((a, b) => a - b);
        const cdf = (x) => jstat.normal.cdf(x, mean, stdDev);
        let dPlus = 0;
        let dMinus = 0;
        for (let j = 0; j < n; j++) {
            const empiricalCDF = (j + 1) / n;
            const theoreticalCDF = cdf(sortedSample[j]);
            dPlus = Math.max(dPlus, empiricalCDF - theoreticalCDF);
            dMinus = Math.max(dMinus, theoreticalCDF - j / n);
        }
        const d = Math.max(dPlus, dMinus);
        criticalValues.push(d);
    }
    criticalValues.sort((a, b) => a - b);
    return criticalValues[Math.floor(numSimulations * (1 - alpha))];
}

module.exports = {
    shapiroWilk,
    kolmogorovSmirnov,
    jarqueBera,
    andersonDarling2,
    andersonDarling,
    lilliefors,
    simulateLillieforsCriticalValues
};
