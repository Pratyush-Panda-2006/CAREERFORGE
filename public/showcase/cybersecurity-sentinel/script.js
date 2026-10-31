function runSecurityScan() {
  if (window.triggerIncidentScan) {
    window.triggerIncidentScan();
  } else {
    alert('Sentinel Vulnerability Scanner Engine active! Scanning ports & SSL certificates...');
  }
}

/* ===== BEGIN issue #97: global threat map ===== */
(function () {
  'use strict';
  var map = document.getElementById('tm-map');
  if (!map) return;

  var NS = 'http://www.w3.org/2000/svg';
  var W = 1000, H = 500;
  var TICK_MS = 100;
  var ARC_LIFE_MS = 2600;
  var LOG_MAX = 100;

  // Equirectangular projection: longitude and latitude map linearly onto x and y.
  function project(lon, lat) {
    return { x: (lon + 180) * W / 360, y: (90 - lat) * H / 180 };
  }

  // Very rough continent outlines as [lon, lat] pairs. Enough to read as a world map, not for navigation.
  var LAND = [
    [[-168,66],[-162,70],[-140,70],[-125,70],[-95,72],[-82,68],[-65,60],[-55,52],[-66,45],[-70,42],[-76,35],[-81,31],[-80,25],[-83,29],[-90,30],[-97,26],[-98,20],[-92,18],[-87,21],[-83,15],[-79,9],[-85,10],[-92,14],[-105,20],[-110,24],[-115,30],[-118,34],[-124,40],[-124,48],[-135,58],[-150,60],[-165,60]], // North America
    [[-55,60],[-45,60],[-20,70],[-20,82],[-60,82],[-70,76]], // Greenland
    [[-80,9],[-72,12],[-62,10],[-50,0],[-35,-5],[-40,-22],[-48,-28],[-58,-38],[-65,-42],[-68,-52],[-72,-52],[-74,-40],[-71,-20],[-81,-5]], // South America
    [[-10,36],[-9,43],[-2,48],[2,51],[8,54],[10,58],[5,62],[15,69],[28,71],[45,68],[60,70],[80,73],[105,77],[140,72],[170,70],[180,66],[170,60],[160,55],[155,60],[142,52],[140,45],[130,40],[127,35],[122,30],[120,22],[108,18],[106,10],[100,13],[104,1],[98,8],[93,20],[88,22],[80,15],[77,8],[73,18],[67,25],[57,25],[56,27],[50,30],[48,29],[52,24],[59,22],[52,16],[43,13],[35,28],[34,31],[36,36],[28,37],[26,40],[22,37],[16,40],[18,40],[12,44],[8,44],[3,43],[-5,36]], // Europe and Asia
    [[-17,21],[-10,30],[-6,36],[10,37],[11,33],[20,31],[32,31],[35,28],[43,12],[51,12],[42,-2],[40,-15],[35,-25],[32,-29],[20,-35],[17,-30],[12,-17],[13,-5],[9,4],[-8,4],[-17,14]], // Africa
    [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-34],[130,-31],[115,-34]], // Australia
    [[-5,50],[1,51],[-2,56],[-5,58],[-6,55]], // Great Britain
    [[130,32],[135,34],[141,38],[142,44],[140,41],[135,36]], // Japan
    [[109,1],[117,7],[119,1],[116,-4],[110,-3]], // Borneo
    [[44,-25],[48,-14],[50,-15],[47,-25]] // Madagascar
  ];

  var CITIES = [
    { name: 'New York', cc: 'US', lat: 40.71, lon: -74.01 },
    { name: 'San Francisco', cc: 'US', lat: 37.77, lon: -122.42 },
    { name: 'Sao Paulo', cc: 'BR', lat: -23.55, lon: -46.63 },
    { name: 'London', cc: 'GB', lat: 51.51, lon: -0.13 },
    { name: 'Frankfurt', cc: 'DE', lat: 50.11, lon: 8.68 },
    { name: 'Moscow', cc: 'RU', lat: 55.76, lon: 37.62 },
    { name: 'Lagos', cc: 'NG', lat: 6.52, lon: 3.38 },
    { name: 'Johannesburg', cc: 'ZA', lat: -26.2, lon: 28.05 },
    { name: 'Dubai', cc: 'AE', lat: 25.2, lon: 55.27 },
    { name: 'Mumbai', cc: 'IN', lat: 19.08, lon: 72.88 },
    { name: 'Singapore', cc: 'SG', lat: 1.35, lon: 103.82 },
    { name: 'Beijing', cc: 'CN', lat: 39.9, lon: 116.41 },
    { name: 'Seoul', cc: 'KR', lat: 37.57, lon: 126.98 },
    { name: 'Tokyo', cc: 'JP', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', cc: 'AU', lat: -33.87, lon: 151.21 }
  ];

  var TYPES = {
    DDoS: { cls: 'ddos', ports: [80, 443, 53, 123], severities: ['Low', 'Medium', 'High'] },
    Ransomware: { cls: 'ransomware', ports: [445, 3389, 22], severities: ['High', 'Critical'] },
    SQLi: { cls: 'sqli', ports: [3306, 1433, 5432, 443], severities: ['Medium', 'High', 'Critical'] }
  };
  var TYPE_NAMES = Object.keys(TYPES);

  var els = {
    grid: document.getElementById('tm-grid'),
    land: document.getElementById('tm-land'),
    arcs: document.getElementById('tm-arcs'),
    nodes: document.getElementById('tm-nodes'),
    wrap: document.getElementById('tm-map-wrap'),
    pause: document.getElementById('tm-pause'),
    filter: document.getElementById('tm-filter'),
    body: document.getElementById('tm-log-body'),
    empty: document.getElementById('tm-empty'),
    showing: document.getElementById('tm-showing'),
    latest: document.getElementById('tm-latest'),
    count: { all: document.getElementById('tm-count-all') }
  };
  TYPE_NAMES.forEach(function (t) { els.count[t] = document.getElementById('tm-count-' + t); });

  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function fmt(n) { return n.toFixed(1); }
  function coord(c) {
    return fmt(Math.abs(c.lat)) + '°' + (c.lat >= 0 ? 'N' : 'S') + ', ' + fmt(Math.abs(c.lon)) + '°' + (c.lon >= 0 ? 'E' : 'W');
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function timeStamp(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }

  // ---- static map ----
  var lon, lat;
  for (lon = -180; lon <= 180; lon += 30) {
    els.grid.appendChild(svg('line', { x1: project(lon, 0).x, y1: 0, x2: project(lon, 0).x, y2: H, class: 'tm-gridline' }));
  }
  for (lat = -60; lat <= 60; lat += 30) {
    els.grid.appendChild(svg('line', { x1: 0, y1: project(0, lat).y, x2: W, y2: project(0, lat).y, class: lat === 0 ? 'tm-gridline tm-equator' : 'tm-gridline' }));
  }
  LAND.forEach(function (poly) {
    var pts = poly.map(function (p) { var q = project(p[0], p[1]); return fmt(q.x) + ',' + fmt(q.y); }).join(' ');
    els.land.appendChild(svg('polygon', { points: pts, class: 'tm-land' }));
  });
  CITIES.forEach(function (c) {
    var p = project(c.lon, c.lat);
    c.x = p.x; c.y = p.y;
    var node = svg('g', { class: 'tm-node' });
    var title = svg('title');
    title.textContent = c.name + ', ' + c.cc + ' (' + coord(c) + ')';
    node.appendChild(title);
    node.appendChild(svg('circle', { cx: fmt(p.x), cy: fmt(p.y), r: 3.2, class: 'tm-dot' }));
    var label = svg('text', { x: fmt(p.x + 6), y: fmt(p.y + 3), class: 'tm-label' });
    label.textContent = c.name;
    node.appendChild(label);
    els.nodes.appendChild(node);
  });

  // ---- simulation state ----
  var state = { paused: false, filter: 'all', untilNext: 400, total: 0, counts: {}, rows: [], arcs: [] };
  TYPE_NAMES.forEach(function (t) { state.counts[t] = 0; });

  function makeAttack() {
    var type = pick(TYPE_NAMES);
    var from = pick(CITIES), to = pick(CITIES);
    while (to === from) to = pick(CITIES);
    var def = TYPES[type];
    return { type: type, from: from, to: to, port: pick(def.ports), severity: pick(def.severities), at: new Date() };
  }

  function drawArc(a) {
    var x1 = a.from.x, y1 = a.from.y, x2 = a.to.x, y2 = a.to.y;
    var dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    var cx = (x1 + x2) / 2;
    var cy = Math.max(4, (y1 + y2) / 2 - dist * 0.28);
    var grp = svg('g', { class: 'tm-attack tm-' + TYPES[a.type].cls });
    grp.appendChild(svg('path', {
      d: 'M' + fmt(x1) + ' ' + fmt(y1) + ' Q' + fmt(cx) + ' ' + fmt(cy) + ' ' + fmt(x2) + ' ' + fmt(y2),
      pathLength: 1, class: 'tm-arc'
    }));
    grp.appendChild(svg('circle', { cx: fmt(x1), cy: fmt(y1), r: 4, class: 'tm-ring tm-ring-origin' }));
    grp.appendChild(svg('circle', { cx: fmt(x2), cy: fmt(y2), r: 4, class: 'tm-ring tm-ring-hit' }));
    els.arcs.appendChild(grp);
    state.arcs.push({ el: grp, life: ARC_LIFE_MS });
  }

  function rowVisible(type) { return state.filter === 'all' || state.filter === type; }

  function addLogRow(a) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-type', a.type);
    var cells = [
      [timeStamp(a.at), ''],
      [a.type, 'tm-k-' + TYPES[a.type].cls],
      [a.from.name + ', ' + a.from.cc + ' → ' + a.to.name + ', ' + a.to.cc, ''],
      [String(a.port), ''],
      [a.severity, 'tm-sev tm-sev-' + a.severity.toLowerCase()]
    ];
    cells.forEach(function (c) {
      var td = document.createElement('td');
      td.textContent = c[0];
      if (c[1]) td.className = c[1];
      tr.appendChild(td);
    });
    tr.hidden = !rowVisible(a.type);
    els.body.insertBefore(tr, els.body.firstChild);
    state.rows.push(tr);
    if (state.rows.length > LOG_MAX) {
      var old = state.rows.shift();
      if (old.parentNode) old.parentNode.removeChild(old);
    }
  }

  function updateCounts() {
    els.count.all.textContent = String(state.total);
    TYPE_NAMES.forEach(function (t) { els.count[t].textContent = String(state.counts[t]); });
    var shown = state.rows.filter(function (r) { return !r.hidden; }).length;
    els.empty.hidden = shown !== 0;
    els.showing.textContent = 'Showing ' + shown + ' of ' + state.rows.length + ' logged attacks'
      + (state.filter === 'all' ? '' : ' (' + state.filter + ' only)') + '.';
  }

  function spawn() {
    var a = makeAttack();
    state.total += 1;
    state.counts[a.type] += 1;
    addLogRow(a);
    if (rowVisible(a.type)) {
      drawArc(a);
      els.latest.textContent = a.type + ': ' + a.from.name + ' (' + coord(a.from) + ') → ' + a.to.name + ' (' + coord(a.to) + '), port ' + a.port + ', severity ' + a.severity + '.';
    }
    updateCounts();
  }

  function tick() {
    if (state.paused) return;
    state.untilNext -= TICK_MS;
    if (state.untilNext <= 0) {
      spawn();
      state.untilNext = 800 + Math.random() * 1000;
    }
    state.arcs = state.arcs.filter(function (arc) {
      arc.life -= TICK_MS;
      if (arc.life <= 0) { arc.el.parentNode && arc.el.parentNode.removeChild(arc.el); return false; }
      return true;
    });
  }

  // ---- controls ----
  els.pause.addEventListener('click', function () {
    state.paused = !state.paused;
    els.pause.textContent = state.paused ? 'Resume' : 'Pause';
    els.wrap.classList.toggle('tm-paused', state.paused);
  });

  els.filter.addEventListener('change', function (e) {
    if (!e.target || e.target.name !== 'tm-type') return;
    state.filter = e.target.value;
    state.rows.forEach(function (tr) { tr.hidden = !rowVisible(tr.getAttribute('data-type')); });
    state.arcs = state.arcs.filter(function (arc) {
      var keep = state.filter === 'all' || arc.el.classList.contains('tm-' + TYPES[state.filter].cls);
      if (!keep) arc.el.parentNode && arc.el.parentNode.removeChild(arc.el);
      return keep;
    });
    updateCounts();
  });

  updateCounts();
  setInterval(tick, TICK_MS);
})();
/* ===== END issue #97 ===== */

