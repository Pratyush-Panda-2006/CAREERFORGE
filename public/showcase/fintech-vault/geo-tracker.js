export const EARTH_RADIUS_KM = 6371.0088;
const radians = (degrees) => degrees * Math.PI / 180;
const degrees = (angle) => angle * 180 / Math.PI;

function coordinate(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new RangeError('Use finite latitude −90…90 and longitude −180…180.');
  }
  return { lat, lon };
}

function geometry(start, end) {
  coordinate(start.lat, start.lon);
  coordinate(end.lat, end.lon);
  const a = radians(start.lat), b = radians(end.lat);
  const delta = radians(((end.lon - start.lon + 540) % 360) - 180);
  const x = Math.cos(b) * Math.sin(delta);
  const y = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(delta);
  const dot = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(delta);
  const h = Math.min(1, Math.max(0, Math.sin((b - a) / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(delta / 2) ** 2));
  const angle = h > 1 - 1e-12 ? Math.atan2(Math.hypot(x, y), dot) : 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return { x, y, angle };
}

export class FintechVaultGeoRadarEngine {
  #nodes;

  constructor(nodes = []) {
    if (!Array.isArray(nodes) || nodes.length > 128) throw new RangeError('Supply at most 128 locations.');
    const ids = new Set();
    this.#nodes = Array.from(nodes, (node) => {
      if (!node || typeof node.id !== 'string' || !node.id.trim() || node.id.length > 60 || typeof node.name !== 'string' || !node.name.trim() || node.name.length > 100) {
        throw new TypeError('Each site needs an ID and a name.');
      }
      const id = node.id.trim();
      if (ids.has(id)) throw new TypeError('Location IDs must be unique.');
      ids.add(id);
      return Object.freeze({ id, name: node.name.trim(), ...coordinate(node.lat, node.lon) });
    });
  }

  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    return EARTH_RADIUS_KM * geometry({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 }).angle;
  }

  computeBearing(start, end) {
    if (!start || !end) throw new TypeError('Supply start and end coordinates.');
    const { x, y } = geometry(start, end);
    if (Math.abs(start.lat) === 90 || Math.hypot(x, y) < 1e-14) return null;
    return (degrees(Math.atan2(x, y)) + 360) % 360;
  }

  sortNearestNodes(userCoord) {
    if (!userCoord) throw new TypeError('Supply an origin coordinate.');
    coordinate(userCoord.lat, userCoord.lon);
    return this.#nodes.map((node) => ({
      ...node,
      distanceKm: this.calculateHaversineDistance(userCoord.lat, userCoord.lon, node.lat, node.lon),
      bearingDegrees: this.computeBearing(userCoord, node),
    })).sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

