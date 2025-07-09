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

   const payload = {
  parcels,
  mode: fieldMode,
  group_size: 30  // Add this line
};;

    try {
      const res = await fetch("https://prouting-391338802487.us-west1.run.app", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

       const raw = await res.text();
       console.log("RAW RESPONSE:", raw);
       const data = JSON.parse(raw);
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
  
  if (!data.routes || data.routes.length === 0) {
    resultsDiv.innerHTML = `<div class="alert alert-warning">No routes found.</div>`;
    return;
  }
  
  data.routes.forEach((route, i) => {
    const group = document.createElement("div");
    group.classList.add("card", "mb-3", "shadow-sm");
    
    const stops = route.stops.map((stop, idx) =>
      `<li class="list-group-item">
        <strong>Stop ${idx + 1}:</strong> ${stop.address || 'No address'} 
        <span class="text-muted">(${stop.prop_id})</span>
      </li>`
    ).join("");
    
    // Create map section with error handling
    const mapSection = createMapSection(route.map_url, route.route_id, route.stops);
    
    group.innerHTML = `
      <div class="card-header appertivo-purple text-white">
        <div class="d-flex justify-content-between align-items-center">
          <span>Route ${i + 1}</span>
          <small>${route.total_time} minutes</small>
        </div>
      </div>
      <ul class="list-group list-group-flush">${stops}</ul>
      <div class="card-body">
        ${mapSection}
      </div>
    `;
    
    resultsDiv.appendChild(group);
  });
}

function createMapSection(mapUrl, routeId, stops) {
  if (!mapUrl) {
    return `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        Map not available for this route.
      </div>
    `;
  }
  
  // Create a unique ID for this map
  const mapId = `map-${routeId}`;
  
  return `
    <div class="map-container">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0">Route Map</h6>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="openInGoogleMaps('${mapUrl}')">
            <i class="fas fa-external-link-alt"></i> Open in Maps
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="refreshMap('${mapId}')">
            <i class="fas fa-refresh"></i> Refresh
          </button>
        </div>
      </div>
      
      <div class="ratio ratio-16x9">
        <iframe 
          id="${mapId}"
          src="${mapUrl}" 
          width="100%" 
          height="100%" 
          style="border:0;" 
          allowfullscreen
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          onerror="handleMapError('${mapId}')"
          onload="handleMapLoad('${mapId}')">
        </iframe>
      </div>
      
      <div id="${mapId}-error" class="alert alert-warning mt-2" style="display: none;">
        <i class="fas fa-exclamation-triangle"></i>
        Unable to load embedded map. 
        <a href="${mapUrl}" target="_blank" class="alert-link">Click here to open in Google Maps</a>
      </div>
    </div>
  `;
}

function handleMapError(mapId) {
  console.error(`Map loading error for ${mapId}`);
  document.getElementById(mapId).style.display = 'none';
  document.getElementById(`${mapId}-error`).style.display = 'block';
}

function handleMapLoad(mapId) {
  console.log(`Map loaded successfully for ${mapId}`);
  document.getElementById(`${mapId}-error`).style.display = 'none';
}

function refreshMap(mapId) {
  const iframe = document.getElementById(mapId);
  const currentSrc = iframe.src;
  iframe.src = '';
  setTimeout(() => {
    iframe.src = currentSrc;
  }, 100);
}

function openInGoogleMaps(mapUrl) {
  // Convert embed URL to regular Google Maps URL if needed
  let regularUrl = mapUrl;
  
  if (mapUrl.includes('maps/embed/v1/directions')) {
    // Extract parameters and convert to regular maps URL
    const urlParams = new URLSearchParams(mapUrl.split('?')[1]);
    const origin = urlParams.get('origin');
    const destination = urlParams.get('destination');
    const waypoints = urlParams.get('waypoints');
    
    if (origin && destination) {
      regularUrl = `https://www.google.com/maps/dir/${origin}`;
      if (waypoints) {
        regularUrl += `/${waypoints.replace(/\|/g, '/')}`;
      }
      regularUrl += `/${destination}`;
    }
  }
  
  window.open(regularUrl, '_blank');
}

// Add some CSS for better map styling
const additionalCSS = `
  <style>
    .map-container {
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      padding: 1rem;
      background-color: #f8f9fa;
    }
    
    .map-container iframe {
      border-radius: 0.375rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .btn-group .btn {
      font-size: 0.875rem;
    }
    
    .alert-warning a {
      font-weight: 600;
    }
  </style>
`;

// Add the CSS to the head
document.head.insertAdjacentHTML('beforeend', additionalCSS);

    resultsDiv.appendChild(group);
  });
}
