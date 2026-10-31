// Vanguard estate filter: data model, deterministic filtering and sidebar wiring.
// Pure logic lives in EstateFilter so it can be tested with node --test.

var ESTATES = [
  { id: 'glass-horizon', name: 'The Glass Horizon Villa', location: 'Malibu, California', icon: '🏰', price: 14500000, beds: 5, baths: 7, sqft: 9200, type: 'Villa', amenities: ['Infinity Pool', 'Ocean View', 'Home Cinema'] },
  { id: 'skyline-penthouse', name: 'Skyline Sky-Penthouse', location: 'Tribeca, New York', icon: '🏙️', price: 22000000, beds: 4, baths: 5, sqft: 6800, type: 'Penthouse', amenities: ['Private Elevator', 'Rooftop Terrace', 'Wine Cellar'] },
  { id: 'aspen-ridge', name: 'Aspen Ridge Lodge', location: 'Aspen, Colorado', icon: '🏔️', price: 35000000, beds: 8, baths: 10, sqft: 14500, type: 'Villa', amenities: ['Ski-In / Ski-Out', 'Wine Cellar', 'Home Cinema'] },
  { id: 'azur-chateau', name: 'Château des Roches', location: "Côte d'Azur, France", icon: '🏯', price: 18500000, beds: 9, baths: 8, sqft: 16000, type: 'Château', amenities: ['Infinity Pool', 'Wine Cellar', 'Vineyard'] },
  { id: 'cay-island', name: 'Private Cay Island', location: 'Exuma, Bahamas', icon: '🏝️', price: 12000000, beds: 6, baths: 6, sqft: 7400, type: 'Island', amenities: ['Helipad', 'Private Marina', 'Ocean View'] },
  { id: 'wilshire-terrace', name: 'Wilshire Terrace Penthouse', location: 'Beverly Hills, California', icon: '🌆', price: 2800000, beds: 2, baths: 3, sqft: 2900, type: 'Penthouse', amenities: ['Private Elevator', 'Rooftop Terrace'] }
];

