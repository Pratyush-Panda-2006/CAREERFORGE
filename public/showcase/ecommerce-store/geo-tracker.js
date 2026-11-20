export const EARTH_RADIUS_KM = 6371.0088;
const radians = (degrees) => degrees * Math.PI / 180;
const degrees = (angle) => angle * 180 / Math.PI;
function coordinate(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new RangeError('Use finite latitude −90…90 and longitude −180…180.');
  return { lat, lon };
}
function geometry(start, end) {
  coordinate(start.lat, start.lon); coordinate(end.lat, end.lon);
  const a = radians(start.lat), b = radians(end.lat);
  const delta = radians(((end.lon - start.lon + 540) % 360) - 180);
  const x = Math.cos(b) * Math.sin(delta);
  const y = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(delta);
  const dot = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(delta);
  const h = Math.min(1, Math.max(0, Math.sin((b - a) / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(delta / 2) ** 2));
  // Haversine loses resolution near antipodes; the equivalent atan2 stays stable there.
  const angle = h > 1 - 1e-12 ? Math.atan2(Math.hypot(x, y), dot) : 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return { x, y, angle };
}

export class EcommerceStoreGeoRadarEngine {
  #nodes;
  constructor(nodes = []) {
    if (!Array.isArray(nodes) || nodes.length > 128) throw new RangeError('Supply at most 128 survey sites.');
    const ids = new Set();
    this.#nodes = Array.from(nodes, (node) => {
      if (!node || typeof node.id !== 'string' || !node.id.trim() || node.id.length > 60 || typeof node.name !== 'string' || !node.name.trim() || node.name.length > 100) throw new TypeError('Each site needs an ID and a name.');
      const id = node.id.trim();
      if (ids.has(id)) throw new TypeError('Survey site IDs must be unique.');
      ids.add(id); return Object.freeze({ id, name: node.name.trim(), ...coordinate(node.lat, node.lon) });
    });
  }
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    return EARTH_RADIUS_KM * geometry({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 }).angle;
  }
  computeBearing(start, end) {
    if (!start || !end) throw new TypeError('Supply start and end coordinates.');
    const { x, y } = geometry(start, end);
    // Coincident/antipodal sites and a polar origin have no unique compass heading.
    if (Math.abs(start.lat) === 90 || Math.hypot(x, y) < 1e-14) return null;
    return (degrees(Math.atan2(x, y)) + 360) % 360;
  }
  sortNearestNodes(userCoord) {
    if (!userCoord) throw new TypeError('Supply an origin coordinate.');
    coordinate(userCoord.lat, userCoord.lon);
    return this.#nodes.map((node) => ({ ...node,
      distanceKm: this.calculateHaversineDistance(userCoord.lat, userCoord.lon, node.lat, node.lon),
      bearingDegrees: this.computeBearing(userCoord, node),
    })).sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

