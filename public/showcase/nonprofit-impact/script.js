/**
 * TerraInitia — Global Reforestation & Ocean Climate Alliance
 * Feature: Global Conservation Project Directory (Issue #104)
 * Includes: Biome Filtering, Animated Project Statistics, and Native Species Catalog Modal
 */

function openDonateModal() {
  alert('Donation checkout is not connected in this demo.');
}
if (typeof window !== 'undefined') {
  window.openDonateModal = openDonateModal;
}

/*Volunteer signup modal */
(function () {
  if (typeof document === 'undefined') return;

  var modal = document.getElementById('volunteer-modal');
  var openBtn = document.getElementById('open-volunteer-modal');
  var closeBtn = document.getElementById('close-volunteer-modal');
  var form = document.getElementById('volunteer-form');
  var formView = document.getElementById('volunteer-form-view');
  var successView = document.getElementById('volunteer-success');
  var errorBox = document.getElementById('volunteer-error');
  var thankYou = document.getElementById('volunteer-thank-you');
  var finishBtn = document.getElementById('finish-volunteer');

  if (!modal || !openBtn || !closeBtn || !form) return;

  function closeModal() {
    modal.close();
  }

  openBtn.addEventListener('click', function () {
    form.reset();
    errorBox.hidden = true;
    formView.hidden = false;
    successView.hidden = true;
    modal.showModal();
    document.getElementById('volunteer-name').focus();
  });

  closeBtn.addEventListener('click', closeModal);
  finishBtn.addEventListener('click', closeModal);

  // Close when the user clicks the backdrop, not the modal content.
  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorBox.hidden = true;

    var name = document.getElementById('volunteer-name').value.trim();
    var email = document.getElementById('volunteer-email').value.trim();
    var causeSelect = document.getElementById('volunteer-cause');
    var cause = causeSelect.options[causeSelect.selectedIndex].text;

    if (!name || !email || !causeSelect.value) {
      errorBox.textContent = 'Please complete all fields.';
      errorBox.hidden = false;
      return;
    }

    if (name.length > 100 || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorBox.textContent = 'Please enter a valid name and email address.';
      errorBox.hidden = false;
      return;
    }

    thankYou.textContent =
      'Thank you, ' + name + '! Your chosen cause is ' + cause + '.';

    formView.hidden = true;
    successView.hidden = false;
    finishBtn.focus();
  });
})();

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
    if (typeof v === 'undefined' || v === null || isNaN(n)) {
      errors.push(k + ' must be a number');
    } else if (n < lim[0] || n > lim[1]) {
      errors.push(k + ' must be between ' + lim[0] + ' and ' + lim[1]);
    } else if (k === 'household' && !Number.isInteger(n)) {
      errors.push('household must be a whole number');
    } else {
      clean[k] = n;
    }
  });
  if (!raw.diet || typeof DIET_TONNES[raw.diet] === 'undefined') {
    errors.push('diet is invalid');
  } else {
    clean.diet = raw.diet;
  }
  return { ok: errors.length === 0, errors: errors, values: clean };
}

function calculateFootprint(input) {
  var f = CARBON_FACTORS;
  var people = input.household || 1;

  var car = (input.carKm * f.weeksPerYear * f.carPerKm) / 1000;
  var transit = (input.transitKm * f.weeksPerYear * f.transitPerKm) / 1000;
  var flights = (input.flightHours * f.flightPerHour) / 1000;
  var diet = DIET_TONNES[input.diet] || 0;
  var electricity = (input.electricityKwh * f.monthsPerYear * f.electricityPerKwh) / 1000 / people;
  var gas = (input.gasKwh * f.monthsPerYear * f.gasPerKwh) / 1000 / people;

  var total = car + transit + flights + diet + electricity + gas;
  return {
    total: Math.round(total * 100) / 100,
    breakdown: {
      car: Math.round(car * 100) / 100,
      transit: Math.round(transit * 100) / 100,
      flights: Math.round(flights * 100) / 100,
      diet: Math.round(diet * 100) / 100,
      electricity: Math.round(electricity * 100) / 100,
      gas: Math.round(gas * 100) / 100
    }
  };
}