var EstateFilter = (function () {
  var PRICE_MIN = 1000000;
  var PRICE_MAX = 25000000; // top of the slider means "$25M and above"
  var PRICE_STEP = 500000;

  function formatMoney(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function formatShortPrice(n, isTop) {
    var m = n / 1000000;
    var s = '$' + (Number.isInteger(m) ? m : m.toFixed(1)) + 'M';
    return isTop ? s + '+' : s;
  }

  function defaults() {
    return { minPrice: PRICE_MIN, maxPrice: PRICE_MAX, minBeds: 0, types: [], amenities: [] };
  }

  // Accepts a partial/untrusted filter object and returns a clean one.
  function normalize(f) {
    var d = defaults();
    f = f || {};
    var lo = Number(f.minPrice);
    var hi = Number(f.maxPrice);
    lo = isFinite(lo) ? Math.min(Math.max(lo, PRICE_MIN), PRICE_MAX) : d.minPrice;
    hi = isFinite(hi) ? Math.min(Math.max(hi, PRICE_MIN), PRICE_MAX) : d.maxPrice;
    if (lo > hi) { var t = lo; lo = hi; hi = t; }
    var beds = Number(f.minBeds);
    return {
      minPrice: lo,
      maxPrice: hi,
      minBeds: isFinite(beds) && beds > 0 ? Math.floor(beds) : 0,
      types: Array.isArray(f.types) ? f.types : [],
      amenities: Array.isArray(f.amenities) ? f.amenities : []
    };
  }

  function matches(estate, f) {
    if (estate.price < f.minPrice) return false;
    if (f.maxPrice < PRICE_MAX && estate.price > f.maxPrice) return false; // max at the top = no upper cap
    if (estate.beds < f.minBeds) return false;
    if (f.types.length && f.types.indexOf(estate.type) === -1) return false;
    for (var i = 0; i < f.amenities.length; i++) {
      if (estate.amenities.indexOf(f.amenities[i]) === -1) return false; // must have every selected amenity
    }
    return true;
  }

  function filterEstates(list, filters) {
    var f = normalize(filters);
    return list.filter(function (e) { return matches(e, f); });
  }

  function countLabel(shown, total) {
    return 'Showing ' + shown + ' of ' + total + (total === 1 ? ' Estate' : ' Estates');
  }

  function uniqueSorted(list, pick) {
    var seen = {};
    list.forEach(function (e) { [].concat(pick(e)).forEach(function (v) { seen[v] = true; }); });
    return Object.keys(seen).sort();
  }

  return {
    PRICE_MIN: PRICE_MIN, PRICE_MAX: PRICE_MAX, PRICE_STEP: PRICE_STEP,
    defaults: defaults, normalize: normalize, matches: matches, filterEstates: filterEstates,
    countLabel: countLabel, formatMoney: formatMoney, formatShortPrice: formatShortPrice, uniqueSorted: uniqueSorted
  };
})();

/* ---------- DOM wiring (skipped when there is no document, e.g. in tests) ---------- */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('estate-grid');
    if (!grid) return;

    var form = document.getElementById('filter-form');
    var minRange = document.getElementById('price-min');
    var maxRange = document.getElementById('price-max');
    var bedsSelect = document.getElementById('beds-min');
    var priceLabel = document.getElementById('price-label');
    var countEl = document.getElementById('estate-count');
    var emptyEl = document.getElementById('estate-empty');
    var resetBtns = document.querySelectorAll('[data-reset-filters]');
    var toggleBtn = document.getElementById('filter-toggle');
    var panel = document.getElementById('filter-panel');

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function cardHtml(e) {
      return '<div class="card" data-price="' + e.price + '">' +
        '<div class="card-badge">' + EstateFilter.formatMoney(e.price) + '</div>' +
        '<div class="img-holder" aria-hidden="true">' + e.icon + '</div>' +
        '<h3>' + esc(e.name) + '</h3>' +
        '<p class="location">' + esc(e.location) + '</p>' +
        '<div class="specs">' +
          '<span class="spec-item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18v8H3zM5 12V7h6v5M3 16h18M5 20v2M19 20v2"/></svg><span>' + e.beds + ' Beds</span></span>' +
          '<span class="spec-item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12V5a2 2 0 0 1 4 0v7M4 9h4M4 12h16v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM7 20v2M17 20v2"/></svg><span>' + e.baths + ' Baths</span></span>' +
          '<span class="spec-item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M3 3l7 7M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7M16 21h5v-5M21 21l-7-7"/></svg><span>' + e.sqft.toLocaleString('en-US') + ' sqft</span></span>' +
        '</div>' +
        '<p class="estate-meta"><span class="type-tag">' + esc(e.type) + '</span> ' + e.amenities.map(esc).join(' · ') + '</p>' +
        '<button type="button" class="calc-estate-btn" onclick="applyEstatePrice(' + e.price + ')">Calculate Mortgage ↗</button>' +
      '</div>';
    }

    function checkboxGroup(containerId, name, values) {
      var box = document.getElementById(containerId);
      box.innerHTML = values.map(function (v, i) {
        var id = name + '-' + i;
        return '<label class="check-row" for="' + id + '"><input type="checkbox" id="' + id + '" name="' + name + '" value="' + esc(v) + '"><span>' + esc(v) + '</span></label>';
      }).join('');
    }

    checkboxGroup('type-options', 'type', EstateFilter.uniqueSorted(ESTATES, function (e) { return e.type; }));
    checkboxGroup('amenity-options', 'amenity', EstateFilter.uniqueSorted(ESTATES, function (e) { return e.amenities; }));

    function checked(name) {
      return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
    }

    function read() {
      return EstateFilter.normalize({
        minPrice: minRange.value, maxPrice: maxRange.value, minBeds: bedsSelect.value,
        types: checked('type'), amenities: checked('amenity')
      });
    }

    function render() {
      var f = read();
      var shown = EstateFilter.filterEstates(ESTATES, f);
      grid.innerHTML = shown.map(cardHtml).join('');
      countEl.textContent = EstateFilter.countLabel(shown.length, ESTATES.length);
      emptyEl.hidden = shown.length !== 0;
      priceLabel.textContent = EstateFilter.formatShortPrice(f.minPrice, false) + ' – ' +
        EstateFilter.formatShortPrice(f.maxPrice, f.maxPrice === EstateFilter.PRICE_MAX);
      minRange.setAttribute('aria-valuetext', EstateFilter.formatMoney(f.minPrice));
      maxRange.setAttribute('aria-valuetext', f.maxPrice === EstateFilter.PRICE_MAX ? '$25,000,000 and above' : EstateFilter.formatMoney(f.maxPrice));
      var span = EstateFilter.PRICE_MAX - EstateFilter.PRICE_MIN;
      var track = document.getElementById('price-track');
      track.style.setProperty('--lo', ((f.minPrice - EstateFilter.PRICE_MIN) / span * 100) + '%');
      track.style.setProperty('--hi', ((f.maxPrice - EstateFilter.PRICE_MIN) / span * 100) + '%');
    }

    // Keep the thumbs from crossing: the one being dragged is clamped to the other.
    minRange.addEventListener('input', function () {
      if (Number(minRange.value) > Number(maxRange.value)) minRange.value = maxRange.value;
    });
    maxRange.addEventListener('input', function () {
      if (Number(maxRange.value) < Number(minRange.value)) maxRange.value = minRange.value;
    });

    form.addEventListener('input', render);
    form.addEventListener('change', render);
    form.addEventListener('submit', function (ev) { ev.preventDefault(); });

    function reset() {
      form.reset();
      render();
      minRange.focus();
    }
    Array.prototype.forEach.call(resetBtns, function (b) { b.addEventListener('click', reset); });

    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', function () {
        var open = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('open', !open);
      });
    }

    render();
  });
}
