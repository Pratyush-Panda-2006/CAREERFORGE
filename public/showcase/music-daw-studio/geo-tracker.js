/**
 * MusicDawStudioGeoRadarEngine
 * Autonomous geospatial coordinate proximity engine and circular radar locator
 * for collaborative recording studios, acoustic mastering labs, and audio hardware gear lounges.
 */
export class MusicDawStudioGeoRadarEngine {
  constructor(options = {}) {
    this.nodes = options.nodes || this.getDefaultNodes();
    this.userCoord = options.initialCoord || { lat: 51.5074, lon: -0.1278 }; // London Studio District
    this.earthRadiusKm = options.earthRadiusKm || 6371;
    this.listeners = [];
  }

  getDefaultNodes() {
    return [
      {
        id: 'abbey-sound',
        name: 'Abbey Chamber Sound Lab',
        type: 'recording-studio',
        lat: 51.5320,
        lon: -0.1782,
        status: 'live-session',
        gear: 'Neve 88RS, Studer A820',
        capacity: 'Studio A: Active'
      },
      {
        id: 'metropolis-master',
        name: 'Metropolis Mastering Suite',
        type: 'mastering-lab',
        lat: 51.4925,
        lon: -0.2235,
        status: 'open',
        gear: 'PMC BB5 XBD, EMI TG12410',
        capacity: 'Suite 2: Available'
      },
      {
        id: 'soho-modular',
        name: 'Soho Modular Synth Haven',
        type: 'hardware-lounge',
        lat: 51.5136,
        lon: -0.1365,
        status: 'open',
        gear: 'Eurorack Wall, Moog One',
        capacity: 'Jam Room: 4 Producers'
      },
      {
        id: 'east-acoustic',
        name: 'East London Spatial Audio Stage',
        type: 'spatial-stage',
        lat: 51.5207,
        lon: -0.0712,
        status: 'rehearsal',
        gear: 'Dolby Atmos 9.1.6, Genelec',
        capacity: 'Main Stage: Booked'
      }
    ];
  }

  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      throw new Error('Valid numerical coordinates required');
    }

    const toRad = (val) => (val * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.earthRadiusKm * c;

    return Math.round(distance * 100) / 100;
  }

  computeBearing(start, end) {
    if (!start || !end || typeof start.lat !== 'number' || typeof end.lat !== 'number') {
      throw new Error('Valid start and end coordinates required');
    }

    const toRad = (val) => (val * Math.PI) / 180;
    const lat1 = toRad(start.lat);
    const lat2 = toRad(end.lat);
    const dLon = toRad(end.lon - start.lon);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return Math.round(bearing);
  }

  getCompassDirection(bearing) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  sortNearestNodes(userCoord = this.userCoord, nodeList = null) {
    const nodes = nodeList || this.nodes;
    if (!Array.isArray(nodes)) return [];

    const calculated = nodes.map((node) => {
      const distanceKm = this.calculateHaversineDistance(
        userCoord.lat,
        userCoord.lon,
        node.lat,
        node.lon
      );
      const bearing = this.computeBearing(userCoord, { lat: node.lat, lon: node.lon });
      const compass = this.getCompassDirection(bearing);

      return {
        ...node,
        distanceKm,
        bearing,
        compass
      };
    });

    return calculated.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  setUserCoord(lat, lon) {
    this.userCoord = { lat, lon };
    this.notify();
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify() {
    const sorted = this.sortNearestNodes(this.userCoord);
    this.listeners.forEach((fn) => {
      try {
        fn(this.userCoord, sorted);
      } catch (e) {
        console.error('DAW GeoRadar listener error:', e);
      }
    });
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const rootWrapper = document.createElement('div');
    rootWrapper.className = 'geo-radar-root';

    // Header
    const header = document.createElement('header');
    header.className = 'geo-radar-header';
    const title = document.createElement('h2');
    title.textContent = 'Music DAW Studio — Studio Proximity & Gear Locator Radar';
    const subtitle = document.createElement('p');
    subtitle.textContent =
      'Real-time Haversine distance calculator, rotating acoustic radar, and nearby recording studio reachability.';
    header.append(title, subtitle);

    // Main layout
    const mainGrid = document.createElement('div');
    mainGrid.className = 'geo-radar-grid';

    // Left column: Radar Viewport
    const radarCol = document.createElement('div');
    radarCol.className = 'geo-radar-col geo-radar-visual-panel';

    const radarScreen = document.createElement('div');
    radarScreen.className = 'geo-radar-screen';

    const sweepBeam = document.createElement('div');
    sweepBeam.className = 'geo-radar-sweep-beam';

    const ring1 = document.createElement('div');
    ring1.className = 'geo-radar-ring ring-1';
    const ring2 = document.createElement('div');
    ring2.className = 'geo-radar-ring ring-2';
    const ring3 = document.createElement('div');
    ring3.className = 'geo-radar-ring ring-3';

    const crosshairX = document.createElement('div');
    crosshairX.className = 'geo-radar-crosshair-x';
    const crosshairY = document.createElement('div');
    crosshairY.className = 'geo-radar-crosshair-y';

    const blipsContainer = document.createElement('div');
    blipsContainer.className = 'geo-radar-blips-container';

    radarScreen.append(ring1, ring2, ring3, crosshairX, crosshairY, sweepBeam, blipsContainer);

    const radarLegend = document.createElement('div');
    radarLegend.className = 'geo-radar-legend';
    radarLegend.textContent = 'ACOUSTIC SCANNER RANGE: 10.0 KM RADIUS';

    radarCol.append(radarScreen, radarLegend);

    // Right column: Coordinates & Destination cards
    const controlCol = document.createElement('div');
    controlCol.className = 'geo-radar-col geo-radar-controls-panel';

    const formGroup = document.createElement('div');
    formGroup.className = 'geo-input-group';

    const latLabel = document.createElement('label');
    latLabel.textContent = 'Producer Lat:';
    const latInput = document.createElement('input');
    latInput.type = 'number';
    latInput.step = '0.0001';
    latInput.value = String(this.userCoord.lat);

    const lonLabel = document.createElement('label');
    lonLabel.textContent = 'Producer Lon:';
    const lonInput = document.createElement('input');
    lonInput.type = 'number';
    lonInput.step = '0.0001';
    lonInput.value = String(this.userCoord.lon);

    const updateCoordBtn = document.createElement('button');
    updateCoordBtn.textContent = 'Calibrate Studio Coords';
    updateCoordBtn.className = 'geo-btn geo-btn-primary';

    formGroup.append(latLabel, latInput, lonLabel, lonInput, updateCoordBtn);

    const nodesTitle = document.createElement('h3');
    nodesTitle.textContent = 'Nearby Recording Studios (Sorted by Distance)';

    const nodesList = document.createElement('div');
    nodesList.className = 'geo-nodes-list';

    controlCol.append(formGroup, nodesTitle, nodesList);

    const updateDisplay = (_coord, sortedNodes) => {
      nodesList.replaceChildren();
      blipsContainer.replaceChildren();

      const maxRadarDistanceKm = 10.0;

      sortedNodes.forEach((node) => {
        // Node Card
        const card = document.createElement('div');
        card.className = 'geo-node-card';

        const topRow = document.createElement('div');
        topRow.className = 'geo-node-card-top';

        const nameEl = document.createElement('span');
        nameEl.className = 'geo-node-name';
        nameEl.textContent = node.name;

        const distEl = document.createElement('span');
        distEl.className = 'geo-node-dist';
        distEl.textContent = `${node.distanceKm} km`;

        topRow.append(nameEl, distEl);

        const subRow = document.createElement('div');
        subRow.className = 'geo-node-card-sub';
        subRow.textContent = `Bearing: ${node.bearing}° (${node.compass}) | Status: ${node.status.toUpperCase()} | Gear: ${node.gear}`;

        card.append(topRow, subRow);
        nodesList.append(card);

        // Radar Blip calculation
        const rad = ((node.bearing - 90) * Math.PI) / 180;
        const normalizedDist = Math.min(node.distanceKm / maxRadarDistanceKm, 0.95);
        const radiusPx = 110;
        const x = 125 + Math.cos(rad) * (normalizedDist * radiusPx);
        const y = 125 + Math.sin(rad) * (normalizedDist * radiusPx);

        const blip = document.createElement('div');
        blip.className = 'geo-radar-blip';
        blip.style.left = `${x}px`;
        blip.style.top = `${y}px`;
        blip.title = `${node.name}: ${node.distanceKm}km`;
        blipsContainer.append(blip);
      });
    };

    updateCoordBtn.addEventListener('click', () => {
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        this.setUserCoord(lat, lon);
      }
    });

    this.subscribe(updateDisplay);
    updateDisplay(this.userCoord, this.sortNearestNodes(this.userCoord));

    mainGrid.append(radarCol, controlCol);
    rootWrapper.append(header, mainGrid);
    container.append(rootWrapper);

    return rootWrapper;
  }
}
