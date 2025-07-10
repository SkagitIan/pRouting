let routeData = [];
let currentMapType = 'individual'; // 'individual' or 'combined'

document.addEventListener("DOMContentLoaded", () => {
  const optimizeBtn = document.getElementById("optimizeBtn");
  const resultsDiv = document.getElementById("results");

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

    optimizeBtn.disabled = true;
    optimizeBtn.innerHTML = '<div class="loading-spinner me-2"></div>Processing...';
    resultsDiv.innerHTML = `
      <div class="alert alert-info">
        <div class="loading-spinner me-3"></div>
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
          return_map: true 
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
    } finally {
      optimizeBtn.disabled = false;
      optimizeBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Optimize Routes';
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "mapTypeToggle") {
      currentMapType = e.target.checked ? 'combined' : 'individual';
      if (routeData.length > 0) {
        renderMaps();
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.id === "exportBtn") {
      exportRouteData();
    }
  });
});

// UI helpers
function addMapControls() {
  const controlsHtml = `
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
    </div>`;
  document.getElementById("results").insertAdjacentHTML("beforebegin", controlsHtml);
}

// Core display
function renderResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  const totalTime = data.routes.reduce((sum, r) => sum + r.total_time, 0);
  const avgParcels = (
    data.routes.reduce((sum, r) => sum + r.stops.length, 0) / data.routes.length
  ).toFixed(1);

  const summary = `
    <div class="route-summary">
      <h5 class="mb-4">📦 Route Summary</h5>
      <div class="row text-center">
        <div class="col-md-3 col-6 mb-3">
          <div class="stats-number">${data.stats.total_routes}</div>
          <div>Total Routes</div>
        </div>
        <div class="col-md-3 col-6 mb-3">
          <div class="stats-number">${totalTime.toFixed(1)}</div>
          <div>Total Minutes</div>
        </div>
        <div class="col-md-3 col-6 mb-3">
          <div class="stats-number">${avgParcels}</div>
          <div>Avg Parcels/Route</div>
        </div>
        <div class="col-md-3 col-6 mb-3">
          <div class="stats-number">${data.stats.found_parcels}</div>
          <div>Found Parcels</div>
        </div>
      </div>
      ${data.stats.not_found_parcels.length > 0 ? `
        <div class="alert alert-warning mt-3">
          <strong>Not Found:</strong> ${data.stats.not_found_parcels.join(", ")}
        </div>
      ` : ''}
    </div>`;
  resultsDiv.insertAdjacentHTML("beforeend", summary);

  renderMaps();
}

async function renderMaps() {
  const resultsDiv = document.getElementById("results");
  resultsDiv.querySelectorAll('.map-container').forEach(map => map.remove());

  if (currentMapType === 'combined') {
    await renderCombinedMap();
  } else {
    await renderIndividualMaps();
  }
}

async function renderCombinedMap() {
  const resultsDiv = document.getElementById("results");
  resultsDiv.insertAdjacentHTML("beforeend", `
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
  `);

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
    document.getElementById("combined-map").innerHTML = `
      <div class="alert alert-danger m-3">Failed to generate map: ${error.message}</div>`;
  }
}

async function renderIndividualMaps() {
  const resultsDiv = document.getElementById("results");

  for (let i = 0; i < routeData.length; i++) {
    const route = routeData[i];
    const mapId = `map-${i}`;
    const stopsHtml = route.stops.map((s, j) => `
      <li class="list-group-item">
        <span class="badge bg-primary me-2">${j + 1}</span>
        <strong>${s.prop_id}</strong> <small class="text-muted">${s.address || ""}</small>
      </li>`).join("");

    resultsDiv.insertAdjacentHTML("beforeend", `
      <div class="map-container">
        <div class="card mb-4 shadow-sm">
          <div class="card-header bg-light">
            <strong>Route ${i + 1}</strong> - ${route.total_time.toFixed(1)} min, ${route.stops.length} stops
          </div>
          <div class="card-body p-0">
            <div id="${mapId}" style="height: 400px;"></div>
          </div>
          <div class="card-footer">
            <ul class="list-group">${stopsHtml}</ul>
          </div>
        </div>
      </div>
    `);

    try {
      const res = await fetch("https://prouting-391338802487.us-west1.run.app/generate_map", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes: [route] })
      });
      const html = await res.text();
      document.getElementById(mapId).innerHTML = html;
    } catch (err) {
      document.getElementById(mapId).innerHTML = `<div class="alert alert-danger">Map failed</div>`;
    }
  }
}

function exportRouteData() {
  const allRoutes = routeData.flatMap((route, i) =>
    route.stops.map((stop, j) => ({
      route: i + 1,
      stop: j + 1,
      prop_id: stop.prop_id,
      address: stop.address || "",
      latitude: stop.latitude,
      longitude: stop.longitude,
      hood: stop.hood || "",
      total_time: route.total_time
    }))
  );
  const csv = [
    Object.keys(allRoutes[0]),
    ...allRoutes.map(row => Object.values(row))
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "all_routes.csv";
  a.click();
  URL.revokeObjectURL(url);
}