/* ===== BEGIN issue #182: CVE vulnerability explorer ===== */
(function initCveExplorer() {
  'use strict';
  var listEl = document.getElementById('cveList');
  var minEl = document.getElementById('cveMin');
  var maxEl = document.getElementById('cveMax');
  if (!listEl || !minEl || !maxEl) return;

  var minOut = document.getElementById('cveMinOut');
  var maxOut = document.getElementById('cveMaxOut');
  var scaleEl = document.querySelector('#cveRange .cve-scale');
  var showingEl = document.getElementById('cveShowing');
  var emptyEl = document.getElementById('cveEmpty');
  var sevRadios = document.querySelectorAll('input[name="cve-sev"]');
  var exRadios = document.querySelectorAll('input[name="cve-ex"]');

  // Scores are kept in tenths (98 = 9.8) so range comparisons never hit float rounding.
  var BANDS = {
    all: { label: 'All severities', lo: 0, hi: 100 },
    critical: { label: 'Critical', lo: 90, hi: 100 },
    high: { label: 'High', lo: 70, hi: 89 },
    medium: { label: 'Medium', lo: 40, hi: 69 },
    low: { label: 'Low', lo: 1, hi: 39 }
  };

  var EXPLOIT = {
    active: { label: 'Exploited in the wild', icon: '⚠' },
    poc: { label: 'Public PoC', icon: '◆' },
    none: { label: 'No known exploit', icon: '○' }
  };

  // Invented demo entries, none of these describe a real advisory.
  var CVES = [
    { id: 'CVE-2026-10430', title: 'Unauthenticated command injection in the Zenith firmware updater', product: 'Zenith Updater 2.1', date: '2026-10-27', score: 100, ex: 'active' },
    { id: 'CVE-2026-10412', title: 'Remote code execution through the Sentinel Edge Gateway admin API', product: 'Edge Gateway 4.2', date: '2026-10-24', score: 98, ex: 'active' },
    { id: 'CVE-2026-10388', title: 'Authentication bypass in the VaultSync SSO connector', product: 'VaultSync 3.7', date: '2026-10-21', score: 91, ex: 'active' },
    { id: 'CVE-2026-09977', title: 'Unsafe deserialization in the Orbit Queue message broker', product: 'Orbit Queue 1.9', date: '2026-10-09', score: 90, ex: 'poc' },
    { id: 'CVE-2026-10105', title: 'SQL injection in the HelioCRM report builder', product: 'HelioCRM 8.0', date: '2026-10-16', score: 88, ex: 'active' },
    { id: 'CVE-2026-09750', title: 'Path traversal in the NimbusFS file server download handler', product: 'NimbusFS 5.3', date: '2026-10-02', score: 81, ex: 'poc' },
    { id: 'CVE-2026-10231', title: 'Local privilege escalation in the Kestrel endpoint agent driver', product: 'Kestrel Agent 6.4', date: '2026-10-19', score: 78, ex: 'poc' },
    { id: 'CVE-2026-09601', title: 'Heap overflow when decoding crafted images in PixelDecode', product: 'PixelDecode 0.14', date: '2026-09-28', score: 75, ex: 'none' },
    { id: 'CVE-2026-10290', title: 'Server side request forgery in the Lattice webhook relay', product: 'Lattice Relay 2.6', date: '2026-10-22', score: 72, ex: 'none' },
    { id: 'CVE-2026-09418', title: 'Stored cross-site scripting in the Pylon admin dashboard', product: 'Pylon 11.2', date: '2026-09-17', score: 61, ex: 'poc' },
    { id: 'CVE-2026-10347', title: 'Weak TLS cipher fallback in the Quill mail relay', product: 'Quill Relay 3.0', date: '2026-10-25', score: 56, ex: 'none' },
    { id: 'CVE-2026-10019', title: 'Open redirect on the Meridian login page', product: 'Meridian Portal 7.5', date: '2026-10-11', score: 54, ex: 'none' },
    { id: 'CVE-2026-09833', title: 'Information disclosure in the Tessera log exporter', product: 'Tessera 2.2', date: '2026-10-05', score: 53, ex: 'none' },
    { id: 'CVE-2026-09266', title: 'Cross-site request forgery on the Basalt settings form', product: 'Basalt CMS 4.8', date: '2026-09-09', score: 43, ex: 'poc' },
    { id: 'CVE-2026-09102', title: 'Verbose error messages leak stack traces in the Cobalt API', product: 'Cobalt API 1.12', date: '2026-08-30', score: 37, ex: 'none' },
    { id: 'CVE-2026-09555', title: 'Clickjacking possible on the Ember status page', product: 'Ember Status 2.0', date: '2026-09-23', score: 31, ex: 'none' },
    { id: 'CVE-2026-08871', title: 'Missing HTTP security headers in the Ridge CDN console', product: 'Ridge Console 9.1', date: '2026-08-14', score: 21, ex: 'none' }
  ];

  var state = { min: 0, max: 100, ex: 'any' };

  function bandOf(score) {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  function fmt(tenths) { return (tenths / 10).toFixed(1); }

  function exMatches(c) { return state.ex === 'any' || c.ex === state.ex; }

  // The severity pill that matches the current range exactly, or '' for a custom range.
  function matchingBand() {
    for (var k in BANDS) {
      if (BANDS[k].lo === state.min && BANDS[k].hi === state.max) return k;
    }
    return '';
  }

  function badge(tag, cls, text) {
    var s = document.createElement(tag);
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function buildItem(c) {
    var band = bandOf(c.score);
    var li = document.createElement('li');
    li.className = 'cve-item cve-' + band;

    var main = document.createElement('div');
    main.className = 'cve-main';
    var idRow = document.createElement('div');
    idRow.className = 'cve-idrow';
    idRow.appendChild(badge('span', 'cve-id', c.id));
    idRow.appendChild(badge('span', 'cve-exploit-badge cve-ex-' + c.ex, EXPLOIT[c.ex].icon + ' ' + EXPLOIT[c.ex].label));
    main.appendChild(idRow);
    main.appendChild(badge('h3', 'cve-title', c.title));
    main.appendChild(badge('p', 'cve-meta', c.product + ' · Published ' + c.date));

    var score = document.createElement('div');
    score.className = 'cve-score';
    score.appendChild(badge('span', 'cve-badge', fmt(c.score) + ' ' + BANDS[band].label));
    var meter = document.createElement('span');
    meter.className = 'cve-meter';
    meter.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('span');
    fill.className = 'cve-meter-fill';
    fill.style.width = c.score + '%';
    meter.appendChild(fill);
    score.appendChild(meter);

    li.appendChild(main);
    li.appendChild(score);
    return li;
  }

  function render() {
    var shown = CVES.filter(function (c) { return c.score >= state.min && c.score <= state.max && exMatches(c); });

    listEl.textContent = '';
    shown.forEach(function (c) { listEl.appendChild(buildItem(c)); });
    emptyEl.hidden = shown.length > 0;

    minOut.textContent = fmt(state.min);
    maxOut.textContent = fmt(state.max);
    minEl.setAttribute('aria-valuetext', fmt(state.min));
    maxEl.setAttribute('aria-valuetext', fmt(state.max));
    scaleEl.style.setProperty('--cve-lo', state.min + '%');
    scaleEl.style.setProperty('--cve-hi', (100 - state.max) + '%');

    // Counts on the pills follow the exploitability filter only, so a pill shows what it would give you.
    var counts = { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    CVES.forEach(function (c) { if (exMatches(c)) { counts.all++; counts[bandOf(c.score)]++; } });
    for (var k in counts) {
      var el = document.getElementById('cveCount' + k.charAt(0).toUpperCase() + k.slice(1));
      if (el) el.textContent = counts[k];
    }

    var band = matchingBand();
    for (var i = 0; i < sevRadios.length; i++) sevRadios[i].checked = sevRadios[i].value === band;

    var range = 'CVSS ' + fmt(state.min) + ' to ' + fmt(state.max);
    var exText = state.ex === 'any' ? '' : ', ' + EXPLOIT[state.ex].label.toLowerCase();
    showingEl.textContent = 'Showing ' + shown.length + ' of ' + CVES.length + ' vulnerabilities (' + range + exText + ').';
  }

  function onSlider(which) {
    var v = Math.round(parseFloat((which === 'min' ? minEl : maxEl).value) * 10);
    if (which === 'min') state.min = Math.min(v, state.max);
    else state.max = Math.max(v, state.min);
    // Keep the thumbs honest when one tries to cross the other.
    minEl.value = state.min / 10;
    maxEl.value = state.max / 10;
    render();
  }

  function syncSliders() {
    minEl.value = state.min / 10;
    maxEl.value = state.max / 10;
  }

  function reset() {
    state.min = 0; state.max = 100; state.ex = 'any';
    syncSliders();
    for (var i = 0; i < exRadios.length; i++) exRadios[i].checked = exRadios[i].value === 'any';
    render();
  }

  minEl.addEventListener('input', function () { onSlider('min'); });
  maxEl.addEventListener('input', function () { onSlider('max'); });

  for (var i = 0; i < sevRadios.length; i++) {
    sevRadios[i].addEventListener('change', function (e) {
      var b = BANDS[e.target.value];
      if (!b) return;
      state.min = b.lo; state.max = b.hi;
      syncSliders();
      render();
    });
  }
  for (var j = 0; j < exRadios.length; j++) {
    exRadios[j].addEventListener('change', function (e) {
      state.ex = e.target.value;
      render();
    });
  }
  document.getElementById('cveReset').addEventListener('click', reset);
  document.getElementById('cveEmptyReset').addEventListener('click', function () {
    reset();
    document.getElementById('cveReset').focus();
  });

  render();
})();
/* ===== END issue #182 ===== */

// ---------------------------------------------------------------
// Password strength analyzer
// ---------------------------------------------------------------
const OFFLINE_RATE = 1e10; // guesses per second, fast hash on a GPU rig
const ONLINE_RATE = 100; // guesses per second against a rate limited login
const SECONDS_PER_YEAR = 31557600;

const COMMON_PASSWORDS = new Set([
  'password', 'passw0rd', 'password1', 'password123', '123456', '1234567', '12345678', '123456789',
  '1234567890', '12345', '1234', '111111', '000000', '123123', '654321', 'qwerty', 'qwerty123',
  'qwertyuiop', 'abc123', 'letmein', 'monkey', 'dragon', 'iloveyou', 'admin', 'welcome', 'login',
  'football', 'baseball', 'master', 'sunshine', 'princess', 'trustno1', '1q2w3e4r', 'zaq12wsx',
  'qazwsx', 'hello', 'freedom', 'whatever', 'shadow', 'superman', 'batman', 'starwars', 'changeme',
  'secret', 'access', 'flower', 'mustang', 'soccer', 'hockey', 'killer', 'test', 'guest', 'root',
  'asdfgh', 'asdfghjkl', 'zxcvbnm', 'pass', 'default', 'computer', 'internet', 'cheese', 'summer'
]);

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];

function poolSize(pw) {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[ !-\/:-@\[-`{-~]/.test(pw)) pool += 33;
  if (/[^\x00-\x7F]/.test(pw)) pool += 100; // rough allowance for non-ASCII characters
  return pool;
}

function shannonPerChar(pw) {
  if (!pw) return 0;
  const counts = {};
  for (const ch of pw) counts[ch] = (counts[ch] || 0) + 1;
  const len = [...pw].length;
  let h = 0;
  Object.values(counts).forEach((n) => {
    const p = n / len;
    h -= p * Math.log2(p);
  });
  return h;
}

function isKeyboardRun(a, b, c) {
  const trio = (a + b + c).toLowerCase();
  const rev = trio.split('').reverse().join('');
  return KEYBOARD_ROWS.some((row) => row.includes(trio) || row.includes(rev));
}

// Number of characters that are predictable: the third+ character of a run
// of one repeated character, or of an ascending/descending/keyboard run.
function countPredictable(chars) {
  let n = 0;
  for (let i = 1; i < chars.length; i++) {
    if (i >= 2 && chars[i] === chars[i - 1] && chars[i] === chars[i - 2]) { n++; continue; }
    if (i >= 2) {
      const d1 = chars[i].charCodeAt(0) - chars[i - 1].charCodeAt(0);
      const d2 = chars[i - 1].charCodeAt(0) - chars[i - 2].charCodeAt(0);
      const stepRun = Math.abs(d1) === 1 && d1 === d2;
      if (stepRun || isKeyboardRun(chars[i - 2], chars[i - 1], chars[i])) n++;
    }
  }
  return n;
}

function isCommonPassword(pw) {
  const lower = pw.toLowerCase();
  const unleet = (str) => str.replace(/@/g, 'a').replace(/\$/g, 's').replace(/0/g, 'o').replace(/3/g, 'e').replace(/!/g, 'i');
  const stripped = (str) => str.replace(/[0-9!@#$%^&*._-]+$/, '');
  const base = stripped(lower);
  return [lower, unleet(lower), base, unleet(base)].some((c) => c && COMMON_PASSWORDS.has(c));
}

function analyzePassword(pw) {
  const chars = [...pw];
  const length = chars.length;
  const pool = poolSize(pw);
  const predictable = countPredictable(chars);
  const common = isCommonPassword(pw);

  const checks = {
    length: length >= 12,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
    common: length > 0 && !common,
    pattern: length > 0 && predictable === 0
  };

  // Entropy: each unpredictable character is worth log2(pool) bits.
  // A password found in a leaked list is guessed in the first few
  // hundred tries, so its entropy is capped at about 10 bits.
  let bits = pool > 0 ? (length - predictable) * Math.log2(pool) : 0;
  if (common) bits = Math.min(bits, 10);

  const guesses = Math.pow(2, bits) / 2; // on average half the space is searched
  const level = length === 0 ? 0 : bits < 28 ? 1 : bits < 36 ? 2 : bits < 60 ? 3 : bits < 80 ? 4 : 5;

  return {
    length, pool, predictable, common, checks, bits, level,
    shannon: shannonPerChar(pw),
    offlineSeconds: guesses / OFFLINE_RATE,
    onlineSeconds: guesses / ONLINE_RATE
  };
}

function formatDuration(seconds) {
  if (!(seconds >= 1)) return 'Instantly';
  const round = (n) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
  if (seconds < 60) return `${round(seconds)} seconds`;
  if (seconds < 3600) return `${round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${round(seconds / 3600)} hours`;
  if (seconds < SECONDS_PER_YEAR) return `${round(seconds / 86400)} days`;
  const years = seconds / SECONDS_PER_YEAR;
  if (years < 1e3) return `${round(years)} years`;
  if (years < 1e6) return `${round(years / 1e3)} thousand years`;
  if (years < 1e9) return `${round(years / 1e6)} million years`;
  if (years < 1e12) return `${round(years / 1e9)} billion years`;
  return 'More than a trillion years';
}

const LEVEL_LABELS = ['No password yet', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

function renderAnalysis(pw) {
  const r = analyzePassword(pw);
  const meter = document.getElementById('strengthMeter');
  meter.dataset.level = String(r.level);
  meter.querySelectorAll('.seg').forEach((seg, i) => seg.classList.toggle('on', i < r.level));

  const verdict = document.getElementById('verdict');
  verdict.textContent = r.length === 0
    ? 'Type a password to begin the audit.'
    : `${LEVEL_LABELS[r.level]}: about ${Math.round(r.bits)} bits of entropy.`;

  document.getElementById('statEntropy').textContent = `${r.bits.toFixed(1)} bits`;
  document.getElementById('statShannon').textContent = `${r.shannon.toFixed(2)} bits`;
  document.getElementById('statLength').textContent = String(r.length);
  document.getElementById('statPool').textContent = String(r.pool);
  document.getElementById('statOffline').textContent = r.length ? formatDuration(r.offlineSeconds) : '-';
  document.getElementById('statOnline').textContent = r.length ? formatDuration(r.onlineSeconds) : '-';

  document.querySelectorAll('#passwordAudit .checklist li').forEach((li) => {
    const ok = Boolean(r.checks[li.dataset.rule]);
    li.classList.toggle('pass', ok);
    li.querySelector('.mark').textContent = ok ? '✓' : '✕';
    li.querySelector('.status-text').textContent = ok ? ' (met)' : ' (not met)';
  });
  return r;
}

(function initPasswordAudit() {
  const input = document.getElementById('pwInput');
  const toggle = document.getElementById('pwToggle');
  if (!input || !toggle) return;
  input.addEventListener('input', () => renderAnalysis(input.value));
  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(show));
  });
  renderAnalysis('');
})();

/* ===============================================================
   Live Incident Response Filterable Timeline Feed (Issue #57)
   =============================================================== */
(function initIncidentFeed() {
  'use strict';

  const container = document.getElementById('timelineStream');
  if (!container) return;

  const INITIAL_INCIDENTS = [
    {
      id: 'INC-9824',
      cve: 'CVE-2026-4412',
      severity: 'critical',
      title: 'Zero-Day Kernel Memory Corruption Hot-Patched',
      desc: 'Autonomic eBPF shield identified heap overflow in Linux kernel crypto subsystem. Hotfix microcode patched live across 48 node clusters without reboot.',
      timeOffsetSec: 14,
      status: 'auto-mitigated',
      statusText: '🛡️ AUTO-PATCHED',
      host: 'k8s-cluster.eu-central.01',
      source: 'Internal Runtime Guard (eBPF)',
      port: 'Kernel Ring 0',
      responseMs: '38ms',
      forensics: {
        exploit_vector: 'kmalloc overflow attempt',
        target_pid: 14820,
        action: 'Memory page isolated & live kpatch injected',
        integrity_hash: 'sha256:8f92b7c4a1e948c2e6d982bfa120c9e782'
      }
    },
    {
      id: 'INC-9823',
      cve: 'DDoS-SYN-FLOOD',
      severity: 'high',
      title: 'Distributed Volumetric DDoS Amplification Mitigated',
      desc: '1.42 Tbps SYN flood targeting Cloud API Edge Gateway isolated. Anycast scrubbing rerouted malicious UDP reflection across 14 PoPs with zero legitimate request drops.',
      timeOffsetSec: 52,
      status: 'auto-mitigated',
      statusText: '✅ SCRUBBED & BLOCKED',
      host: 'api.sentinel-shield.io:443',
      source: '185.220.101.42 (Tor Exit / AS44392)',
      port: 'TCP / Port 443',
      responseMs: '92ms',
      forensics: {
        peak_volume: '1.42 Tbps / 480 Mpps',
        attack_type: 'DNS / NTP UDP Reflection + SYN Flood',
        scrubbing_pop: 'Frankfurt & Amsterdam Edge Nodes',
        blocked_packets: '98,420,119 packets dropped'
      }
    },
    {
      id: 'INC-9822',
      cve: 'AUTH-BURST-SSH',
      severity: 'medium',
      title: 'Distributed SSH Credential Stuffing Quarantined',
      desc: '38,400 authentication attempts detected from 210 Mirai-variant IoT botnet IPs. Dynamic rate limiter engaged; entire CIDR subnet /24 banned for 72 hours.',
      timeOffsetSec: 140,
      status: 'contained',
      statusText: '⚡ IP SUBNET BANNED',
      host: 'bastion-host-03.us-east',
      source: '194.26.29.112 (AS202425)',
      port: 'SSH / Port 22',
      responseMs: '64ms',
      forensics: {
        failed_attempts: '38,400 attempts / 15s',
        usernames_targeted: 'admin, root, deploy, ubuntu, oracle',
        mitigation: 'Adaptive Geo-IP quarantine + iptables reject'
      }
    },
    {
      id: 'INC-9821',
      cve: 'CERT-AUTO-RENEW',
      severity: 'info',
      title: 'Automated TLS 1.3 / Wildcard SSL Certificate Rotation',
      desc: 'Scheduled zero-downtime Let\'s Encrypt ECC P-384 wildcard certificate renewal completed. Keys rotated and distributed to 24 ingress load balancers.',
      timeOffsetSec: 280,
      status: 'verified',
      statusText: '✓ CERT VERIFIED',
      host: '*.sentinel-shield.io',
      source: 'system:sentinel-cert-manager',
      port: 'TLS / Port 443',
      responseMs: '120ms',
      forensics: {
        issuer: 'Let\'s Encrypt Authority E6',
        cipher: 'TLS_AES_256_GCM_SHA384 (X25519)',
        valid_until: '2027-01-28T00:00:00Z',
        propagation: '24/24 edge nodes synchronized'
      }
    },
    {
      id: 'INC-9820',
      cve: 'CVE-2026-1189',
      severity: 'critical',
      title: 'Ransomware Lateral Movement Intercepted & Isolated',
      desc: 'Heuristic canary token triggered on internal staging DB. Automated host quarantine isolated container network namespace within 45ms before encryption.',
      timeOffsetSec: 420,
      status: 'auto-mitigated',
      statusText: '🛡️ HOST ISOLATED',
      host: 'db-replica-04.prod.vpc',
      source: '10.244.18.91 (Compromised CI Runner)',
      port: 'SMB / Port 445',
      responseMs: '45ms',
      forensics: {
        behavior: 'Rapid directory traversal + canary honeypot read',
        payload_sig: 'Trojan.Win32.BlackByte.Variant',
        quarantine_action: 'VPC network interface detached'
      }
    },
    {
      id: 'INC-9819',
      cve: 'SQLI-WAF-BLOCK',
      severity: 'high',
      title: 'Boolean Blind SQL Injection Attack Dropped by WAF',
      desc: 'Obfuscated nested UNION SELECT payload detected targeting user billing query endpoint. ModSecurity WAF rule #942100 dropped connection and flagged session.',
      timeOffsetSec: 610,
      status: 'auto-mitigated',
      statusText: '✅ WAF DROPPED',
      host: 'app.sentinel.cloud/api/v2/invoices',
      source: '91.240.118.84 (Bulletproof VPN)',
      port: 'HTTPS / Port 443',
      responseMs: '18ms',
      forensics: {
        payload: "' UNION SELECT 1,schema_name,3 FROM information_schema.schemata--",
        rule_matched: 'OWASP CRS v4.0 - SQLi Defenses (Rule 942100)',
        action: 'HTTP 403 Forbidden + Session Cookie Revoked'
      }
    },
    {
      id: 'INC-9818',
      cve: 'DNS-ANOMALY-TUNNEL',
      severity: 'medium',
      title: 'Suspected DNS Tunneling Exfiltration Thwarted',
      desc: 'High entropy Base32 subdomains queried at 1,200 req/sec to malicious domain. Sentinel DNS firewall sank the domain to loopback 127.0.0.1.',
      timeOffsetSec: 890,
      status: 'contained',
      statusText: '⚡ DNS HOLE-PUNCHED',
      host: 'dns-resolver-us.internal',
      source: '10.0.4.15 (Workstation-FinOps-09)',
      port: 'UDP / Port 53',
      responseMs: '24ms',
      forensics: {
        entropy_score: '4.89 / 5.0 (Shannon Metric)',
        domain_sinkholed: 'exfil.darktelecom.biz',
        host_status: 'Scheduled for EDR deep forensic scan'
      }
    },
    {
      id: 'INC-9817',
      cve: 'IAM-LEAK-GUARD',
      severity: 'info',
      title: 'Cloud IAM Policy Compliance Sweep Completed',
      desc: 'Autonomous daily IAM credential auditor reviewed 4,210 service accounts. 3 stale API tokens revoked; MFA enforcement validated across 100% of org accounts.',
      timeOffsetSec: 1200,
      status: 'verified',
      statusText: '✓ AUDIT CLEAN',
      host: 'cloud-iam.aws-sentinel',
      source: 'system:iam-auditor-worker',
      port: 'API / gRPC',
      responseMs: '210ms',
      forensics: {
        accounts_scanned: 4210,
        unused_keys_deactivated: 3,
        mfa_compliance: '100.0%',
        next_audit: 'T+24h'
      }
    }
  ];

  let incidents = [...INITIAL_INCIDENTS];
  let currentFilter = 'all';
  let searchQuery = '';
  let isPaused = false;
  let nextIncidentCounter = 9825;

  function formatRelativeTime(secondsAgo) {
    if (secondsAgo < 60) return `${Math.max(1, Math.round(secondsAgo))}s ago`;
    const m = Math.floor(secondsAgo / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  }

  function updateCounts() {
    const counts = { all: incidents.length, critical: 0, high: 0, medium: 0, info: 0 };
    incidents.forEach((inc) => {
      if (counts[inc.severity] !== undefined) {
        counts[inc.severity]++;
      }
    });

    const elAll = document.getElementById('countAll');
    const elCrit = document.getElementById('countCritical');
    const elHigh = document.getElementById('countHigh');
    const elMed = document.getElementById('countMedium');
    const elInfo = document.getElementById('countInfo');

    if (elAll) elAll.textContent = String(counts.all);
    if (elCrit) elCrit.textContent = String(counts.critical);
    if (elHigh) elHigh.textContent = String(counts.high);
    if (elMed) elMed.textContent = String(counts.medium);
    if (elInfo) elInfo.textContent = String(counts.info);
  }

  function renderIncidents() {
    container.replaceChildren();

    const q = searchQuery.toLowerCase().trim();
    const filtered = incidents.filter((inc) => {
      const matchSev = (currentFilter === 'all' || inc.severity === currentFilter);
      if (!matchSev) return false;
      if (!q) return true;
      const haystack = `${inc.id} ${inc.cve} ${inc.title} ${inc.desc} ${inc.host} ${inc.source} ${inc.port}`.toLowerCase();
      return haystack.includes(q);
    });

    const emptyBox = document.getElementById('timelineEmpty');
    if (emptyBox) emptyBox.hidden = (filtered.length > 0);

    filtered.forEach((inc) => {
      const card = document.createElement('div');
      card.className = `incident-card sev-${inc.severity}`;
      card.dataset.id = inc.id;

      const node = document.createElement('div');
      node.className = 'incident-node';
      card.appendChild(node);

      const inner = document.createElement('div');
      inner.className = 'card-inner';

      // Top row
      const topRow = document.createElement('div');
      topRow.className = 'card-top-row';

      const badges = document.createElement('div');
      badges.className = 'card-badges';

      const sevBadge = document.createElement('span');
      sevBadge.className = `badge-sev ${inc.severity}`;
      sevBadge.textContent = inc.severity.toUpperCase();

      const idBadge = document.createElement('span');
      idBadge.className = 'badge-id';
      idBadge.textContent = `${inc.id} • ${inc.cve}`;

      const statusBadge = document.createElement('span');
      statusBadge.className = inc.status === 'in-progress' ? 'badge-in-progress' : 'badge-mitigated';
      statusBadge.textContent = inc.statusText || 'AUTO-MITIGATED';

      badges.append(sevBadge, idBadge, statusBadge);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'card-time';
      timeSpan.textContent = formatRelativeTime(inc.timeOffsetSec);

      topRow.append(badges, timeSpan);

      // Title & Desc
      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = inc.title;

      const desc = document.createElement('p');
      desc.className = 'card-desc';
      desc.textContent = inc.desc;

      // Telemetry row
      const telemRow = document.createElement('div');
      telemRow.className = 'card-telemetry-row';

      const hostChip = document.createElement('span');
      hostChip.className = 'telem-chip';
      hostChip.innerHTML = `<span>Target:</span> <strong>${inc.host}</strong>`;

      const sourceChip = document.createElement('span');
      sourceChip.className = 'telem-chip';
      sourceChip.innerHTML = `<span>Source:</span> ${inc.source}`;

      const portChip = document.createElement('span');
      portChip.className = 'telem-chip';
      portChip.innerHTML = `<span>Vector:</span> ${inc.port}`;

      const respChip = document.createElement('span');
      respChip.className = 'telem-chip';
      respChip.innerHTML = `<span>Latency:</span> ${inc.responseMs}`;

      const toggleForensicsBtn = document.createElement('button');
      toggleForensicsBtn.type = 'button';
      toggleForensicsBtn.className = 'forensics-toggle';
      toggleForensicsBtn.textContent = 'Inspect Forensics ▾';
      toggleForensicsBtn.setAttribute('aria-expanded', 'false');

      telemRow.append(hostChip, sourceChip, portChip, respChip, toggleForensicsBtn);

      // Drawer
      const drawer = document.createElement('div');
      drawer.className = 'forensics-drawer';
      drawer.hidden = true;

      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(inc.forensics, null, 2);
      drawer.appendChild(pre);

      toggleForensicsBtn.addEventListener('click', () => {
        const isHidden = drawer.hidden;
        drawer.hidden = !isHidden;
        toggleForensicsBtn.textContent = isHidden ? 'Hide Forensics ▴' : 'Inspect Forensics ▾';
        toggleForensicsBtn.setAttribute('aria-expanded', String(isHidden));
      });

      inner.append(topRow, title, desc, telemRow, drawer);
      card.appendChild(inner);
      container.appendChild(card);
    });

    updateCounts();
  }

  function injectNewIncident(customData) {
    const defaultTemplates = [
      {
        severity: 'critical',
        cve: 'CVE-2026-9021',
        title: 'Zero-Day API Token Impersonation Quarantined',
        desc: 'Stolen high-privilege bearer token detected from unrecognized ASN 39812. Autonomic IAM guard revoked token signature in 12ms and isolated session.',
        host: 'iam.gateway.sentinel.internal',
        source: '89.187.162.14 (Compromised Proxy)',
        port: 'gRPC / Port 50051',
        status: 'auto-mitigated',
        statusText: '🛡️ TOKEN REVOKED',
        responseMs: '12ms',
        forensics: {
          token_jti: 'urn:sentinel:token:849204128',
          action: 'Global revocation broadcast via Redis pub/sub',
          threat_actor: 'UNC3821 (Credential Harvesting)'
        }
      },
      {
        severity: 'high',
        cve: 'SYN-FLOOD-L4',
        title: 'Layer 4 SYN Flood Attack Mitigated by eBPF Filter',
        desc: 'Surge of 850k SYN packets/sec targeting payment ingress. Kernel XDP hook dropped malformed TCP packets before socket allocation.',
        host: 'pay.sentinel-shield.io:443',
        source: '45.154.255.89 (Mirai Subnet / AS60117)',
        port: 'TCP / Port 443',
        status: 'auto-mitigated',
        statusText: '✅ XDP DROPPED',
        responseMs: '4ms',
        forensics: {
          rate: '850,000 pps',
          filter_engine: 'eBPF / XDP native driver hook',
          cpu_impact: '< 0.8% overhead'
        }
      },
      {
        severity: 'medium',
        cve: 'BRUTE-FORCE-ADMIN',
        title: 'Admin Console Brute-Force Rate Limiter Engaged',
        desc: '1,200 failed 2FA attempts within 30 seconds against internal admin gateway. Adaptive CAPTCHA and IP temporary quarantine enforced.',
        host: 'admin.sentinel-shield.io',
        source: '178.62.204.18 (DigitalOcean / AS14061)',
        port: 'HTTPS / Port 443',
        status: 'contained',
        statusText: '⚡ RATE LIMITED',
        responseMs: '22ms',
        forensics: {
          attempts_logged: 1200,
          lockout_duration: '3600 seconds',
          alert_dispatched: 'SOC Tier 1 Slack channel'
        }
      },
      {
        severity: 'info',
        cve: 'KERNEL-AUDIT-PASS',
        title: 'Daily Automated Security Microcode Integrity Check',
        desc: 'Autonomic host integrity scanner verified SHA-256 signatures of all loaded kernel modules against secure hardware TPM enclave.',
        host: 'worker-node-12.us-west',
        source: 'system:tpm2-integrity-guard',
        port: 'Hardware TPM 2.0',
        status: 'verified',
        statusText: '✓ TPM 100% OK',
        responseMs: '310ms',
        forensics: {
          modules_checked: 142,
          pcr_measurements: 'Match baseline reference golden image',
          enclave_status: 'HEALTHY'
        }
      }
    ];

    const template = customData || defaultTemplates[Math.floor(Math.random() * defaultTemplates.length)];
    const newInc = {
      id: `INC-${nextIncidentCounter++}`,
      cve: template.cve,
      severity: template.severity,
      title: template.title,
      desc: template.desc,
      timeOffsetSec: 2,
      status: template.status || 'auto-mitigated',
      statusText: template.statusText || '✅ MITIGATED',
      host: template.host,
      source: template.source,
      port: template.port,
      responseMs: template.responseMs,
      forensics: template.forensics
    };

    incidents.unshift(newInc);
    if (incidents.length > 50) incidents.pop();
    renderIncidents();
  }

  // Bind filter pills
  const filterPills = document.querySelectorAll('.sev-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-checked', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-checked', 'true');
      currentFilter = pill.dataset.severity;
      renderIncidents();
    });
  });

  // Bind Search
  const searchInput = document.getElementById('incidentSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      renderIncidents();
    });
  }

  // Reset filter button
  const resetBtn = document.getElementById('feedResetFilter');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentFilter = 'all';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      filterPills.forEach(p => {
        const isAll = p.dataset.severity === 'all';
        p.classList.toggle('active', isAll);
        p.setAttribute('aria-checked', String(isAll));
      });
      renderIncidents();
    });
  }

  // Pause / Resume Toggle
  const togglePauseBtn = document.getElementById('feedTogglePause');
  const pauseIcon = document.getElementById('feedPauseIcon');
  const pauseText = document.getElementById('feedPauseText');
  if (togglePauseBtn) {
    togglePauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      if (isPaused) {
        if (pauseIcon) pauseIcon.textContent = '▶️';
        if (pauseText) pauseText.textContent = 'Resume Live';
        togglePauseBtn.setAttribute('aria-label', 'Resume live stream');
      } else {
        if (pauseIcon) pauseIcon.textContent = '⏸️';
        if (pauseText) pauseText.textContent = 'Pause Live';
        togglePauseBtn.setAttribute('aria-label', 'Pause live stream');
      }
    });
  }

  // Simulate Incident Button
  const injectBtn = document.getElementById('feedInjectBtn');
  if (injectBtn) {
    injectBtn.addEventListener('click', () => {
      injectNewIncident();
    });
  }

  // External trigger connected to hero vulnerability scan
  window.triggerIncidentScan = function () {
    const scanIncident = {
      severity: 'critical',
      cve: 'CVE-2026-0042',
      title: 'Full Vulnerability Scan Completed: Zero-Day Memory Leak Neutralized',
      desc: 'Automated deep heuristic scanner probed 65,535 TCP/UDP ports and TLS certificates. 1 buffer boundary flaw neutralized via automated eBPF runtime patch.',
      host: 'perimeter.sentinel-shield.io:all',
      source: 'Internal Heuristic Engine (Sentinel v4.2)',
      port: 'Comprehensive Port Sweep (0-65535)',
      status: 'auto-mitigated',
      statusText: '🛡️ SCAN COMPLETED & FIXED',
      responseMs: '184ms',
      forensics: {
        ports_audited: 65535,
        tls_ciphers_checked: 48,
        anomalies_detected: 1,
        auto_mitigation_time: '184ms'
      }
    };
    injectNewIncident(scanIncident);
    const feedSec = document.getElementById('incidentFeed');
    if (feedSec) {
      feedSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Live timer tick
  setInterval(() => {
    incidents.forEach((inc) => {
      inc.timeOffsetSec += 2;
    });

    // Update relative time in cards without re-rendering everything
    document.querySelectorAll('.incident-card').forEach((card) => {
      const id = card.dataset.id;
      const found = incidents.find(i => i.id === id);
      if (found) {
        const timeEl = card.querySelector('.card-time');
        if (timeEl) timeEl.textContent = formatRelativeTime(found.timeOffsetSec);
      }
    });
  }, 2000);

  // Auto-inject simulated events periodically
  setInterval(() => {
    if (!isPaused && incidents.length < 40) {
      injectNewIncident();
    }
  }, 7000);

  renderIncidents();
})();

