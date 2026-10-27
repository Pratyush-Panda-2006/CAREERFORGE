function runSecurityScan() {
  alert('Sentinel Vulnerability Scanner Engine active! Scanning ports & SSL certificates...');
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

// Copy the displayed sample only; never read credential-audit inputs.
(() => {
  const button = document.getElementById('copy-command');
  const code = document.getElementById('sample-command-text');
  const status = document.getElementById('copy-command-status');
  if (!button || !code || !status) return;
  let resetTimer;
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    clearTimeout(resetTimer);
    button.disabled = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Copied! ✓';
      status.textContent = 'Sample command copied.';
    } catch {
      button.textContent = 'Copy';
      status.textContent = 'Could not copy. Select the command and copy it manually.';
    } finally {
      button.disabled = false;
      resetTimer = setTimeout(() => { button.textContent = 'Copy'; status.textContent = ''; }, 2000);
    }
  });
})();
