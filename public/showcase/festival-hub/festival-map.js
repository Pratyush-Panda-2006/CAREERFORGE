import { findFestivalRoute, gaussianCrowdIntensity, simulateCrowdZones } from './map-model.mjs';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 480;
const map = document.getElementById('vm-map');
const frame = document.getElementById('vm-frame');
const canvas = document.getElementById('vm-live-canvas');

if (map && frame && canvas) {
  const context = canvas.getContext('2d');
  const status = document.getElementById('vm-live-status');
  const summary = document.getElementById('vm-crowd-summary');
  const crowdToggle = document.getElementById('vm-crowd-toggle');
  const soundToggle = document.getElementById('vm-sound-toggle');
  const locationButton = document.getElementById('vm-set-location');
  const destinationSelect = document.getElementById('vm-route-target');
  const findRouteButton = document.getElementById('vm-find-route');
  const clearRouteButton = document.getElementById('vm-clear-route');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!context || !status || !summary || !crowdToggle || !soundToggle || !locationButton || !destinationSelect || !findRouteButton || !clearRouteButton) {
    if (status) status.textContent = 'The live venue map could not be initialized in this browser.';
  } else {
    let showCrowds = true;
    let showSound = true;
    let pickingLocation = false;
    let currentLocation = null;
    let route = null;
    let zones = simulateCrowdZones();
    let lastDraw = 0;
    let lastSummary = 0;
    let lastRouteUpdate = 0;
    let frameRequest = 0;

    function resizeCanvas() {
      const bounds = map.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(canvas.width / MAP_WIDTH, 0, 0, canvas.height / MAP_HEIGHT, 0, 0);
      drawMap(performance.now());
    }

    function colorWithAlpha(hex, alpha) {
      const value = Number.parseInt(hex.slice(1), 16);
      const red = (value >> 16) & 255;
      const green = (value >> 8) & 255;
      const blue = value & 255;
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    function drawCrowdHeatmap() {
      for (const zone of zones) {
        const density = gaussianCrowdIntensity(zone, zone);
        const sigma = zone.spread;
        const radius = sigma * 2.8;
        const gradient = context.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, radius);
        for (const stop of [0, 0.3, 0.6, 1]) {
          const distance = radius * stop;
          const attenuation = Math.exp(-(distance * distance) / (2 * sigma * sigma));
          gradient.addColorStop(stop, colorWithAlpha(zone.color, 0.42 * density * attenuation));
        }
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    function drawSoundContours(timestamp) {
      const thresholds = [26, 16, 6];
      for (const zone of zones) {
        const beatDuration = 60000 / zone.bpm;
        const beatPhase = (timestamp % beatDuration) / beatDuration;
        const pulse = reducedMotion.matches ? 1 : 0.94 + Math.sin(beatPhase * Math.PI * 2) * 0.06;
        for (const attenuationDb of thresholds) {
          const radius = Math.min(188, 25 * (10 ** (attenuationDb / 20)) * pulse);
          context.beginPath();
          context.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
          context.strokeStyle = colorWithAlpha(zone.color, attenuationDb === 6 ? 0.3 : 0.2);
          context.lineWidth = attenuationDb === 6 ? 2 : 1.4;
          context.setLineDash(attenuationDb === 6 ? [] : [5, 6]);
          context.stroke();
        }
      }
      context.setLineDash([]);
    }

    function drawRoute() {
      if (route) {
        context.beginPath();
        context.moveTo(route[0].x, route[0].y);
        for (const point of route.slice(1)) context.lineTo(point.x, point.y);
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.strokeStyle = '#7df5e4';
        context.lineWidth = 5;
        context.shadowColor = '#7df5e4';
        context.shadowBlur = 12;
        context.stroke();
        context.shadowBlur = 0;
      }

      if (currentLocation) {
        context.beginPath();
        context.arc(currentLocation.x, currentLocation.y, 9, 0, Math.PI * 2);
        context.fillStyle = '#fef08a';
        context.shadowColor = '#fef08a';
        context.shadowBlur = 14;
        context.fill();
        context.shadowBlur = 0;
        context.lineWidth = 3;
        context.strokeStyle = '#0f172a';
        context.stroke();
      }
    }

    function drawMap(timestamp) {
      context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      zones = simulateCrowdZones(timestamp);
      if (route && currentLocation && timestamp - lastRouteUpdate >= 1800) {
        route = findFestivalRoute(currentLocation, destinationSelect.value, zones);
        lastRouteUpdate = timestamp;
        clearRouteButton.disabled = !route;
      }
      if (showCrowds) drawCrowdHeatmap();
      if (showSound) drawSoundContours(timestamp);
      drawRoute();
    }

    function updateSummary(timestamp) {
      if (timestamp - lastSummary < 1800) return;
      lastSummary = timestamp;
      const readings = zones.map((zone) => `${zone.name} ${zone.attendance.toLocaleString()}/${zone.capacity.toLocaleString()} · ${zone.decibels} dB · ${zone.bpm} BPM`).join(' · ');
      summary.textContent = `Simulated stage telemetry — ${readings}`;
    }

    function renderFrame(timestamp) {
      const interval = reducedMotion.matches ? 1000 : 80;
      if (timestamp - lastDraw >= interval) {
        drawMap(timestamp);
        updateSummary(timestamp);
        lastDraw = timestamp;
      }
      frameRequest = window.requestAnimationFrame(renderFrame);
    }

    function setRoute() {
      if (!currentLocation) return;
      route = findFestivalRoute(currentLocation, destinationSelect.value, zones);
      clearRouteButton.disabled = !route;
      if (!route) {
        status.textContent = 'No walking route is available for that destination.';
        return;
      }
      const destination = destinationSelect.value === 'medical' ? 'Medical Tent / Info Hub' : 'Main Gate';
      status.textContent = `Walking route to ${destination} plotted along festival paths.`;
      lastRouteUpdate = performance.now();
      drawMap(performance.now());
    }

    function setLocationFromClick(event) {
      if (!pickingLocation) return;
      if (event.target.closest('.vm-pin, .vm-popover, .ml-waypoint-pin, .ml-popover')) return;

      event.stopImmediatePropagation();
      const bounds = map.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      currentLocation = {
        x: Math.max(0, Math.min(MAP_WIDTH, ((event.clientX - bounds.left) / bounds.width) * MAP_WIDTH)),
        y: Math.max(0, Math.min(MAP_HEIGHT, ((event.clientY - bounds.top) / bounds.height) * MAP_HEIGHT))
      };
      pickingLocation = false;
      frame.classList.remove('is-picking-location');
      locationButton.setAttribute('aria-pressed', 'false');
      locationButton.textContent = 'Update my location';
      findRouteButton.disabled = false;
      setRoute();
    }

    crowdToggle.addEventListener('click', () => {
      showCrowds = !showCrowds;
      crowdToggle.setAttribute('aria-pressed', String(showCrowds));
      crowdToggle.textContent = `Crowd heatmap: ${showCrowds ? 'on' : 'off'}`;
      drawMap(performance.now());
    });

    soundToggle.addEventListener('click', () => {
      showSound = !showSound;
      soundToggle.setAttribute('aria-pressed', String(showSound));
      soundToggle.textContent = `Sound contours: ${showSound ? 'on' : 'off'}`;
      drawMap(performance.now());
    });

    locationButton.addEventListener('click', () => {
      pickingLocation = !pickingLocation;
      frame.classList.toggle('is-picking-location', pickingLocation);
      locationButton.setAttribute('aria-pressed', String(pickingLocation));
      locationButton.textContent = pickingLocation ? 'Click map to set location' : currentLocation ? 'Update my location' : 'Set my location';
      status.textContent = pickingLocation
        ? 'Click your current position on the map.'
        : 'Location selection cancelled.';
    });

    findRouteButton.addEventListener('click', setRoute);
    destinationSelect.addEventListener('change', () => {
      if (currentLocation) setRoute();
    });
    clearRouteButton.addEventListener('click', () => {
      route = null;
      clearRouteButton.disabled = true;
      status.textContent = 'Suggested walking route cleared.';
      drawMap(performance.now());
    });
    map.addEventListener('click', setLocationFromClick);

    if ('ResizeObserver' in window) {
      new ResizeObserver(resizeCanvas).observe(map);
    } else {
      window.addEventListener('resize', resizeCanvas);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frameRequest);
        frameRequest = 0;
        return;
      }
      lastDraw = 0;
      if (!frameRequest) frameRequest = window.requestAnimationFrame(renderFrame);
    });

    resizeCanvas();
    frameRequest = window.requestAnimationFrame(renderFrame);
  }
}