const SAMPLE_SITES = [
  { id: 'nursery', name: 'Central demo pickup', lat: 12.9830, lon: 77.6120 },
  { id: 'riverbank', name: 'South demo pickup', lat: 12.9520, lon: 77.5650 },
  { id: 'water', name: 'North demo pickup', lat: 13.0800, lon: 77.6700 },
  { id: 'seed', name: 'East demo pickup', lat: 12.8800, lon: 77.7100 },
  { id: 'canopy', name: 'West demo pickup', lat: 13.2200, lon: 77.3400 },
  { id: 'training', name: 'Regional demo pickup', lat: 12.4700, lon: 77.1200 },
  { id: 'east', name: 'Dateline training east', lat: 0, lon: 179.8 },
  { id: 'west', name: 'Dateline training west', lat: 0, lon: -179.8 },
];
function mountRadar() {
  const root = document.querySelector('[data-geo-radar]'); if (!root) return;
  const engine = new EcommerceStoreGeoRadarEngine(SAMPLE_SITES), get = (id) => root.querySelector(`#${id}`);
  const svg = (name, attributes = {}) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  };
  let origin = { lat: 12.9716, lon: 77.5946 }, radius = 20, rows = [], selectedId = null;
  const distance = (km) => `${km.toLocaleString('en-US', { maximumFractionDigits: 2 })} km`;
  const heading = (value) => value === null ? 'Heading undefined' : `${value.toFixed(1)}° from north`;
  const notice = (text, error = false) => { get('notice').textContent = text; get('notice').setAttribute('role', error ? 'alert' : 'status'); };
  function select(id) {
    const site = rows.find((row) => row.id === id); if (!site) return;
    selectedId = id;
    for (const element of root.querySelectorAll('[data-site-id]')) element.setAttribute('aria-pressed', String(element.dataset.siteId === id));
    const blip = Array.from(get('blips').children).find((element) => element.dataset.siteId === id), marker = get('selection-ring');
    marker.setAttribute('visibility', blip ? 'visible' : 'hidden');
    if (blip) for (const axis of ['cx', 'cy']) marker.setAttribute(axis, blip.getAttribute(axis));
    get('site-name').textContent = site.name; get('site-distance').textContent = distance(site.distanceKm);
    get('site-bearing').textContent = heading(site.bearingDegrees);
    get('site-coordinate').textContent = `${site.lat.toFixed(4)}°, ${site.lon.toFixed(4)}°`;
    get('site-range').textContent = site.distanceKm <= radius ? 'Inside the radar range' : 'Outside the radar range';
  }
  function render() {
    rows = engine.sortNearestNodes(origin);
    get('origin-label').textContent = `${origin.lat.toFixed(4)}°, ${origin.lon.toFixed(4)}°`;
    get('range-value').textContent = distance(radius);
    const rings = [];
    for (const fraction of [.25, .5, .75, 1]) {
      rings.push(svg('circle', { cx: 200, cy: 200, r: 152 * fraction, class: 'range-ring' }));
      const label = svg('text', { x: 205, y: 197 - 152 * fraction, class: 'ring-label' }); label.textContent = distance(radius * fraction); rings.push(label);
    }
    get('rings').replaceChildren(...rings);
    const visible = rows.filter((row) => row.distanceKm <= radius);
    const located = visible.filter((row) => row.bearingDegrees !== null || row.distanceKm < 1e-8);
    get('site-count').textContent = `${visible.length} of ${rows.length} sites in range`;
    get('radar-note').textContent = !visible.length ? 'No sites inside range. Increase the range or change the origin.'
      : located.length < visible.length ? `${visible.length - located.length} ${visible.length - located.length === 1 ? 'site has' : 'sites have'} no unique heading. Inspect the list.`
        : 'Select a blip or a listed site to inspect its measurements.';
    get('blips').replaceChildren(...located.map((site) => {
      const angle = radians(site.bearingDegrees ?? 0), reach = 152 * site.distanceKm / radius;
      const blip = svg('circle', { cx: 200 + Math.sin(angle) * reach, cy: 200 - Math.cos(angle) * reach, r: 6,
        tabindex: 0, role: 'button', 'aria-label': `${site.name}, ${distance(site.distanceKm)}, ${heading(site.bearingDegrees)}`, 'data-site-id': site.id, class: 'site-blip' });
      blip.addEventListener('focus', () => select(site.id)); blip.addEventListener('click', () => select(site.id));
      blip.addEventListener('keydown', (event) => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); select(site.id); } });
      return blip;
    }));
    get('sites').replaceChildren(...rows.map((site) => {
      const li = document.createElement('li'), button = document.createElement('button'), title = document.createElement('strong'), metrics = document.createElement('span');
      button.type = 'button'; button.dataset.siteId = site.id;
      title.textContent = site.name; metrics.textContent = `${distance(site.distanceKm)} · ${heading(site.bearingDegrees)}${site.distanceKm > radius ? ' · outside range' : ''}`;
      button.append(title, metrics); button.addEventListener('click', () => select(site.id)); li.append(button); return li;
    }));
    select(rows.some((row) => row.id === selectedId) ? selectedId : rows[0].id);
  }
  get('origin-form').addEventListener('invalid', () => notice('Enter latitude −90…90 and longitude −180…180. The previous origin is retained.', true), true);
  get('origin-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try { origin = coordinate(get('latitude').valueAsNumber, get('longitude').valueAsNumber); selectedId = null; render(); notice('Origin applied. Sites are sorted by straight-line distance.'); }
    catch (error) { notice(error.message, true); }
  });
  get('range').addEventListener('input', () => { radius = get('range').valueAsNumber; render(); });
  get('pause').addEventListener('click', () => {
    const paused = root.classList.toggle('paused'); get('pause').textContent = paused ? 'Resume sweep' : 'Pause sweep'; get('pause').setAttribute('aria-pressed', String(paused));
  });
  function setDemo(lat, lon, range) {
    origin = coordinate(lat, lon); radius = range; selectedId = null;
    get('latitude').value = String(lat); get('longitude').value = String(lon); get('range').value = String(range); render();
  }
  get('dateline').addEventListener('click', () => { setDemo(0, 179.7, 100); notice('Dateline example loaded. Nearby sites remain close across ±180° longitude.'); });
  get('reset').addEventListener('click', () => { setDemo(12.9716, 77.5946, 20); notice('Default illustrative pickup locations restored.'); });
  render();
}
if (typeof document !== 'undefined') mountRadar();
