function openDonateModal() {
  alert('TerraInitia Reforestation Donation Modal Triggered!');
}

/* ---------- Carbon footprint calculator ---------- */

// Emission factors, kg CO2e per unit. Rounded; sources are listed under the calculator.
var CARBON_FACTORS = {
  carPerKm: 0.17,          // average passenger car, UK DEFRA conversion factors
  transitPerKm: 0.07,      // blended bus/rail per passenger-km, UK DEFRA
  flightPerHour: 100,      // kg per passenger flight hour, approx. economy average (DEFRA)
  electricityPerKwh: 0.44, // world average grid intensity, IEA
  gasPerKwh: 0.18,         // natural gas, UK DEFRA
  weeksPerYear: 52,
  monthsPerYear: 12
};

// Tonnes CO2e per person per year by diet (Scarborough et al. 2014, kg/day x 365).
var DIET_TONNES = {
  vegan: 1.05,
  vegetarian: 1.39,
  pescatarian: 1.43,
  lowMeat: 1.7,
  mediumMeat: 2.05,
  highMeat: 2.62
};

var DIET_LABELS = {
  vegan: 'vegan', vegetarian: 'vegetarian', pescatarian: 'pescatarian',
  lowMeat: 'low meat', mediumMeat: 'medium meat', highMeat: 'high meat'
};

// Per-capita tonnes CO2 per year (Global Carbon Project, approx.). The target is the
// commonly cited ~2.3 t/person by 2030 for a 1.5C pathway.
var BENCHMARKS = [
  { key: 'target', label: 'Paris-aligned 2030 target', tonnes: 2.3 },
  { key: 'world', label: 'World average', tonnes: 4.7 },
  { key: 'eu', label: 'EU average', tonnes: 6.0 },
  { key: 'us', label: 'US average', tonnes: 14.0 }
];

var OFFSET_USD_PER_TONNE = 20; // assumption
var KG_PER_TREE_YEAR = 22;     // assumption, mature tree absorption

var INPUT_LIMITS = {
  carKm: [0, 5000],
  transitKm: [0, 5000],
  flightHours: [0, 1000],
  electricityKwh: [0, 10000],
  gasKwh: [0, 20000],
  household: [1, 20]
};

function validateCarbonInputs(raw) {
  var errors = [];
  var clean = {};
  Object.keys(INPUT_LIMITS).forEach(function (k) {
    var v = raw[k];
    var n = (typeof v === 'string' && v.trim() === '') ? NaN : Number(v);
    var lim = INPUT_LIMITS[k];
    if (v === null || v === undefined || !isFinite(n)) {
      errors.push(k + ' must be a number');
    } else if (n < lim[0] || n > lim[1]) {
      errors.push(k + ' must be between ' + lim[0] + ' and ' + lim[1]);
    } else if (k === 'household' && Math.floor(n) !== n) {
      errors.push('household must be a whole number');
    } else {
      clean[k] = n;
    }
  });
  if (!Object.prototype.hasOwnProperty.call(DIET_TONNES, raw.diet)) {
    errors.push('diet must be one of: ' + Object.keys(DIET_TONNES).join(', '));
  } else {
    clean.diet = raw.diet;
  }
  return { ok: errors.length === 0, errors: errors, values: clean };
}

function round2(n) { return Math.round(n * 100) / 100; }

// Returns tonnes CO2e per person per year. Home energy is split across the household.
function calculateFootprint(input) {
  var f = CARBON_FACTORS;
  var breakdown = {
    car: input.carKm * f.weeksPerYear * f.carPerKm / 1000,
    transit: input.transitKm * f.weeksPerYear * f.transitPerKm / 1000,
    flights: input.flightHours * f.flightPerHour / 1000,
    diet: DIET_TONNES[input.diet],
    electricity: input.electricityKwh * f.monthsPerYear * f.electricityPerKwh / 1000 / input.household,
    gas: input.gasKwh * f.monthsPerYear * f.gasPerKwh / 1000 / input.household
  };
  var total = 0;
  Object.keys(breakdown).forEach(function (k) { total += breakdown[k]; });
  Object.keys(breakdown).forEach(function (k) { breakdown[k] = round2(breakdown[k]); });
  return { total: round2(total), breakdown: breakdown };
}

