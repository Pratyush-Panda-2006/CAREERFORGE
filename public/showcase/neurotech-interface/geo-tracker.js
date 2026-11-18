/**
 * Neurotech Interface - Geospatial Proximity Calculator & Location Radar Engine
 * Calculates spherical distance via Haversine formula, determines azimuth bearing,
 * and tracks nearby Neural Laboratories, BCI Implant Centers, and Biofeedback Clinics.
 */

export class NeurotechInterfaceGeoRadarEngine {
  constructor(defaultLocations = null) {
    this.earthRadiusKm = 6371; // Earth's mean spherical radius in km
    this.locations = defaultLocations || [
      { id: 'bci-synapse-lab', name: 'Mission Bay Synaptic Research Lab', lat: 37.7681, lon: -122.3921, category: 'Cortical Research' },
      { id: 'bci-implant-clinic', name: 'UCSF Neuroprosthetics Surgical Wing', lat: 37.7631, lon: -122.4580, category: 'Surgical Center' },
      { id: 'bci-eeg-sanctuary', name: 'Presidio Brainwave Biofeedback Sanctuary', lat: 37.7990, lon: -122.4635, category: 'Biofeedback Clinic' },
      { id: 'bci-neural-link', name: 'SOMA Neural Interface Accelerator', lat: 37.7812, lon: -122.4045, category: 'Hardware Incubator' },
      { id: 'bci-meg-imaging', name: 'Nob Hill Magnetoencephalography Suite', lat: 37.7925, lon: -122.4140, category: 'MEG Neuroimaging' }
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
   * Sorts neurotech centers by ascending distance from given user coordinates.
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
   * Registers a custom neurotechnology laboratory in the registry.
   */
  addLocation(node) {
    if (!node || !node.id || !node.name || typeof node.lat !== 'number' || typeof node.lon !== 'number') {
      throw new Error('Invalid location node schema');
    }
    this.locations.push(node);
  }
}

// Browser DOM initializer for interactive neuro radar locator
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new NeurotechInterfaceGeoRadarEngine();

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
        meta.textContent = `Type: ${node.category} | Dist: ${node.distanceKm} km | Bearing: ${node.bearingDeg}°`;

        card.append(title, meta);
        nodesList.append(card);

        if (radarSweep) {
          const blip = document.createElement('div');
          blip.className = 'radar-blip';
          const maxDist = Math.max(...sortedNodes.map(n => n.distanceKm), 8);
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
        locationStatus.textContent = `Scan complete: ${sorted.length} neural centers locked around (${lat}, ${lon}).`;
      }
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', runScan);
      runScan();
    }
  });
}
