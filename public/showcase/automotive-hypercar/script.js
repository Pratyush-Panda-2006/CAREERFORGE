/* ===== Performance Comparator (issue #52) START ===== */
(function () {
  'use strict';

  // ---- Data block. Every figure is approximate (see the note on the page). ----
  var CARS = {
    apex:   { name: 'Apex Zero (concept)',      cls: '',              zeroSixty: 1.74, quarterMile: 8.9, topSpeed: 258, gForce: 1.8 },
    chiron: { name: 'Bugatti Chiron Super Sport', cls: 'cmp-rival-a', zeroSixty: 2.4,  quarterMile: 9.5, topSpeed: 273, gForce: 1.5 },
    jesko:  { name: 'Koenigsegg Jesko',         cls: 'cmp-rival-b',   zeroSixty: 2.5,  quarterMile: 9.3, topSpeed: 300, gForce: 1.6 }
  };
  var HERO = 'apex';
  var RIVALS = ['chiron', 'jesko'];
  var ALL_RIVALS = 'both';
  var DEFAULT_RIVAL = 'chiron';

  // lowerIsBetter rows are inverted: the bar is best / value, so the best car always fills 100%.
  var METRICS = [
    { key: 'zeroSixty',   label: '0-60 MPH',     unit: ' s',   decimals: 2, lowerIsBetter: true },
    { key: 'quarterMile', label: 'QUARTER MILE', unit: ' s',   decimals: 1, lowerIsBetter: true },
    { key: 'topSpeed',    label: 'TOP SPEED',    unit: ' mph', decimals: 0, lowerIsBetter: false },
    { key: 'gForce',      label: 'PEAK G-FORCE', unit: ' g',   decimals: 1, lowerIsBetter: false }
  ];

  var els = {};
  var rowRefs = {};   // metric key -> { carId -> { wrap, fill, val, tag } }

  // ---- Pure helpers ----
  function activeCars(selection) {
    return selection === ALL_RIVALS ? [HERO].concat(RIVALS) : [HERO, selection];
  }

  function bestValue(metric, ids) {
    var values = ids.map(function (id) { return CARS[id][metric.key]; });
    return metric.lowerIsBetter ? Math.min.apply(null, values) : Math.max.apply(null, values);
  }

  // Bar width in percent, relative to the best value in the row.
  function barPercent(metric, value, best) {
    return (metric.lowerIsBetter ? best / value : value / best) * 100;
  }

  function fmt(metric, value) { return value.toFixed(metric.decimals) + metric.unit; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // ---- Build once, then only update widths so the bars animate between selections ----
  function build() {
    METRICS.forEach(function (m) {
      var row = el('li', 'cmp-row');
      var head = el('div', 'cmp-row-head');
      head.appendChild(el('span', 'cmp-metric', m.label));
      head.appendChild(el('span', 'cmp-hint', m.lowerIsBetter ? 'lower is better, bar inverted' : 'higher is better'));
      row.appendChild(head);
      rowRefs[m.key] = {};
      [HERO].concat(RIVALS).forEach(function (id) {
        var wrap = el('div', 'cmp-car ' + CARS[id].cls);
        wrap.appendChild(el('span', 'cmp-name', CARS[id].name));
        var track = el('span', 'cmp-track');
        track.setAttribute('aria-hidden', 'true');
        var fill = el('span', 'cmp-fill');
        track.appendChild(fill);
        wrap.appendChild(track);
        var val = el('span', 'cmp-val');
        var num = el('span', null, '');
        var tag = el('span', 'cmp-best', 'BEST');
        val.appendChild(num);
        val.appendChild(tag);
        wrap.appendChild(val);
        row.appendChild(wrap);
        rowRefs[m.key][id] = { wrap: wrap, fill: fill, num: num, tag: tag };
      });
      els.grid.appendChild(row);
    });
  }

  function update() {
    var selection = els.select.value;
    var ids = activeCars(selection);
    var wins = 0;
    METRICS.forEach(function (m) {
      var best = bestValue(m, ids);
      var refs = rowRefs[m.key];
      Object.keys(refs).forEach(function (id) {
        var r = refs[id];
        var shown = ids.indexOf(id) !== -1;
        r.wrap.hidden = !shown;
        if (!shown) return;
        var v = CARS[id][m.key];
        r.num.textContent = fmt(m, v);
        r.fill.style.width = barPercent(m, v, best).toFixed(1) + '%';
        r.tag.hidden = v !== best;
      });
      if (CARS[HERO][m.key] === best) wins++;
    });
    var rivalNames = ids.slice(1).map(function (id) { return CARS[id].name; }).join(' and ');
    els.summary.textContent = 'Apex Zero leads in ' + wins + ' of ' + METRICS.length + ' metrics against ' + rivalNames + '.';
    els.key.textContent = 'Bar length shows how close a car is to the best value in that row (100% is the best). 0-60 and quarter mile are inverted because a lower time is better.';
  }

  function init() {
    els.grid = document.getElementById('cmp-grid');
    if (!els.grid) return;
    els.select = document.getElementById('cmp-rival');
    els.summary = document.getElementById('cmp-summary');
    els.key = document.getElementById('cmp-key');

    RIVALS.forEach(function (id) {
      var o = document.createElement('option');
      o.value = id;
      o.textContent = CARS[id].name;
      els.select.appendChild(o);
    });
    var both = document.createElement('option');
    both.value = ALL_RIVALS;
    both.textContent = 'Both benchmarks (3-way)';
    els.select.appendChild(both);
    els.select.value = DEFAULT_RIVAL;

    build();
    update();   // first pass: bars sit at 0 until the next frame so they animate in
    var fills = els.grid.querySelectorAll('.cmp-fill');
    for (var i = 0; i < fills.length; i++) fills[i].style.width = '0%';
    requestAnimationFrame(function () { requestAnimationFrame(update); });
    els.select.addEventListener('change', update);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
/* ===== Performance Comparator (issue #52) END ===== */

window.reserveHypercar = function reserveHypercar() {
  alert('Apex Zero Hypercar Reservation Allocation Request Received!');
};

/* ===== Virtual Wind Tunnel (issue #99) START ===== */
(function () {
  'use strict';

  // ---- All simulation constants live in this one block ----
  var AIR_DENSITY = 1.225;        // kg/m^3, sea level, 15 C
  var FRONTAL_AREA = 2.0;         // m^2, assumed frontal area of the car
  var MPH_TO_MS = 0.44704;        // metres per second per mph
  var GRAVITY = 9.80665;          // m/s^2, to turn newtons into kg of force
  var SPEED_MIN = 100;            // mph
  var SPEED_MAX = 300;            // mph
  var SPEED_DEFAULT = 200;        // mph
  var FLOW_PX_PER_MPH = 3;        // animation: canvas px per second for each mph of wind
  // Per wing state: cd = drag coefficient, cl = downforce coefficient (both made-up demo values).
  // wingY / wingAngle describe the drawn wing; wake is how turbulent the air behind the car looks.
  var STATES = {
    retract:  { label: 'Retract',  note: 'Wing flat, lowest drag',      cd: 0.28, cl: 0.15, wingY: 186, wingAngle: 0,  wake: 2 },
    deploy:   { label: 'Deploy',   note: 'Wing up, more downforce',     cd: 0.36, cl: 0.75, wingY: 168, wingAngle: 14, wake: 5 },
    airbrake: { label: 'Airbrake', note: 'Wing steep, maximum braking', cd: 0.50, cl: 0.95, wingY: 160, wingAngle: 55, wake: 12 }
  };
  var DEFAULT_STATE = 'retract';

  // ---- Pure physics ----
  function mphToMs(mph) { return mph * MPH_TO_MS; }

  function calcAero(stateKey, mph) {
    var s = STATES[stateKey];
    var v = mphToMs(mph);
    var q = 0.5 * AIR_DENSITY * v * v;            // dynamic pressure in pascals
    var dragN = q * s.cd * FRONTAL_AREA;           // drag = 0.5 * rho * v^2 * Cd * A
    var downN = q * s.cl * FRONTAL_AREA;           // downforce uses the same form with Cl
    return { v: v, q: q, cd: s.cd, dragN: dragN, downN: downN, downKg: downN / GRAVITY, powerKw: dragN * v / 1000 };
  }

  // ---- Car shape (canvas units, the canvas is 800 x 320) ----
  var W = 800, H = 320, GROUND = 284;
  var BODY_TOP = [[150, 232], [175, 214], [250, 198], [320, 170], [380, 148], [450, 146], [520, 168], [580, 184], [620, 190], [650, 198]];
  var WHEELS = [[240, 254], [560, 254]];
  var WING_X = 585, WING_LEN = 70;
  var LINES_Y0 = [200, 170, 140, 110, 80, 50];   // streamline resting heights, lowest first
  var STEP = 4;                                   // px between precomputed streamline samples
  var N_SAMPLES = Math.floor(W / STEP) + 1;
  var PARTICLES_PER_LINE = 12;

  var state = { key: DEFAULT_STATE, mph: SPEED_DEFAULT, paused: false };
  var wing = { y: STATES[DEFAULT_STATE].wingY, angle: STATES[DEFAULT_STATE].wingAngle };
  var els = {};
  var ctx = null, rafId = 0, lastT = 0, clock = 0;
  var particles = [];
  var ys = [];                                    // ys[line][sample]

  function bodyTopAt(x) {
    if (x < BODY_TOP[0][0] || x > BODY_TOP[BODY_TOP.length - 1][0]) return Infinity;
    for (var i = 1; i < BODY_TOP.length; i++) {
      if (x <= BODY_TOP[i][0]) {
        var a = BODY_TOP[i - 1], b = BODY_TOP[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return Infinity;
  }

  function wingTopAt(x) {
    var rad = wing.angle * Math.PI / 180;
    var x1 = WING_X + WING_LEN * Math.cos(rad);
    if (x < WING_X || x > x1) return Infinity;
    return wing.y - (x - WING_X) * Math.tan(rad);
  }

  function smoothstep(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  function computeStreamlines() {
    var wake = STATES[state.key].wake;
    ys = LINES_Y0.map(function (y0, k) {
      var gap = 8 + 12 * k;
      var raw = [];
      for (var i = 0; i < N_SAMPLES; i++) {
        var x = i * STEP;
        var obstacle = Math.min(bodyTopAt(x), wingTopAt(x));
        raw.push(Math.min(y0, obstacle - gap));
      }
      var out = raw;
      for (var pass = 0; pass < 2; pass++) {          // two box blurs make the bends smooth
        var next = [];
        for (var j = 0; j < N_SAMPLES; j++) {
          var sum = 0, n = 0;
          for (var d = -6; d <= 6; d++) {
            var idx = j + d;
            if (idx >= 0 && idx < N_SAMPLES) { sum += out[idx]; n++; }
          }
          next.push(sum / n);
        }
        out = next;
      }
      for (var m = 0; m < N_SAMPLES; m++) {              // turbulence behind the tail, strongest near the body
        var xx = m * STEP;
        var ramp = smoothstep((xx - 650) / 90) * Math.max(0, 1 - k / 3);
        out[m] += wake * ramp * Math.sin(xx * 0.07 - clock * 9);
      }
      return out;
    });
  }

  function yAt(line, x) {
    var f = Math.max(0, Math.min(N_SAMPLES - 1, x / STEP));
    var i = Math.floor(f);
    var j = Math.min(i + 1, N_SAMPLES - 1);
    return ys[line][i] + (ys[line][j] - ys[line][i]) * (f - i);
  }

  function initParticles() {
    particles = [];
    for (var k = 0; k < LINES_Y0.length; k++) {
      for (var i = 0; i < PARTICLES_PER_LINE; i++) {
        particles.push({ line: k, x: (i / PARTICLES_PER_LINE) * W + k * 17 });
      }
    }
  }

  function flowSpeed() { return state.mph * FLOW_PX_PER_MPH; }   // canvas px per second

  // ---- Drawing ----
  function drawCar() {
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(BODY_TOP[0][0], BODY_TOP[0][1]);
    for (var i = 1; i < BODY_TOP.length; i++) ctx.lineTo(BODY_TOP[i][0], BODY_TOP[i][1]);
    ctx.lineTo(650, 226); ctx.lineTo(640, 246); ctx.lineTo(160, 246); ctx.lineTo(150, 234);
    ctx.closePath();
    ctx.fillStyle = '#14080a';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(239,68,68,0.6)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // canopy
    ctx.beginPath();
    ctx.moveTo(335, 170); ctx.lineTo(382, 153); ctx.lineTo(448, 151); ctx.lineTo(500, 170); ctx.closePath();
    ctx.fillStyle = 'rgba(34,211,238,0.14)';
    ctx.fill();
    WHEELS.forEach(function (w) {
      ctx.beginPath(); ctx.arc(w[0], w[1], 30, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a'; ctx.fill();
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(w[0], w[1], 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke();
    });
    // wing: pylon + blade
    var rad = wing.angle * Math.PI / 180;
    var x1 = WING_X + WING_LEN * Math.cos(rad);
    var y1 = wing.y - WING_LEN * Math.sin(rad);
    ctx.beginPath(); ctx.moveTo(WING_X + 14, 192); ctx.lineTo(WING_X + 14, wing.y + 2);
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(WING_X, wing.y); ctx.lineTo(x1, y1);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(239,68,68,0.8)'; ctx.shadowBlur = 8; ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineCap = 'butt';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();

    // faint guide lines
    ctx.strokeStyle = 'rgba(34,211,238,0.10)';
    ctx.lineWidth = 1;
    for (var k = 0; k < ys.length; k++) {
      ctx.beginPath();
      for (var i = 0; i < N_SAMPLES; i++) {
        if (i === 0) ctx.moveTo(0, ys[k][0]); else ctx.lineTo(i * STEP, ys[k][i]);
      }
      ctx.stroke();
    }

    drawCar();

    // moving streaks, length grows with speed
    var len = 14 + flowSpeed() * 0.05;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.shadowColor = 'rgba(34,211,238,0.9)';
    ctx.shadowBlur = 6;
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      var tail = pt.x - len;
      ctx.beginPath();
      ctx.moveTo(tail, yAt(pt.line, tail));
      for (var x = tail + STEP; x < pt.x; x += STEP) ctx.lineTo(x, yAt(pt.line, x));
      ctx.lineTo(pt.x, yAt(pt.line, pt.x));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  function step(ts) {
    var dt = lastT ? Math.min((ts - lastT) / 1000, 0.05) : 0;
    lastT = ts;
    clock += dt;
    var target = STATES[state.key];
    var k = Math.min(1, dt * 8);
    wing.y += (target.wingY - wing.y) * k;
    wing.angle += (target.wingAngle - wing.angle) * k;
    var move = flowSpeed() * dt;
    for (var i = 0; i < particles.length; i++) {
      particles[i].x += move;
      if (particles[i].x - 120 > W) particles[i].x -= W + 120;
    }
    computeStreamlines();
    draw();
    rafId = requestAnimationFrame(step);
  }

  function renderStatic() {                      // used when paused: snap the wing and draw one frame
    wing.y = STATES[state.key].wingY;
    wing.angle = STATES[state.key].wingAngle;
    computeStreamlines();
    draw();
  }

  function startLoop() { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(step); } }
  function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

  // ---- Readouts ----
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  function updateReadouts() {
    var r = calcAero(state.key, state.mph);
    var s = STATES[state.key];
    var base = calcAero(DEFAULT_STATE, state.mph);
    els.cd.textContent = s.cd.toFixed(2);
    els.drag.textContent = fmt(r.dragN) + ' N';
    els.down.textContent = fmt(r.downKg) + ' kg';
    els.power.textContent = fmt(r.powerKw) + ' kW';
    els.speedOut.textContent = state.mph + ' mph';
    els.speed.setAttribute('aria-valuetext', state.mph + ' miles per hour');
    els.formula.textContent = 'Drag = 0.5 × ' + AIR_DENSITY + ' kg/m³ × (' + r.v.toFixed(1) + ' m/s)² × ' +
      s.cd.toFixed(2) + ' × ' + FRONTAL_AREA.toFixed(1) + ' m² = ' + fmt(r.dragN) + ' N';
    if (state.key === DEFAULT_STATE) {
      els.delta.textContent = 'Baseline setup: wing retracted.';
    } else {
      var pct = (r.dragN / base.dragN - 1) * 100;
      els.delta.textContent = 'Versus a retracted wing at ' + state.mph + ' mph: drag +' + pct.toFixed(1) + '% (+' +
        fmt(r.dragN - base.dragN) + ' N), downforce +' + fmt(r.downKg - base.downKg) + ' kg.';
    }
    els.caption.textContent = s.label.toUpperCase() + ' | ' + state.mph + ' MPH | AIRFLOW ' + Math.round(flowSpeed()) + ' PX/S';
    els.canvas.dataset.flowSpeed = String(flowSpeed());
    els.canvas.setAttribute('aria-label', 'Side view of the hypercar in an airflow tunnel, wing ' + s.label.toLowerCase() +
      ', wind ' + state.mph + ' miles per hour. Drag ' + fmt(r.dragN) + ' newtons, downforce ' + fmt(r.downKg) + ' kilograms.');
  }

  function announce() {
    var r = calcAero(state.key, state.mph);
    els.live.textContent = STATES[state.key].label + ' at ' + state.mph + ' mph: Cd ' + r.cd.toFixed(2) +
      ', drag ' + fmt(r.dragN) + ' newtons, downforce ' + fmt(r.downKg) + ' kilograms.';
  }

  function refresh() {
    updateReadouts();
    if (state.paused) renderStatic();
  }

  function setPaused(p) {
    state.paused = p;
    els.pause.setAttribute('aria-pressed', String(p));
    els.pause.textContent = p ? 'Play airflow' : 'Pause airflow';
    if (p) { stopLoop(); renderStatic(); } else { startLoop(); }
  }

  function buildStateControls() {
    Object.keys(STATES).forEach(function (key) {
      var s = STATES[key];
      var wrap = document.createElement('div');
      wrap.className = 'wt-state';
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'wt-state';
      input.id = 'wt-state-' + key;
      input.value = key;
      input.checked = key === state.key;
      var label = document.createElement('label');
      label.htmlFor = input.id;
      var strong = document.createElement('strong');
      strong.textContent = s.label;
      var span = document.createElement('span');
      span.textContent = s.note + ' (Cd ' + s.cd.toFixed(2) + ')';
      label.appendChild(strong);
      label.appendChild(span);
      wrap.appendChild(input);
      wrap.appendChild(label);
      els.states.appendChild(wrap);
      input.addEventListener('change', function () {
        state.key = key;
        refresh();
        announce();
      });
    });
  }

  function init() {
    els.canvas = document.getElementById('wt-canvas');
    if (!els.canvas || !els.canvas.getContext) return;
    ['states', 'speed', 'pause', 'cd', 'drag', 'down', 'power', 'formula', 'delta', 'live', 'caption', 'note'].forEach(function (k) {
      els[k] = document.getElementById('wt-' + k);
    });
    els.speedOut = document.getElementById('wt-speed-out');

    els.speed.min = SPEED_MIN;
    els.speed.max = SPEED_MAX;
    els.speed.value = SPEED_DEFAULT;
    els.note.textContent = 'Approximate demo model: air density ' + AIR_DENSITY + ' kg/m³, frontal area ' + FRONTAL_AREA.toFixed(1) +
      ' m², and the Cd / downforce coefficients are made-up values chosen for illustration.';

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    els.canvas.width = W * dpr;
    els.canvas.height = H * dpr;
    ctx = els.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildStateControls();
    els.speed.addEventListener('input', function () { state.mph = Number(els.speed.value); refresh(); });
    els.speed.addEventListener('change', announce);
    els.pause.addEventListener('click', function () { setPaused(!state.paused); });

    initParticles();
    updateReadouts();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPaused(!!reduce);
    if (!reduce) startLoop();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
/* ===== Virtual Wind Tunnel (issue #99) END ===== */

/* ===== 360° Vehicle Colorway & Wheel Configurator (issue #51) START ===== */
(function () {
  'use strict';

  var BASE_PRICE = 2400000;
  var STORAGE_KEY = 'apex_zero_config_v1';

  var COLORS = [
    {
      id: 'stealth',
      name: 'Apex Stealth Black',
      code: 'EXT-01 // STEALTH-BLK',
      tech: 'Satin Carbon Weave + Anti-Static Ceramic',
      price: 0,
      priceLabel: 'Included',
      primary: '#14161b',
      secondary: '#090a0d',
      highlight: '#2f3440',
      glow: 'rgba(239, 68, 68, 0.4)',
      swatchGrad: 'radial-gradient(circle at 35% 35%, #3a3f4d 0%, #14161b 65%, #050507 100%)'
    },
    {
      id: 'mercury',
      name: 'Liquid Mercury',
      code: 'EXT-02 // LIQUID-MERC',
      tech: 'Mirror Platinum Metallic + Poly-Ceramic Clear',
      price: 6000,
      priceLabel: '+$6,000',
      primary: '#cbd5e1',
      secondary: '#64748b',
      highlight: '#f8fafc',
      glow: 'rgba(203, 213, 225, 0.5)',
      swatchGrad: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #cbd5e1 55%, #475569 100%)'
    },
    {
      id: 'orange',
      name: 'Hyper Orange',
      code: 'EXT-03 // HYPER-ORNG',
      tech: 'Tri-Coat Electric Papaya Pearlescent',
      price: 8500,
      priceLabel: '+$8,500',
      primary: '#ff5500',
      secondary: '#b43b02',
      highlight: '#ffaa00',
      glow: 'rgba(255, 85, 0, 0.65)',
      swatchGrad: 'radial-gradient(circle at 35% 35%, #ffbb33 0%, #ff5500 60%, #9a3412 100%)'
    },
    {
      id: 'crimson',
      name: 'Racing Crimson',
      code: 'EXT-04 // RACE-CRIM',
      tech: 'Scuderia Gloss Candy Apple Red Tint',
      price: 10000,
      priceLabel: '+$10,000',
      primary: '#ef4444',
      secondary: '#991b1b',
      highlight: '#fca5a5',
      glow: 'rgba(239, 68, 68, 0.7)',
      swatchGrad: 'radial-gradient(circle at 35% 35%, #f87171 0%, #ef4444 55%, #7f1d1d 100%)'
    },
    {
      id: 'cobalt',
      name: 'Electric Cobalt',
      code: 'EXT-05 // ELEC-COBLT',
      tech: 'Anodized Kinetic Cyan with Blue Photon Luster',
      price: 9000,
      priceLabel: '+$9,000',
      primary: '#06b6d4',
      secondary: '#0e7490',
      highlight: '#67e8f9',
      glow: 'rgba(6, 182, 212, 0.65)',
      swatchGrad: 'radial-gradient(circle at 35% 35%, #a5f3fc 0%, #06b6d4 55%, #155e75 100%)'
    },
    {
      id: 'green',
      name: 'Acid Kinetic Green',
      code: 'EXT-06 // KINETIC-GRN',
      tech: 'High-Luminance Acid Emerald Pearl',
      price: 11500,
      priceLabel: '+$11,500',
      primary: '#10b981',
      secondary: '#047857',
      highlight: '#6ee7b7',
      glow: 'rgba(16, 185, 129, 0.65)',
      swatchGrad: 'radial-gradient(circle at 35% 35%, #a7f3d0 0%, #10b981 55%, #064e3b 100%)'
    }
  ];

  var WHEELS = [
    {
      id: 'aero',
      name: '21" Forged Aero Turbine',
      code: 'WHL-01 // AERO-TURBINE',
      spec: '8-blade carbon directional turbine ring',
      price: 0,
      priceLabel: 'Included (Standard)'
    },
    {
      id: 'vlight',
      name: '20" Hyper-Spoke V-Light',
      code: 'WHL-02 // HYPER-SPOKE',
      spec: 'Split 5-spoke forged magnesium track rim',
      price: 14500,
      priceLabel: '+$14,500'
    },
    {
      id: 'centerlock',
      name: '21" Track-Spec Centerlock',
      code: 'WHL-03 // CENTERLOCK',
      spec: 'Centerlock satin gold race monoblock',
      price: 22000,
      priceLabel: '+$22,000'
    },
    {
      id: 'carbon',
      name: '20" Monoblock Stealth Carbon',
      code: 'WHL-04 // STEALTH-CRB',
      spec: 'Full hollow-core carbon-fiber composite',
      price: 35000,
      priceLabel: '+$35,000'
    }
  ];

  var CALIPERS = [
    { id: 'crimson', name: 'Crimson Brembo', color: '#ef4444', price: 0 },
    { id: 'yellow',  name: 'Acid Yellow',    color: '#eab308', price: 2500 },
    { id: 'cyan',    name: 'Neon Cyan',      color: '#06b6d4', price: 3000 },
    { id: 'stealth', name: 'Stealth Carbon', color: '#374151', price: 4500 }
  ];

  var ANGLES = [
    { deg: 0,   id: 'front',   label: '000° // FRONT 3/4' },
    { deg: 90,  id: 'side',    label: '090° // SIDE AERO' },
    { deg: 180, id: 'rear',    label: '180° // REAR DIFFUSER' },
    { deg: 270, id: 'top',     label: '270° // TOP AERO' }
  ];

  var state = {
    color: 'stealth',
    wheel: 'aero',
    caliper: 'crimson',
    angle: 0,
    trackAero: false,
    matrixLed: true
  };

  var dom = {};

  function formatCurrency(num) {
    return '$' + num.toLocaleString('en-US');
  }

  function getActiveColor() {
    for (var i = 0; i < COLORS.length; i++) {
      if (COLORS[i].id === state.color) return COLORS[i];
    }
    return COLORS[0];
  }

  function getActiveWheel() {
    for (var i = 0; i < WHEELS.length; i++) {
      if (WHEELS[i].id === state.wheel) return WHEELS[i];
    }
    return WHEELS[0];
  }

  function getActiveCaliper() {
    for (var i = 0; i < CALIPERS.length; i++) {
      if (CALIPERS[i].id === state.caliper) return CALIPERS[i];
    }
    return CALIPERS[0];
  }

  function calculateTotal() {
    var color = getActiveColor();
    var wheel = getActiveWheel();
    var caliper = getActiveCaliper();
    var total = BASE_PRICE + color.price + wheel.price + caliper.price;
    if (state.trackAero) total += 18000;
    if (state.matrixLed) total += 9500;
    return total;
  }

  function getClosestAnglePreset(deg) {
    deg = ((deg % 360) + 360) % 360;
    if (deg >= 45 && deg < 135) return 90;
    if (deg >= 135 && deg < 225) return 180;
    if (deg >= 225 && deg < 315) return 270;
    return 0;
  }

  // ---- SVG Artwork Renderers ----
  function renderWheelSvgGroup(cx, cy, r, style, caliperColor) {
    var out = '';
    // Rotor & Caliper
    var rotorR = r * 0.76;
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rotorR + '" fill="#1e222b" stroke="#374151" stroke-width="2"/>';
    // Rotor cross-drilled holes
    for (var a = 0; a < 360; a += 45) {
      var rad = (a * Math.PI) / 180;
      var hx = cx + Math.cos(rad) * (rotorR * 0.65);
      var hy = cy + Math.sin(rad) * (rotorR * 0.65);
      out += '<circle cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="1.5" fill="#0f1115"/>';
    }
    // Caliper
    var calX = cx - rotorR * 0.95;
    var calY = cy - rotorR * 0.6;
    out += '<rect x="' + calX.toFixed(1) + '" y="' + calY.toFixed(1) + '" width="' + (rotorR * 0.45).toFixed(1) + '" height="' + (rotorR * 1.1).toFixed(1) + '" rx="4" fill="' + caliperColor + '" stroke="#ffffff" stroke-width="0.8" opacity="0.95"/>';
    out += '<text x="' + (calX + rotorR * 0.22).toFixed(1) + '" y="' + (calY + rotorR * 0.6).toFixed(1) + '" fill="#ffffff" font-size="4" font-family="Orbitron" font-weight="900" transform="rotate(-90 ' + (calX + rotorR * 0.22).toFixed(1) + ' ' + (calY + rotorR * 0.6).toFixed(1) + ')" text-anchor="middle">APEX</text>';

    // Tire outer rim
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#0a0a0c" stroke-width="' + (r * 0.22).toFixed(1) + '"/>';
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.89).toFixed(1) + '" fill="none" stroke="#262626" stroke-width="1.5"/>';

    // Wheels Spoke Geometries
    if (style === 'aero') {
      // 8-blade turbine
      for (var i = 0; i < 8; i++) {
        var angle = (i * 45 * Math.PI) / 180;
        var x1 = cx + Math.cos(angle) * (r * 0.22);
        var y1 = cy + Math.sin(angle) * (r * 0.22);
        var x2 = cx + Math.cos(angle + 0.35) * (r * 0.86);
        var y2 = cy + Math.sin(angle + 0.35) * (r * 0.86);
        out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#e5e7eb" stroke-width="3" stroke-linecap="round"/>';
        out += '<line x1="' + (x1 + 2).toFixed(1) + '" y1="' + (y1 + 2).toFixed(1) + '" x2="' + (x2 - 2).toFixed(1) + '" y2="' + (y2 - 2).toFixed(1) + '" stroke="#4b5563" stroke-width="1.5"/>';
      }
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.25).toFixed(1) + '" fill="#18181b" stroke="#71717a" stroke-width="1.5"/>';
    } else if (style === 'vlight') {
      // 5 split V-spokes
      for (var v = 0; v < 5; v++) {
        var baseDeg = v * 72;
        var r1 = (baseDeg - 12) * Math.PI / 180;
        var r2 = (baseDeg + 12) * Math.PI / 180;
        var vx1 = cx + Math.cos(r1) * (r * 0.86);
        var vy1 = cy + Math.sin(r1) * (r * 0.86);
        var vx2 = cx + Math.cos(r2) * (r * 0.86);
        var vy2 = cy + Math.sin(r2) * (r * 0.86);
        out += '<polygon points="' + cx + ',' + cy + ' ' + vx1.toFixed(1) + ',' + vy1.toFixed(1) + ' ' + vx2.toFixed(1) + ',' + vy2.toFixed(1) + '" fill="#9ca3af" stroke="#ffffff" stroke-width="0.8" opacity="0.9"/>';
      }
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.2).toFixed(1) + '" fill="#09090b" stroke="#ef4444" stroke-width="1.5"/>';
    } else if (style === 'centerlock') {
      // 10-spoke gold mesh centerlock
      for (var c = 0; c < 10; c++) {
        var cDeg = (c * 36 * Math.PI) / 180;
        var cx2 = cx + Math.cos(cDeg) * (r * 0.86);
        var cy2 = cy + Math.sin(cDeg) * (r * 0.86);
        out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx2.toFixed(1) + '" y2="' + cy2.toFixed(1) + '" stroke="#f59e0b" stroke-width="2.5"/>';
      }
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.28).toFixed(1) + '" fill="#78350f" stroke="#fbbf24" stroke-width="2"/>';
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.12).toFixed(1) + '" fill="#dc2626"/>';
    } else {
      // Carbon Monoblock 6-spoke
      for (var m = 0; m < 6; m++) {
        var mDeg = (m * 60 * Math.PI) / 180;
        var mx2 = cx + Math.cos(mDeg) * (r * 0.86);
        var my2 = cy + Math.sin(mDeg) * (r * 0.86);
        out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + mx2.toFixed(1) + '" y2="' + my2.toFixed(1) + '" stroke="#18181b" stroke-width="5" stroke-linecap="round"/>';
        out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + mx2.toFixed(1) + '" y2="' + my2.toFixed(1) + '" stroke="#52525b" stroke-width="1.5"/>';
      }
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.24).toFixed(1) + '" fill="#09090b" stroke="#71717a" stroke-width="2"/>';
    }

    return out;
  }

  function generateCarSvg(presetAngle, color, wheel, caliper) {
    var p = color.primary;
    var s = color.secondary;
    var h = color.highlight;
    var cal = caliper.color;
    var headlightColor = state.matrixLed ? '#22d3ee' : '#ffffff';
    var canardsExtra = state.trackAero;

    var svgDefs = '<defs>' +
      '<linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="' + h + '"/>' +
        '<stop offset="45%" stop-color="' + p + '"/>' +
        '<stop offset="100%" stop-color="' + s + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="canopyGrad" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#0f172a" stop-opacity="0.95"/>' +
        '<stop offset="40%" stop-color="#1e293b" stop-opacity="0.8"/>' +
        '<stop offset="100%" stop-color="#0284c7" stop-opacity="0.35"/>' +
      '</linearGradient>' +
      '<linearGradient id="carbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
        '<stop offset="0%" stop-color="#090a0f"/>' +
        '<stop offset="50%" stop-color="#1e222a"/>' +
        '<stop offset="100%" stop-color="#090a0f"/>' +
      '</linearGradient>' +
      '<filter id="headlightGlow" x="-20%" y="-20%" width="140%" height="140%">' +
        '<feGaussianBlur stdDeviation="5" result="blur"/>' +
        '<feComposite in="SourceGraphic" in2="blur" operator="over"/>' +
      '</filter>' +
    '</defs>';

    if (presetAngle === 0) {
      // ===== 000° FRONT 3/4 PERSPECTIVE =====
      return '<svg viewBox="0 0 840 380" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        svgDefs +
        // Ground Shadow
        '<ellipse cx="430" cy="340" rx="360" ry="24" fill="#000000" opacity="0.85"/>' +
        // Rear Muscular Haunch & Diffuser Fin
        '<path d="M620 220 L740 230 L760 270 L720 290 Z" fill="' + s + '" stroke="#000" stroke-width="2"/>' +
        // Main Hypercar Sculpted Body (Front 3/4)
        '<path d="M110 278 C130 262 170 248 230 240 C280 232 370 222 460 216 C530 212 620 216 710 230 C745 235 770 252 760 278 C750 300 700 310 630 310 L250 310 C180 310 120 295 110 278 Z" fill="url(#bodyGrad)" stroke="#1a1c23" stroke-width="3"/>' +
        // Front Splitter (Carbon)
        '<path d="M90 286 L230 288 L250 314 L80 306 Z" fill="url(#carbonGrad)" stroke="#374151" stroke-width="1.5"/>' +
        (canardsExtra ? '<polygon points="80,270 120,272 135,285 75,282" fill="#111827" stroke="#ef4444" stroke-width="1.5"/>' : '') +
        // Hood Intake Ducts & Contours
        '<path d="M220 245 C280 238 350 232 420 228 L430 246 C360 250 290 258 230 266 Z" fill="' + s + '" opacity="0.6"/>' +
        '<polygon points="270,250 360,242 355,252 265,260" fill="#090a0f"/>' +
        // Sleek Teardrop Cockpit Canopy
        '<path d="M360 222 C390 178 450 152 530 150 C585 148 640 170 670 220 C610 218 450 216 360 222 Z" fill="url(#canopyGrad)" stroke="#38bdf8" stroke-width="1.5"/>' +
        '<path d="M420 190 C470 168 530 162 600 168" stroke="#ffffff" stroke-width="2" opacity="0.5" stroke-linecap="round"/>' +
        // Aggressive LED Matrix Headlight Eyes
        '<polygon points="135,268 200,256 195,265 140,274" fill="' + headlightColor + '" filter="url(#headlightGlow)"/>' +
        '<line x1="130" y1="272" x2="205" y2="258" stroke="' + headlightColor + '" stroke-width="3" stroke-linecap="round" filter="url(#headlightGlow)"/>' +
        // Active Rear Aero Wing Profile
        '<path d="M680 185 L760 175 L770 185 L690 196 Z" fill="url(#carbonGrad)" stroke="#ef4444" stroke-width="1.5"/>' +
        '<line x1="710" y1="190" x2="715" y2="225" stroke="#4b5563" stroke-width="4"/>' +
        // Front Wheel (Angled 3/4)
        '<g transform="translate(0, 0)">' +
          renderWheelSvgGroup(230, 280, 52, wheel.id, cal) +
        '</g>' +
        // Rear Wheel
        '<g transform="translate(0, 0)">' +
          renderWheelSvgGroup(635, 275, 48, wheel.id, cal) +
        '</g>' +
        // Side Sill & Apex Emblem
        '<rect x="290" y="300" width="280" height="10" fill="url(#carbonGrad)"/>' +
        '<text x="430" y="308" fill="#9ca3af" font-size="7" font-family="Orbitron" font-weight="900" text-anchor="middle" letter-spacing="3">APEX ZERO // 1900 HP</text>' +
      '</svg>';
    } else if (presetAngle === 90) {
      // ===== 090° SIDE AERO SILHOUETTE =====
      return '<svg viewBox="0 0 840 340" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        svgDefs +
        // Shadow
        '<ellipse cx="420" cy="305" rx="380" ry="20" fill="#000000" opacity="0.9"/>' +
        // Main Car Silhouette Body
        '<path d="M70 255 C90 250 140 240 180 236 C220 232 280 220 340 175 C390 138 460 134 530 140 C600 148 640 185 680 215 C720 225 760 232 780 240 C790 252 770 270 740 275 L120 275 C85 275 65 265 70 255 Z" fill="url(#bodyGrad)" stroke="#1f2937" stroke-width="2.5"/>' +
        // Cockpit Window Glass
        '<path d="M345 178 C390 144 455 140 520 145 C575 152 615 180 645 212 C540 210 420 205 345 178 Z" fill="url(#canopyGrad)" stroke="#38bdf8" stroke-width="1.5"/>' +
        // Door Side Air Duct Scoop & Flank Strake
        '<path d="M370 218 C430 215 500 210 560 190 L575 245 C510 255 420 255 365 245 Z" fill="' + s + '" stroke="#000000" stroke-width="1.5"/>' +
        '<polygon points="565,195 580,240 560,236 550,200" fill="#090a0f"/>' +
        // Front Carbon Splitter
        '<polygon points="55,268 150,268 140,278 50,278" fill="url(#carbonGrad)" stroke="#4b5563" stroke-width="1"/>' +
        (canardsExtra ? '<polygon points="50,250 85,255 90,264 45,260" fill="#111827" stroke="#ef4444" stroke-width="1.5"/>' : '') +
        // Active High-Downforce Rear Wing Blade & Pylons
        '<polygon points="720,135 810,120 815,132 725,148" fill="url(#carbonGrad)" stroke="#ef4444" stroke-width="2"/>' +
        '<line x1="745" y1="144" x2="735" y2="218" stroke="#6b7280" stroke-width="4"/>' +
        '<line x1="785" y1="130" x2="775" y2="225" stroke="#6b7280" stroke-width="4"/>' +
        // Rear Diffuser Underbody Blades
        '<polygon points="710,274 785,274 795,265 770,258" fill="url(#carbonGrad)"/>' +
        // Front Wheel (Side)
        '<g transform="translate(0, 0)">' +
          renderWheelSvgGroup(210, 255, 52, wheel.id, cal) +
        '</g>' +
        // Rear Wheel (Side)
        '<g transform="translate(0, 0)">' +
          renderWheelSvgGroup(660, 255, 54, wheel.id, cal) +
        '</g>' +
      '</svg>';
    } else if (presetAngle === 180) {
      // ===== 180° REAR DIFFUSER & TAIL =====
      return '<svg viewBox="0 0 840 380" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        svgDefs +
        // Shadow
        '<ellipse cx="420" cy="340" rx="360" ry="22" fill="#000000" opacity="0.9"/>' +
        // Massive Rear Aero Wing (Spanning Full Width)
        '<polygon points="120,95 720,95 730,115 110,115" fill="url(#carbonGrad)" stroke="#ef4444" stroke-width="2.5"/>' +
        '<polygon points="100,80 125,80 120,135 95,135" fill="#ef4444"/>' +
        '<polygon points="715,80 740,80 745,135 720,135" fill="#ef4444"/>' +
        '<line x1="310" y1="115" x2="330" y2="185" stroke="#4b5563" stroke-width="6"/>' +
        '<line x1="530" y1="115" x2="510" y2="185" stroke="#4b5563" stroke-width="6"/>' +
        // Cabin Glass Dome (Rear View)
        '<path d="M290 185 C330 135 510 135 550 185 Z" fill="url(#canopyGrad)" stroke="#38bdf8" stroke-width="1.5"/>' +
        // Broad Muscular Rear Body Fenders
        '<path d="M120 280 C140 240 220 220 280 210 C340 200 500 200 560 210 C620 220 700 240 720 280 C705 315 620 325 540 325 L300 325 C220 325 135 315 120 280 Z" fill="url(#bodyGrad)" stroke="#1a1c23" stroke-width="3"/>' +
        // Continuous Cyber LED Tail Light Blade (Full Width)
        '<path d="M170 238 C280 230 560 230 670 238" stroke="#ef4444" stroke-width="6" stroke-linecap="round" filter="url(#headlightGlow)"/>' +
        '<path d="M185 240 C280 234 560 234 655 240" stroke="#fca5a5" stroke-width="2" stroke-linecap="round"/>' +
        // Apex Emblem
        '<text x="420" y="260" fill="#ffffff" font-size="12" font-family="Orbitron" font-weight="900" text-anchor="middle" letter-spacing="4">APEX ZERO</text>' +
        // Dual Giant Venturi Diffuser Tunnels (Carbon)
        '<rect x="230" y="275" width="380" height="48" rx="6" fill="#090a0f" stroke="#374151" stroke-width="2"/>' +
        // Diffuser Vertical Aero Fins
        '<line x1="280" y1="275" x2="280" y2="323" stroke="#ef4444" stroke-width="3"/>' +
        '<line x1="340" y1="275" x2="340" y2="323" stroke="#4b5563" stroke-width="3"/>' +
        '<line x1="420" y1="275" x2="420" y2="323" stroke="#ef4444" stroke-width="4"/>' +
        '<line x1="500" y1="275" x2="500" y2="323" stroke="#4b5563" stroke-width="3"/>' +
        '<line x1="560" y1="275" x2="560" y2="323" stroke="#ef4444" stroke-width="3"/>' +
        // F1 Rain Fog Light Pulsing Strobe
        '<polygon points="410,290 430,290 425,308 415,308" fill="#ef4444" filter="url(#headlightGlow)"/>' +
        // Rear Wide Tires Peeking Out
        '<rect x="145" y="270" width="45" height="52" rx="4" fill="#18181b" stroke="#27272a" stroke-width="2"/>' +
        '<rect x="650" y="270" width="45" height="52" rx="4" fill="#18181b" stroke="#27272a" stroke-width="2"/>' +
      '</svg>';
    } else {
      // ===== 270° TOP DOWN COCKPIT =====
      return '<svg viewBox="0 0 840 400" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        svgDefs +
        // Shadow
        '<ellipse cx="420" cy="200" rx="350" ry="120" fill="#000000" opacity="0.85"/>' +
        // Front Splitter Wings
        '<polygon points="110,130 180,140 180,260 110,270" fill="url(#carbonGrad)" stroke="#4b5563" stroke-width="1.5"/>' +
        (canardsExtra ? '<polygon points="100,110 140,125 140,140 95,125" fill="#ef4444"/><polygon points="100,290 140,275 140,260 95,275" fill="#ef4444"/>' : '') +
        // Main Car Top Silhouette
        '<path d="M125 190 C130 150 190 140 260 135 C320 130 400 135 480 135 C560 135 640 140 710 150 C740 170 740 230 710 250 C640 260 560 265 480 265 C400 265 320 270 260 265 C190 260 130 250 125 210 Z" fill="url(#bodyGrad)" stroke="#1f2937" stroke-width="3"/>' +
        // Wheel Wells / Fenders Top Outline
        '<rect x="220" y="118" width="80" height="24" rx="4" fill="#0a0a0c" stroke="#374151" stroke-width="1.5"/>' +
        '<rect x="220" y="258" width="80" height="24" rx="4" fill="#0a0a0c" stroke="#374151" stroke-width="1.5"/>' +
        '<rect x="580" y="122" width="90" height="26" rx="4" fill="#0a0a0c" stroke="#374151" stroke-width="1.5"/>' +
        '<rect x="580" y="252" width="90" height="26" rx="4" fill="#0a0a0c" stroke="#374151" stroke-width="1.5"/>' +
        // Panoramic Cockpit Bubble
        '<ellipse cx="410" cy="200" rx="140" ry="46" fill="url(#canopyGrad)" stroke="#38bdf8" stroke-width="1.5"/>' +
        // Central Aerodynamic Spine & Roof Scoop
        '<line x1="330" y1="200" x2="620" y2="200" stroke="#ef4444" stroke-width="3"/>' +
        '<polygon points="450,195 480,192 480,208 450,205" fill="url(#carbonGrad)" stroke="#4b5563"/>' +
        // Rear Cooling Louvers
        '<line x1="520" y1="185" x2="520" y2="215" stroke="#111827" stroke-width="3"/>' +
        '<line x1="540" y1="182" x2="540" y2="218" stroke="#111827" stroke-width="3"/>' +
        '<line x1="560" y1="180" x2="560" y2="220" stroke="#111827" stroke-width="3"/>' +
        // Wide Carbon Rear Wing (Top View)
        '<rect x="680" y="105" width="28" height="190" rx="3" fill="url(#carbonGrad)" stroke="#ef4444" stroke-width="2"/>' +
      '</svg>';
    }
  }

  function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.add('visible');
    clearTimeout(dom.toastTimer);
    dom.toastTimer = setTimeout(function () {
      dom.toast.classList.remove('visible');
    }, 3800);
  }

  function updateVisualizer() {
    var color = getActiveColor();
    var wheel = getActiveWheel();
    var caliper = getActiveCaliper();
    var preset = getClosestAnglePreset(state.angle);

    // Update Ground Glow
    if (dom.groundGlow) {
      dom.groundGlow.style.background = color.glow;
    }

    // Render SVG
    if (dom.carStage) {
      dom.carStage.innerHTML = generateCarSvg(preset, color, wheel, caliper);
    }

    // Update Telemetry Header Readouts
    if (dom.angleDisplay) {
      for (var a = 0; a < ANGLES.length; a++) {
        if (ANGLES[a].deg === preset) {
          dom.angleDisplay.textContent = ANGLES[a].label;
          break;
        }
      }
    }
    if (dom.colorDisplay) dom.colorDisplay.textContent = color.name.toUpperCase();
    if (dom.wheelDisplay) dom.wheelDisplay.textContent = wheel.name.toUpperCase();

    var total = calculateTotal();
    if (dom.priceDisplay) dom.priceDisplay.textContent = formatCurrency(total);

    // Update Angle Preset Buttons
    var presetBtns = document.querySelectorAll('.cfg-preset-btn');
    presetBtns.forEach(function (btn) {
      var bDeg = Number(btn.getAttribute('data-angle'));
      var isAct = bDeg === preset;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    // Update Azimuth Slider Readout
    if (dom.sliderDeg) dom.sliderDeg.textContent = state.angle + '°';
    if (dom.slider && Number(dom.slider.value) !== state.angle) {
      dom.slider.value = state.angle;
    }

    // Update Paint Details
    if (dom.paintCode) dom.paintCode.textContent = color.code;
    if (dom.paintTech) dom.paintTech.textContent = color.tech;
    if (dom.paintCost) dom.paintCost.textContent = color.price === 0 ? 'Standard (Included)' : color.priceLabel;

    // Update Swatch Active Rings
    var swatchBtns = document.querySelectorAll('.cfg-swatch-btn');
    swatchBtns.forEach(function (btn) {
      var isAct = btn.getAttribute('data-color') === state.color;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-checked', isAct ? 'true' : 'false');
    });

    // Update Wheel Cards
    if (dom.wheelCode) dom.wheelCode.textContent = wheel.code;
    var wheelCards = document.querySelectorAll('.cfg-wheel-card');
    wheelCards.forEach(function (card) {
      var isAct = card.getAttribute('data-wheel') === state.wheel;
      card.classList.toggle('active', isAct);
      card.setAttribute('aria-checked', isAct ? 'true' : 'false');
    });

    // Update Caliper Swatches
    if (dom.caliperCode) dom.caliperCode.textContent = 'BRK-0' + (CALIPERS.findIndex(function(c){return c.id===state.caliper;}) + 1) + ' // ' + caliper.name.toUpperCase();
    var calBtns = document.querySelectorAll('.cfg-caliper-btn');
    calBtns.forEach(function (btn) {
      var isAct = btn.getAttribute('data-caliper') === state.caliper;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-checked', isAct ? 'true' : 'false');
    });

    // Update Summary Specs Text
    if (dom.summaryText) {
      var specs = [
        color.name,
        wheel.name,
        caliper.name + ' Calipers'
      ];
      if (state.trackAero) specs.push('Track Aero Pack');
      if (state.matrixLed) specs.push('Cyber Matrix LED');
      dom.summaryText.textContent = specs.join(' • ');
    }

    // Persist
    saveState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable or blocked
    }
  }

  function loadState() {
    // 1. Try URL Hash or Query params
    try {
      var hash = window.location.hash || '';
      var params = new URLSearchParams(window.location.search);
      var cParam = params.get('color') || (hash.match(/color=([a-z0-9_-]+)/i) ? RegExp.$1 : null);
      var wParam = params.get('wheel') || (hash.match(/wheel=([a-z0-9_-]+)/i) ? RegExp.$1 : null);
      if (cParam && COLORS.some(function(c){ return c.id === cParam; })) state.color = cParam;
      if (wParam && WHEELS.some(function(w){ return w.id === wParam; })) state.wheel = wParam;
    } catch {
      // ignore
    }

    // 2. Try LocalStorage
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.color && COLORS.some(function(c){ return c.id === parsed.color; })) state.color = parsed.color;
        if (parsed.wheel && WHEELS.some(function(w){ return w.id === parsed.wheel; })) state.wheel = parsed.wheel;
        if (parsed.caliper && CALIPERS.some(function(cl){ return cl.id === parsed.caliper; })) state.caliper = parsed.caliper;
        if (typeof parsed.angle === 'number') state.angle = parsed.angle;
        if (typeof parsed.trackAero === 'boolean') state.trackAero = parsed.trackAero;
        if (typeof parsed.matrixLed === 'boolean') state.matrixLed = parsed.matrixLed;
      }
    } catch {
      // ignore
    }
  }

  function buildSwatches() {
    if (!dom.paintSwatches) return;
    dom.paintSwatches.innerHTML = '';
    COLORS.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cfg-swatch-btn' + (c.id === state.color ? ' active' : '');
      btn.setAttribute('data-color', c.id);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', c.id === state.color ? 'true' : 'false');
      btn.setAttribute('aria-label', c.name + ' (' + c.priceLabel + ')');

      var circle = document.createElement('span');
      circle.className = 'cfg-swatch-circle';
      circle.style.background = c.swatchGrad;
      circle.style.color = c.primary;

      var name = document.createElement('span');
      name.className = 'cfg-swatch-name';
      name.textContent = c.name;

      var cost = document.createElement('span');
      cost.className = 'cfg-swatch-cost';
      cost.textContent = c.priceLabel;

      btn.appendChild(circle);
      btn.appendChild(name);
      btn.appendChild(cost);

      btn.addEventListener('click', function () {
        state.color = c.id;
        updateVisualizer();
        showToast('Colorway applied: ' + c.name + ' (' + c.priceLabel + ')');
      });

      dom.paintSwatches.appendChild(btn);
    });
  }

  function buildWheels() {
    if (!dom.wheelOptions) return;
    dom.wheelOptions.innerHTML = '';
    WHEELS.forEach(function (w) {
      var card = document.createElement('div');
      card.className = 'cfg-wheel-card' + (w.id === state.wheel ? ' active' : '');
      card.setAttribute('data-wheel', w.id);
      card.setAttribute('role', 'radio');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-checked', w.id === state.wheel ? 'true' : 'false');

      var info = document.createElement('div');
      info.className = 'cfg-wheel-info';

      var name = document.createElement('span');
      name.className = 'cfg-wheel-name';
      name.textContent = w.name;

      var spec = document.createElement('span');
      spec.className = 'cfg-wheel-spec';
      spec.textContent = w.spec;

      info.appendChild(name);
      info.appendChild(spec);

      var price = document.createElement('span');
      price.className = 'cfg-wheel-price';
      price.textContent = w.priceLabel;

      card.appendChild(info);
      card.appendChild(price);

      function select() {
        state.wheel = w.id;
        updateVisualizer();
        showToast('Wheel architecture selected: ' + w.name);
      }

      card.addEventListener('click', select);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });

      dom.wheelOptions.appendChild(card);
    });
  }

  function buildCalipers() {
    if (!dom.caliperSwatches) return;
    dom.caliperSwatches.innerHTML = '';
    CALIPERS.forEach(function (cal) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cfg-caliper-btn' + (cal.id === state.caliper ? ' active' : '');
      btn.setAttribute('data-caliper', cal.id);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', cal.id === state.caliper ? 'true' : 'false');
      btn.setAttribute('aria-label', cal.name);

      var dot = document.createElement('span');
      dot.className = 'cfg-caliper-dot';
      dot.style.backgroundColor = cal.color;

      var label = document.createElement('span');
      label.className = 'cfg-caliper-label';
      label.textContent = cal.name;

      btn.appendChild(dot);
      btn.appendChild(label);

      btn.addEventListener('click', function () {
        state.caliper = cal.id;
        updateVisualizer();
        showToast('Brembo Calipers: ' + cal.name);
      });

      dom.caliperSwatches.appendChild(btn);
    });
  }

  function init() {
    dom.carStage = document.getElementById('cfg-car-stage');
    if (!dom.carStage) return;

    dom.angleDisplay = document.getElementById('cfg-angle-display');
    dom.colorDisplay = document.getElementById('cfg-color-display');
    dom.wheelDisplay = document.getElementById('cfg-wheel-display');
    dom.priceDisplay = document.getElementById('cfg-price-display');
    dom.groundGlow = document.getElementById('cfg-ground-glow');
    dom.slider = document.getElementById('cfg-azimuth-slider');
    dom.sliderDeg = document.getElementById('cfg-slider-deg');
    dom.paintSwatches = document.getElementById('cfg-paint-swatches');
    dom.paintCode = document.getElementById('cfg-paint-code');
    dom.paintTech = document.getElementById('cfg-paint-tech');
    dom.paintCost = document.getElementById('cfg-paint-cost');
    dom.wheelOptions = document.getElementById('cfg-wheel-options');
    dom.wheelCode = document.getElementById('cfg-wheel-code');
    dom.caliperSwatches = document.getElementById('cfg-caliper-swatches');
    dom.caliperCode = document.getElementById('cfg-caliper-code');
    dom.toggleAero = document.getElementById('cfg-toggle-aero');
    dom.toggleMatrix = document.getElementById('cfg-toggle-matrix');
    dom.summaryText = document.getElementById('cfg-summary-text');
    dom.resetBtn = document.getElementById('cfg-reset-btn');
    dom.shareBtn = document.getElementById('cfg-share-btn');
    dom.saveBtn = document.getElementById('cfg-save-btn');
    dom.toast = document.getElementById('cfg-toast');

    loadState();
    buildSwatches();
    buildWheels();
    buildCalipers();

    // Toggle Checkboxes
    if (dom.toggleAero) {
      dom.toggleAero.checked = state.trackAero;
      dom.toggleAero.addEventListener('change', function () {
        state.trackAero = dom.toggleAero.checked;
        updateVisualizer();
        showToast(state.trackAero ? 'Track Aero Pack installed (+$18,000)' : 'Standard Aerodynamics restored');
      });
    }

    if (dom.toggleMatrix) {
      dom.toggleMatrix.checked = state.matrixLed;
      dom.toggleMatrix.addEventListener('change', function () {
        state.matrixLed = dom.toggleMatrix.checked;
        updateVisualizer();
        showToast(state.matrixLed ? 'Cyber Laser Matrix active' : 'Standard LED projectors');
      });
    }

    // Angle Presets
    var presetBtns = document.querySelectorAll('.cfg-preset-btn');
    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var deg = Number(btn.getAttribute('data-angle'));
        state.angle = deg;
        if (dom.slider) dom.slider.value = deg;
        updateVisualizer();
      });
    });

    // Azimuth Range Slider
    if (dom.slider) {
      dom.slider.addEventListener('input', function () {
        state.angle = Number(dom.slider.value);
        updateVisualizer();
      });
    }

    // Reset Button
    if (dom.resetBtn) {
      dom.resetBtn.addEventListener('click', function () {
        state.color = 'stealth';
        state.wheel = 'aero';
        state.caliper = 'crimson';
        state.angle = 0;
        state.trackAero = false;
        state.matrixLed = true;
        if (dom.toggleAero) dom.toggleAero.checked = false;
        if (dom.toggleMatrix) dom.toggleMatrix.checked = true;
        updateVisualizer();
        showToast('Factory specification restored.');
      });
    }

    // Share / Copy Link Button
    if (dom.shareBtn) {
      dom.shareBtn.addEventListener('click', function () {
        var url = window.location.origin + window.location.pathname + '#color=' + state.color + '&wheel=' + state.wheel + '&angle=' + state.angle;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            showToast('✓ Bespoke build URL copied to clipboard!');
          }).catch(function () {
            showToast('Build URL: ' + url);
          });
        } else {
          showToast('Build URL: ' + url);
        }
      });
    }

    // Lock In Allocation Button
    if (dom.saveBtn) {
      dom.saveBtn.addEventListener('click', function () {
        var total = calculateTotal();
        var allocId = 'APEX-' + Math.floor(1000 + Math.random() * 9000);
        showToast('Allocation ' + allocId + ' Confirmed! Total: ' + formatCurrency(total));
      });
    }

    updateVisualizer();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