// Suggestions with estimated tonnes saved per year, highest impact first.
function getReductionSuggestions(input) {
  var f = CARBON_FACTORS;
  var out = [];
  function add(id, text, saved) {
    saved = round2(saved);
    if (saved > 0) out.push({ id: id, text: text, savedTonnes: saved });
  }
  var shiftKm = input.carKm / 2;
  add('car-to-transit',
    'Replace half of your car kilometres (' + Math.round(shiftKm) + ' km/week) with public transit, cycling or walking.',
    shiftKm * f.weeksPerYear * (f.carPerKm - f.transitPerKm) / 1000);
  add('fly-less',
    'Take 25% fewer flight hours (about ' + Math.round(input.flightHours * 0.25 * 10) / 10 + ' h/year) by choosing rail or video calls.',
    input.flightHours * 0.25 * f.flightPerHour / 1000);
  var order = ['highMeat', 'mediumMeat', 'lowMeat', 'vegetarian', 'vegan'];
  var i = order.indexOf(input.diet);
  if (input.diet === 'pescatarian') {
    add('diet', 'Move from a pescatarian to a vegetarian diet.', DIET_TONNES.pescatarian - DIET_TONNES.vegetarian);
  } else if (i >= 0 && i < order.length - 1) {
    var next = order[i + 1];
    add('diet', 'Shift your diet from ' + DIET_LABELS[input.diet] + ' to ' + DIET_LABELS[next] + '.',
      DIET_TONNES[input.diet] - DIET_TONNES[next]);
  }
  add('electricity',
    'Cut electricity use by 20% with efficient appliances and LEDs, or switch to a renewable tariff.',
    input.electricityKwh * 0.2 * f.monthsPerYear * f.electricityPerKwh / 1000 / input.household);
  add('gas',
    'Lower gas use by 15% with better insulation and a thermostat 1-2 degrees lower.',
    input.gasKwh * 0.15 * f.monthsPerYear * f.gasPerKwh / 1000 / input.household);
  out.sort(function (a, b) { return b.savedTonnes - a.savedTonnes; });
  return out;
}

function getOffsetEstimate(totalTonnes) {
  return {
    usd: Math.round(totalTonnes * OFFSET_USD_PER_TONNE * 100) / 100,
    trees: Math.ceil(totalTonnes * 1000 / KG_PER_TREE_YEAR)
  };
}

function compareToBenchmarks(totalTonnes) {
  return BENCHMARKS.map(function (b) {
    return {
      key: b.key, label: b.label, tonnes: b.tonnes,
      diffPercent: Math.round((totalTonnes - b.tonnes) / b.tonnes * 100)
    };
  });
}

var CarbonCalc = {
  calculateFootprint: calculateFootprint,
  validateCarbonInputs: validateCarbonInputs,
  getReductionSuggestions: getReductionSuggestions,
  getOffsetEstimate: getOffsetEstimate,
  compareToBenchmarks: compareToBenchmarks,
  FACTORS: CARBON_FACTORS
};