function getReductionSuggestions(input) {
  var out = [];
  var f = CARBON_FACTORS;
  function add(key, text, saved) {
    if (saved > 0.05) out.push({ key: key, text: text, savedTonnes: Math.round(saved * 100) / 100 });
  }
  if (input.flightHours > 0) {
    add('flights',
      'Cut flying in half by switching to rail or virtual meetings where possible.',
      (input.flightHours * 0.5 * f.flightPerHour) / 1000);
  }
  if (input.carKm > 20) {
    add('car',
      'Replace 20 km of driving each week with cycling, walking or transit.',
      (20 * f.weeksPerYear * (f.carPerKm - f.transitPerKm)) / 1000);
  }
  var order = ['highMeat', 'mediumMeat', 'lowMeat', 'pescatarian', 'vegetarian', 'vegan'];
  var pos = order.indexOf(input.diet);
  if (pos >= 0 && pos < order.length - 1) {
    var next = order[pos + 1];
    add('diet',
      'Shift your diet one tier toward plant-based (from ' + DIET_LABELS[input.diet] + ' to ' + DIET_LABELS[next] + ').',
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
if (typeof window !== 'undefined') {
  window.CarbonCalc = CarbonCalc;
}

/* ---------- Carbon Calculator UI wiring ---------- */
(function () {
  if (typeof document === 'undefined') return;
  var form = document.getElementById('carbon-form');
  if (!form) return;

  var LABELS = { car: 'Car', transit: 'Transit', flights: 'Flights', diet: 'Diet', electricity: 'Electricity', gas: 'Gas' };
  var ICONS = { car: '🚗', transit: '🚌', flights: '✈️', diet: '🥗', electricity: '💡', gas: '🔥' };

  ['carKm', 'transitKm', 'flightHours', 'electricityKwh', 'gasKwh'].forEach(function (id) {
    var el = document.getElementById(id);
    var out = document.getElementById(id + '-out');
    if (el && out) {
      el.addEventListener('input', function () { out.textContent = el.value; });
    }
  });

  function readInputs() {
    var data = {};
    ['carKm', 'transitKm', 'flightHours', 'electricityKwh', 'gasKwh', 'household', 'diet'].forEach(function (id) {
      var elem = document.getElementById(id);
      if (elem) data[id] = elem.value;
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

/* ===============================================================
   Global Conservation Projects Directory (Issue #104)
=============================================================== */
(function initConservationDirectory() {
  'use strict';
  if (typeof document === 'undefined') return;

  var BIOMES = Object.freeze({
    Rainforest: { label: 'Rainforest', icon: '🌿', color: '#10b981' },
    'Coral Reefs': { label: 'Coral Reefs', icon: '🪸', color: '#06b6d4' },
    'Boreal Forest': { label: 'Boreal Forest', icon: '🌲', color: '#14b8a6' },
    Savanna: { label: 'Savanna', icon: '🌾', color: '#f59e0b' }
  });

  var CONSERVATION_PROJECTS = Object.freeze([
    Object.freeze({
      id: 'proj-amazon-madre',
      name: 'Amazonian Biodiversity Corridor',
      location: 'Madre de Dios, Peru',
      biome: 'Rainforest',
      coordinates: '12.5933° S, 69.1891° W',
      hectares: 24500,
      survivalRate: 92,
      speciesCount: 14,
      desc: 'Restoring fragmented primary canopy corridors between Tambopata Biosphere Reserve and indigenous community forests, protecting endangered jaguars and giant river otters.',
      speciesList: Object.freeze([
        { common: 'Brazil Nut', scientific: 'Bertholletia excelsa', role: 'Canopy Giant', desc: 'Vulnerable keystone tree that only flowers when pollinated by large native euglossine orchid bees.' },
        { common: 'Shihuahuaco', scientific: 'Dipteryx micrantha', role: 'Carbon Sink', desc: 'Ancient hardwood emergent storing over 35 tons of carbon per mature individual.' },
        { common: 'Capirona', scientific: 'Calycophyllum spruceanum', role: 'Pioneer Healer', desc: 'Fast-growing riverine tree with smooth shedding bark used for natural soil regeneration.' },
        { common: 'Peruvian Cedar', scientific: 'Cedrela odorata', role: 'High Ecological Value', desc: 'Heavily depleted timber tree now cultivated in communal nursery corridors.' },
        { common: 'Açaí Palm', scientific: 'Euterpe precatoria', role: 'Wildlife & Forage', desc: 'Provides rich seasonal berry forage for toucans, tapirs, and local forest communities.' }
      ])
    }),

    Object.freeze({
      id: 'proj-leuser-sumatra',
      name: 'Sumatran Cloud Forest Sanctuary',
      location: 'Leuser Ecosystem, Indonesia',
      biome: 'Rainforest',
      coordinates: '3.7842° N, 97.4328° E',
      hectares: 18200,
      survivalRate: 89,
      speciesCount: 12,
      desc: 'Reclaiming illegal encroached agricultural lands along volcanic ridges to safeguard the last joint habitat of wild Sumatran elephants, tigers, and orangutans.',
      speciesList: Object.freeze([
        { common: 'Red Meranti', scientific: 'Shorea leprosula', role: 'Rainforest Emergent', desc: 'Towering dipterocarp that forms the upper structural canopy for arboreal wildlife.' },
        { common: 'Borneo Ironwood', scientific: 'Eusideroxylon zwageri', role: 'Erosion Barrier', desc: 'Extremely dense, termite-resistant timber that anchors steep volcanic hillside soils.' },
        { common: 'Wild Cinnamon', scientific: 'Cinnamomum iners', role: 'Frugivore Food', desc: 'Aromatic evergreen supporting native hornbill and fruit bat dietary networks.' },
        { common: 'Weeping Fig', scientific: 'Ficus benjamina', role: 'Year-Round Keystone', desc: 'Crucial starvation food tree for primate populations during lean fruiting seasons.' }
      ])
    }),

    Object.freeze({
      id: 'proj-turneffe-belize',
      name: 'Mesoamerican Barrier Reef Restoration',
      location: 'Turneffe Atoll, Belize',
      biome: 'Coral Reefs',
      coordinates: '17.3167° N, 87.8833° W',
      hectares: 12800,
      survivalRate: 88,
      speciesCount: 10,
      desc: 'Micro-fragmentation outplanting of thermal-resilient coral colonies combined with coastal mangrove nursery buffers that filter agricultural runoff.',
      speciesList: Object.freeze([
        { common: 'Staghorn Coral', scientific: 'Acropora cervicornis', role: 'Structural Builder', desc: 'Critically endangered branching coral providing primary nursery shelter for juvenile reef fish.' },
        { common: 'Elkhorn Coral', scientific: 'Acropora palmata', role: 'Wave Dissipator', desc: 'Massive flattened branches that reduce incoming hurricane wave energy by up to 90%.' },
        { common: 'Red Mangrove', scientific: 'Rhizophora mangle', role: 'Coastal Buffer', desc: 'Stilt-rooted shoreline trees trapping sediments and sequestering blue carbon in marine soils.' },
        { common: 'Symmetrical Brain Coral', scientific: 'Pseudodiploria strigosa', role: 'Ancient Framework', desc: 'Slow-growing, dense hemispherical colonies providing long-term structural reef mass.' }
      ])
    }),

    Object.freeze({
      id: 'proj-raja-ampat',
      name: 'Coral Triangle Marine Resiliency Hub',
      location: 'Raja Ampat, Indonesia',
      biome: 'Coral Reefs',
      coordinates: '0.5484° S, 130.5489° E',
      hectares: 15400,
      survivalRate: 91,
      speciesCount: 11,
      desc: 'Community-enforced no-take marine reserves restoring dynamited shallow reef flats and connecting mangrove estuaries to offshore coral reefs.',
      speciesList: Object.freeze([
        { common: 'Pillar Coral', scientific: 'Dendrogyra cylindrus', role: 'Columnar Keystone', desc: 'Distinctive vertical columns with daytime polyp extension, creating unique three-dimensional complexity.' },
        { common: 'Black Mangrove', scientific: 'Avicennia germinans', role: 'Pneumatophore Nursery', desc: 'Aerial breathing roots creating sheltered sanctuaries for benthic marine life.' },
        { common: 'Millepora Finger Coral', scientific: 'Acropora millepora', role: 'Fast-Growing Re-seeder', desc: 'Spawns millions of gametes yearly to naturally re-populate adjacent damaged reefs.' },
        { common: 'Bubble Coral', scientific: 'Plerogyra sinuosa', role: 'Invertebrate Habitat', desc: 'Vesicle-covered colonies hosting symbiotic cleaner shrimp and clownfish species.' }
      ])
    }),

    Object.freeze({
      id: 'proj-lapland-taiga',
      name: 'Taiga Peatland & Ancient Pine Regeneration',
      location: 'Lapland, Finland',
      biome: 'Boreal Forest',
      coordinates: '67.5539° N, 26.5492° E',
      hectares: 31000,
      survivalRate: 94,
      speciesCount: 8,
      desc: 'Rewetting historic forestry ditches to restore natural subarctic peat bogs and planting old-growth boreal conifers that lock gigatons of carbon in permafrost soils.',
      speciesList: Object.freeze([
        { common: 'Scots Pine', scientific: 'Pinus sylvestris', role: 'Boreal Anchor', desc: 'Hardy conifer surviving winter temperatures below -45°C with deep anchoring taproots.' },
        { common: 'Norway Spruce', scientific: 'Picea abies', role: 'Snow Canopy', desc: 'Downward-sloping needle branches shedding heavy snow loads while harboring boreal owl nests.' },
        { common: 'Downy Birch', scientific: 'Betula pubescens', role: 'Pioneer Nutrient Cycler', desc: 'Cold-tolerant deciduous tree with leaf litter that enriches acidic taiga podzols.' },
        { common: 'Sweet Gale', scientific: 'Myrica gale', role: 'Nitrogen Fixer', desc: 'Peatland shrub with actinorhizal root nodules that enrich nutrient-poor subarctic wetlands.' }
      ])
    }),

    Object.freeze({
      id: 'proj-alaska-boreal',
      name: 'Yukon River Basin Watershed Protection',
      location: 'Alaska, USA',
      biome: 'Boreal Forest',
      coordinates: '61.8592° N, 161.4231° W',
      hectares: 28700,
      survivalRate: 93,
      speciesCount: 9,
      desc: 'Post-wildfire reforestation creating living riparian firebreaks and protecting critical gravel beds for migrating Chinook and Coho salmon runs.',
      speciesList: Object.freeze([
        { common: 'White Spruce', scientific: 'Picea glauca', role: 'Floodplain Stabilizer', desc: 'Primary riverbank stabilizer preventing silt inundation of sensitive salmon spawning gravels.' },
        { common: 'Black Spruce', scientific: 'Picea mariana', role: 'Muskeg Carbon Lock', desc: 'Adapted to cold wet soils and permafrost, sealing immense soil methane reserves.' },
        { common: 'Quaking Aspen', scientific: 'Populus tremuloides', role: 'Fire-Resilient Buffer', desc: 'Moist deciduous foliage creating natural firebreaks that slow boreal mega-fires.' },
        { common: 'Paper Birch', scientific: 'Betula papyrifera', role: 'Fast Canopy Cover', desc: 'Rapid pioneer providing vital shade that prevents river temperature spikes in summer.' }
      ])
    }),

    Object.freeze({
      id: 'proj-sahel-senegal',
      name: 'Great Green Wall Sahelian Acacia Belt',
      location: 'Matam, Senegal',
      biome: 'Savanna',
      coordinates: '15.6559° N, 13.2554° W',
      hectares: 45000,
      survivalRate: 86,
      speciesCount: 10,
      desc: 'Halting southern Sahara desertification across the Sahel using traditional rainwater zaï planting pits and deep-rooting nitrogen-fixing native acacia agroforestry.',
      speciesList: Object.freeze([
        { common: 'Gum Arabic Tree', scientific: 'Senegalia senegal', role: 'Drought Armor', desc: 'Thorny savanna tree with deep taproots that exudes natural resin and restores barren desert ground.' },
        { common: 'Desert Date', scientific: 'Balanites aegyptiaca', role: 'Sub-Saharan Food Security', desc: 'Evergreen tree surviving extreme 50°C heat with nutritious edible fruit and medicinal seed oil.' },
        { common: 'Apple-Ring Acacia', scientific: 'Faidherbia albida', role: 'Fertility Miracle', desc: 'Exhibits reverse phenology—drops nutrient-rich nitrogen leaves right when companion crops are planted.' },
        { common: 'African Baobab', scientific: 'Adansonia digitata', role: 'Water Storage Colossus', desc: 'Spongy trunk storing tens of thousands of liters of groundwater during 9-month droughts.' }
      ])
    }),

    Object.freeze({
      id: 'proj-serengeti-mara',
      name: 'Serengeti-Mara Wildlife Corridor Savanna',
      location: 'Narok, Kenya',
      biome: 'Savanna',
      coordinates: '1.2864° S, 35.8236° E',
      hectares: 22300,
      survivalRate: 90,
      speciesCount: 8,
      desc: 'Restoring indigenous acacia woodlands and degraded grazing plains along the Great Migration corridor with Maasai community conservancies.',
      speciesList: Object.freeze([
        { common: 'Umbrella Thorn', scientific: 'Vachellia tortilis', role: 'Iconic Savanna Canopy', desc: 'Iconic flat-crowned tree with high-protein seed pods browsed by elephants, giraffes, and impalas.' },
        { common: 'Fever Tree', scientific: 'Vachellia xanthophloea', role: 'Riparian Sentry', desc: 'Striking greenish-yellow bark tree growing near waterholes, preventing bank erosion.' },
        { common: 'Candelabra Tree', scientific: 'Euphorbia ingens', role: 'Structural Diversity', desc: 'Succulent tree creating safe nesting sites for raptors in dry open plains.' },
        { common: 'African Wild Olive', scientific: 'Olea europaea subsp. cuspidata', role: 'Durable Hardwood', desc: 'Slow-growing, dense tree providing vital shaded respite and nutritious fruit for birds.' }
      ])
    })
  ]);

  var dirState = {
    selectedBiome: 'all',
    searchQuery: '',
    selectedProject: null
  };

  var lastActiveButton = null;

  function qs(id) {
    return document.getElementById(id);
  }

  // Animate statistics counter (e.g. from 0 to 92%)
  function animateNumber(element, start, end, duration, suffix) {
    if (!element) return;
    suffix = suffix || '';
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutCubic
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(start + (end - start) * ease);
      element.textContent = current.toLocaleString('en-US') + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = end.toLocaleString('en-US') + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  // Open Species Planted Modal
  function openSpeciesModal(project, triggerBtn) {
    lastActiveButton = triggerBtn || document.activeElement;
    dirState.selectedProject = project;

    var backdrop = qs('speciesModalBackdrop');
    var modal = qs('speciesModal');
    if (!backdrop || !modal) return;

    var biomeInfo = BIOMES[project.biome] || { label: project.biome, icon: '🌱' };

    qs('modalBiomeBadge').textContent = biomeInfo.icon + ' ' + biomeInfo.label;
    qs('modalCoordPill').textContent = '📍 ' + project.coordinates;
    qs('modalProjectTitle').textContent = project.name;
    qs('modalProjectLocation').textContent = project.location + ' • ' + project.desc;

    qs('modalMetricHa').textContent = project.hectares.toLocaleString('en-US') + ' ha';
    qs('modalMetricSurvival').textContent = project.survivalRate + '%';
    qs('modalMetricSpeciesCount').textContent = project.speciesCount + ' Species';

    var container = qs('speciesCardsContainer');
    container.textContent = ''; // safe clear

    project.speciesList.forEach(function (sp) {
      var card = document.createElement('div');
      card.className = 'species-item-card';

      var topMeta = document.createElement('div');
      topMeta.className = 'species-top-meta';

      var nameEl = document.createElement('span');
      nameEl.className = 'species-common-name';
      nameEl.textContent = sp.common;
      topMeta.appendChild(nameEl);

      var roleBadge = document.createElement('span');
      roleBadge.className = 'species-role-badge';
      roleBadge.textContent = sp.role;
      topMeta.appendChild(roleBadge);
      card.appendChild(topMeta);

      var sciName = document.createElement('div');
      sciName.className = 'species-scientific-name';
      sciName.textContent = sp.scientific;
      card.appendChild(sciName);

      var roleDesc = document.createElement('p');
      roleDesc.className = 'species-ecological-role';
      roleDesc.textContent = sp.desc;
      card.appendChild(roleDesc);

      container.appendChild(card);
    });

    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    modal.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    var closeBtn = qs('speciesModalCloseBtn');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeSpeciesModal() {
    var backdrop = qs('speciesModalBackdrop');
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    if (lastActiveButton && typeof lastActiveButton.focus === 'function') {
      lastActiveButton.focus();
    }
  }

  // Render Projects Grid with Safe DOM Construction
  function renderProjects() {
    var container = qs('projectsGrid');
    if (!container) return;

    container.textContent = ''; // safe wipe

    var query = dirState.searchQuery.toLowerCase().trim();

    var filtered = CONSERVATION_PROJECTS.filter(function (p) {
      if (dirState.selectedBiome !== 'all' && p.biome !== dirState.selectedBiome) {
        return false;
      }
      if (query) {
        var matchName = p.name.toLowerCase().indexOf(query) !== -1;
        var matchLoc = p.location.toLowerCase().indexOf(query) !== -1;
        var matchCoord = p.coordinates.toLowerCase().indexOf(query) !== -1;
        var matchSpecies = p.speciesList.some(function (s) {
          return s.common.toLowerCase().indexOf(query) !== -1 || s.scientific.toLowerCase().indexOf(query) !== -1;
        });
        if (!matchName && !matchLoc && !matchCoord && !matchSpecies) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      var emptyNotice = document.createElement('div');
      emptyNotice.className = 'card';
      emptyNotice.style.gridColumn = '1 / -1';
      var emptyHeading = document.createElement('h3');
      emptyHeading.textContent = 'No Conservation Projects Found';
      emptyHeading.style.color = '#86efac';
      var emptyDesc = document.createElement('p');
      emptyDesc.textContent = 'Try adjusting your search keyword or selecting "All Biomes".';
      emptyNotice.appendChild(emptyHeading);
      emptyNotice.appendChild(emptyDesc);
      container.appendChild(emptyNotice);
      return;
    }

    filtered.forEach(function (project) {
      var biomeInfo = BIOMES[project.biome] || { label: project.biome, icon: '🌱', color: '#22c55e' };

      var card = document.createElement('div');
      card.className = 'project-card';
      card.style.setProperty('--biome-color', biomeInfo.color);

      var topRow = document.createElement('div');
      topRow.className = 'card-top-row';

      var biomeBadge = document.createElement('span');
      biomeBadge.className = 'biome-badge';
      biomeBadge.textContent = biomeInfo.icon + ' ' + biomeInfo.label;
      topRow.appendChild(biomeBadge);

      var coordChip = document.createElement('span');
      coordChip.className = 'coord-chip';
      coordChip.textContent = '📍 ' + project.coordinates;
      topRow.appendChild(coordChip);

      card.appendChild(topRow);

      var nameEl = document.createElement('h3');
      nameEl.className = 'project-name';
      nameEl.textContent = project.name;
      card.appendChild(nameEl);

      var locEl = document.createElement('div');
      locEl.className = 'project-location';
      locEl.textContent = project.location;
      card.appendChild(locEl);

      var descEl = document.createElement('p');
      descEl.className = 'project-desc';
      descEl.textContent = project.desc;
      card.appendChild(descEl);

      // Statistics Row
      var statsGrid = document.createElement('div');
      statsGrid.className = 'project-stats-grid';

      var haCol = document.createElement('div');
      haCol.className = 'p-stat-col';
      var haVal = document.createElement('span');
      haVal.className = 'p-stat-val';
      haVal.textContent = project.hectares.toLocaleString('en-US') + ' ha';
      var haLbl = document.createElement('span');
      haLbl.className = 'p-stat-lbl';
      haLbl.textContent = 'Hectares';
      haCol.appendChild(haVal);
      haCol.appendChild(haLbl);
      statsGrid.appendChild(haCol);

      var survCol = document.createElement('div');
      survCol.className = 'p-stat-col';
      var survVal = document.createElement('span');
      survVal.className = 'p-stat-val survival-val';
      survVal.textContent = '0%';
      var survLbl = document.createElement('span');
      survLbl.className = 'p-stat-lbl';
      survLbl.textContent = 'Survival';
      var miniBar = document.createElement('div');
      miniBar.className = 'survival-mini-bar';
      var miniFill = document.createElement('div');
      miniFill.className = 'survival-mini-fill';
      miniFill.style.width = '0%';
      miniBar.appendChild(miniFill);
      survCol.appendChild(survVal);
      survCol.appendChild(survLbl);
      survCol.appendChild(miniBar);
      statsGrid.appendChild(survCol);

      var spCol = document.createElement('div');
      spCol.className = 'p-stat-col';
      var spVal = document.createElement('span');
      spVal.className = 'p-stat-val';
      spVal.textContent = '0';
      var spLbl = document.createElement('span');
      spLbl.className = 'p-stat-lbl';
      spLbl.textContent = 'Species';
      spCol.appendChild(spVal);
      spCol.appendChild(spLbl);
      statsGrid.appendChild(spCol);

      card.appendChild(statsGrid);

      // View Tree Species Button
      var viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'btn-view-species';
      viewBtn.textContent = '🍃 View Tree Species Planted ↗';
      viewBtn.setAttribute('aria-label', 'View native plant and tree species planted in ' + project.name);
      viewBtn.addEventListener('click', function () {
        openSpeciesModal(project, viewBtn);
      });
      card.appendChild(viewBtn);

      container.appendChild(card);

      // Trigger number & progress bar animation
      setTimeout(function () {
        animateNumber(survVal, 0, project.survivalRate, 750, '%');
        animateNumber(spVal, 0, project.speciesCount, 750, '');
        miniFill.style.width = project.survivalRate + '%';
      }, 50);
    });
  }

  // Update counts in biome buttons
  function updateBiomeCounts() {
    var counts = { all: CONSERVATION_PROJECTS.length, Rainforest: 0, 'Coral Reefs': 0, 'Boreal Forest': 0, Savanna: 0 };
    CONSERVATION_PROJECTS.forEach(function (p) {
      if (typeof counts[p.biome] !== 'undefined') counts[p.biome] += 1;
    });

    var countAll = qs('count-all');
    var countRainforest = qs('count-rainforest');
    var countReefs = qs('count-reefs');
    var countBoreal = qs('count-boreal');
    var countSavanna = qs('count-savanna');

    if (countAll) countAll.textContent = String(counts.all);
    if (countRainforest) countRainforest.textContent = String(counts.Rainforest);
    if (countReefs) countReefs.textContent = String(counts['Coral Reefs']);
    if (countBoreal) countBoreal.textContent = String(counts['Boreal Forest']);
    if (countSavanna) countSavanna.textContent = String(counts.Savanna);
  }

  // Event wiring
  function setupEvents() {
    var filterBtns = document.querySelectorAll('.biome-btn');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        dirState.selectedBiome = btn.dataset.biome || 'all';
        renderProjects();
      });
    });

    var searchInput = qs('directorySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        dirState.searchQuery = e.target.value;
        renderProjects();
      });
    }

    var closeBtn = qs('speciesModalCloseBtn');
    var dismissBtn = qs('speciesModalDismissBtn');
    var backdrop = qs('speciesModalBackdrop');

    if (closeBtn) closeBtn.addEventListener('click', closeSpeciesModal);
    if (dismissBtn) dismissBtn.addEventListener('click', closeSpeciesModal);
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) closeSpeciesModal();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop && !backdrop.hidden) {
        closeSpeciesModal();
      }
    });

    updateBiomeCounts();
    renderProjects();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEvents);
  } else {
    setupEvents();
  }
})();
