/**
 * Luxury Realms - Geospatial Proximity Calculator & Location Radar Engine
 * Calculates spherical distance via Haversine formula, determines azimuth bearing,
 * and tracks nearby ultra-prime estate enclaves, historic palazzos, and sovereign residences.
 */

export class LuxuryRealmsGeoRadarEngine {
  constructor(defaultLocations = null) {
    this.earthRadiusKm = 6371; // Earth's mean spherical radius in km
    this.locations = defaultLocations || [
      { id: 'lr-cedres', name: 'Villa Les Cèdres (Saint-Jean-Cap-Ferrat)', lat: 43.6896, lon: 7.3312, category: 'Historic Belle Époque Estate' },
      { id: 'lr-peak', name: 'The Peak Penthouse Enclave (Hong Kong)', lat: 22.2711, lon: 114.1490, category: 'Ultra-High Elevation Residence' },
      { id: 'lr-kensington', name: 'Kensington Palace Gardens Sovereign Villa (London)', lat: 51.5053, lon: -0.1908, category: 'Billionaires Row Manor' },
      { id: 'lr-aurora', name: 'Villa Aurora Sovereign Palazzo (Rome)', lat: 41.9075, lon: 12.4907, category: 'Heritage Caravaggio Villa' },
      { id: 'lr-theone', name: 'The One Megamansion (Bel Air, Los Angeles)', lat: 34.0898, lon: -118.4552, category: 'Architectural Megamansion' }
    ];
  }

  /**
   * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
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
   * Sorts estate enclave nodes by ascending distance from given user coordinates.
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
    const engine = new LuxuryRealmsGeoRadarEngine();

    const latInput = document.getElementById('user-lat');
    const lonInput = document.getElementById('user-lon');
    const scanBtn = document.getElementById('scan-radar-btn');
    const statusElem = document.getElementById('radar-status');
    const nodesList = document.getElementById('nodes-list');
    const canvasSweep = document.getElementById('radar-sweep-canvas');

    function performScan() {
      const lat = parseFloat(latInput?.value || '43.6896');
      const lon = parseFloat(lonInput?.value || '7.3312');

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
        statusElem.textContent = `Scanned ${sorted.length} sovereign enclaves. Closest: ${sorted[0].name} (${sorted[0].distanceKm} km).`;
      }
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', performScan);
    }

    performScan();
  });
}
