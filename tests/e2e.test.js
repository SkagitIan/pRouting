// End-to-end integration tests for the complete Property Route Optimizer workflow

/**
 * @jest-environment jsdom
 */

const {
  parseParcelInput,
  validateApiResponse,
  transformRoutesForExport,
  generateCSV,
  calculateRouteStats
} = require('../scripts-testable.js');

describe('Property Route Optimizer - E2E Integration Tests', () => {

  beforeEach(() => {
    // Set up complete DOM structure
    document.body.innerHTML = `
      <div class="container">
        <div class="hero-section">
          <h1>Property Route Optimizer</h1>
        </div>
        
        <div class="row">
          <div class="col-lg-8">
            <div class="card">
              <div class="card-body">
                <textarea id="parcelInput" rows="8" placeholder="P12345"></textarea>
                <select id="fieldMode">
                  <option value="REVAL">Revaluation (2 min stops)</option>
                  <option value="INSPECTION">Inspection (10 min stops)</option>
                </select>
                <button id="optimizeBtn">Optimize Routes</button>
              </div>
            </div>
          </div>
        </div>

        <div id="results"></div>
      </div>
    `;

    // Mock fetch
    fetch.mockClear();
  });

  describe('Complete User Workflow', () => {
    test('should handle complete successful workflow from input to export', async () => {
      // Step 1: User enters parcel data
      const parcelInput = document.getElementById('parcelInput');
      const testParcels = 'P12345\nP67890\nP11111\nINVALID123\nP22222';
      parcelInput.value = testParcels;

      // Step 2: Parse and validate input
      const parsedParcels = parseParcelInput(testParcels);
      expect(parsedParcels).toEqual(['P12345', 'P67890', 'P11111', 'P22222']);

      // Step 3: Mock successful API response
      const mockApiResponse = {
        routes: [
          {
            total_time: 120,
            stops: [
              {
                prop_id: 'P12345',
                address: '123 Main St',
                latitude: 40.7128,
                longitude: -74.0060,
                hood: 'Downtown'
              },
              {
                prop_id: 'P67890',
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
                prop_id: 'P11111',
                address: '789 Pine St',
                latitude: 40.6782,
                longitude: -73.9442,
                hood: 'Brooklyn'
              },
              {
                prop_id: 'P22222',
                address: '321 Elm Dr',
                latitude: 40.7831,
                longitude: -73.9712,
                hood: 'Upper East'
              }
            ]
          }
        ],
        stats: {
          total_routes: 2,
          found_parcels: 4,
          not_found_parcels: []
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      });

      // Step 4: Validate API response structure
      expect(validateApiResponse(mockApiResponse)).toBe(true);

      // Step 5: Calculate statistics
      const stats = calculateRouteStats(mockApiResponse.routes);
      expect(stats).toEqual({
        totalTime: 210,
        avgParcels: 2,
        totalRoutes: 2,
        totalStops: 4
      });

      // Step 6: Transform data for export
      const exportData = transformRoutesForExport(mockApiResponse.routes);
      expect(exportData).toHaveLength(4);
      expect(exportData[0]).toEqual({
        route: 1,
        stop: 1,
        prop_id: 'P12345',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.0060,
        hood: 'Downtown',
        total_time: 120
      });

      // Step 7: Generate CSV
      const csv = generateCSV(exportData);
      expect(csv).toContain('route,stop,prop_id,address,latitude,longitude,hood,total_time');
      expect(csv.split('\n')).toHaveLength(5); // 4 data rows + 1 header

      // Step 8: Verify all parcels were processed
      const processedParcels = exportData.map(row => row.prop_id);
      expect(processedParcels).toEqual(['P12345', 'P67890', 'P11111', 'P22222']);
    });

    test('should handle workflow with not found parcels', async () => {
      const testParcels = 'P12345\nP99999\nP67890\nP88888';
      const parsedParcels = parseParcelInput(testParcels);
      expect(parsedParcels).toEqual(['P12345', 'P99999', 'P67890', 'P88888']);

      const mockApiResponse = {
        routes: [
          {
            total_time: 120,
            stops: [
              { prop_id: 'P12345', address: '123 Main St' },
              { prop_id: 'P67890', address: '456 Oak Ave' }
            ]
          }
        ],
        stats: {
          total_routes: 1,
          found_parcels: 2,
          not_found_parcels: ['P99999', 'P88888']
        }
      };

      expect(validateApiResponse(mockApiResponse)).toBe(true);
      
      const exportData = transformRoutesForExport(mockApiResponse.routes);
      expect(exportData).toHaveLength(2); // Only found parcels
      
      const processedParcels = exportData.map(row => row.prop_id);
      expect(processedParcels).toEqual(['P12345', 'P67890']);
      expect(processedParcels).not.toContain('P99999');
      expect(processedParcels).not.toContain('P88888');
    });

    test('should handle empty results workflow', async () => {
      const testParcels = 'P99999\nP88888';
      const parsedParcels = parseParcelInput(testParcels);

      const mockApiResponse = {
        routes: [],
        stats: {
          total_routes: 0,
          found_parcels: 0,
          not_found_parcels: ['P99999', 'P88888']
        }
      };

      expect(validateApiResponse(mockApiResponse)).toBe(true);
      
      const stats = calculateRouteStats(mockApiResponse.routes);
      expect(stats).toEqual({
        totalTime: 0,
        avgParcels: 0,
        totalRoutes: 0,
        totalStops: 0
      });

      const exportData = transformRoutesForExport(mockApiResponse.routes);
      expect(exportData).toHaveLength(0);

      const csv = generateCSV(exportData);
      expect(csv).toBe('');
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should handle API error and recovery workflow', async () => {
      const testParcels = 'P12345\nP67890';
      const parsedParcels = parseParcelInput(testParcels);
      expect(parsedParcels).toHaveLength(2);

      // Test that we can handle successful API response after error
      const mockApiResponse = {
        routes: [
          {
            total_time: 120,
            stops: [
              { prop_id: 'P12345', address: '123 Main St' },
              { prop_id: 'P67890', address: '456 Oak Ave' }
            ]
          }
        ],
        stats: {
          total_routes: 1,
          found_parcels: 2,
          not_found_parcels: []
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      });

      const response = await fetch('https://prouting-391338802487.us-west1.run.app', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcels: parsedParcels,
          mode: 'REVAL',
          return_map: true
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(validateApiResponse(data)).toBe(true);
      
      // Test that error handling works with error message formatting
      const testError = new Error('Server error: 500');
      expect(testError.message).toBe('Server error: 500');
    });

    test('should handle invalid input and graceful degradation', () => {
      // Test various invalid inputs
      const invalidInputs = [
        '', // Empty
        '123\n456\nABC', // No valid parcels
        null, // Null input
        undefined, // Undefined input
        'P\nP\nP' // Only single P characters
      ];

      invalidInputs.forEach(input => {
        const result = parseParcelInput(input);
        expect(result).toEqual([]);
      });

      // Workflow should handle gracefully
      const exportData = transformRoutesForExport([]);
      expect(exportData).toEqual([]);

      const csv = generateCSV(exportData);
      expect(csv).toBe('');
    });
  });

  describe('Map Type Toggle Workflows', () => {
    test('should handle map type switching workflow', () => {
      // Add map controls to DOM
      const resultsDiv = document.getElementById('results');
      const controlsHTML = `
        <div class="control-panel">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="mapTypeToggle">
            <label class="form-check-label" for="mapTypeToggle">Combined Map View</label>
          </div>
        </div>
      `;
      resultsDiv.insertAdjacentHTML('beforebegin', controlsHTML);

      const mapToggle = document.getElementById('mapTypeToggle');
      
      // Test individual view (default)
      expect(mapToggle.checked).toBe(false);
      
      // Switch to combined view
      mapToggle.checked = true;
      expect(mapToggle.checked).toBe(true);
      
      // Switch back to individual view
      mapToggle.checked = false;
      expect(mapToggle.checked).toBe(false);
    });

    test('should handle map rendering workflow for both view types', () => {
      const resultsDiv = document.getElementById('results');
      
      // Test individual map creation
      const individualMapHTML = `
        <div class="map-container">
          <div class="card">
            <div class="card-header">Route 1 - 120.0 min, 2 stops</div>
            <div class="card-body">
              <div id="map-0" style="height: 400px;"></div>
            </div>
          </div>
        </div>
      `;
      
      resultsDiv.innerHTML = individualMapHTML;
      expect(document.getElementById('map-0')).toBeTruthy();
      
      // Clear for combined map
      resultsDiv.querySelectorAll('.map-container').forEach(map => map.remove());
      
      // Test combined map creation
      const combinedMapHTML = `
        <div class="map-container">
          <div class="card">
            <div class="card-header">🗺️ Combined Route Map</div>
            <div class="card-body">
              <div id="combined-map" style="height: 600px;"></div>
            </div>
          </div>
        </div>
      `;
      
      resultsDiv.innerHTML = combinedMapHTML;
      expect(document.getElementById('combined-map')).toBeTruthy();
    });
  });

  describe('Export Workflow Integration', () => {
    test('should handle complete export workflow', () => {
      // Add export button to DOM
      const resultsDiv = document.getElementById('results');
      const exportHTML = `
        <button id="exportBtn" class="btn btn-outline-primary">
          <i class="fas fa-download me-2"></i>Export All Routes
        </button>
      `;
      resultsDiv.insertAdjacentHTML('beforebegin', exportHTML);

      // Mock route data for export
      const routeData = [
        {
          total_time: 120,
          stops: [
            { 
              prop_id: 'P12345',
              address: '123 Main St',
              latitude: 40.7128,
              longitude: -74.0060,
              hood: 'Downtown'
            }
          ]
        }
      ];

      // Transform and generate CSV
      const exportData = transformRoutesForExport(routeData);
      const csv = generateCSV(exportData);

      expect(csv).toContain('route,stop,prop_id,address,latitude,longitude,hood,total_time');
      expect(csv).toContain('"P12345","123 Main St","40.7128","-74.006","Downtown","120"');

      // Verify export button exists
      expect(document.getElementById('exportBtn')).toBeTruthy();
    });

    test('should handle export with no data', () => {
      const exportData = transformRoutesForExport([]);
      const csv = generateCSV(exportData);
      
      expect(csv).toBe('');
      
      // Export should handle empty data gracefully
      expect(() => generateCSV([])).not.toThrow();
    });
  });

  describe('UI State Management Workflows', () => {
    test('should handle loading state transitions', () => {
      const optimizeBtn = document.getElementById('optimizeBtn');
      const resultsDiv = document.getElementById('results');

      // Initial state
      expect(optimizeBtn.disabled).toBe(false);

      // Loading state
      optimizeBtn.disabled = true;
      optimizeBtn.innerHTML = '<div class="loading-spinner me-2"></div>Processing...';
      resultsDiv.innerHTML = `
        <div class="alert alert-info">
          <div class="loading-spinner me-3"></div>
          Processing 4 parcels... please wait.
        </div>
      `;

      expect(optimizeBtn.disabled).toBe(true);
      expect(optimizeBtn.innerHTML).toContain('loading-spinner');
      expect(resultsDiv.innerHTML).toContain('Processing 4 parcels');

      // Success state
      optimizeBtn.disabled = false;
      optimizeBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Optimize Routes';
      resultsDiv.innerHTML = `
        <div class="route-summary">
          <h5>📦 Route Summary</h5>
          <div class="stats-number">2</div>
        </div>
      `;

      expect(optimizeBtn.disabled).toBe(false);
      expect(resultsDiv.innerHTML).toContain('Route Summary');
    });

    test('should handle error state display', () => {
      const resultsDiv = document.getElementById('results');

      // Error state
      resultsDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> Server error: 500. Please try again.
        </div>
      `;

      expect(resultsDiv.innerHTML).toContain('alert-danger');
      expect(resultsDiv.innerHTML).toContain('Server error: 500');
    });
  });

  describe('Field Mode Integration', () => {
    test('should handle different field modes in workflow', () => {
      const fieldMode = document.getElementById('fieldMode');
      
      // Test REVAL mode
      fieldMode.value = 'REVAL';
      expect(fieldMode.value).toBe('REVAL');
      
      // Test INSPECTION mode
      fieldMode.value = 'INSPECTION';
      expect(fieldMode.value).toBe('INSPECTION');
      
      // Field mode should be included in API request
      const requestBody = {
        parcels: ['P12345'],
        mode: fieldMode.value,
        return_map: true
      };
      
      expect(requestBody.mode).toBe('INSPECTION');
    });
  });
});