/* ---------- UI wiring ---------- */
(function () {
  if (typeof document === 'undefined') return;
  var form = document.getElementById('carbon-form');
  if (!form) return;

  var LABELS = { car: 'Car', transit: 'Transit', flights: 'Flights', diet: 'Diet', electricity: 'Electricity', gas: 'Gas' };
  var ICONS = { car: '🚗', transit: '🚌', flights: '✈️', diet: '🥗', electricity: '💡', gas: '🔥' };

  ['carKm', 'transitKm', 'flightHours', 'electricityKwh', 'gasKwh'].forEach(function (id) {
    var el = document.getElementById(id);
    var out = document.getElementById(id + '-out');
    el.addEventListener('input', function () { out.textContent = el.value; });
  });

  function readInputs() {
    var data = {};
    ['carKm', 'transitKm', 'flightHours', 'electricityKwh', 'gasKwh', 'household', 'diet'].forEach(function (id) {
      data[id] = document.getElementById(id).value;
    });
    return data;
  }

  function addRow(list, left, right) {
    var li = document.createElement('li');
    var a = document.createElement('span');
    var b = document.createElement('strong');
    a.textContent = left;
    b.textContent = right;
    li.appendChild(a);
    li.appendChild(b);
    list.appendChild(li);
  }

  var lastTotal = 0;

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var errBox = document.getElementById('form-error');
    var res = validateCarbonInputs(readInputs());
    if (!res.ok) {
      errBox.textContent = 'Please fix: ' + res.errors.join('; ') + '.';
      errBox.hidden = false;
      return;
    }
    errBox.hidden = true;
    var r = calculateFootprint(res.values);
    lastTotal = r.total;
    document.getElementById('results').hidden = false;
    document.getElementById('total-t').textContent = r.total.toFixed(1);

    // Gauge scale tops out at 16 t; colour reflects the benchmarks.
    var fill = document.getElementById('gauge-fill');
    fill.style.setProperty('--pct', Math.min(100, r.total / 16 * 100) + '%');
    fill.className = 'gauge-fill ' + (r.total <= 2.3 ? 'good' : r.total <= 4.7 ? 'ok' : 'high');
    document.getElementById('gauge').setAttribute('aria-label', 'Footprint ' + r.total.toFixed(1) + ' tonnes CO2e per year');

    var bd = document.getElementById('breakdown');
    bd.textContent = '';
    Object.keys(r.breakdown).forEach(function (k) {
      addRow(bd, ICONS[k] + ' ' + LABELS[k], r.breakdown[k].toFixed(2) + ' t');
    });

    var bench = document.getElementById('bench');
    bench.textContent = '';
    compareToBenchmarks(r.total).forEach(function (b) {
      var d = b.diffPercent === 0 ? 'about equal' : Math.abs(b.diffPercent) + '% ' + (b.diffPercent > 0 ? 'above' : 'below');
      addRow(bench, b.label + ' (' + b.tonnes + ' t)', d);
    });

    var tips = document.getElementById('tips');
    tips.textContent = '';
    var suggestions = getReductionSuggestions(res.values);
    if (suggestions.length === 0) {
      addRow(tips, 'No major reductions left to suggest. Great work.', '');
    }
    suggestions.forEach(function (s) {
      addRow(tips, s.text, 'Saves ~' + s.savedTonnes.toFixed(2) + ' t/year');
    });

    var off = getOffsetEstimate(r.total);
    document.getElementById('offset-cost').textContent = '$' + off.usd.toFixed(2);
    document.getElementById('offset-trees').textContent = off.trees;
    document.getElementById('offset-msg').hidden = true;
  });

  document.getElementById('offset-btn').addEventListener('click', function () {
    var off = getOffsetEstimate(lastTotal);
    var msg = document.getElementById('offset-msg');
    msg.textContent = 'Thank you! A $' + off.usd.toFixed(2) + ' contribution would fund about ' + off.trees +
      ' trees. Online checkout is not connected in this demo.';
    msg.hidden = false;
  });
})();

// Animate the existing displayed milestone once; keep its accessible name stable.
(() => {
  if (typeof document === 'undefined') return;
  const counter = document.querySelector('[data-impact-counter]');
  if (!counter || !window.requestAnimationFrame) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (reducedMotion?.matches) return;
  const target = Number(counter.dataset.impactCounter);
  if (!Number.isFinite(target) || target < 0) return;
  const finalText = counter.textContent;
  let start;
  let frame;
  let finished = false;
  const finish = () => {
    finished = true;
    cancelAnimationFrame(frame);
    counter.textContent = finalText;
    reducedMotion?.removeEventListener?.('change', onMotionChange);
  };
  const onMotionChange = event => { if (event.matches) finish(); };
  reducedMotion?.addEventListener?.('change', onMotionChange);
  const tick = now => {
    if (finished) return;
    start ??= now;
    const progress = Math.min(1, Math.max(0, (now - start) / 1500));
    counter.textContent = Math.floor(target * progress).toLocaleString('en-US') + '+';
    if (progress < 1) frame = requestAnimationFrame(tick);
    else finish();
  };
  frame = requestAnimationFrame(tick);
})();
