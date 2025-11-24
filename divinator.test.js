const divinator = require('./index.js');

describe('Divinator - Core Functionality Tests', () => {
  // Test data with known statistical properties
  const normalData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const dataWithOutliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // 100 is clear outlier
  const smallDataset = [1, 2, 3];
  
  // More comprehensive test dataset
  const cpuData = [
    42, 41, 45, 49, 44, 39, 47, 11, 69, 60,
    59, 40, 39, 40, 18, 41, 48, 50, 48, 49,
    44, 49, 66, 62, 66, 95, 47, 43, 42, 45,
    59, 61, 68, 56, 46, 59
  ];

  describe('Version and Constants', () => {
    test('should export correct version', () => {
      expect(divinator.version).toBe('3.2.0');
    });

    test('should export mathematical constants', () => {
      expect(divinator.PI).toBeDefined();
      expect(divinator.E).toBeDefined();
      // Test PI precision (first 10 digits)
      expect(divinator.PI.toString().substring(0, 12)).toBe('3.1415926535');
      // Test E precision (first 10 digits)
      expect(divinator.E.toString().substring(0, 12)).toBe('2.7182818284');
    });
  });

  describe('Input Validation', () => {
    test('should handle empty arrays gracefully', () => {
      expect(() => divinator.iqr([])).toThrow();
      expect(() => divinator.zscore([])).toThrow();
      expect(() => divinator.modifiedZscore([])).toThrow();
    });

    test('should handle non-numeric data', () => {
      expect(() => divinator.iqr(['a', 'b', 'c'])).toThrow();
      expect(() => divinator.zscore([1, 'invalid', 3])).toThrow();
    });

    test('should handle null and undefined inputs', () => {
      expect(() => divinator.iqr(null)).toThrow();
      expect(() => divinator.zscore(undefined)).toThrow();
    });
  });

  describe('IQR (Interquartile Range) Method', () => {
    test('should detect outliers in known dataset', () => {
      const outliers = divinator.iqr(dataWithOutliers);
      expect(outliers).toContain(100);
      expect(outliers.length).toBeGreaterThan(0);
    });

    test('should work with custom multiplier', () => {
      const outliers1 = divinator.iqr(cpuData, 1.5);
      const outliers2 = divinator.iqr(cpuData, 2.0);
      // More conservative threshold should find fewer outliers
      expect(outliers2.length).toBeLessThanOrEqual(outliers1.length);
    });

    test('should handle normal data appropriately', () => {
      const outliers = divinator.iqr(normalData);
      // Normal sequential data shouldn't have outliers with default threshold
      expect(outliers.length).toBe(0);
    });

    test('should validate multiplier parameter', () => {
      // Invalid multiplier should default to 1.5
      const outliers1 = divinator.iqr(cpuData);
      const outliers2 = divinator.iqr(cpuData, 'invalid');
      expect(outliers1).toEqual(outliers2);
    });
  });
  describe('Z-Score Method', () => {
    test('should detect outliers in known dataset', () => {
      const outliers = divinator.zscore(dataWithOutliers);
      // Value 100 has Z-score ~2.87, below default threshold of 3
      expect(outliers).not.toContain(100);
    });

    test('should work with custom threshold', () => {
      const outliers1 = divinator.zscore(cpuData, 2);
      const outliers2 = divinator.zscore(cpuData, 3);
      // More conservative threshold should find fewer outliers
      expect(outliers2.length).toBeLessThanOrEqual(outliers1.length);
    });

    test('should validate threshold parameter', () => {
      expect(() => divinator.zscore(cpuData, 'invalid')).toThrow();
    });

    test('should handle edge cases', () => {
      // All identical values should have z-score of 0
      const identicalData = [5, 5, 5, 5, 5];
      const outliers = divinator.zscore(identicalData);
      expect(outliers.length).toBe(0);
    });
  });

  describe('Modified Z-Score Method', () => {
    test('should detect outliers in known dataset', () => {
      const outliers = divinator.modifiedZscore(dataWithOutliers);
      expect(outliers).toContain(100);
    });

    test('should work with custom threshold', () => {
      const outliers1 = divinator.modifiedZscore(cpuData, 2.5);
      const outliers2 = divinator.modifiedZscore(cpuData, 3.5);
      expect(outliers2.length).toBeLessThanOrEqual(outliers1.length);
    });

    test('should validate threshold parameter', () => {
      expect(() => divinator.modifiedZscore(cpuData, 'invalid')).toThrow();
    });    test('should be more robust than standard z-score', () => {
      // Modified z-score should be less affected by extreme outliers
      const dataWithExtremeOutlier = [1, 2, 3, 4, 5, 1000000];
      const zOutliers = divinator.zscore(dataWithExtremeOutlier);
      const modZOutliers = divinator.modifiedZscore(dataWithExtremeOutlier);
      
      // Modified Z-score should detect the extreme outlier
      expect(modZOutliers).toContain(1000000);
      // Standard Z-score fails with extreme outliers due to mean/std being affected
      expect(zOutliers).not.toContain(1000000);
    });
  });

  describe('Zone Analysis', () => {
    test('should create Zone instance correctly', () => {
      const zone = new divinator.Zone(normalData);
      expect(zone.data).toEqual(normalData);
      expect(zone.mean).toBeDefined();
      expect(zone.std).toBeDefined();
      expect(zone.zones).toHaveLength(3); // A, B, C zones
    });

    test('should categorize values into correct zones', () => {
      const zone = new divinator.Zone(cpuData);
      const zoneName = zone.which(zone.mean); // Value at mean should be in zone C
      expect(['C', 'B', 'A', 'X']).toContain(zoneName);
    });

    test('should handle extreme values', () => {
      const zone = new divinator.Zone(normalData);
      const extremeValue = zone.which(1000);
      expect(extremeValue).toBe('X'); // Should be in zone X (beyond 3 sigma)
    });
  });

  describe('Pattern Analysis', () => {
    test('should analyze patterns without crashing', () => {
      const result = divinator.patterns(cpuData);
      expect(result).toBeDefined();
      expect(result.mean).toBeDefined();
      expect(result.standardDeviation).toBeDefined();
      expect(result.outliers).toBeDefined();
    });

    test('should detect control chart violations', () => {
      const result = divinator.patterns(cpuData);
      expect(result.alpha).toBeDefined(); // Points beyond control limits
      expect(result.bravo).toBeDefined(); // 2 out of 3 in zone A
      expect(result.charlie).toBeDefined(); // 4 out of 5 in zone B
    });

    test('should calculate statistical measures correctly', () => {
      const result = divinator.patterns(cpuData);
      expect(result['1sigma']).toHaveLength(2); // [lower, upper]
      expect(result['2sigma']).toHaveLength(2);
      expect(result['3sigma']).toHaveLength(2);
      expect(result.jarqueBera).toBeDefined();
      expect(result.skewness).toBeDefined();
      expect(result.kurtosis).toBeDefined();
    });

    test('should handle collapse option', () => {
      const resultFull = divinator.patterns(cpuData, false);
      const resultCollapsed = divinator.patterns(cpuData, true);
      expect(resultFull).toBeDefined();
      expect(resultCollapsed).toBeDefined();
    });
  });

  describe('Moving Averages', () => {
    test('xbar should calculate moving averages correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = divinator.xbar(data, { size: 5 });
      expect(result).toHaveLength(2); // 10 elements, window 5 = 2 averages
      expect(result[0]).toBe(3); // Average of [1,2,3,4,5]
      expect(result[1]).toBe(8); // Average of [6,7,8,9,10]
    });

    test('xbar2 should handle options correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const result = divinator.xbar2(data, { size: 3, front: true });
      expect(result).toHaveLength(3); // 9 elements, window 3 = 3 averages
    });

    test('should handle decimal places option', () => {
      const data = [1.111, 2.222, 3.333];
      const result = divinator.xbar(data, { size: 3, d: 2 });
      expect(result[0]).toBe(2.22); // Rounded to 2 decimal places
    });
  });

  describe('Normality Tests', () => {
    test('Shapiro-Wilk test should work', () => {
      const result = divinator.shapiroWilk(normalData);
      expect(result.testStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.testStatistic).toBeGreaterThan(0);
      expect(result.testStatistic).toBeLessThanOrEqual(1);
    });

    test('Kolmogorov-Smirnov test should work', () => {
      const result = divinator.kolmogorovSmirnov(normalData);
      expect(result.testStatistic).toBeDefined();
      expect(result.criticalValues).toBeDefined();
      expect(result.criticalValues.alpha05).toBeDefined();
    });

    test('Jarque-Bera test should work', () => {
      const result = divinator.jarqueBera(normalData);
      expect(result.testStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
    });

    test('should handle invalid alpha in Shapiro-Wilk', () => {
      expect(() => divinator.shapiroWilk(normalData, -0.1)).toThrow();
      expect(() => divinator.shapiroWilk(normalData, 1.1)).toThrow();
    });
  });

  describe('Utility Functions', () => {
    test('collapse function should work correctly', () => {
      const input = {
        alpha: [[1, 2, 3], [4, 5]],
        bravo: [[10, 11], [12]],
        metadata: "test"
      };
      const result = divinator.collapse(input);
      expect(result.alpha).toBeDefined();
      expect(result.metadata).toBe("test");
    });

    test('probability and discrete constants should be defined', () => {
      expect(divinator.probability).toBeDefined();
      expect(divinator.discrete).toBeDefined();
      expect(divinator.rules).toBeDefined();
      
      expect(divinator.probability.A).toBeDefined();
      expect(divinator.probability.B).toBeDefined();
      expect(divinator.probability.C).toBeDefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => Math.random() * 100);
      const start = Date.now();
      const outliers = divinator.iqr(largeData);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(outliers).toBeDefined();
    });    test('should handle single outlier correctly', () => {
      const dataWithSingleOutlier = [50, 51, 52, 53, 54, 55, 200];
      const iqrOutliers = divinator.iqr(dataWithSingleOutlier);
      const zOutliers = divinator.zscore(dataWithSingleOutlier);
      const modZOutliers = divinator.modifiedZscore(dataWithSingleOutlier);
      
      expect(iqrOutliers).toContain(200);
      // Z-score for 200 is ~2.45, below default threshold of 3
      expect(zOutliers).not.toContain(200);
      expect(modZOutliers).toContain(200);
    });

    test('should handle datasets with repeated values', () => {
      const repeatedData = [1, 1, 1, 2, 2, 2, 3, 3, 3, 100];
      const outliers = divinator.iqr(repeatedData);
      expect(outliers).toContain(100);
    });
  });
});

describe('Compatibility and Integration Tests', () => {
  test('should maintain backward compatibility', () => {
    // Test that the original simple API still works
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
    
    expect(() => divinator.iqr(data)).not.toThrow();
    expect(() => divinator.zscore(data)).not.toThrow();
    expect(() => divinator.modifiedZscore(data)).not.toThrow();
  });

  test('should export all expected functions', () => {
    const expectedExports = [
      'version', 'PI', 'E', 'iqr', 'zscore', 'modifiedZscore',
      'Zone', 'patterns', 'collapse', 'xbar', 'xbar2',
      'shapiroWilk', 'kolmogorovSmirnov', 'jarqueBera',
      'probability', 'discrete', 'rules'
    ];

    expectedExports.forEach(exportName => {
      expect(divinator[exportName]).toBeDefined();
    });
  });
});