const SAMPLE_SITES = [
  {
    "id": "ny-vault",
    "name": "Wall Street Sovereign Vault",
    "lat": 40.706,
    "lon": -74.009
  },
  {
    "id": "london-vault",
    "name": "City of London Bullion Depot",
    "lat": 51.513,
    "lon": -0.09
  },
  {
    "id": "zurich-vault",
    "name": "Zurich Alpine Reserve Vault",
    "lat": 47.376,
    "lon": 8.541
  },
  {
    "id": "singapore-vault",
    "name": "Marina Bay Asset Citadel",
    "lat": 1.283,
    "lon": 103.858
  },
  {
    "id": "tokyo-vault",
    "name": "Otemachi Settlement Center",
    "lat": 35.687,
    "lon": 139.764
  },
  {
    "id": "frankfurt-vault",
    "name": "Frankfurt Liquidity Node",
    "lat": 50.11,
    "lon": 8.682
  },
  {
    "id": "dateline-vault",
    "name": "Pacific Offshore Settlement",
    "lat": 0,
    "lon": 179.8
  }
];

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new FintechVaultGeoRadarEngine(SAMPLE_SITES);
    const originForm = document.getElementById('origin-form');
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    const rangeInput = document.getElementById('range');
    const rangeValue = document.getElementById('range-value');
    const sitesList = document.getElementById('sites');
    const blipsGroup = document.getElementById('blips');
    const ringsGroup = document.getElementById('rings');
    const pauseBtn = document.getElementById('pause');
    const radarPanel = document.querySelector('.radar-panel');
    const originLabel = document.getElementById('origin-label');

    let currentOrigin = { lat: parseFloat(latInput.value), lon: parseFloat(lonInput.value) };
    let currentRange = parseFloat(rangeInput.value);
    let selectedSiteId = null;

    function renderRings() {
      if (!ringsGroup) return;
      ringsGroup.innerHTML = '';
      for (const fraction of [0.25, 0.5, 0.75, 1]) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '200');
        circle.setAttribute('cy', '200');
        circle.setAttribute('r', (152 * fraction).toString());
        circle.setAttribute('class', 'range-ring');
        ringsGroup.appendChild(circle);
      }
    }

    function update() {
      if (originLabel) originLabel.textContent = `${currentOrigin.lat.toFixed(4)}°, ${currentOrigin.lon.toFixed(4)}°`;
      if (rangeValue) rangeValue.textContent = `${currentRange} km`;

      const sorted = engine.sortNearestNodes(currentOrigin);
      if (sitesList) {
        sitesList.innerHTML = '';
        sorted.forEach(node => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.setAttribute('type', 'button');
          if (node.id === selectedSiteId) btn.setAttribute('aria-pressed', 'true');
          btn.innerHTML = `<strong>${node.name}</strong><span>${node.distanceKm.toFixed(1)} km • ${node.bearingDegrees !== null ? node.bearingDegrees.toFixed(0) + '°' : 'N/A'}</span>`;
          btn.addEventListener('click', () => selectSite(node));
          li.appendChild(btn);
          sitesList.appendChild(li);
        });
      }

      if (blipsGroup) {
        blipsGroup.innerHTML = '';
        sorted.forEach(node => {
          if (node.distanceKm <= currentRange && node.bearingDegrees !== null) {
            const rad = node.bearingDegrees * Math.PI / 180;
            const distRatio = node.distanceKm / currentRange;
            const px = 200 + Math.sin(rad) * 152 * distRatio;
            const py = 200 - Math.cos(rad) * 152 * distRatio;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', px.toString());
            circle.setAttribute('cy', py.toString());
            circle.setAttribute('r', '6');
            circle.setAttribute('class', 'site-blip');
            if (node.id === selectedSiteId) circle.setAttribute('aria-pressed', 'true');
            circle.addEventListener('click', () => selectSite(node));
            blipsGroup.appendChild(circle);
          }
        });
      }
    }

    function selectSite(node) {
      selectedSiteId = node.id;
      const siteDist = document.getElementById('site-distance');
      const siteBearing = document.getElementById('site-bearing');
      const siteCoord = document.getElementById('site-coordinate');
      const siteRange = document.getElementById('site-range');
      const siteName = document.getElementById('site-name');

      if (siteName) siteName.textContent = node.name;
      if (siteDist) siteDist.textContent = `${node.distanceKm.toFixed(2)} km`;
      if (siteBearing) siteBearing.textContent = node.bearingDegrees !== null ? `${node.bearingDegrees.toFixed(1)}°` : 'Indeterminate';
      if (siteCoord) siteCoord.textContent = `${node.lat.toFixed(4)}°, ${node.lon.toFixed(4)}°`;
      if (siteRange) siteRange.textContent = node.distanceKm <= currentRange ? 'In Range' : 'Out of Range';
      update();
    }

    if (originForm) {
      originForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentOrigin = { lat: parseFloat(latInput.value), lon: parseFloat(lonInput.value) };
        update();
      });
    }

    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => {
        currentRange = parseFloat(e.target.value);
        update();
      });
    }

    if (pauseBtn && radarPanel) {
      pauseBtn.addEventListener('click', () => {
        const isPaused = radarPanel.classList.toggle('paused');
        pauseBtn.setAttribute('aria-pressed', isPaused.toString());
        pauseBtn.textContent = isPaused ? 'Resume Sweep' : 'Pause Sweep';
      });
    }

    renderRings();
    update();
  });
}
