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
      initMaps(); // only now build maps

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
    const routeId = route.route_id;
    const mapDivId = `map-${routeId}`;

    routeMapData.push({
      routeId: mapDivId,
      stops: route.stops.map((s, idx) => ({ ...s, label: `${idx + 1}` })),
      polyline: route.polyline
    });

    const stopsList = route.stops.map((stop, idx) =>
      `<li class="list-group-item">
        <strong>Stop ${idx + 1} – ${stop.prop_id}</strong><br/>
        <a href="https://maps.google.com/?q=${stop.latitude},${stop.longitude}" target="_blank">
          <small class="text-muted">${stop.address || "No address"}</small>
        </a>
      </li>`).join("");

    const card = `
      <div class="card mb-3 shadow-sm" data-route-id="${routeId}">
        <div class="card-header appertivo-purple d-flex justify-content-between">
          <span>Route ${i + 1}</span>
          <small>${route.total_time.toFixed(1)} minutes</small>
        </div>
        <div class="card-body">
          <div id="${mapDivId}" class="gmap mb-3" style="width:100%;height:300px;background-color:#f5f5f5;"></div>
          <ul class="list-group list-group-flush">${stopsList}</ul>
          <button class="btn btn-sm btn-outline-success mt-3" onclick="copyParcelList('${routeId}')">
            📋 Copy Parcel List
          </button>
        </div>
      </div>`;
    resultsDiv.insertAdjacentHTML("beforeend", card);
  });
}

// Called once Google Maps SDK and DOM are ready
window.initMaps = function() {
  console.log("✅ Initializing maps for", routeMapData.length, "routes");

  routeMapData.forEach(({ routeId, stops, polyline }) => {
    const mapEl = document.getElementById(routeId);
    if (!mapEl || stops.length < 2) return;

    const bounds = new google.maps.LatLngBounds();
    const map = new google.maps.Map(mapEl, {
      mapTypeId: "roadmap",
      tilt: 0
    });

    // Draw polyline if available
    if (polyline && google.maps.geometry) {
      const decodedPath = google.maps.geometry.encoding.decodePath(polyline);
      new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: "#B993D6",
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map
      });
    }

    // Add markers
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
  });
};

function copyParcelList(routeId) {
  const card = document.querySelector(`[data-route-id="${routeId}"]`);
  const parcels = Array.from(card.querySelectorAll("li")).map(li => {
    const match = li.textContent.match(/P\d+/);
    return match ? match[0] : "";
  }).filter(Boolean).join("\n");

  navigator.clipboard.writeText(parcels)
    .then(() => alert("Parcel list copied to clipboard!"))
    .catch(() => alert("Clipboard copy failed."));
}
