/**
 * CharityMicroloansGeoRadarEngine
 * Autonomous geospatial coordinate proximity engine and circular radar locator
 * for microfinance field stations, community lending kiosks, and rural banking centers.
 */
export class CharityMicroloansGeoRadarEngine {
  constructor(options = {}) {
    this.nodes = options.nodes || this.getDefaultNodes();
    this.userCoord = options.initialCoord || { lat: -1.2864, lon: 36.8172 }; // Nairobi Central Hub
    this.earthRadiusKm = options.earthRadiusKm || 6371;
    this.listeners = [];
  }

  getDefaultNodes() {
    return [
      {
        id: 'kibera-center',
        name: 'Kibera Community Credit Kiosk',
        type: 'field-branch',
        lat: -1.3130,
        lon: 36.7870,
        status: 'active',
        officers: '3 field officers',
        services: 'Disbursal, Cashless Repayment'
      },
      {
        id: 'eastleigh-coop',
        name: 'Eastleigh Traders Cooperative Bank',
        type: 'merchant-pool',
        lat: -1.2780,
        lon: 36.8520,
        status: 'active',
        officers: '5 field officers',
        services: 'SME Microcredit, Peer Vouching'
      },
      {
        id: 'thika-agri',
        name: 'Thika Smallholder Agri-Lending Desk',
        type: 'agri-hub',
        lat: -1.0333,
        lon: 37.0693,
        status: 'open',
        officers: '4 field officers',
        services: 'Crop Financing, Seed Capital'
      },
      {
        id: 'machakos-rural',
        name: 'Machakos Rural Development Center',
        type: 'regional-office',
        lat: -1.5177,
        lon: 37.2634,
        status: 'active',
        officers: '6 field officers',
        services: 'Women Entrepreneur Grants, Audits'
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
        console.error('Charity GeoRadar listener error:', e);
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
    title.textContent = 'Charity Microloans — Rural Branch Proximity & Field Radar';
    const subtitle = document.createElement('p');
    subtitle.textContent =
      'Real-time Haversine distance calculator, rotating microfinance radar, and community credit kiosk reachability.';
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
    radarLegend.textContent = 'FIELD STATION SCANNER: 50.0 KM RADIUS';

    radarCol.append(radarScreen, radarLegend);

    // Right column: Coordinates & Destination cards
    const controlCol = document.createElement('div');
    controlCol.className = 'geo-radar-col geo-radar-controls-panel';

    const formGroup = document.createElement('div');
    formGroup.className = 'geo-input-group';

    const latLabel = document.createElement('label');
    latLabel.textContent = 'Borrower Lat:';
    const latInput = document.createElement('input');
    latInput.type = 'number';
    latInput.step = '0.0001';
    latInput.value = String(this.userCoord.lat);

    const lonLabel = document.createElement('label');
    lonLabel.textContent = 'Borrower Lon:';
    const lonInput = document.createElement('input');
    lonInput.type = 'number';
    lonInput.step = '0.0001';
    lonInput.value = String(this.userCoord.lon);

    const updateCoordBtn = document.createElement('button');
    updateCoordBtn.textContent = 'Calibrate Position';
    updateCoordBtn.className = 'geo-btn geo-btn-primary';

    formGroup.append(latLabel, latInput, lonLabel, lonInput, updateCoordBtn);

    const nodesTitle = document.createElement('h3');
    nodesTitle.textContent = 'Nearby Microfinance Branches (Sorted by Distance)';

    const nodesList = document.createElement('div');
    nodesList.className = 'geo-nodes-list';

    controlCol.append(formGroup, nodesTitle, nodesList);

    const updateDisplay = (_coord, sortedNodes) => {
      nodesList.replaceChildren();
      blipsContainer.replaceChildren();

      const maxRadarDistanceKm = 50.0;

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
        subRow.textContent = `Bearing: ${node.bearing}° (${node.compass}) | Officers: ${node.officers} | ${node.services}`;

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
