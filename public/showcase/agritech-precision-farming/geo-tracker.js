const EARTH_RADIUS_KM = 6371;
const radians = (value) => (value * Math.PI) / 180;
const degrees = (value) => (value * 180) / Math.PI;

function coordinate(lat, lon) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    throw new RangeError(
      "Latitude must be between −90 and 90; longitude between −180 and 180.",
    );
  }
  return { lat, lon };
}

export class AgritechPrecisionFarmingGeoRadarEngine {
  constructor(nodes = []) {
    if (!Array.isArray(nodes) || nodes.length > 1000)
      throw new RangeError("Use at most 1,000 nodes.");
    const ids = new Set();
    this.nodes = nodes.map((node) => {
      if (
        !node ||
        typeof node.id !== "string" ||
        !node.id.trim() ||
        ids.has(node.id)
      ) {
        throw new TypeError("Each node needs a unique, non-empty ID.");
      }
      ids.add(node.id);
      return Object.freeze({ ...node, ...coordinate(node.lat, node.lon) });
    });
  }

  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    coordinate(lat1, lon1);
    coordinate(lat2, lon2);
    const a =
      Math.sin(radians(lat2 - lat1) / 2) ** 2 +
      Math.cos(radians(lat1)) *
        Math.cos(radians(lat2)) *
        Math.sin(radians(lon2 - lon1) / 2) ** 2;
    return (
      2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))))
    );
  }

  computeBearing(start, end) {
    coordinate(start.lat, start.lon);
    coordinate(end.lat, end.lon);
    const delta = radians(end.lon - start.lon);
    const y = Math.sin(delta) * Math.cos(radians(end.lat));
    const x =
      Math.cos(radians(start.lat)) * Math.sin(radians(end.lat)) -
      Math.sin(radians(start.lat)) *
        Math.cos(radians(end.lat)) *
        Math.cos(delta);
    // Coincident and antipodal points have no unique initial bearing; use zero.
    if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return 0;
    return (degrees(Math.atan2(y, x)) + 360) % 360;
  }

  sortNearestNodes(userCoord, rangeKm = Infinity) {
    coordinate(userCoord.lat, userCoord.lon);
    if (!(rangeKm > 0)) throw new RangeError("Range must be positive.");
    return this.nodes
      .map((node) => ({
        ...node,
        distanceKm: this.calculateHaversineDistance(
          userCoord.lat,
          userCoord.lon,
          node.lat,
          node.lon,
        ),
        bearing: this.computeBearing(userCoord, node),
      }))
      .filter((node) => node.distanceKm <= rangeKm)
      .sort(
        (a, b) =>
          a.distanceKm - b.distanceKm ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
  }
}

if (typeof document !== "undefined") {
  const engine = new AgritechPrecisionFarmingGeoRadarEngine([
    {
      id: "soil-west",
      name: "West field · soil probe",
      lat: 18.5208,
      lon: 73.844,
    },
    {
      id: "irrigation-north",
      name: "North field · irrigation",
      lat: 18.534,
      lon: 73.858,
    },
    {
      id: "drone-east",
      name: "East field · drone station",
      lat: 18.524,
      lon: 73.883,
    },
    {
      id: "weather-ridge",
      name: "Ridge · weather station",
      lat: 18.555,
      lon: 73.9,
    },
  ]);
  const form = document.querySelector("#radar-controls");
  const list = document.querySelector("#node-list");
  const blips = document.querySelector("#blips");
  const status = document.querySelector("#radar-status");
  const radar = document.querySelector("#radar");
  const empty = document.querySelector("#empty");
  const render = () => {
    if (!form.reportValidity()) return;
    try {
      const origin = coordinate(
        Number(form.elements.latitude.value),
        Number(form.elements.longitude.value),
      );
      const range = Number(form.elements.range.value);
      const nodes = engine.sortNearestNodes(origin, range);
      list.replaceChildren();
      blips.replaceChildren();
      for (const node of nodes) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = node.name;
        const detail = document.createElement("span");
        detail.textContent = `${node.distanceKm.toFixed(2)} km · ${node.bearing.toFixed(0)}° from north`;
        item.append(title, detail);
        list.append(item);
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "blip";
        dot.setAttribute("aria-label", `${node.name}, ${detail.textContent}`);
        const radius = (node.distanceKm / range) * 43;
        dot.style.left = `${50 + radius * Math.sin(radians(node.bearing))}%`;
        dot.style.top = `${50 - radius * Math.cos(radians(node.bearing))}%`;
        dot.addEventListener("click", () => {
          list
            .querySelectorAll("li")
            .forEach((li) => li.classList.remove("selected"));
          item.classList.add("selected");
          status.textContent = `${node.name}: ${detail.textContent}`;
        });
        blips.append(dot);
      }
      empty.hidden = nodes.length > 0;
      radar.setAttribute(
        "aria-label",
        `Radar: ${nodes.length} sample farm nodes within ${range} km`,
      );
      status.textContent = `${nodes.length} of ${engine.nodes.length} sample nodes within ${range} km. North is up.`;
    } catch (error) {
      status.textContent = error.message;
    }
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  document.querySelector("#reset-origin").addEventListener("click", () => {
    form.reset();
    render();
  });
  render();
}
