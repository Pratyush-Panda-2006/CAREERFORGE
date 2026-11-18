/**
 * Fitness Crossfit Pro - Geospatial Proximity Calculator & Location Radar Engine
 * Calculates spherical distance using the Haversine formula, computes azimuth bearing,
 * and tracks nearby CrossFit affiliate boxes, endurance tracks, and training hubs.
 */

export class FitnessCrossfitProGeoRadarEngine {
  constructor(defaultLocations = null) {
    this.earthRadiusKm = 6371; // Earth's mean spherical radius in kilometers
    this.locations = defaultLocations || [
      { id: 'wod-hq', name: 'Downtown CrossFit Box Arena', lat: 37.7749, lon: -122.4194, category: 'Affiliate Gym' },
      { id: 'wod-olympic', name: 'Golden Gate Olympic Lifting Studio', lat: 37.8024, lon: -122.4058, category: 'Barbell Club' },
      { id: 'wod-track', name: 'Presidio High-Intensity Sprint Oval', lat: 37.7989, lon: -122.4662, category: 'Endurance Track' },
      { id: 'wod-crossfit-east', name: 'Mission District Conditioning Pit', lat: 37.7599, lon: -122.4148, category: 'Conditioning Pit' },
      { id: 'wod-recovery', name: 'Pacific Bay Cryo & Mobility Lab', lat: 37.8080, lon: -122.4177, category: 'Recovery Center' }
    ];
  }

  /**
   * Calculates great-circle distance between two coordinates in kilometers via Haversine formula.
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
   * Computes the forward azimuth / initial bearing from start to destination in degrees (0-360).
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
   * Sorts all registered training destinations by proximity to user coordinates.
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
   * Adds an affiliate CrossFit box or outdoor arena to the registry.
   */
  addLocation(node) {
    if (!node || !node.id || !node.name || typeof node.lat !== 'number' || typeof node.lon !== 'number') {
      throw new Error('Invalid location node schema');
    }
    this.locations.push(node);
  }
}

// Browser DOM initializer for interactive radar workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new FitnessCrossfitProGeoRadarEngine();

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
        // DOM-safe card rendering
        const card = document.createElement('div');
        card.className = 'radar-node-card';

        const title = document.createElement('h4');
        title.textContent = `${index + 1}. ${node.name}`;

        const meta = document.createElement('p');
        meta.textContent = `Type: ${node.category} | Dist: ${node.distanceKm} km | Bearing: ${node.bearingDeg}°`;

        card.append(title, meta);
        nodesList.append(card);

        // Radar display blip rendering
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
        locationStatus.textContent = `Scan complete: ${sorted.length} CrossFit hubs locked around (${lat}, ${lon}).`;
      }
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', runScan);
      runScan(); // Initial scan
    }
  });
}
