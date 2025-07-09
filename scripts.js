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

  data.routes.forEach((route, i) => {
    const group = document.createElement("div");
    group.classList.add("card", "mb-3", "shadow-sm");

    const stops = route.stops.map((stop, idx) =>
      `<li class="list-group-item">Stop ${idx + 1}: ${stop.address} (${stop.prop_id})</li>`
    ).join("");

    group.innerHTML = `
      <div class="card-header appertivo-purple text-white">Route ${i + 1} - ${route.total_time} mins</div>
      <ul class="list-group list-group-flush">${stops}</ul>
      <div class="card-body">
        <div class="ratio ratio-16x9">
          <iframe src="${route.map_url}" width="100%" height="100%" style="border:0;" allowfullscreen></iframe>
        </div>
      </div>
    `;

    resultsDiv.appendChild(group);
  });
}
