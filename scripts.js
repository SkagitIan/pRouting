  const BACKEND_URL = "https://prouting-391338802487.us-west1.run.app"; // ← CHANGE THIS

  let parcelData = [];
  let routeCounter = 1;
  let drawnItems = new L.FeatureGroup();
  const routeState = {};

  const map = L.map('main-map').setView([48.5, -122.3], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map);
  map.addLayer(drawnItems);

  const drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: {
      polygon: true,
      rectangle: true,
      circle: false,
      polyline: false,
      marker: false
    }
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    drawnItems.addLayer(layer);
    const selected = parcelData.filter(p => layer.getBounds().contains([p.lat, p.lon]));
    if (selected.length > 0) createRouteCard(selected);
  });

  function loadParcels() {
    const raw = document.getElementById('parcel-input').value.trim().split(/\s+/);
    fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_parcels',
        parcel_ids: raw
      })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("Failed to load parcels.");
        return;
      }
      parcelData = data.parcels;
      parcelData.forEach(p => {
        const marker = L.circleMarker([p.lat, p.lon], { radius: 4, color: 'blue' }).addTo(map);
        marker.bindTooltip(p.parcel_id);
      });
      const bounds = L.latLngBounds(parcelData.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds);
    });
  }

  function createRouteCard(parcels) {
    const routeId = `route-${routeCounter++}`;
    routeState[routeId] = { parcels, optimized: false, mode: 'drive' };

    const html = `
      <div class="card mb-3" id="${routeId}">
        <div class="card-header d-flex justify-content-between align-items-center">
          <strong>${routeId}</strong>
          <select class="form-select form-select-sm w-auto" onchange="changeMode('${routeId}', this.value)">
            <option value="drive">🚗 Drive</option>
            <option value="walk">🚶 Walk</option>
          </select>
        </div>
        <div class="card-body">
          <div id="${routeId}-map" class="map-container"></div>
          <ul class="list-group parcel-list" id="list-${routeId}">
            ${parcels.map(p => `<li class="list-group-item" data-id="${p.parcel_id}">${p.parcel_id}</li>`).join('')}
          </ul>
          <button class="btn btn-sm btn-primary mt-2" onclick="optimizeRoute('${routeId}')">Optimize</button>
        </div>
      </div>
    `;
    document.getElementById('routes').insertAdjacentHTML('beforeend', html);

    const routeMap = L.map(`${routeId}-map`, {
      attributionControl: false,
      zoomControl: false
    }).setView([parcels[0].lat, parcels[0].lon], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(routeMap);
    parcels.forEach(p => L.circleMarker([p.lat, p.lon], { radius: 4, color: 'green' }).addTo(routeMap));

    Sortable.create(document.getElementById(`list-${routeId}`), {
      group: 'routes',
      animation: 150,
      onAdd: () => routeState[routeId].optimized = false,
      onUpdate: () => routeState[routeId].optimized = false
    });
  }

  function changeMode(routeId, mode) {
    routeState[routeId].mode = mode;
    routeState[routeId].optimized = false;
  }

  function optimizeRoute(routeId) {
    const ul = document.getElementById(`list-${routeId}`);
    const parcel_ids = Array.from(ul.querySelectorAll('li')).map(li => li.dataset.id);
    const mode = routeState[routeId].mode;

    fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'optimize_route',
        parcel_ids,
        mode
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status !== 'success') {
        alert("Optimization failed.");
        return;
      }
      routeState[routeId].optimized = true;
      alert(`Route ${routeId} optimized!\nTotal time: ${data.total_time} min`);
      // TODO: Render polyline if returned
    });
  }
