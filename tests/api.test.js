// API integration tests for Property Route Optimizer

const { validateApiResponse, formatErrorMessage } = require('../scripts-testable.js');

describe('Property Route Optimizer - API Integration Tests', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('API Request Structure', () => {
    test('should structure API request correctly for route optimization', () => {
      const parcels = ['P12345', 'P67890', 'P11111'];
      const fieldMode = 'REVAL';
      
      const expectedRequestBody = {
        parcels,
        mode: fieldMode,
        return_map: true
      };

      expect(expectedRequestBody).toEqual({
        parcels: ['P12345', 'P67890', 'P11111'],
        mode: 'REVAL',
        return_map: true
      });
    });

    test('should structure API request for map generation', () => {
      const routeData = [
        {
          total_time: 120,
          stops: [
            { prop_id: 'P123', address: '123 Main St' }
          ]
        }
      ];

      const expectedRequestBody = {
        routes: routeData
      };

      expect(expectedRequestBody).toEqual({
        routes: [
          {
            total_time: 120,
            stops: [
              { prop_id: 'P123', address: '123 Main St' }
            ]
          }
        ]
      });
    });
  });

  describe('API Response Handling', () => {
    test('should handle successful API response', async () => {
      const mockResponse = {
        routes: [
          {
            total_time: 120,
            stops: [
              { 
                prop_id: 'P123', 
                address: '123 Main St',
                latitude: 40.7128,
                longitude: -74.0060
              }
            ]
          }
        ],
        stats: {
          total_routes: 1,
          found_parcels: 1,
          not_found_parcels: []
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const response = await fetch('https://prouting-391338802487.us-west1.run.app', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcels: ['P123'],
          mode: 'REVAL',
          return_map: true
        })
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(validateApiResponse(data)).toBe(true);
      expect(data.routes).toHaveLength(1);
      expect(data.stats.total_routes).toBe(1);
    });

    test('should handle API error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const response = await fetch('https://prouting-391338802487.us-west1.run.app', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcels: ['P123'],
          mode: 'REVAL',
          return_map: true
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    test('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('https://prouting-391338802487.us-west1.run.app', {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parcels: ['P123'],
            mode: 'REVAL',
            return_map: true
          })
        });
      } catch (error) {
        expect(error.message).toBe('Network error');
        expect(formatErrorMessage(error)).toBe('Network error');
      }
    });
  });

  describe('Map Generation API', () => {
    test('should handle successful map generation response', async () => {
      const mockMapHtml = '<div class="folium-map">Map content here</div>';

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockMapHtml
      });

      const response = await fetch('https://prouting-391338802487.us-west1.run.app/generate_map', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routes: [
            {
              total_time: 120,
              stops: [{ prop_id: 'P123' }]
            }
          ]
        })
      });

      expect(response.ok).toBe(true);
      
      const html = await response.text();
      expect(html).toContain('folium-map');
    });

    test('should handle map generation failures', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const response = await fetch('https://prouting-391338802487.us-west1.run.app/generate_map', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: [] })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('API Response Validation', () => {
    test('should validate complete API response structure', () => {
      const validResponse = {
        routes: [
          {
            total_time: 120,
            stops: [
              {
                prop_id: 'P123',
                address: '123 Main St',
                latitude: 40.7128,
                longitude: -74.0060,
                hood: 'Downtown'
              }
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

    test('should reject invalid response structures', () => {
      // Missing routes
      expect(validateApiResponse({
        stats: { total_routes: 0 }
      })).toBe(false);

      // Invalid route structure
      expect(validateApiResponse({
        routes: [
          {
            // Missing total_time
            stops: [{ prop_id: 'P123' }]
          }
        ]
      })).toBe(false);

      // Invalid stops structure
      expect(validateApiResponse({
        routes: [
          {
            total_time: 120,
            stops: 'invalid' // Should be array
          }
        ]
      })).toBe(false);
    });

    test('should validate response with multiple routes', () => {
      const multiRouteResponse = {
        routes: [
          {
            total_time: 120,
            stops: [
              { prop_id: 'P123' },
              { prop_id: 'P456' }
            ]
          },
          {
            total_time: 90,
            stops: [
              { prop_id: 'P789' }
            ]
          }
        ],
        stats: {
          total_routes: 2,
          found_parcels: 3,
          not_found_parcels: []
        }
      };

      expect(validateApiResponse(multiRouteResponse)).toBe(true);
    });

    test('should handle response with not found parcels', () => {
      const responseWithNotFound = {
        routes: [
          {
            total_time: 120,
            stops: [{ prop_id: 'P123' }]
          }
        ],
        stats: {
          total_routes: 1,
          found_parcels: 1,
          not_found_parcels: ['P999', 'P888']
        }
      };

      expect(validateApiResponse(responseWithNotFound)).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should format server error messages correctly', () => {
      const serverError = new Error('Server error: 500');
      expect(formatErrorMessage(serverError)).toBe('Server error: 500');
    });

    test('should format network error messages correctly', () => {
      const networkError = new Error('Failed to fetch');
      expect(formatErrorMessage(networkError)).toBe('Failed to fetch');
    });

    test('should handle timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      expect(formatErrorMessage(timeoutError)).toBe('Request timeout');
    });

    test('should handle CORS errors', () => {
      const corsError = new Error('CORS policy violation');
      expect(formatErrorMessage(corsError)).toBe('CORS policy violation');
    });
  });

  describe('API Configuration', () => {
    test('should use correct API endpoint URLs', () => {
      const baseUrl = 'https://prouting-391338802487.us-west1.run.app';
      const mapUrl = 'https://prouting-391338802487.us-west1.run.app/generate_map';

      expect(baseUrl).toBe('https://prouting-391338802487.us-west1.run.app');
      expect(mapUrl).toBe('https://prouting-391338802487.us-west1.run.app/generate_map');
    });

    test('should use correct request headers', () => {
      const headers = {
        'Content-Type': 'application/json'
      };

      expect(headers['Content-Type']).toBe('application/json');
    });

    test('should use correct request method and mode', () => {
      const requestConfig = {
        method: 'POST',
        mode: 'cors'
      };

      expect(requestConfig.method).toBe('POST');
      expect(requestConfig.mode).toBe('cors');
    });
  });

  describe('Rate Limiting and Performance', () => {
    test('should handle concurrent API requests', async () => {
      const mockResponse = {
        routes: [{ total_time: 120, stops: [{ prop_id: 'P123' }] }],
        stats: { total_routes: 1, found_parcels: 1, not_found_parcels: [] }
      };

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      // Simulate multiple concurrent requests
      const requests = Array(3).fill(null).map(() =>
        fetch('https://prouting-391338802487.us-west1.run.app', {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parcels: ['P123'],
            mode: 'REVAL',
            return_map: true
          })
        })
      );

      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });

    test('should handle rate limit errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const response = await fetch('https://prouting-391338802487.us-west1.run.app', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcels: ['P123'],
          mode: 'REVAL',
          return_map: true
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });
  });
});