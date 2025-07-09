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
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ parcels, mode: fieldMode, group_size: 30 })
      });

      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);

      const data = await res.json();

      renderResults(data);
    } catch (err) {
      console.error("Fetch error:", err);
      resultsDiv.innerHTML = `<div class="alert alert-danger">Something went wrong. Please try again.</div>`;
    }
  });
});

function renderResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  // 2️⃣ Summary Card
  const totalTime = data.routes.reduce((sum, r) => sum + r.total_time, 0);
  const avgParcels = (data.routes.reduce((sum, r) => sum + r.stops.length, 0) / data.routes.length).toFixed(1);
  const summaryHtml = `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">Route Summary</h5>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>Total Routes:</strong> ${data.stats.total_routes}</li>
          <li class="list-group-item"><strong>Total Time:</strong> ${totalTime.toFixed(1)} minutes</li>
          <li class="list-group-item"><strong>Avg Parcels per Route:</strong> ${avgParcels}</li>
        </ul>
      </div>
    </div>`;
  resultsDiv.insertAdjacentHTML("beforeend", summaryHtml);

  data.routes.forEach((route, i) => {
    const mapSection = createMapSection(route, i);
    const stopsList = route.stops.map((stop, idx) =>
      `<li class="list-group-item">
        <strong>Stop ${idx+1} – ${stop.prop_id}</strong><br/>
        <a href="https://maps.google.com/?q=${stop.latitude},${stop.longitude}" target="_blank">
          <small class="text-muted">${stop.address || 'No address'}</small>
        </a>
      </li>`).join("");

    const routeHtml = `
      <div class="card mb-3 shadow-sm" data-route-id="${route.route_id}">
        <div class="card-header appertivo-purple text-white d-flex justify-content-between">
          <span>Route ${i+1}</span>
          <small>${route.total_time.toFixed(1)} minutes</small>
        </div>
        <div class="card-body">
          ${mapSection}
          <ul class="list-group list-group-flush mt-3">${stopsList}</ul>
          <button class="btn btn-sm btn-outline-success mt-3" onclick="copyParcelList('${route.route_id}')">
            📋 Copy Parcel List
          </button>
        </div>
      </div>`;
    resultsDiv.insertAdjacentHTML("beforeend", routeHtml);
  });
}

function createMapSection(route, idx) {
  const coords = route.stops.map(s => `${s.latitude},${s.longitude}`);
  const centerLat = (route.stops.reduce((sum, s) => sum + s.latitude, 0) / coords.length).toFixed(6);
  const centerLng = (route.stops.reduce((sum, s) => sum + s.longitude, 0) / coords.length).toFixed(6);
  const zoom = 13;

  const markerParams = coords.map(c => `markers=label:P|${c}`).join("&");
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=${zoom}&size=600x300&style=feature:road|element:geometry|lightness:50&${markerParams}&key=YOUR_STATIC_MAP_KEY`;

  return `
    <div class="map-container mb-3">
      <img src="${mapUrl}" class="img-fluid rounded shadow-sm" alt="Route map ${idx+1}"/>
    </div>`;
}

function copyParcelList(routeId) {
  const card = document.querySelector(`[data-route-id="${routeId}"]`);
  const parcels = Array.from(card.querySelectorAll("li")).map(li => {
    const match = li.textContent.match(/P\d+/);
    return match ? match[0] : "";
  }).filter(Boolean).join("\n");

  navigator.clipboard.writeText(parcels)
    .then(() => alert("Parcel list copied to clipboard!"))
    .catch(err => alert("Failed to copy parcel list."));
}
