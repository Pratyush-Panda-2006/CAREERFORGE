/**
 * Automotive Hypercar - Geospatial Proximity Calculator & Interactive Location Radar
 * Computes great-circle distance using spherical trigonometry (Haversine formula),
 * determines forward bearing, and tracks iconic grand prix circuits, proving grounds,
 * and high-speed telemetry hubs.
 */

export class AutomotiveHypercarGeoRadarEngine {
  constructor(defaultLocations = null) {
    this.name = 'AutomotiveHypercarGeoRadarEngine';
    this.earthRadiusKm = 6371; // Earth's mean radius in kilometers
    this.locations = defaultLocations || [
      { id: 'track-nurburgring', name: 'Nürburgring Nordschleife (Germany)', lat: 50.3356, lon: 6.9475, category: 'Endurance Proving Grounds' },
      { id: 'track-spa', name: 'Circuit de Spa-Francorchamps (Belgium)', lat: 50.4372, lon: 5.9714, category: 'High-Downforce Circuit' },
      { id: 'track-monza', name: 'Autodromo Nazionale Monza (Italy)', lat: 45.6156, lon: 9.2811, category: 'Temple of Speed (Low-Drag)' },
      { id: 'track-silverstone', name: 'Silverstone Circuit (United Kingdom)', lat: 52.0786, lon: -1.0169, category: 'High-Speed Dynamic Circuit' },
      { id: 'track-monaco', name: 'Circuit de Monaco (Monaco)', lat: 43.7347, lon: 7.4206, category: 'Urban Street Telemetry Circuit' },
      { id: 'track-laguna-seca', name: 'WeatherTech Raceway Laguna Seca (USA)', lat: 36.5844, lon: -121.7536, category: 'Technical Elevation Track' },
      { id: 'track-suzuka', name: 'Suzuka International Racing Course (Japan)', lat: 34.8431, lon: 136.5414, category: 'Figure-Eight Proving Track' }
    ];
  }

  /**
   * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
   * @param {number} lat1 - Latitude of origin
   * @param {number} lon1 - Longitude of origin
   * @param {number} lat2 - Latitude of destination
   * @param {number} lon2 - Longitude of destination
   * @returns {number} Distance in kilometers
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const radLat1 = toRadians(lat1);
    const radLat2 = toRadians(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((this.earthRadiusKm * c).toFixed(3));
  }

  /**
   * Computes forward azimuth / initial bearing from start to destination in degrees (0-360).
   * @param {{ lat: number, lon: number }} start - Origin coordinate
   * @param {{ lat: number, lon: number }} end - Destination coordinate
   * @returns {number} Bearing in degrees
   */
  computeBearing(start, end) {
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const toDegrees = (rad) => (rad * 180) / Math.PI;

    const lat1 = toRadians(start.lat);
    const lat2 = toRadians(end.lat);
    const dLon = toRadians(end.lon - start.lon);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const initialBearing = toDegrees(Math.atan2(y, x));
    return parseFloat(((initialBearing + 360) % 360).toFixed(2));
  }

  /**
   * Sorts circuit proving ground nodes by ascending distance from given user coordinates.
   * @param {{ lat: number, lon: number }} userCoord - User coordinate
   * @returns {Array<Object>} Sorted list of location nodes
   */
  sortNearestNodes(userCoord) {
    if (!userCoord || typeof userCoord.lat !== 'number' || typeof userCoord.lon !== 'number') {
      throw new Error('Invalid user coordinates: must provide numeric lat and lon.');
    }

    return this.locations
      .map((node) => {
        const distanceKm = this.calculateHaversineDistance(
          userCoord.lat,
          userCoord.lon,
          node.lat,
          node.lon
        );
        const bearingDeg = this.computeBearing(userCoord, { lat: node.lat, lon: node.lon });
        return {
          ...node,
          distanceKm,
          bearingDeg
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AutomotiveHypercarGeoRadarEngine();
    const latInput = document.getElementById('user-lat');
    const lonInput = document.getElementById('user-lon');
    const scanBtn = document.getElementById('scan-radar-btn');
    const statusBox = document.getElementById('radar-status');
    const nodesList = document.getElementById('nodes-list');
    const blipsLayer = document.getElementById('radar-sweep-canvas');

    function renderRadarSweep(userCoord, sortedNodes) {
      if (!blipsLayer || !nodesList) return;

      blipsLayer.replaceChildren();
      nodesList.replaceChildren();

      const maxRadarDistanceKm = 1500; // 1500km boundary radius for radar scope
      const radarRadiusPx = 130; // Half of 280px display with margins

      sortedNodes.forEach((node, index) => {
        // Build Node Card safely
        const card = document.createElement('div');
        card.className = 'node-card';

        const cardTop = document.createElement('div');
        cardTop.className = 'node-card-top';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'node-name';
        nameSpan.textContent = `${index + 1}. ${node.name}`;

        const distSpan = document.createElement('span');
        distSpan.className = 'node-dist';
        distSpan.textContent = `${node.distanceKm.toLocaleString()} km`;

        cardTop.append(nameSpan, distSpan);

        const catDiv = document.createElement('div');
        catDiv.className = 'node-category';
        catDiv.textContent = node.category;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'node-meta';

        const bearingSpan = document.createElement('span');
        bearingSpan.innerHTML = `Bearing: <strong>${node.bearingDeg}°</strong>`;

        const coordsSpan = document.createElement('span');
        coordsSpan.innerHTML = `GPS: <strong>${node.lat.toFixed(4)}, ${node.lon.toFixed(4)}</strong>`;

        metaDiv.append(bearingSpan, coordsSpan);
        card.append(cardTop, catDiv, metaDiv);
        nodesList.append(card);

        // Render Blip on Radar Viewport if within visible range
        if (node.distanceKm <= maxRadarDistanceKm) {
          const ratio = Math.max(0.15, node.distanceKm / maxRadarDistanceKm);
          const radBearing = ((node.bearingDeg - 90) * Math.PI) / 180;
          const x = 140 + Math.cos(radBearing) * (radarRadiusPx * ratio);
          const y = 140 + Math.sin(radBearing) * (radarRadiusPx * ratio);

          const blip = document.createElement('div');
          blip.className = 'radar-blip';
          blip.style.left = `${x}px`;
          blip.style.top = `${y}px`;
          blip.title = `${node.name} (${node.distanceKm} km, ${node.bearingDeg}°)`;
          blipsLayer.append(blip);
        }
      });

      if (statusBox) {
        const nearest = sortedNodes[0];
        statusBox.textContent = `Proximity computed: Nearest proving ground is ${nearest.name} at ${nearest.distanceKm} km (Bearing ${nearest.bearingDeg}°).`;
      }
    }

    function executeScan() {
      const lat = parseFloat(latInput ? latInput.value : '50.3356');
      const lon = parseFloat(lonInput ? lonInput.value : '6.9475');

      if (isNaN(lat) || isNaN(lon)) {
        if (statusBox) statusBox.textContent = 'Telemetry Error: Please enter valid numerical coordinates.';
        return;
      }

      const userCoord = { lat, lon };
      const sorted = engine.sortNearestNodes(userCoord);
      renderRadarSweep(userCoord, sorted);
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', executeScan);
    }

    // Initial scan run
    executeScan();
  });
}
