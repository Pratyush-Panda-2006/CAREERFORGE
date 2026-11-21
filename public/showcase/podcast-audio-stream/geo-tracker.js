/**
 * Podcast Audio Stream - Geospatial Proximity Calculator & Location Radar Engine
 * Calculates spherical distance via Haversine formula, determines azimuth bearing,
 * and tracks nearby recording studios, broadcast towers, and audio engineering facilities.
 */

export class PodcastAudioStreamGeoRadarEngine {
  constructor(defaultLocations = null) {
    this.earthRadiusKm = 6371; // Earth's mean spherical radius in km
    this.locations = defaultLocations || [
      { id: 'studio-london', name: 'BBC Broadcasting House (London, UK)', lat: 51.5186, lon: -0.1438, category: 'National Broadcast Hub' },
      { id: 'studio-nyc', name: 'NPR & Gimlet Media Studios (Brooklyn, NY)', lat: 40.7028, lon: -73.9872, category: 'Flagship Production Studio' },
      { id: 'studio-stockholm', name: 'Spotify Production HQ (Stockholm, Sweden)', lat: 59.3372, lon: 18.0620, category: 'Digital Streaming Studio' },
      { id: 'studio-la', name: 'Sunset Sound & Podcasting Hub (Los Angeles, CA)', lat: 34.0978, lon: -118.3377, category: 'Acoustic Soundstage' },
      { id: 'studio-tokyo', name: 'Shibuya Audio Broadcasting Tower (Tokyo, Japan)', lat: 35.6580, lon: 139.7016, category: 'APAC Transmission Hub' }
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

    let bearing = toDegrees(Math.atan2(y, x));
    bearing = (bearing + 360) % 360;
    return parseFloat(bearing.toFixed(2));
  }

  /**
   * Sorts registered locations relative to given user origin coordinate.
   * @param {{ lat: number, lon: number }} userCoord - User coordinate
   * @returns {Array<object>} Sorted locations with distanceKm and bearing
   */
  sortNearestNodes(userCoord) {
    if (!userCoord || typeof userCoord.lat !== 'number' || typeof userCoord.lon !== 'number' ||
        Number.isNaN(userCoord.lat) || Number.isNaN(userCoord.lon)) {
      throw new Error('Invalid user coordinates supplied to sortNearestNodes');
    }

    const calculated = this.locations.map((loc) => {
      const distanceKm = this.calculateHaversineDistance(userCoord.lat, userCoord.lon, loc.lat, loc.lon);
      const bearing = this.computeBearing(userCoord, loc);
      return {
        ...loc,
        distanceKm,
        bearing
      };
    });

    calculated.sort((a, b) => a.distanceKm - b.distanceKm);
    return calculated;
  }
}

// Browser DOM UI controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new PodcastAudioStreamGeoRadarEngine();

    const latInput = document.getElementById('user-lat');
    const lonInput = document.getElementById('user-lon');
    const scanBtn = document.getElementById('scan-radar-btn');
    const nodesList = document.getElementById('nodes-list');
    const blipsLayer = document.getElementById('radar-sweep-canvas');
    const statusElem = document.getElementById('radar-status');

    function renderRadar(userCoord) {
      const sorted = engine.sortNearestNodes(userCoord);

      if (nodesList) {
        nodesList.textContent = '';
        sorted.forEach((node) => {
          const card = document.createElement('div');
          card.className = 'node-card';

          const top = document.createElement('div');
          top.className = 'node-top';

          const title = document.createElement('span');
          title.className = 'node-title';
          title.textContent = node.name;

          const dist = document.createElement('span');
          dist.className = 'node-dist';
          dist.textContent = `${node.distanceKm.toLocaleString()} km`;

          top.appendChild(title);
          top.appendChild(dist);

          const meta = document.createElement('div');
          meta.className = 'node-meta';

          const badge = document.createElement('span');
          badge.className = 'node-badge';
          badge.textContent = node.category;

          const bearing = document.createElement('span');
          bearing.textContent = `Bearing: ${node.bearing}°`;

          meta.appendChild(badge);
          meta.appendChild(bearing);

          card.appendChild(top);
          card.appendChild(meta);
          nodesList.appendChild(card);
        });
      }

      if (blipsLayer) {
        blipsLayer.textContent = '';

        // Center origin blip
        const originBlip = document.createElement('div');
        originBlip.className = 'blip user-origin';
        originBlip.style.left = '50%';
        originBlip.style.top = '50%';
        originBlip.title = 'Current Podcaster Location';
        blipsLayer.appendChild(originBlip);

        // Blips mapped on radar polar coordinates
        const maxDist = Math.max(...sorted.map((s) => s.distanceKm), 1000);
        sorted.forEach((node) => {
          if (node.distanceKm === 0) return;
          const normalizedDist = Math.min(node.distanceKm / maxDist, 0.95);
          const rad = (node.bearing - 90) * (Math.PI / 180);
          const radiusPx = 130 * normalizedDist;

          const x = 140 + radiusPx * Math.cos(rad);
          const y = 140 + radiusPx * Math.sin(rad);

          const blip = document.createElement('div');
          blip.className = 'blip';
          blip.style.left = `${x}px`;
          blip.style.top = `${y}px`;
          blip.title = `${node.name} (${node.distanceKm} km, ${node.bearing}°)`;
          blipsLayer.appendChild(blip);
        });
      }

      if (statusElem) {
        statusElem.textContent = `Scanned ${sorted.length} production studios. Nearest: ${sorted[0].name} (${sorted[0].distanceKm} km)`;
      }
    }

    if (scanBtn && latInput && lonInput) {
      scanBtn.addEventListener('click', () => {
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          renderRadar({ lat, lon });
        }
      });

      // Initial render
      const initialLat = parseFloat(latInput.value) || 51.5186;
      const initialLon = parseFloat(lonInput.value) || -0.1438;
      renderRadar({ lat: initialLat, lon: initialLon });
    }
  });
}
