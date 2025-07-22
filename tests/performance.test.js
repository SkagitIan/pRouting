// Performance tests for Property Route Optimizer

const {
  parseParcelInput,
  calculateRouteStats,
  transformRoutesForExport,
  generateCSV
} = require('../scripts-testable.js');

describe('Property Route Optimizer - Performance Tests', () => {

  describe('Performance with Large Datasets', () => {
    test('should handle large parcel input efficiently', () => {
      // Generate a large input string with 1000 parcel IDs
      const largeParcels = Array.from({ length: 1000 }, (_, i) => `P${i.toString().padStart(5, '0')}`);
      const largeInput = largeParcels.join('\n');

      const startTime = performance.now();
      const result = parseParcelInput(largeInput);
      const endTime = performance.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should calculate stats for large route datasets efficiently', () => {
      // Generate 100 routes with 20 stops each
      const largeRoutes = Array.from({ length: 100 }, (_, i) => ({
        total_time: Math.floor(Math.random() * 300) + 60, // 60-360 minutes
        stops: Array.from({ length: 20 }, (_, j) => ({
          prop_id: `P${(i * 20 + j).toString().padStart(5, '0')}`
        }))
      }));

      const startTime = performance.now();
      const result = calculateRouteStats(largeRoutes);
      const endTime = performance.now();

      expect(result.totalRoutes).toBe(100);
      expect(result.totalStops).toBe(2000);
      expect(result.avgParcels).toBe(20);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
    });

    test('should transform large route data for export efficiently', () => {
      // Generate 50 routes with varying numbers of stops
      const largeRoutes = Array.from({ length: 50 }, (_, i) => ({
        total_time: Math.floor(Math.random() * 200) + 60,
        stops: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, j) => ({
          prop_id: `P${(i * 10 + j).toString().padStart(5, '0')}`,
          address: `${j + 1}00 Street ${i + 1}`,
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          hood: `Hood ${Math.floor(Math.random() * 5) + 1}`
        }))
      }));

      const startTime = performance.now();
      const result = transformRoutesForExport(largeRoutes);
      const endTime = performance.now();

      expect(result.length).toBeGreaterThan(250); // At least 250 stops total
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should generate CSV for large datasets efficiently', () => {
      // Generate 2000 data records
      const largeData = Array.from({ length: 2000 }, (_, i) => ({
        route: Math.floor(i / 20) + 1,
        stop: (i % 20) + 1,
        prop_id: `P${i.toString().padStart(5, '0')}`,
        address: `${i + 1}00 Test Street`,
        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
        hood: `Hood ${Math.floor(Math.random() * 10) + 1}`,
        total_time: Math.floor(Math.random() * 300) + 60
      }));

      const startTime = performance.now();
      const result = generateCSV(largeData);
      const endTime = performance.now();

      expect(result).toContain('route,stop,prop_id'); // Header row
      expect(result.split('\n')).toHaveLength(2001); // 2000 data rows + 1 header
      expect(endTime - startTime).toBeLessThan(200); // Should complete in less than 200ms
    });
  });

  describe('Memory Usage Optimization', () => {
    test('should not create excessive intermediate arrays during parsing', () => {
      const input = Array.from({ length: 1000 }, (_, i) => `P${i}`).join('\n');
      
      // Test that we're not creating excessive garbage
      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < 10; i++) {
        parseParcelInput(input);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('should handle repeated route calculations without memory leaks', () => {
      const routes = Array.from({ length: 100 }, (_, i) => ({
        total_time: 120,
        stops: Array.from({ length: 10 }, (_, j) => ({ prop_id: `P${i}${j}` }))
      }));

      const initialMemory = process.memoryUsage();
      
      // Run calculation many times
      for (let i = 0; i < 100; i++) {
        calculateRouteStats(routes);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle empty inputs efficiently', () => {
      const startTime = performance.now();
      
      // Run empty input tests multiple times
      for (let i = 0; i < 1000; i++) {
        parseParcelInput('');
        calculateRouteStats([]);
        transformRoutesForExport([]);
        generateCSV([]);
      }
      
      const endTime = performance.now();
      
      // Should complete very quickly
      expect(endTime - startTime).toBeLessThan(50);
    });

    test('should handle malformed input gracefully without performance degradation', () => {
      const malformedInput = Array.from({ length: 1000 }, (_, i) => {
        // Mix of valid and invalid parcel IDs
        return i % 3 === 0 ? `P${i}` : `INVALID${i}`;
      }).join('\n');

      const startTime = performance.now();
      const result = parseParcelInput(malformedInput);
      const endTime = performance.now();

      expect(result.length).toBeLessThan(1000); // Should filter out invalid ones
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle routes with missing properties efficiently', () => {
      const mixedRoutes = Array.from({ length: 100 }, (_, i) => {
        // Create routes with various missing properties
        const route = {};
        if (i % 2 === 0) route.total_time = 120;
        if (i % 3 === 0) route.stops = [{ prop_id: `P${i}` }];
        return route;
      });

      const startTime = performance.now();
      const result = calculateRouteStats(mixedRoutes);
      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Concurrent Operation Performance', () => {
    test('should handle concurrent parsing operations', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) => 
        Array.from({ length: 100 }, (_, j) => `P${i}${j}`).join('\n')
      );

      const startTime = performance.now();
      
      const promises = inputs.map(input => 
        Promise.resolve(parseParcelInput(input))
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toHaveLength(100));
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle concurrent CSV generation', async () => {
      const datasets = Array.from({ length: 5 }, (_, i) => 
        Array.from({ length: 200 }, (_, j) => ({
          route: i + 1,
          stop: j + 1,
          prop_id: `P${i}${j}`
        }))
      );

      const startTime = performance.now();
      
      const promises = datasets.map(data => 
        Promise.resolve(generateCSV(data))
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(5);
      results.forEach(csv => {
        expect(csv).toContain('route,stop,prop_id');
        expect(csv.split('\n')).toHaveLength(201); // 200 rows + header
      });
      expect(endTime - startTime).toBeLessThan(150);
    });
  });

  describe('Function Optimization Benchmarks', () => {
    test('should demonstrate improved performance vs naive implementations', () => {
      const input = Array.from({ length: 1000 }, (_, i) => `P${i}`).join('\n');

      // Test optimized version
      const optimizedStart = performance.now();
      const optimizedResult = parseParcelInput(input);
      const optimizedEnd = performance.now();

      // Test naive implementation
      const naiveStart = performance.now();
      const naiveResult = input.split('\n')
        .filter(p => p.trim().toUpperCase().startsWith('P'))
        .filter(p => p.trim().length > 1)
        .map(p => p.trim().toUpperCase());
      const naiveEnd = performance.now();

      expect(optimizedResult).toEqual(naiveResult);
      
      // Our optimized version should be at least as fast or faster
      const optimizedTime = optimizedEnd - optimizedStart;
      const naiveTime = naiveEnd - naiveStart;
      
      // Allow some variance, but generally should be comparable or better
      expect(optimizedTime).toBeLessThanOrEqual(naiveTime * 2);
    });
  });
});