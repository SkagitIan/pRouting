// Unit tests for Property Route Optimizer utility functions

const {
  parseParcelInput,
  calculateRouteStats,
  transformRoutesForExport,
  generateCSV,
  validateApiResponse,
  formatErrorMessage
} = require('../scripts-testable.js');

describe('Property Route Optimizer - Utility Functions', () => {
  
  describe('parseParcelInput', () => {
    test('should parse valid parcel IDs starting with P', () => {
      const input = 'P12345\nP67890\nP11111';
      const result = parseParcelInput(input);
      expect(result).toEqual(['P12345', 'P67890', 'P11111']);
    });

    test('should filter out invalid parcel IDs', () => {
      const input = 'P12345\n67890\nP11111\nINVALID\nP22222';
      const result = parseParcelInput(input);
      expect(result).toEqual(['P12345', 'P11111', 'P22222']);
    });

    test('should handle mixed case and trim whitespace', () => {
      const input = '  p12345  \n  P67890\n p11111  ';
      const result = parseParcelInput(input);
      expect(result).toEqual(['P12345', 'P67890', 'P11111']);
    });

    test('should handle empty input', () => {
      expect(parseParcelInput('')).toEqual([]);
      expect(parseParcelInput(null)).toEqual([]);
      expect(parseParcelInput(undefined)).toEqual([]);
    });

    test('should handle non-string input', () => {
      expect(parseParcelInput(123)).toEqual([]);
      expect(parseParcelInput({})).toEqual([]);
      expect(parseParcelInput([])).toEqual([]);
    });

    test('should filter out single P character', () => {
      const input = 'P\nP12345\nP';
      const result = parseParcelInput(input);
      expect(result).toEqual(['P12345']);
    });
  });

  describe('calculateRouteStats', () => {
    test('should calculate correct statistics for valid routes', () => {
      const routes = [
        { 
          total_time: 120, 
          stops: [
            { prop_id: 'P123' }, 
            { prop_id: 'P456' }
          ] 
        },
        { 
          total_time: 180, 
          stops: [
            { prop_id: 'P789' }, 
            { prop_id: 'P101' }, 
            { prop_id: 'P102' }
          ] 
        }
      ];

      const result = calculateRouteStats(routes);
      expect(result).toEqual({
        totalTime: 300,
        avgParcels: 2.5,
        totalRoutes: 2,
        totalStops: 5
      });
    });

    test('should handle empty routes array', () => {
      const result = calculateRouteStats([]);
      expect(result).toEqual({
        totalTime: 0,
        avgParcels: 0,
        totalRoutes: 0,
        totalStops: 0
      });
    });

    test('should handle null or undefined input', () => {
      expect(calculateRouteStats(null)).toEqual({
        totalTime: 0,
        avgParcels: 0,
        totalRoutes: 0,
        totalStops: 0
      });
      expect(calculateRouteStats(undefined)).toEqual({
        totalTime: 0,
        avgParcels: 0,
        totalRoutes: 0,
        totalStops: 0
      });
    });

    test('should handle routes with missing properties', () => {
      const routes = [
        { total_time: 120 }, // Missing stops
        { stops: [{ prop_id: 'P123' }] }, // Missing total_time
        { total_time: 60, stops: null } // Null stops
      ];

      const result = calculateRouteStats(routes);
      expect(result).toEqual({
        totalTime: 180,
        avgParcels: 0.3,
        totalRoutes: 3,
        totalStops: 1
      });
    });
  });

  describe('transformRoutesForExport', () => {
    test('should transform routes into flat export format', () => {
      const routeData = [
        {
          total_time: 120,
          stops: [
            { 
              prop_id: 'P123', 
              address: '123 Main St', 
              latitude: 40.7128, 
              longitude: -74.0060, 
              hood: 'Downtown' 
            },
            { 
              prop_id: 'P456', 
              address: '456 Oak Ave', 
              latitude: 40.7589, 
              longitude: -73.9851, 
              hood: 'Midtown' 
            }
          ]
        },
        {
          total_time: 90,
          stops: [
            { 
              prop_id: 'P789', 
              address: '789 Pine St', 
              latitude: 40.6782, 
              longitude: -73.9442, 
              hood: 'Brooklyn' 
            }
          ]
        }
      ];

      const result = transformRoutesForExport(routeData);
      expect(result).toEqual([
        {
          route: 1,
          stop: 1,
          prop_id: 'P123',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
          hood: 'Downtown',
          total_time: 120
        },
        {
          route: 1,
          stop: 2,
          prop_id: 'P456',
          address: '456 Oak Ave',
          latitude: 40.7589,
          longitude: -73.9851,
          hood: 'Midtown',
          total_time: 120
        },
        {
          route: 2,
          stop: 1,
          prop_id: 'P789',
          address: '789 Pine St',
          latitude: 40.6782,
          longitude: -73.9442,
          hood: 'Brooklyn',
          total_time: 90
        }
      ]);
    });

    test('should handle missing properties gracefully', () => {
      const routeData = [
        {
          total_time: 120,
          stops: [
            { prop_id: 'P123' }, // Missing other properties
            { 
              prop_id: 'P456', 
              address: '456 Oak Ave' 
              // Missing lat/lng/hood 
            }
          ]
        }
      ];

      const result = transformRoutesForExport(routeData);
      expect(result).toEqual([
        {
          route: 1,
          stop: 1,
          prop_id: 'P123',
          address: '',
          latitude: '',
          longitude: '',
          hood: '',
          total_time: 120
        },
        {
          route: 1,
          stop: 2,
          prop_id: 'P456',
          address: '456 Oak Ave',
          latitude: '',
          longitude: '',
          hood: '',
          total_time: 120
        }
      ]);
    });

    test('should handle empty or invalid input', () => {
      expect(transformRoutesForExport([])).toEqual([]);
      expect(transformRoutesForExport(null)).toEqual([]);
      expect(transformRoutesForExport(undefined)).toEqual([]);
    });

    test('should handle routes with missing or invalid stops', () => {
      const routeData = [
        { total_time: 120 }, // Missing stops
        { total_time: 90, stops: null }, // Null stops
        { total_time: 60, stops: [] } // Empty stops
      ];

      const result = transformRoutesForExport(routeData);
      expect(result).toEqual([]);
    });
  });

  describe('generateCSV', () => {
    test('should generate valid CSV from data array', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];

      const result = generateCSV(data);
      const expected = 'name,age,city\n"John","30","New York"\n"Jane","25","Los Angeles"';
      expect(result).toBe(expected);
    });

    test('should handle empty data', () => {
      expect(generateCSV([])).toBe('');
      expect(generateCSV(null)).toBe('');
      expect(generateCSV(undefined)).toBe('');
    });

    test('should handle missing properties in data objects', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', city: 'LA' }, // Missing age
        { age: 25, city: 'NYC' } // Missing name
      ];

      const result = generateCSV(data);
      const expected = 'name,age\n"John","30"\n"Jane",""\n"","25"';
      expect(result).toBe(expected);
    });

    test('should escape quotes in data', () => {
      const data = [
        { name: 'John "Johnny" Doe', description: 'A "great" person' }
      ];

      const result = generateCSV(data);
      const expected = 'name,description\n"John "Johnny" Doe","A "great" person"';
      expect(result).toBe(expected);
    });
  });

  describe('validateApiResponse', () => {
    test('should validate correct API response structure', () => {
      const validResponse = {
        routes: [
          {
            total_time: 120,
            stops: [
              { prop_id: 'P123', address: '123 Main St' }
            ]
          }
        ],
        stats: {
          total_routes: 1,
          found_parcels: 1,
          not_found_parcels: []
        }
      };

      expect(validateApiResponse(validResponse)).toBe(true);
    });

    test('should reject invalid API response structures', () => {
      // Missing routes
      expect(validateApiResponse({})).toBe(false);
      
      // Routes is not an array
      expect(validateApiResponse({ routes: 'invalid' })).toBe(false);
      
      // Route missing required properties
      expect(validateApiResponse({ 
        routes: [{ stops: [] }] // Missing total_time
      })).toBe(false);
      
      expect(validateApiResponse({ 
        routes: [{ total_time: 120 }] // Missing stops
      })).toBe(false);
      
      // Stops is not an array
      expect(validateApiResponse({ 
        routes: [{ total_time: 120, stops: 'invalid' }] 
      })).toBe(false);
    });

    test('should handle null or undefined input', () => {
      expect(validateApiResponse(null)).toBe(false);
      expect(validateApiResponse(undefined)).toBe(false);
    });

    test('should validate empty but correctly structured response', () => {
      const emptyResponse = {
        routes: []
      };
      expect(validateApiResponse(emptyResponse)).toBe(true);
    });
  });

  describe('formatErrorMessage', () => {
    test('should format Error objects correctly', () => {
      const error = new Error('Something went wrong');
      expect(formatErrorMessage(error)).toBe('Something went wrong');
    });

    test('should handle string errors', () => {
      expect(formatErrorMessage('String error')).toBe('String error');
    });

    test('should handle null or undefined errors', () => {
      expect(formatErrorMessage(null)).toBe('Unknown error occurred');
      expect(formatErrorMessage(undefined)).toBe('Unknown error occurred');
    });

    test('should handle Error objects without message', () => {
      const error = {};
      expect(formatErrorMessage(error)).toBe('An error occurred');
    });

    test('should handle non-standard error objects', () => {
      const error = { message: 'Custom error' };
      expect(formatErrorMessage(error)).toBe('Custom error');
    });
  });
});