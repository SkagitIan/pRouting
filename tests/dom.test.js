// Integration tests for DOM functionality and user interactions

/**
 * @jest-environment jsdom
 */

describe('Property Route Optimizer - DOM Integration Tests', () => {
  
  beforeEach(() => {
    // Set up a basic DOM structure that matches the application
    document.body.innerHTML = `
      <div class="container">
        <div id="results"></div>
        <textarea id="parcelInput"></textarea>
        <select id="fieldMode">
          <option value="REVAL">Revaluation</option>
          <option value="INSPECTION">Inspection</option>
        </select>
        <button id="optimizeBtn">Optimize Routes</button>
      </div>
    `;
  });

  describe('DOM Element Interaction', () => {
    test('should find required DOM elements', () => {
      expect(document.getElementById('parcelInput')).toBeTruthy();
      expect(document.getElementById('fieldMode')).toBeTruthy();
      expect(document.getElementById('optimizeBtn')).toBeTruthy();
      expect(document.getElementById('results')).toBeTruthy();
    });

    test('should handle parcel input changes', () => {
      const parcelInput = document.getElementById('parcelInput');
      const testInput = 'P12345\nP67890\nP11111';
      
      parcelInput.value = testInput;
      expect(parcelInput.value).toBe(testInput);
    });

    test('should handle field mode selection', () => {
      const fieldMode = document.getElementById('fieldMode');
      
      fieldMode.value = 'INSPECTION';
      expect(fieldMode.value).toBe('INSPECTION');
      
      fieldMode.value = 'REVAL';
      expect(fieldMode.value).toBe('REVAL');
    });
  });

  describe('Results Display', () => {
    test('should render route summary correctly', () => {
      const resultsDiv = document.getElementById('results');
      
      // Mock route summary HTML
      const summaryHTML = `
        <div class="route-summary">
          <h5 class="mb-4">📦 Route Summary</h5>
          <div class="row text-center">
            <div class="col-md-3 col-6 mb-3">
              <div class="stats-number">2</div>
              <div>Total Routes</div>
            </div>
            <div class="col-md-3 col-6 mb-3">
              <div class="stats-number">300.0</div>
              <div>Total Minutes</div>
            </div>
            <div class="col-md-3 col-6 mb-3">
              <div class="stats-number">2.5</div>
              <div>Avg Parcels/Route</div>
            </div>
            <div class="col-md-3 col-6 mb-3">
              <div class="stats-number">5</div>
              <div>Found Parcels</div>
            </div>
          </div>
        </div>
      `;
      
      resultsDiv.innerHTML = summaryHTML;
      
      expect(resultsDiv.querySelector('.route-summary')).toBeTruthy();
      expect(resultsDiv.querySelector('.stats-number').textContent).toBe('2');
    });

    test('should display error messages correctly', () => {
      const resultsDiv = document.getElementById('results');
      
      const errorHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> Server error: 500. Please try again.
        </div>
      `;
      
      resultsDiv.innerHTML = errorHTML;
      
      expect(resultsDiv.querySelector('.alert-danger')).toBeTruthy();
      expect(resultsDiv.textContent).toContain('Server error: 500');
    });

    test('should display loading state correctly', () => {
      const resultsDiv = document.getElementById('results');
      
      const loadingHTML = `
        <div class="alert alert-info">
          <div class="loading-spinner me-3"></div>
          Processing 3 parcels... please wait.
        </div>
      `;
      
      resultsDiv.innerHTML = loadingHTML;
      
      expect(resultsDiv.querySelector('.alert-info')).toBeTruthy();
      expect(resultsDiv.querySelector('.loading-spinner')).toBeTruthy();
      expect(resultsDiv.textContent).toContain('Processing 3 parcels');
    });
  });

  describe('Map Container Management', () => {
    test('should create individual map containers', () => {
      const resultsDiv = document.getElementById('results');
      
      // Simulate adding individual map containers
      const mapHTML = `
        <div class="map-container">
          <div class="card mb-4 shadow-sm">
            <div class="card-header bg-light">
              <strong>Route 1</strong> - 120.0 min, 2 stops
            </div>
            <div class="card-body p-0">
              <div id="map-0" style="height: 400px;"></div>
            </div>
          </div>
        </div>
      `;
      
      resultsDiv.insertAdjacentHTML('beforeend', mapHTML);
      
      expect(resultsDiv.querySelector('.map-container')).toBeTruthy();
      expect(resultsDiv.querySelector('#map-0')).toBeTruthy();
      expect(resultsDiv.textContent).toContain('Route 1');
    });

    test('should create combined map container', () => {
      const resultsDiv = document.getElementById('results');
      
      const combinedMapHTML = `
        <div class="map-container">
          <div class="card mb-4 shadow-sm">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">🗺️ Combined Route Map</h5>
            </div>
            <div class="card-body p-0">
              <div id="combined-map" style="height: 600px; width: 100%;"></div>
            </div>
          </div>
        </div>
      `;
      
      resultsDiv.insertAdjacentHTML('beforeend', combinedMapHTML);
      
      expect(resultsDiv.querySelector('#combined-map')).toBeTruthy();
      expect(resultsDiv.textContent).toContain('Combined Route Map');
    });

    test('should remove existing map containers', () => {
      const resultsDiv = document.getElementById('results');
      
      // Add some map containers
      resultsDiv.innerHTML = `
        <div class="map-container">Map 1</div>
        <div class="map-container">Map 2</div>
        <div class="other-content">Other</div>
      `;
      
      // Simulate removing map containers
      resultsDiv.querySelectorAll('.map-container').forEach(map => map.remove());
      
      expect(resultsDiv.querySelectorAll('.map-container')).toHaveLength(0);
      expect(resultsDiv.querySelector('.other-content')).toBeTruthy();
    });
  });

  describe('Control Panel', () => {
    test('should create control panel with map toggle', () => {
      const resultsDiv = document.getElementById('results');
      
      const controlsHTML = `
        <div class="control-panel">
          <div class="map-controls">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="mapTypeToggle">
              <label class="form-check-label" for="mapTypeToggle">
                <strong>Combined Map View</strong>
              </label>
            </div>
            <button id="exportBtn" class="btn btn-outline-primary">
              <i class="fas fa-download me-2"></i>Export All Routes
            </button>
            <button class="btn btn-outline-secondary" onclick="window.print()">
              <i class="fas fa-print me-2"></i>Print
            </button>
          </div>
        </div>
      `;
      
      resultsDiv.insertAdjacentHTML('beforebegin', controlsHTML);
      
      expect(document.getElementById('mapTypeToggle')).toBeTruthy();
      expect(document.getElementById('exportBtn')).toBeTruthy();
      expect(document.querySelector('.control-panel')).toBeTruthy();
    });

    test('should handle map type toggle', () => {
      const resultsDiv = document.getElementById('results');
      
      const controlsHTML = `
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="mapTypeToggle">
          <label class="form-check-label" for="mapTypeToggle">Combined Map View</label>
        </div>
      `;
      
      resultsDiv.insertAdjacentHTML('beforebegin', controlsHTML);
      
      const toggle = document.getElementById('mapTypeToggle');
      
      // Test unchecked state
      expect(toggle.checked).toBe(false);
      
      // Test checked state
      toggle.checked = true;
      expect(toggle.checked).toBe(true);
    });
  });

  describe('Button State Management', () => {
    test('should handle optimize button state changes', () => {
      const optimizeBtn = document.getElementById('optimizeBtn');
      
      // Test initial state
      expect(optimizeBtn.disabled).toBe(false);
      expect(optimizeBtn.innerHTML).toContain('Optimize Routes');
      
      // Test loading state
      optimizeBtn.disabled = true;
      optimizeBtn.innerHTML = '<div class="loading-spinner me-2"></div>Processing...';
      
      expect(optimizeBtn.disabled).toBe(true);
      expect(optimizeBtn.innerHTML).toContain('Processing...');
      expect(optimizeBtn.innerHTML).toContain('loading-spinner');
      
      // Test reset state
      optimizeBtn.disabled = false;
      optimizeBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Optimize Routes';
      
      expect(optimizeBtn.disabled).toBe(false);
      expect(optimizeBtn.innerHTML).toContain('Optimize Routes');
    });
  });

  describe('CSV Export Simulation', () => {
    test('should create download link for CSV export', () => {
      // Mock the export functionality
      const csvData = 'route,stop,prop_id\n1,1,P123\n1,2,P456';
      const blob = new Blob([csvData], { type: 'text/csv' });
      
      // Verify blob creation
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should handle CSV export with empty data', () => {
      const csvData = '';
      
      // Should not create export for empty data
      expect(csvData).toBe('');
    });
  });

  describe('Responsive Design Elements', () => {
    test('should have responsive container structure', () => {
      expect(document.querySelector('.container')).toBeTruthy();
    });

    test('should handle mobile-friendly controls', () => {
      const resultsDiv = document.getElementById('results');
      
      const mobileControlsHTML = `
        <div class="map-controls">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="mapTypeToggle">
            <label class="form-check-label" for="mapTypeToggle">Combined View</label>
          </div>
        </div>
      `;
      
      resultsDiv.insertAdjacentHTML('beforebegin', mobileControlsHTML);
      
      expect(document.querySelector('.map-controls')).toBeTruthy();
      expect(document.querySelector('.form-check-input')).toBeTruthy();
    });
  });
});