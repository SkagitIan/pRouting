let routeMapData = [];

document.addEventListener("DOMContentLoaded", () => {
  const optimizeBtn = document.getElementById("optimizeBtn");
  const resultsDiv = document.getElementById("results");

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

    resultsDiv.innerHTML = `<div class="alert alert-info">Processing ${parcels.length} parcels... please wait.</div>`;

    try {
      const res = await fetch("https://prouting-391338802487.us-west1.run.app", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcels, mode: fieldMode, group_size: 30 })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      renderResults(data);
      initMaps();

    } catch (err) {
      console.error("Fetch error:", err);
      resultsDiv.innerHTML = `<div class="alert alert-danger">Something went wrong. Please try again.</div>`;
    }
  });
});

function renderResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  const totalTime = data.routes.reduce((sum, r) => sum + r.total_time, 0);
  const avgParcels = (
    data.routes.reduce((sum, r) => sum + r.stops.length, 0) / data.routes.length
  ).toFixed(1);

  const summary = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">📦 Route Summary</h5>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>Total Routes:</strong> ${data.stats.total_routes}</li>
          <li class="list-group-item"><strong>Total Time:</strong> ${totalTime.toFixed(1)} minutes</li>
          <li class="list-group-item"><strong>Average Parcels per Route:</strong> ${avgParcels}</li>
        </ul>
      </div>
    </div>`;
  resultsDiv.insertAdjacentHTML("beforeend", summary);

  routeMapData = [];

  data.routes.forEach((route, i) => {
    // Use the array index instead of route.route_id to ensure unique IDs
    const mapDivId = `map-${i}`;

    if (route.stops.length < 2) return; // skip single-point routes

    routeMapData.push({
      routeId: mapDivId,
      stops: route.stops.map((s, idx) => ({ ...s, label: `${idx + 1}` })),
      polyline: route.polyline
    });

    const stopsList = route.stops.map((stop, idx) =>
      `<li class="list-group-item">
        <span class="badge">${idx + 1}</span><span><strong>${stop.prop_id}</strong></span>
        <a href="https://maps.google.com/?q=${stop.latitude},${stop.longitude}" target="_blank">
          <small class="text-muted ms-2">${stop.address || "No address"}</small>
        </a>
      </li>`).join("");

    const card = `
      <div class="card mb-3 shadow-sm" data-route-id="${mapDivId}">
        <div class="card-header appertivo-purple d-flex justify-content-between">
          <span>Route ${i + 1}</span>
          <small>${route.total_time.toFixed(1)} minutes</small>
        </div>
        <div class="card-body">
          <div id="${mapDivId}" class="gmap mb-3" style="width:100%;height:300px;background-color:#f5f5f5;"></div>
          <ul class="list-group list-group-flush">${stopsList}</ul>
          <button class="btn btn-sm btn-outline-success mt-3" onclick="copyParcelList('${mapDivId}')">
            📋 Copy Parcel List
          </button>
        </div>
      </div>`;
    resultsDiv.insertAdjacentHTML("beforeend", card);
  });
}

window.initMaps = function () {
  console.log("✅ Initializing maps for", routeMapData.length, "routes");

  routeMapData.forEach(({ routeId, stops, polyline }, index) => {
    console.log(`🔍 Processing route ${index + 1}:`, routeId);
    
    const mapEl = document.getElementById(routeId);
    if (!mapEl) {
      console.error(`❌ Map element not found for: ${routeId}`);
      return;
    }
    
    if (stops.length < 2) {
      console.log(`⚠️ Skipping ${routeId} - only ${stops.length} stops`);
      return;
    }

    console.log(`📍 Creating map for ${routeId} with ${stops.length} stops`);

    try {
      const bounds = new google.maps.LatLngBounds();
      const map = new google.maps.Map(mapEl, {
        mapTypeId: "roadmap",
        tilt: 0
      });

      console.log(`✅ Map created successfully for ${routeId}`);

      // Decode and draw polyline between actual stops (not office)
      if (polyline && google.maps.geometry) {
        console.log(`🛣️ Drawing polyline for ${routeId}`);
        const fullPath = google.maps.geometry.encoding.decodePath(polyline);

        // Strip first and last points (office at both ends)
        const stopPath = fullPath.slice(1, -1); // actual stops only
        if (stopPath.length > 1) {
          new google.maps.Polyline({
            path: stopPath,
            geodesic: true,
            strokeColor: "#58B09C",
            strokeOpacity: 0.9,
            strokeWeight: 4,
            map
          });

          stopPath.forEach(p => bounds.extend(p));
        }
      } else {
        console.log(`⚠️ No polyline or geometry library for ${routeId}`);
      }

      // Add markers for actual stops
      console.log(`📌 Adding ${stops.length} markers for ${routeId}`);
      stops.forEach((s, idx) => {
        const marker = new google.maps.Marker({
          position: { lat: s.latitude, lng: s.longitude },
          map,
          label: `${idx + 1}`,
          title: s.prop_id,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#f08000",
            fillOpacity: 1,
            strokeColor: "#49475B",
            strokeWeight: 1,
            scale: 6
          }
        });
        bounds.extend(marker.getPosition());
      });

      map.fitBounds(bounds);
      console.log(`✅ Map completed for ${routeId}`);

    } catch (error) {
      console.error(`❌ Error creating map for ${routeId}:`, error);
    }
  });
};
