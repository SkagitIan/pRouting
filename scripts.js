let routeData = [];
let currentMapType = 'individual'; // 'individual' or 'combined'

document.addEventListener("DOMContentLoaded", () => {
  const optimizeBtn = document.getElementById("optimizeBtn");
  const resultsDiv = document.getElementById("results");
  const mapTypeToggle = document.getElementById("mapTypeToggle");
  const exportBtn = document.getElementById("exportBtn");

  // Add UI controls
  addMapControls();

  optimizeBtn.addEventListener("click", async () => {
    const parcelText = document.getElementById("parcelInput").value.trim();
    const fieldMode = document.getElementById("fieldMode").value;

    const parcels = parcelText
      .split("\n")
      .map(p => p.trim().toUpperCase())
      .filter(p => p.startsWith("P"));

    if (parcels.length === 0) {
      alert("Please enter valid parcel IDs.");
      return;
    }

    resultsDiv.innerHTML = `
      <div class="alert alert-info">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
        Processing ${parcels.length} parcels... please wait.
      </div>`;

    try {
      const res = await fetch("https://prouting-391338802487.us-west1.run.app", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          parcels, 
          mode: fieldMode, 
          group_size: 30,
          return_map: true  // Request map generation
        })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      
      routeData = data.routes;
      renderResults(data);

    } catch (err) {
      console.error("Fetch error:", err);
      resultsDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> ${err.message}. Please try again.
        </div>`;
    }
  });

  // Map type toggle
  if (mapTypeToggle) {
    mapTypeToggle.addEventListener("change", () => {
      currentMapType = mapTypeToggle.checked ? 'combined' : 'individual';
      if (routeData.length > 0) {
        renderMaps();
      }
    });
  }

  // Export functionality
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportRouteData();
    });
  }
});

function addMapControls() {
  const controlsHtml = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-4">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="mapTypeToggle">
              <label class="form-check-label" for="mapTypeToggle">
                <strong>Combined Map View</strong>
              </label>
            </div>
          </div>
          <div class="col-md-4">
            <button id="exportBtn" class="btn btn-outline-primary btn-sm">
              <i class="fas fa-download"></i> Export Routes
            </button>
          </div>
          <div class="col-md-4">
            <button id="printBtn" class="btn btn-outline-secondary btn-sm" onclick="window.print()">
              <i class="fas fa-print"></i> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const resultsDiv = document.getElementById("results");
  resultsDiv.insertAdjacentHTML("beforebegin", controlsHtml);
}

function renderResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  const totalTime = data.routes.reduce((sum, r) => sum + r.total_time, 0);
  const avgParcels = (
    data.routes.reduce((sum, r) => sum + r.stops.length, 0) / data.routes.length
  ).toFixed(1);
  const totalDistance = data.routes.reduce((sum, r) => sum + (r.distance || 0), 0);

  // Enhanced summary with more statistics
  const summary = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">📦 Route Summary</h5>
        <div class="row">
          <div class="col-md-3">
            <div class="text-center">
              <h3 class="text-primary">${data.stats.total_routes}</h3>
              <small>Total Routes</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <h3 class="text-success">${totalTime.toFixed(1)}</h3>
              <small>Total Minutes</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <h3 class="text-info">${avgParcels}</h3>
              <small>Avg Parcels/Route</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <h3 class="text-warning">${data.stats.found_parcels}</h3>
              <small>Found Parcels</small>
            </div>
          </div>
        </div>
        ${data.stats.not_found_parcels.length > 0 ? `
          <div class="alert alert-warning mt-3">
            <strong>Not Found:</strong> ${data.stats.not_found_parcels.join(", ")}
          </div>
        ` : ''}
      </div>
    </div>`;
  
  resultsDiv.insertAdjacentHTML("beforeend", summary);

  // Render maps
  renderMaps();
}

async function renderMaps() {
  const resultsDiv = document.getElementById("results");
  
  // Remove existing map containers
  const existingMaps = resultsDiv.querySelectorAll('.map-container');
  existingMaps.forEach(map => map.remove());

  if (currentMapType === 'combined') {
    await renderCombinedMap();
  } else {
    await renderIndividualMaps();
  }
}

async function renderCombinedMap() {
  const resultsDiv = document.getElementById("results");
  
  const mapContainer = `
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
  
  resultsDiv.insertAdjacentHTML("beforeend", mapContainer);

  try {
    const response = await fetch("https://prouting-391338802487.us-west1.run.app/generate_map", {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routes: routeData })
    });

    if (!response.ok) throw new Error(`Map generation failed: ${response.status}`);
    
    const mapHtml = await response.text();
    document.getElementById("combined-map").innerHTML = mapHtml;
    
  } catch (error) {
    console.error("Failed to generate combined map:", error);
    document.getElementById("combined-map").innerHTML = `
      <div class="alert alert-danger m-3">
        Failed to generate map: ${error.message}
      </div>
    `;
  }

  // Add route list below map
  addRouteList();
}

async function renderIndividualMaps() {
  const resultsDiv = document.getElementById("results");

  for (let i = 0; i < routeData.length; i++) {
    const route = routeData[i];
    const mapDivId = `map-${i}`;

    if (route.stops.length < 1) continue;

    const stopsList = route.stops.map((stop, idx) =>
      `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <span class="badge bg-primary me-2">${idx + 1}</span>
          <strong>${stop.prop_id}</strong>
          <div class="text-muted small">${stop.address || "No address"}</div>
        </div>
        <div>
          <a href="https://maps.google.com/?q=${stop.latitude},${stop.longitude}" 
             target="_blank" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
      </li>`).join("");

    const mapContainer = `
      <div class="map-container">
        <div class="card mb-3 shadow-sm" data-route-id="${mapDivId}">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h6 class="mb-0">🚗 Route ${i + 1}</h6>
            <div class="d-flex align-items-center gap-3">
              <small class="text-muted">
                <i class="fas fa-clock"></i> ${route.total_time.toFixed(1)} min
              </small>
              <small class="text-muted">
                <i class="fas fa-map-marker-alt"></i> ${route.stops.length} stops
              </small>
            </div>
          </div>
          <div class="card-body p-0">
            <div id="${mapDivId}" style="height: 400px; width: 100%;"></div>
          </div>
          <div class="card-footer">
            <div class="row">
              <div class="col-md-8">
                <h6>Stops:</h6>
                <ul class="list-group list-group-flush" style="max-height: 200px; overflow-y: auto;">
                  ${stopsList}
                </ul>
              </div>
              <div class="col-md-4 d-flex flex-column gap-2">
                <button class="btn btn-sm btn-outline-success" onclick="copyParcelList('${mapDivId}')">
                  <i class="fas fa-copy"></i> Copy Parcel List
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="exportRoute(${i})">
                  <i class="fas fa-download"></i> Export Route
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    resultsDiv.insertAdjacentHTML("beforeend", mapContainer);

    // Generate individual map
    try {
      const response = await fetch("https://prouting-391338802487.us-west1.run.app/generate_map", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes: [route] })
      });

      if (!response.ok) throw new Error(`Map generation failed: ${response.status}`);
      
      const mapHtml = await response.text();
      document.getElementById(mapDivId).innerHTML = mapHtml;
      
    } catch (error) {
      console.error(`Failed to generate map for route ${i + 1}:`, error);
      document.getElementById(mapDivId).innerHTML = `
        <div class="alert alert-warning m-3">
          Failed to generate map: ${error.message}
        </div>
      `;
    }
  }
}