/* ===== 360° Vehicle Colorway & Wheel Configurator (issue #51) END ===== */


/* ===== Launch Control 0-60 Acceleration Simulation & Live G-Meter (Issue #177) START ===== */
(function () {
  'use strict';

  function initLaunchControl() {
    var section = document.getElementById('launch-control');
    if (!section) return;

    // DOM Elements
    var launchBtn = document.getElementById('lcLaunchBtn');
    var resetBtn = document.getElementById('lcResetBtn');
    var speedEl = document.getElementById('lcCurrentSpeed');
    var rpmEl = document.getElementById('lcRpmReadout');
    var speedArc = document.getElementById('speedoActiveArc');
    var kwOutputEl = document.getElementById('lcKwOutput');
    var peakMphEl = document.getElementById('lcPeakMph');
    var gPuck = document.getElementById('lcGPuck');
    var gPuckTrail = document.getElementById('lcGPuckTrail');
    var primaryGEl = document.getElementById('lcPrimaryG');
    var latGEl = document.getElementById('lcLatG');
    var maxGEl = document.getElementById('lcMaxG');
    var aeroDownEl = document.getElementById('lcAeroDown');
    var timerDigits = document.getElementById('lcStopwatchDigits');
    var splitsBar = document.getElementById('lcSplitsProgressBar');
    var consoleFeedback = document.getElementById('lcConsoleFeedback');
    var stageLights = {
      amber1: document.getElementById('stageAmber1'),
      amber2: document.getElementById('stageAmber2'),
      amber3: document.getElementById('stageAmber3'),
      green: document.getElementById('stageGreen')
    };
    var msItems = {
      ms30: { el: document.getElementById('ms0to30'), valEl: document.getElementById('msVal0to30'), targetMph: 30, recorded: false },
      ms60: { el: document.getElementById('ms0to60'), valEl: document.getElementById('msVal0to60'), targetMph: 60, recorded: false },
      ms100: { el: document.getElementById('ms0to100'), valEl: document.getElementById('msVal0to100'), targetMph: 100, recorded: false }
    };

    // Physics parameters for 1,900 HP Apex Zero All-Wheel-Drive Hypercar
    var TARGET_TIME_60 = 1.74; // seconds to reach 60 mph
    var MAX_SPEED = 120.0;     // simulation run top speed
    var ARC_CIRCUMFERENCE = 430; // stroke-dasharray

    var state = {
      phase: 'standby', // 'standby', 'staging', 'launching', 'completed'
      startTime: 0,
      elapsed: 0,
      currentSpeed: 0,
      peakSpeed: 0,
      currentG: 0,
      maxG: 0,
      currentLatG: 0,
      animId: null
    };

    function setConsole(msg) {
      if (consoleFeedback) consoleFeedback.textContent = msg;
    }

    function resetSimulation() {
      if (state.animId) cancelAnimationFrame(state.animId);
      state.phase = 'standby';
      state.elapsed = 0;
      state.currentSpeed = 0;
      state.peakSpeed = 0;
      state.currentG = 0;
      state.maxG = 0;
      state.currentLatG = 0;

      // Reset DOM displays
      if (speedEl) speedEl.textContent = '0';
      if (rpmEl) rpmEl.textContent = '0 RPM • 1ST GEAR';
      if (speedArc) speedArc.style.strokeDashoffset = ARC_CIRCUMFERENCE;
      if (kwOutputEl) kwOutputEl.textContent = '0 kW (0 HP)';
      if (peakMphEl) peakMphEl.textContent = '0.0 MPH';
      if (primaryGEl) primaryGEl.textContent = '0.00 G';
      if (latGEl) latGEl.textContent = '0.00 G';
      if (maxGEl) maxGEl.textContent = '0.00 G';
      if (aeroDownEl) aeroDownEl.textContent = '+480 kg';
      if (timerDigits) timerDigits.innerHTML = '0.000<span class="stopwatch-sec">s</span>';
      if (splitsBar) splitsBar.style.width = '0%';

      // Reset G-puck position to origin (120, 120)
      if (gPuck) { gPuck.setAttribute('cx', '120'); gPuck.setAttribute('cy', '120'); }
      if (gPuckTrail) { gPuckTrail.setAttribute('cx', '120'); gPuckTrail.setAttribute('cy', '120'); }

      // Reset staging lights
      Object.keys(stageLights).forEach(function (k) {
        if (stageLights[k]) stageLights[k].classList.remove('active');
      });

      // Reset milestones
      Object.keys(msItems).forEach(function (k) {
        msItems[k].recorded = false;
        if (msItems[k].el) msItems[k].el.classList.remove('achieved');
        if (msItems[k].valEl) msItems[k].valEl.textContent = '-- s';
      });

      if (launchBtn) {
        launchBtn.classList.remove('is-active');
        launchBtn.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-text">LAUNCH HYPERCAR</span>';
      }

      setConsole('[LAUNCH CONTROL ARMED]: Press Launch Hypercar to initiate staging sequence.');
    }

    function startLaunchSequence() {
      if (state.phase !== 'standby') return;
      state.phase = 'staging';

      if (launchBtn) {
        launchBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">STAGING BOOST...</span>';
      }

      setConsole('[STAGING TREE]: Pre-stage armed. Inverter capacitance charging...');
      if (stageLights.amber1) stageLights.amber1.classList.add('active');

      setTimeout(function () {
        if (state.phase !== 'staging') return;
        setConsole('[STAGING TREE]: Full Stage lock. Quad-rotor motor pre-torque 1,400 Nm.');
        if (stageLights.amber2) stageLights.amber2.classList.add('active');
      }, 350);

      setTimeout(function () {
        if (state.phase !== 'staging') return;
        setConsole('[STAGING TREE]: Maximum inverter voltage primed. 1,900 HP boost ready!');
        if (stageLights.amber3) stageLights.amber3.classList.add('active');
      }, 700);

      setTimeout(function () {
        if (state.phase !== 'staging') return;
        if (stageLights.green) stageLights.green.classList.add('active');
        setConsole('[LAUNCH INITIATED]: MAXIMUM ACCELERATION! ALL-WHEEL VECTOR ACTIVE.');
        if (launchBtn) {
          launchBtn.classList.add('is-active');
          launchBtn.innerHTML = '<span class="btn-icon">🚀</span><span class="btn-text">ACCELERATING...</span>';
        }
        beginAccelerationPhysics();
      }, 1050);
    }

    function beginAccelerationPhysics() {
      state.phase = 'launching';
      state.startTime = performance.now();

      function frame(now) {
        var elapsed = (now - state.startTime) / 1000;
        state.elapsed = elapsed;

        // Acceleration curve:
        // Apex Zero hits 60 mph in 1.74s (v(t) = 60 * (t/1.74)^0.82)
        var speed = 0;
        if (elapsed <= TARGET_TIME_60) {
          speed = 60.0 * Math.pow(elapsed / TARGET_TIME_60, 0.82);
        } else {
          // Continues pulling to ~105 mph up to ~3.2 seconds
          var postT = elapsed - TARGET_TIME_60;
          speed = 60.0 + 45.0 * (1 - Math.exp(-postT / 1.1));
        }

        if (speed > MAX_SPEED) speed = MAX_SPEED;
        state.currentSpeed = speed;
        if (speed > state.peakSpeed) state.peakSpeed = speed;

        // Longitudinal G-force:
        // Derivative of velocity: peak of ~1.82 G at launch tapering to 1.15 G at 60 mph
        var gForce = 0;
        if (elapsed < 0.25) {
          gForce = 0.5 + (elapsed / 0.25) * 1.32; // rapid bite
        } else if (elapsed <= TARGET_TIME_60) {
          gForce = 1.82 - (elapsed / TARGET_TIME_60) * 0.65;
        } else {
          gForce = Math.max(0.4, 1.17 - (elapsed - TARGET_TIME_60) * 0.45);
        }

        // Slight micro dynamic lateral ripple simulating quad-motor vectoring
        var latG = (Math.sin(elapsed * 18.0) * 0.08) * (speed / 60.0);
        state.currentG = gForce;
        if (gForce > state.maxG) state.maxG = gForce;
        state.currentLatG = latG;

        // Update DOM
        if (speedEl) speedEl.textContent = Math.floor(speed);

        // RPM calculation (Direct drive electric trans, ~0-18,000 RPM)
        var rpm = Math.floor((speed / MAX_SPEED) * 18500);
        if (rpmEl) rpmEl.textContent = rpm.toLocaleString() + ' RPM • ' + (speed > 55 ? 'DIRECT DRIVE' : '1ST GEAR');

        // Speedometer SVG arc
        var fraction = Math.min(1.0, speed / 120.0);
        if (speedArc) speedArc.style.strokeDashoffset = ARC_CIRCUMFERENCE * (1 - fraction);

        // Power output calculation (up to 1,417 kW / 1,900 HP)
        var kw = Math.floor(fraction * 1417);
        var hp = Math.floor(kw * 1.341);
        if (kwOutputEl) kwOutputEl.textContent = kw + ' kW (' + hp + ' HP)';
        if (peakMphEl) peakMphEl.textContent = state.peakSpeed.toFixed(1) + ' MPH';

        // G-Meter SVG Puck Position
        // Center is (120, 120). 1.0G = 35px offset. Accel pushes puck UP (decrease Y)
        var puckY = Math.max(25, 120 - gForce * 42);
        var puckX = Math.min(215, Math.max(25, 120 + latG * 120));
        if (gPuck) {
          gPuck.setAttribute('cx', puckX.toFixed(1));
          gPuck.setAttribute('cy', puckY.toFixed(1));
        }
        if (gPuckTrail) {
          gPuckTrail.setAttribute('cx', puckX.toFixed(1));
          gPuckTrail.setAttribute('cy', puckY.toFixed(1));
        }

        if (primaryGEl) primaryGEl.textContent = gForce.toFixed(2) + ' G';
        if (latGEl) latGEl.textContent = (latG >= 0 ? '+' : '') + latG.toFixed(2) + ' G';
        if (maxGEl) maxGEl.textContent = state.maxG.toFixed(2) + ' G';

        // Downforce increases with square of speed
        var downforce = Math.floor(480 + Math.pow(speed / 60, 2) * 320);
        if (aeroDownEl) aeroDownEl.textContent = '+' + downforce + ' kg';

        // Stopwatch digits
        if (timerDigits) {
          timerDigits.innerHTML = elapsed.toFixed(3) + '<span class="stopwatch-sec">s</span>';
        }

        // Progress bar (scaled relative to 60 mph target)
        var pFraction = Math.min(100, (speed / 60.0) * 100);
        if (splitsBar) splitsBar.style.width = pFraction.toFixed(1) + '%';

        // Milestone triggers
        Object.keys(msItems).forEach(function (k) {
          var item = msItems[k];
          if (!item.recorded && speed >= item.targetMph) {
            item.recorded = true;
            if (item.el) item.el.classList.add('achieved');
            if (item.valEl) item.valEl.textContent = elapsed.toFixed(3) + ' s';
          }
        });

        // Completion condition (~3.0 seconds after 100+ mph run)
        if (elapsed >= 3.0) {
          state.phase = 'completed';
          setConsole('🏆 [SIMULATION COMPLETED]: 0–60 MPH officially clocked in ' + (msItems.ms60.valEl ? msItems.ms60.valEl.textContent : '1.74s') + ' with peak ' + state.maxG.toFixed(2) + ' G!');
          if (launchBtn) {
            launchBtn.classList.remove('is-active');
            launchBtn.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-text">RE-LAUNCH HYPERCAR</span>';
          }
          return;
        }

        state.animId = requestAnimationFrame(frame);
      }

      state.animId = requestAnimationFrame(frame);
    }

    if (launchBtn) {
      launchBtn.addEventListener('click', function () {
        if (state.phase === 'standby') {
          startLaunchSequence();
        } else if (state.phase === 'completed') {
          resetSimulation();
          setTimeout(startLaunchSequence, 100);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetSimulation();
      });
    }

    resetSimulation();
  }

  document.addEventListener('DOMContentLoaded', initLaunchControl);
})();
/* ===== Launch Control 0-60 Acceleration Simulation & Live G-Meter (Issue #177) END ===== */
