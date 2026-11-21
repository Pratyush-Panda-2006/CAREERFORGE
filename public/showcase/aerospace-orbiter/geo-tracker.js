/**
 * Aerospace Orbiter - Geospatial Proximity Calculator & Location Radar Engine
 * Calculates spherical distance via Haversine formula, determines forward azimuth bearing,
 * and tracks orbital spaceports, launch complexes, and downlink ground stations.
 */

export class AerospaceOrbiterGeoRadarEngine {
  constructor(defaultLocations = null) {
    this.name = 'AerospaceOrbiterGeoRadarEngine';
    this.earthRadiusKm = 6371; // Earth's mean spherical radius in km
    this.locations = defaultLocations || [
      { id: 'sp-ksc', name: 'Kennedy Space Center LC-39A (Cape Canaveral)', lat: 28.5729, lon: -80.6490, category: 'Primary Orbital Launch Facility' },
      { id: 'sp-kourou', name: 'Guiana Space Centre (Kourou)', lat: 5.2390, lon: -52.7680, category: 'Equatorial Spaceport' },
      { id: 'sp-baikonur', name: 'Baikonur Cosmodrome (Kazakhstan)', lat: 45.9650, lon: 63.3050, category: 'Historic Cosmodrome Complex' },
      { id: 'sp-tanegashima', name: 'Tanegashima Space Center (Japan)', lat: 30.4000, lon: 130.9700, category: 'Deep Space Launch Complex' },
      { id: 'sp-esrange', name: 'Esrange Space Center (Kiruna)', lat: 67.8930, lon: 21.1070, category: 'Polar Research Range' }
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
   * Sorts spaceport nodes by ascending distance from given user coordinates.
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
    const engine = new AerospaceOrbiterGeoRadarEngine();

    const latInput = document.getElementById('user-lat');
    const lonInput = document.getElementById('user-lon');
    const scanBtn = document.getElementById('scan-radar-btn');
    const statusElem = document.getElementById('radar-status');
    const nodesList = document.getElementById('nodes-list');
    const canvasSweep = document.getElementById('radar-sweep-canvas');

    function performScan() {
      const lat = parseFloat(latInput?.value || '28.5729');
      const lon = parseFloat(lonInput?.value || '-80.6490');

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        if (statusElem) statusElem.textContent = 'Error: Please enter valid coordinate numbers.';
        return;
      }

      const sorted = engine.sortNearestNodes({ lat, lon });

      if (nodesList) {
        nodesList.textContent = '';
        sorted.forEach((node) => {
          const card = document.createElement('div');
          card.className = 'node-card';

          const header = document.createElement('div');
          header.className = 'node-card-header';
          const nameSpan = document.createElement('span');
          nameSpan.textContent = node.name;
          const distSpan = document.createElement('span');
          distSpan.className = 'node-dist';
          distSpan.textContent = `${node.distanceKm.toLocaleString()} km`;
          header.append(nameSpan, distSpan);

          const cat = document.createElement('div');
          cat.className = 'node-category';
          cat.textContent = node.category;

          const bearing = document.createElement('div');
          bearing.className = 'node-bearing';
          bearing.textContent = `Azimuth Bearing: ${node.bearingDeg}°`;

          card.append(header, cat, bearing);
          nodesList.appendChild(card);
        });
      }

      if (canvasSweep) {
        canvasSweep.textContent = '';
        sorted.slice(0, 5).forEach((node) => {
          const blip = document.createElement('div');
          blip.className = 'radar-blip';
          blip.title = `${node.name} (${node.distanceKm} km)`;

          const angleRad = (node.bearingDeg - 90) * (Math.PI / 180);
          const maxDist = Math.max(...sorted.map((n) => n.distanceKm), 1000);
          const distNorm = Math.min(node.distanceKm / maxDist, 1);
          const radius = 35 + distNorm * 110;

          const centerX = 160;
          const centerY = 160;
          const x = centerX + radius * Math.cos(angleRad);
          const y = centerY + radius * Math.sin(angleRad);

          blip.style.left = `${x}px`;
          blip.style.top = `${y}px`;
          canvasSweep.appendChild(blip);
        });
      }

      if (statusElem) {
        statusElem.textContent = `Scanned ${sorted.length} orbital launch facilities. Closest: ${sorted[0].name} (${sorted[0].distanceKm} km).`;
      }
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', performScan);
    }

    performScan();
  });
}