function addRouteList() {
  const resultsDiv = document.getElementById("results");
  
  const routeList = routeData.map((route, i) => {
    const stopsList = route.stops.map((stop, idx) => 
      `<span class="badge bg-light text-dark me-1">${idx + 1}. ${stop.prop_id}</span>`
    ).join("");
    
    return `
      <div class="card mb-2">
        <div class="card-body">
          <h6>Route ${i + 1} <small class="text-muted">(${route.total_time.toFixed(1)} min)</small></h6>
          <div class="mb-2">${stopsList}</div>
          <button class="btn btn-sm btn-outline-primary" onclick="copyParcelList('route-${i}')">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
      </div>
    `;
  }).join("");
  
  const routeListContainer = `
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0">📋 Route Details</h5>
      </div>
      <div class="card-body">
        ${routeList}
      </div>
    </div>
  `;
  
  resultsDiv.insertAdjacentHTML("beforeend", routeListContainer);
}

// Utility functions
window.copyParcelList = function(routeId) {
  const routeIndex = parseInt(routeId.split('-')[1]);
  const route = routeData[routeIndex];
  
  if (!route) return;
  
  const parcelList = route.stops.map(stop => stop.prop_id).join('\n');
  
  navigator.clipboard.writeText(parcelList).then(() => {
    // Show success toast
    showToast('Parcel list copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy parcel list', 'error');
  });
};

window.exportRoute = function(routeIndex) {
  const route = routeData[routeIndex];
  if (!route) return;
  
  const csvContent = [
    ['Stop', 'Property ID', 'Address', 'Latitude', 'Longitude', 'Neighborhood'],
    ...route.stops.map((stop, idx) => [
      idx + 1,
      stop.prop_id,
      stop.address || '',
      stop.latitude,
      stop.longitude,
      stop.hood || ''
    ])
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  downloadCSV(csvContent, `route_${routeIndex + 1}.csv`);
};

function exportRouteData() {
  const allRoutes = routeData.flatMap((route, routeIndex) => 
    route.stops.map((stop, stopIndex) => ({
      route: routeIndex + 1,
      stop: stopIndex + 1,
      property_id: stop.prop_id,
      address: stop.address || '',
      latitude: stop.latitude,
      longitude: stop.longitude,
      neighborhood: stop.hood || '',
      route_time_minutes: route.total_time
    }))
  );
  
  const csvContent = [
    Object.keys(allRoutes[0]),
    ...allRoutes.map(row => Object.values(row))
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  downloadCSV(csvContent, 'all_routes.csv');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  // Add to page
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  toastContainer.appendChild(toast);
  
  // Show toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  // Remove after hiding
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  container.style.zIndex = '1055';
  document.body.appendChild(container);
  return container;
}
