/**
 * Virtual Museum 3D - Geospatial Proximity Calculator & Location Radar Engine
 * Calculates spherical distance via Haversine formula, determines azimuth bearing,
 * and tracks nearby Fine Art Galleries, Ancient Antiquities Wings, and 3D VR Pavilions.
 */

export class VirtualMuseum3dGeoRadarEngine {
  constructor(defaultLocations = null) {
    this.earthRadiusKm = 6371; // Earth's mean spherical radius in km
    this.locations = defaultLocations || [
      { id: 'mus-classical-wing', name: 'Palace of Fine Arts Rotunda', lat: 37.8029, lon: -122.4484, category: 'Classical Architecture' },
      { id: 'mus-de-young', name: 'De Young Museum Sculpture Garden', lat: 37.7715, lon: -122.4687, category: 'American & African Art' },
      { id: 'mus-legion-honor', name: 'Legion of Honor Ancient Antiquities Wing', lat: 37.7844, lon: -122.5008, category: 'Ancient Antiquities' },
      { id: 'mus-sfmoma', name: 'SFMOMA Modern 3D & Digital Media Pavillion', lat: 37.7857, lon: -122.4011, category: 'Modern 3D Digital' },
      { id: 'mus-asian-art', name: 'Asian Art Museum Heritage Sanctuary', lat: 37.7802, lon: -122.4162, category: 'Heritage Sanctuary' }
    ];
  }

  /**
   * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const toRadians = deg => (deg * Math.PI) / 180;
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
    const toRadians = deg => (deg * Math.PI) / 180;
    const toDegrees = rad => (rad * 180) / Math.PI;

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
   * Sorts museum galleries by ascending distance from given user coordinates.
   */
  sortNearestNodes(userCoord) {
    if (!userCoord || typeof userCoord.lat !== 'number' || typeof userCoord.lon !== 'number') {
      throw new Error('Invalid user coordinates: must provide numeric lat and lon.');
    }

    return this.locations
      .map(node => {
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

  /**
   * Registers a custom museum gallery or exhibition hall in the registry.
   */
  addLocation(node) {
    if (!node || !node.id || !node.name || typeof node.lat !== 'number' || typeof node.lon !== 'number') {
      throw new Error('Invalid location node schema');
    }
    this.locations.push(node);
  }
}

// Browser DOM initializer for interactive museum radar locator
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new VirtualMuseum3dGeoRadarEngine();

    const latInput = document.getElementById('user-lat');
    const lonInput = document.getElementById('user-lon');
    const scanBtn = document.getElementById('scan-radar-btn');
    const nodesList = document.getElementById('nodes-list');
    const radarSweep = document.getElementById('radar-sweep-canvas');
    const locationStatus = document.getElementById('radar-status');

    function renderBlips(sortedNodes) {
      if (!nodesList) return;
      nodesList.replaceChildren();

      if (radarSweep) {
        radarSweep.replaceChildren();
      }

      sortedNodes.forEach((node, index) => {
        const card = document.createElement('div');
        card.className = 'radar-node-card';

        const title = document.createElement('h4');
        title.textContent = `${index + 1}. ${node.name}`;

        const meta = document.createElement('p');
        meta.textContent = `Wing: ${node.category} | Dist: ${node.distanceKm} km | Bearing: ${node.bearingDeg}°`;

        card.append(title, meta);
        nodesList.append(card);

        if (radarSweep) {
          const blip = document.createElement('div');
          blip.className = 'radar-blip';
          const maxDist = Math.max(...sortedNodes.map(n => n.distanceKm), 10);
          const normalizedDist = Math.min(node.distanceKm / maxDist, 1) * 110;
          const rad = (node.bearingDeg - 90) * (Math.PI / 180);
          const x = 125 + normalizedDist * Math.cos(rad);
          const y = 125 + normalizedDist * Math.sin(rad);

          blip.style.left = `${x}px`;
          blip.style.top = `${y}px`;
          blip.title = `${node.name} (${node.distanceKm} km)`;
          radarSweep.append(blip);
        }
      });
    }

    function runScan() {
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        if (locationStatus) locationStatus.textContent = 'Invalid coordinates entered!';
        return;
      }

      const sorted = engine.sortNearestNodes({ lat, lon });
      renderBlips(sorted);
      if (locationStatus) {
        locationStatus.textContent = `Scan complete: ${sorted.length} museum pavilions locked around (${lat}, ${lon}).`;
      }
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', runScan);
      runScan();
    }
  });
}
