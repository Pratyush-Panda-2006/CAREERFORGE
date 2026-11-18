/**
 * RoboticsAutomataGeoRadarEngine
 * Autonomous geospatial coordinate proximity engine and circular radar locator for robotics fleet dispatch, waypoint distance calculation, and docking reachability.
 */
export class RoboticsAutomataGeoRadarEngine {
  constructor(options = {}) {
    this.nodes = options.nodes || this.getDefaultNodes();
    this.userCoord = options.initialCoord || { lat: 37.7749, lon: -122.4194 }; // San Francisco Base
    this.earthRadiusKm = options.earthRadiusKm || 6371;
    this.listeners = [];
  }

  getDefaultNodes() {
    return [
      {
        id: 'dock-alpha',
        name: 'Autonomous Charging Dock Alpha',
        type: 'docking-station',
        lat: 37.7833,
        lon: -122.4167,
        status: 'online',
        capacity: '4/6 bays'
      },
      {
        id: 'assembly-cell-1',
        name: 'Robotic Assembly Cell #1',
        type: 'manufacturing',
        lat: 37.7900,
        lon: -122.4000,
        status: 'active',
        capacity: '8 arms active'
      },
      {
        id: 'logistics-depot-4',
        name: 'Fleet Logistics Depot 4',
        type: 'warehouse',
        lat: 37.7651,
        lon: -122.4241,
        status: 'online',
        capacity: '12 AGVs docked'
      },
      {
        id: 'sensor-gateway-north',
        name: 'LiDAR Sensor Gateway North',
        type: 'telemetry',
        lat: 37.8024,
        lon: -122.4058,
        status: 'idle',
        capacity: '100% signal'
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
    this.listeners.forEach((fn) => fn(this.userCoord, sorted));
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const rootWrapper = document.createElement('div');
    rootWrapper.className = 'geo-radar-container';

    // Header
    const header = document.createElement('div');
    header.className = 'geo-radar-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'geo-radar-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Robotics Proximity Radar & Fleet Dispatch';

    const subtitle = document.createElement('p');
    subtitle.className = 'geo-radar-subtitle';
    subtitle.textContent = 'Real-time great-circle haversine calculation and waypoint reachability sorting.';

    titleGroup.append(title, subtitle);
    header.append(titleGroup);
    rootWrapper.append(header);

    // Main Layout (Radar Viewport Left, Controls & Destination List Right)
    const contentLayout = document.createElement('div');
    contentLayout.className = 'geo-radar-layout';

    // Left: Circular Radar Visualizer
    const radarViewport = document.createElement('div');
    radarViewport.className = 'geo-radar-viewport';

    const radarRings = document.createElement('div');
    radarRings.className = 'geo-radar-rings';

    const sweepBeam = document.createElement('div');
    sweepBeam.className = 'geo-radar-sweep-beam';

    const centerBlip = document.createElement('div');
    centerBlip.className = 'geo-radar-center-blip';
    centerBlip.title = `Current Bot: ${this.userCoord.lat.toFixed(4)}, ${this.userCoord.lon.toFixed(4)}`;

    radarViewport.append(radarRings, sweepBeam, centerBlip);

    // Right: Controls & Node Cards
    const panel = document.createElement('div');
    panel.className = 'geo-radar-panel';

    // Coord Inputs
    const form = document.createElement('div');
    form.className = 'geo-coord-form';

    const latInput = document.createElement('input');
    latInput.type = 'number';
    latInput.step = '0.0001';
    latInput.className = 'geo-input';
    latInput.value = this.userCoord.lat;
    latInput.placeholder = 'Latitude';

    const lonInput = document.createElement('input');
    lonInput.type = 'number';
    lonInput.step = '0.0001';
    lonInput.className = 'geo-input';
    lonInput.value = this.userCoord.lon;
    lonInput.placeholder = 'Longitude';

    const updateBtn = document.createElement('button');
    updateBtn.type = 'button';
    updateBtn.className = 'geo-btn';
    updateBtn.textContent = 'Locate Fleet Nodes';

    form.append(latInput, lonInput, updateBtn);
    panel.append(form);

    // Destination Nodes List
    const listSection = document.createElement('div');
    listSection.className = 'geo-nodes-section';

    const listHeading = document.createElement('h4');
    listHeading.textContent = 'Proximity-Ranked Reachable Nodes';
    listSection.append(listHeading);

    const nodesList = document.createElement('div');
    nodesList.className = 'geo-nodes-list';

    const renderList = () => {
      nodesList.replaceChildren();
      const sorted = this.sortNearestNodes(this.userCoord);

      sorted.forEach((node, index) => {
        const card = document.createElement('div');
        card.className = `geo-node-card ${index === 0 ? 'nearest' : ''}`;

        const nodeInfo = document.createElement('div');
        nodeInfo.className = 'geo-node-info';

        const nameSpan = document.createElement('div');
        nameSpan.className = 'geo-node-name';
        nameSpan.textContent = node.name;

        const metaSpan = document.createElement('div');
        metaSpan.className = 'geo-node-meta';
        metaSpan.textContent = `Type: ${node.type} • Status: ${node.status} • ${node.capacity}`;

        nodeInfo.append(nameSpan, metaSpan);

        const badge = document.createElement('div');
        badge.className = 'geo-node-badge';
        badge.textContent = `${node.distanceKm} km • ${node.bearing}° (${node.compass})`;

        card.append(nodeInfo, badge);
        nodesList.append(card);
      });
    };

    updateBtn.addEventListener('click', () => {
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);
      if (!isNaN(lat) && !isNaN(lon)) {
        this.setUserCoord(lat, lon);
        renderList();
      }
    });

    renderList();
    listSection.append(nodesList);
    panel.append(listSection);

    contentLayout.append(radarViewport, panel);
    rootWrapper.append(contentLayout);
    container.append(rootWrapper);
  }
}
