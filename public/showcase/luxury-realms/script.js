function inquireConcierge() {
  var modal = document.getElementById('conciergeModal');
  if (!modal) return;
  modal.hidden = false;
  var contact = document.getElementById('conciergeContact');
  if (contact) contact.focus();
}

function closeConcierge() {
  var modal = document.getElementById('conciergeModal');
  if (modal) modal.hidden = true;
}

(function () {
  var form = document.getElementById('conciergeForm');
  if (!form) return;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var data = new FormData(form);
    var confirmation = document.getElementById('conciergeConfirmation');
    confirmation.textContent = 'Your ' + data.get('conciergeMethod') + ' briefing request is confirmed. Our private desk will be in touch shortly.';
    confirmation.hidden = false;
    form.hidden = true;
  });
})();

/* ===== BEGIN issue #76: travel curator and printable itinerary ===== */
(function () {
  'use strict';
  var cardsEl = document.getElementById('lr-cards');
  if (!cardsEl) return;

  // Illustrative demo prices in USD.
  var YACHT_PER_NIGHT = 6000;
  var JET_FLAT = 28000; // return flight for the party, per destination
  var NIGHT_CHOICES = [3, 5, 7, 10, 14];
  var DESTINATIONS = [
    { id: 'monaco', name: 'Monaco', icon: '🎰', blurb: 'Harbour-view suite above the Grand Prix circuit.', rate: 2400, yacht: true },
    { id: 'st-barts', name: 'St. Barts', icon: '⛵', blurb: 'Clifftop villa with a private beach in Gustavia.', rate: 3200, yacht: true },
    { id: 'aspen', name: 'Aspen', icon: '🏔️', blurb: 'Slopeside chalet with ski-in access and a chef.', rate: 2800, yacht: false },
    { id: 'maldives', name: 'Maldives', icon: '🏝️', blurb: 'Overwater estate on its own lagoon.', rate: 4500, yacht: true }
  ];

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var els = {
    lines: document.getElementById('lr-lines'),
    body: document.getElementById('lr-lines-body'),
    empty: document.getElementById('lr-empty'),
    total: document.getElementById('lr-total'),
    print: document.getElementById('lr-print'),
    guest: document.getElementById('lr-guest'),
    guestPrint: document.getElementById('lr-guest-print'),
    date: document.getElementById('lr-date')
  };
  // Insertion order of the picks, so the itinerary reads in the order the guest chose.
  var state = {}; // id -> { added, nights, yacht, jet }
  var order = [];
  var refs = {};

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function buildCard(d) {
    state[d.id] = { added: false, nights: 5, yacht: false, jet: false };
    var card = el('article', 'lr-card');
    var icon = el('div', 'lr-icon', d.icon);
    icon.setAttribute('aria-hidden', 'true');
    var h = el('h3', null, d.name);
    var rate = el('p', 'lr-rate', usd.format(d.rate));
    rate.appendChild(el('span', null, ' / night'));

    var fs = el('fieldset', 'lr-opts');
    fs.disabled = true;
    fs.appendChild(el('legend', 'lr-sr', d.name + ' options'));

    var nightsLabel = el('label', 'lr-nights', 'Nights ');
    var sel = document.createElement('select');
    sel.id = 'lr-nights-' + d.id;
    NIGHT_CHOICES.forEach(function (n) {
      var o = document.createElement('option');
      o.value = String(n);
      o.textContent = n + ' nights';
      if (n === state[d.id].nights) o.selected = true;
      sel.appendChild(o);
    });
    nightsLabel.setAttribute('for', sel.id);
    fs.appendChild(nightsLabel);
    fs.appendChild(sel);

    var yacht = addOn('yacht-' + d.id, 'Yacht charter', '+' + usd.format(YACHT_PER_NIGHT) + ' / night', !d.yacht);
    var jet = addOn('jet-' + d.id, 'Private jet', '+' + usd.format(JET_FLAT) + ' return', false);
    fs.appendChild(yacht.label);
    fs.appendChild(jet.label);
    if (!d.yacht) fs.appendChild(el('p', 'lr-hint', 'Yacht not offered here (inland).'));

    var btn = el('button', 'lr-toggle', 'Add to itinerary');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Add ' + d.name + ' to itinerary');

    card.appendChild(icon);
    card.appendChild(h);
    card.appendChild(el('p', 'lr-blurb', d.blurb));
    card.appendChild(rate);
    card.appendChild(fs);
    card.appendChild(btn);
    cardsEl.appendChild(card);

    refs[d.id] = { card: card, fs: fs, btn: btn };

    btn.addEventListener('click', function () {
      var s = state[d.id];
      s.added = !s.added;
      if (s.added) { if (order.indexOf(d.id) === -1) order.push(d.id); }
      else order = order.filter(function (x) { return x !== d.id; });
      fs.disabled = !s.added;
      card.classList.toggle('lr-on', s.added);
      btn.textContent = s.added ? 'Remove from itinerary' : 'Add to itinerary';
      btn.setAttribute('aria-pressed', String(s.added));
      btn.setAttribute('aria-label', (s.added ? 'Remove ' : 'Add ') + d.name + (s.added ? ' from itinerary' : ' to itinerary'));
      render();
    });
    sel.addEventListener('change', function () { state[d.id].nights = Number(sel.value); render(); });
    yacht.input.addEventListener('change', function () { state[d.id].yacht = yacht.input.checked; render(); });
    jet.input.addEventListener('change', function () { state[d.id].jet = jet.input.checked; render(); });
  }

  function addOn(id, name, price, unavailable) {
    var label = el('label', 'lr-addon');
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'lr-' + id;
    input.disabled = !!unavailable;
    label.appendChild(input);
    label.appendChild(el('span', null, name));
    label.appendChild(el('small', null, price));
    return { label: label, input: input };
  }

  function lineRow(text, amount, cls) {
    var tr = el('tr', cls || '');
    tr.appendChild(el('td', null, text));
    tr.appendChild(el('td', 'lr-num', amount === null ? '' : usd.format(amount)));
    return tr;
  }

  function calc(d, s) {
    var lines = [{ text: s.nights + ' nights × ' + usd.format(d.rate), amount: s.nights * d.rate }];
    if (s.yacht && d.yacht) lines.push({ text: 'Yacht charter, ' + s.nights + ' nights × ' + usd.format(YACHT_PER_NIGHT), amount: s.nights * YACHT_PER_NIGHT });
    if (s.jet) lines.push({ text: 'Private jet, return', amount: JET_FLAT });
    return lines;
  }

  function render() {
    els.body.textContent = '';
    var total = 0;
    order.forEach(function (id) {
      var d = DESTINATIONS.filter(function (x) { return x.id === id; })[0];
      var lines = calc(d, state[id]);
      var head = el('tr', 'lr-dest');
      var th = el('th', null, d.name);
      th.colSpan = 2;
      th.scope = 'rowgroup';
      head.appendChild(th);
      els.body.appendChild(head);
      lines.forEach(function (l) { els.body.appendChild(lineRow(l.text, l.amount)); total += l.amount; });
    });
    els.total.textContent = usd.format(total);
    var has = order.length > 0;
    els.lines.hidden = !has;
    els.empty.hidden = has;
    els.print.disabled = !has;
  }

  function updateGuest() {
    var name = els.guest.value.trim();
    els.guestPrint.textContent = name ? 'Prepared for ' + name : '';
    els.guestPrint.hidden = !name;
  }

  DESTINATIONS.forEach(buildCard);
  els.guest.addEventListener('input', updateGuest);
  els.print.addEventListener('click', function () {
    els.date.textContent = 'Issued ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    window.print();
  });
  els.date.textContent = 'Issued ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  render();
})();
/* ===== END issue #76 ===== */

/* ===== BEGIN issue #103: Private Aviation Fleet Explorer & Cabin Walkthrough ===== */
(function () {
  'use strict';

  var fleetGrid = document.getElementById('fleetGrid');
  if (!fleetGrid) return;

  var FLEET_DATA = [
    {
      id: 'global-7500',
      name: 'Bombardier Global 7500',
      category: 'heavy',
      categoryLabel: 'Heavy & Ultra-Long',
      callsign: 'Registration: 9H-AURA • Flagship Long-Haul',
      desc: 'The pinnacle of business aviation offering four distinct true living spaces, a private master stateroom with double bed, and intercontinental range connecting any two worldwide cities non-stop.',
      rangeNm: 7700,
      rangeKm: 14260,
      speed: '982 km/h',
      speedMach: 'Mach 0.90',
      pax: 19,
      paxSleep: 10,
      cabinAlt: '2,900 ft @ 45k ft',
      baggage: '195 cu ft',
      rateHour: 14500,
      color: '#f59e0b',
      reachableByHub: {
        london: ['Tokyo (Non-Stop)', 'Singapore (Non-Stop)', 'Los Angeles (Non-Stop)', 'Buenos Aires', 'Dubai'],
        newyork: ['Tokyo (Non-Stop)', 'Dubai (Non-Stop)', 'London (Non-Stop)', 'Hong Kong', 'Paris'],
        dubai: ['Sydney (Non-Stop)', 'New York (Non-Stop)', 'London (Non-Stop)', 'Tokyo', 'Johannesburg'],
        geneva: ['Tokyo (Non-Stop)', 'San Francisco (Non-Stop)', 'Singapore', 'Cape Town', 'Sao Paulo']
      },
      photos: [
        {
          title: 'Master Executive Stateroom',
          subtitle: 'En-suite private bedroom with queen berth and circadian sky lighting',
          icon: '🛏️',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e1828"/><stop offset="100%" stop-color="#0a0812"/></linearGradient></defs>' +
              '<rect width="100%" height="100%" fill="url(#g1)"/>' +
              '<ellipse cx="50%" cy="30%" rx="35%" ry="18%" fill="none" stroke="rgba(245,158,11,0.25)" stroke-width="2"/>' +
              '<rect x="25%" y="45%" width="50%" height="40%" rx="12" fill="#171322" stroke="rgba(245,158,11,0.4)" stroke-width="2"/>' +
              '<rect x="32%" y="50%" width="36%" height="22%" rx="8" fill="#2d233c"/>' +
              '<circle cx="40%" cy="58%" r="6%" fill="rgba(245,158,11,0.2)"/>' +
              '<circle cx="60%" cy="58%" r="6%" fill="rgba(245,158,11,0.2)"/>' +
              '<text x="50%" y="78%" fill="#d6d3d1" font-size="14" font-family="sans-serif" text-anchor="middle">Private Stateroom with Bed &amp; Acoustic Barrier</text>' +
              '</svg>';
          }
        },
        {
          title: 'Conference & Dining Suite',
          subtitle: 'Hand-crafted walnut dining table with six Nuage ergonomic club chairs',
          icon: '🍽️',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#110d1c"/>' +
              '<rect x="18%" y="42%" width="64%" height="32%" rx="16" fill="#1f182c" stroke="rgba(245,158,11,0.35)" stroke-width="2"/>' +
              '<circle cx="28%" cy="58%" r="14" fill="#36294a" stroke="#f59e0b" stroke-width="1.5"/>' +
              '<circle cx="50%" cy="58%" r="14" fill="#36294a" stroke="#f59e0b" stroke-width="1.5"/>' +
              '<circle cx="72%" cy="58%" r="14" fill="#36294a" stroke="#f59e0b" stroke-width="1.5"/>' +
              '<text x="50%" y="30%" fill="#fef3c7" font-size="14" font-family="Cinzel, serif" text-anchor="middle">6-Seat Executive Dining &amp; Boardroom</text>' +
              '</svg>';
          }
        },
        {
          title: 'Gourmet Galley & Sommelier Cellar',
          subtitle: 'Sub-zero wine refrigeration, steam oven, and dedicated flight chef station',
          icon: '🍷',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#0d0a14"/>' +
              '<path d="M 40,50 L 560,50 L 520,280 L 80,280 Z" fill="#1b1527" stroke="rgba(245,158,11,0.25)"/>' +
              '<rect x="120" y="80" width="80" height="140" rx="6" fill="#292039" stroke="#f59e0b" stroke-width="1"/>' +
              '<rect x="230" y="80" width="140" height="140" rx="6" fill="#241c33" stroke="rgba(255,255,255,0.1)"/>' +
              '<rect x="400" y="80" width="80" height="140" rx="6" fill="#292039" stroke="#f59e0b" stroke-width="1"/>' +
              '<text x="300" y="250" fill="#a8a29e" font-size="13" font-family="sans-serif" text-anchor="middle">Chilled Sommelier Cellar &amp; Espresso Bar</text>' +
              '</svg>';
          }
        },
        {
          title: 'Bombardier Vision Cockpit',
          subtitle: 'Triple-redundant fly-by-wire flight deck with Head-Up Display & synthetic vision',
          icon: '🛩️',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#08070d"/>' +
              '<polygon points="60,280 180,60 420,60 540,280" fill="#161221" stroke="#3b82f6" stroke-width="1.5"/>' +
              '<rect x="160" y="110" width="120" height="90" rx="4" fill="#0b1b2d" stroke="#60a5fa" stroke-width="2"/>' +
              '<rect x="320" y="110" width="120" height="90" rx="4" fill="#0b1b2d" stroke="#60a5fa" stroke-width="2"/>' +
              '<text x="300" y="240" fill="#60a5fa" font-size="13" font-family="monospace" text-anchor="middle">AVIONICS // CAT III-A ALL WEATHER HUD</text>' +
              '</svg>';
          }
        }
      ],
      amenities: [
        'Ka-Band High-Speed Satellite Internet (unlimited streaming & video conferencing)',
        '100% Fresh Air HEPA Circulation System (air refreshed every 90 seconds)',
        'En-suite Master Lavatory with Full Stand-Up Hot Water Shower',
        'Dedicated In-Flight Hospitality Crew & Private Executive Chef',
        'Whisper-Quiet Acoustic Engineering (class-leading 48 dBA quiet zone)',
        'Transcontinental Baggage Capacity (195 cu ft with in-flight walk-in access)'
      ]
    },
    {
      id: 'g650er',
      name: 'Gulfstream G650ER',
      category: 'heavy',
      categoryLabel: 'Heavy & Ultra-Long',
      callsign: 'Registration: N650AR • Ultra-High-Speed Long Range',
      desc: 'The icon of speed and luxury. Reaching Mach 0.925 with 16 signature panoramic oval windows and industry-lowest cabin altitude, delivering guests fresh and energised across time zones.',
      rangeNm: 7500,
      rangeKm: 13890,
      speed: '956 km/h',
      speedMach: 'Mach 0.925',
      pax: 16,
      paxSleep: 7,
      cabinAlt: '3,000 ft @ 41k ft',
      baggage: '195 cu ft',
      rateHour: 13800,
      color: '#f59e0b',
      reachableByHub: {
        london: ['Hong Kong (Non-Stop)', 'Singapore (Non-Stop)', 'Sao Paulo (Non-Stop)', 'Los Angeles', 'Dubai'],
        newyork: ['Hong Kong (Non-Stop)', 'Johannesburg (Non-Stop)', 'Tokyo', 'London', 'Santiago'],
        dubai: ['Sydney (Non-Stop)', 'San Francisco (Non-Stop)', 'London', 'Tokyo', 'Cape Town'],
        geneva: ['Beijing (Non-Stop)', 'Los Angeles (Non-Stop)', 'Perth', 'Dubai', 'Tokyo']
      },
      photos: [
        {
          title: 'Panoramic 16-Window Main Salon',
          subtitle: 'Hand-stitched cream Connolly leather club seats with motorized electrochromic shades',
          icon: '🪟',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#13101d"/>' +
              '<ellipse cx="100" cy="90" rx="36" ry="50" fill="#0d1b2a" stroke="#f59e0b" stroke-width="2"/>' +
              '<ellipse cx="200" cy="90" rx="36" ry="50" fill="#0d1b2a" stroke="#f59e0b" stroke-width="2"/>' +
              '<ellipse cx="300" cy="90" rx="36" ry="50" fill="#0d1b2a" stroke="#f59e0b" stroke-width="2"/>' +
              '<ellipse cx="400" cy="90" rx="36" ry="50" fill="#0d1b2a" stroke="#f59e0b" stroke-width="2"/>' +
              '<ellipse cx="500" cy="90" rx="36" ry="50" fill="#0d1b2a" stroke="#f59e0b" stroke-width="2"/>' +
              '<rect x="80" y="170" width="440" height="90" rx="14" fill="#241e33" stroke="rgba(245,158,11,0.3)"/>' +
              '<text x="300" y="225" fill="#fef3c7" font-size="14" font-family="Cinzel, serif" text-anchor="middle">Signature Gulfstream Oval Windows</text>' +
              '</svg>';
          }
        },
        {
          title: 'Aft Executive Private Suite',
          subtitle: 'Transformable 3-place divan and berthing seats into master king bed',
          icon: '🛋️',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#0e0c15"/>' +
              '<rect x="120" y="70" width="360" height="160" rx="12" fill="#201a2f" stroke="#f59e0b" stroke-width="1.5"/>' +
              '<rect x="160" y="100" width="280" height="100" rx="8" fill="#322849"/>' +
              '<text x="300" y="155" fill="#e7e5e4" font-size="13" font-family="sans-serif" text-anchor="middle">4K Ultra HD Display &amp; Bowers &amp; Wilkins Audio</text>' +
              '</svg>';
          }
        },
        {
          title: 'Forward Master Galley',
          subtitle: 'Dual convection and microwave ovens, chilled wine storage, crystal stemware',
          icon: '🥂',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#100d18"/>' +
              '<rect x="100" y="50" width="400" height="190" rx="8" fill="#1b1627" stroke="rgba(255,255,255,0.1)"/>' +
              '<circle cx="200" cy="140" r="30" fill="#2f2542" stroke="#f59e0b" stroke-width="1"/>' +
              '<circle cx="400" cy="140" r="30" fill="#2f2542" stroke="#f59e0b" stroke-width="1"/>' +
              '<text x="300" y="145" fill="#a8a29e" font-size="13" font-family="sans-serif" text-anchor="middle">Crystal Stemware &amp; Wine Console</text>' +
              '</svg>';
          }
        },
        {
          title: 'Symmetry Flight Deck',
          subtitle: 'Active control sidesticks with 10 touch-screen displays and predictive windshear',
          icon: '🕹️',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#0a0812"/>' +
              '<path d="M 80,260 L 220,70 L 380,70 L 520,260 Z" fill="#171224" stroke="#0ea5e9" stroke-width="2"/>' +
              '<circle cx="300" cy="160" r="45" fill="#0d233a" stroke="#38bdf8" stroke-width="1.5"/>' +
              '<text x="300" y="235" fill="#38bdf8" font-size="12" font-family="monospace" text-anchor="middle">ACTIVE CONTROL SIDESTICKS</text>' +
              '</svg>';
          }
        }
      ],
      amenities: [
        '16 Signature Panoramic Oval Windows providing flooded natural daylight',
        'Lowest Cabin Altitude in Industry (3,000 ft) to eradicate travel fatigue',
        'Ka-band Satellite Ultra-Low Latency Wi-Fi with global coverage',
        '4K Cinematic Entertainment System with Bowers & Wilkins Spatial Surround',
        'Private Dressing Room & Aft Powder Room with granite countertops',
        'High-Volume Heated Luggage Hold with 2,500 lb capacity'
      ]
    },
    {
      id: 'longitude',
      name: 'Cessna Citation Longitude',
      category: 'midsize',
      categoryLabel: 'Super-Midsize',
      callsign: 'Registration: G-LONG • Transcontinental Executive',
      desc: 'Super-midsize excellence designed for coast-to-coast nonstop performance. Features the quietest cabin in its class, flat floor architecture, and fully berthing double-club leather seating.',
      rangeNm: 3500,
      rangeKm: 6482,
      speed: '876 km/h',
      speedMach: 'Mach 0.84',
      pax: 10,
      paxSleep: 4,
      cabinAlt: '4,950 ft @ 45k ft',
      baggage: '112 cu ft',
      rateHour: 8400,
      color: '#38bdf8',
      reachableByHub: {
        london: ['New York (Non-Stop)', 'Dubai (Non-Stop)', 'Cairo', 'Reykjavik', 'Casablanca'],
        newyork: ['London (Non-Stop)', 'San Francisco (Non-Stop)', 'Anchorage', 'Lima', 'Bogota'],
        dubai: ['London (Non-Stop)', 'Rome', 'Bangkok', 'Nairobi', 'Moscow'],
        geneva: ['New York (Non-Stop)', 'Dubai (Non-Stop)', 'Dakar', 'Tbilisi', 'Lagos']
      },
      photos: [
        {
          title: 'Double-Club Executive Suite',
          subtitle: 'Handcrafted leather seating with generous 30-inch legroom and lie-flat berthing',
          icon: '🪑',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#10111a"/>' +
              '<rect x="100" y="60" width="400" height="170" rx="14" fill="#1b1e2e" stroke="#38bdf8" stroke-width="1.5"/>' +
              '<rect x="140" y="90" width="80" height="90" rx="8" fill="#2d334d"/>' +
              '<rect x="380" y="90" width="80" height="90" rx="8" fill="#2d334d"/>' +
              '<line x1="240" y1="135" x2="360" y2="135" stroke="#f59e0b" stroke-dasharray="4"/>' +
              '<text x="300" y="210" fill="#93c5fd" font-size="13" font-family="sans-serif" text-anchor="middle">Class-Leading 30" Club Legroom</text>' +
              '</svg>';
          }
        },
        {
          title: 'Forward Refreshment Wet Bar',
          subtitle: 'Integrated espresso machine, cold beverage storage, and crystal glassware',
          icon: '☕',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#0d0f18"/>' +
              '<rect x="140" y="70" width="320" height="150" rx="10" fill="#181c2c" stroke="rgba(255,255,255,0.1)"/>' +
              '<circle cx="230" cy="130" r="24" fill="#2b3149" stroke="#38bdf8" stroke-width="1"/>' +
              '<rect x="310" y="105" width="90" height="50" rx="4" fill="#24293e"/>' +
              '<text x="300" y="195" fill="#a8a29e" font-size="12" font-family="sans-serif" text-anchor="middle">Artisanal Barista Bar &amp; Wine Rack</text>' +
              '</svg>';
          }
        },
        {
          title: 'Walk-In Heated Baggage Compartment',
          subtitle: 'Fully pressurized and accessible throughout flight at any cruising altitude',
          icon: '🧳',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#0a0c14"/>' +
              '<rect x="120" y="60" width="360" height="160" rx="8" fill="#161928" stroke="#38bdf8" stroke-width="1"/>' +
              '<rect x="160" y="90" width="60" height="80" rx="6" fill="#2e3550"/>' +
              '<rect x="240" y="90" width="60" height="80" rx="6" fill="#2e3550"/>' +
              '<rect x="320" y="90" width="60" height="80" rx="6" fill="#2e3550"/>' +
              '<text x="300" y="200" fill="#cbd5e1" font-size="12" font-family="sans-serif" text-anchor="middle">112 cu ft Pressurized In-Flight Access</text>' +
              '</svg>';
          }
        },
        {
          title: 'Garmin G5000 Integrated Flight Deck',
          subtitle: 'Four touchscreen controllers with 3D Synthetic Vision Technology',
          icon: '✈️',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#07080e"/>' +
              '<rect x="110" y="70" width="380" height="150" rx="8" fill="#131625" stroke="#38bdf8" stroke-width="1.5"/>' +
              '<rect x="140" y="95" width="90" height="65" fill="#082f49" stroke="#38bdf8" stroke-width="1"/>' +
              '<rect x="255" y="95" width="90" height="65" fill="#082f49" stroke="#38bdf8" stroke-width="1"/>' +
              '<rect x="370" y="95" width="90" height="65" fill="#082f49" stroke="#38bdf8" stroke-width="1"/>' +
              '<text x="300" y="195" fill="#38bdf8" font-size="12" font-family="monospace" text-anchor="middle">GARMIN G5000 TOUCHSCREEN</text>' +
              '</svg>';
          }
        }
      ],
      amenities: [
        'Lowest Interior Noise Levels in Midsize Category (whisper-quiet cabin)',
        'Full Walk-in Luggage Compartment accessible to passengers while airborne',
        'Touchscreen Cabin Management System controlling lighting, temperature, and audio',
        'Wireless In-Flight Streaming Entertainment & High-Speed Broadband',
        'Ergonomic Lie-Flat Berthing Seats for transcontinental rest',
        'Short-Field Takeoff Capability allowing direct access to regional private runways'
      ]
    },
    {
      id: 'phenom-300e',
      name: 'Embraer Phenom 300E',
      category: 'light',
      categoryLabel: 'Light Jet',
      callsign: 'Registration: HB-PHEN • Alpine High-Performance',
      desc: 'The best-selling light jet in the world for 12 consecutive years. Renowned for supreme runway agility into mountain airports (St. Moritz, Courchevel, Aspen) with Porsche-styled ergonomic cabin touches.',
      rangeNm: 2010,
      rangeKm: 3723,
      speed: '839 km/h',
      speedMach: 'Mach 0.80',
      pax: 7,
      paxSleep: 2,
      cabinAlt: '6,600 ft @ 45k ft',
      baggage: '84 cu ft',
      rateHour: 4900,
      color: '#a855f7',
      reachableByHub: {
        london: ['Athens (Non-Stop)', 'Reykjavik (Non-Stop)', 'Marrakech', 'Geneva', 'Nice'],
        newyork: ['Miami (Non-Stop)', 'Denver (Non-Stop)', 'Nassau (Bahamas)', 'Toronto', 'Chicago'],
        dubai: ['Cairo (Non-Stop)', 'Delhi (Non-Stop)', 'Istanbul', 'Baku', 'Male (Maldives)'],
        geneva: ['London (Non-Stop)', 'Nice (Non-Stop)', 'Ibiza', 'St. Moritz', 'Mykonos']
      },
      photos: [
        {
          title: 'Bossa Nova Interior Styling',
          subtitle: 'Two-tone contrast carbon weave seats designed by BMW Designworks',
          icon: '💺',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#120e1a"/>' +
              '<rect x="120" y="60" width="360" height="160" rx="12" fill="#201730" stroke="#a855f7" stroke-width="1.5"/>' +
              '<rect x="160" y="85" width="100" height="90" rx="10" fill="#362453" stroke="rgba(245,158,11,0.3)"/>' +
              '<rect x="340" y="85" width="100" height="90" rx="10" fill="#362453" stroke="rgba(245,158,11,0.3)"/>' +
              '<text x="300" y="200" fill="#e9d5ff" font-size="13" font-family="Cinzel, serif" text-anchor="middle">BMW Designworks Bossa Nova Cabin</text>' +
              '</svg>';
          }
        },
        {
          title: 'VIP Single Club Seating',
          subtitle: 'Individual USB-C fast charging, reading illumination, and carbon foldout table',
          icon: '📱',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#0d0914"/>' +
              '<rect x="150" y="70" width="300" height="145" rx="8" fill="#1b1328" stroke="rgba(255,255,255,0.1)"/>' +
              '<rect x="220" y="90" width="160" height="70" rx="6" fill="#2d1e43"/>' +
              '<text x="300" y="185" fill="#a8a29e" font-size="12" font-family="sans-serif" text-anchor="middle">Carbon Fiber Concealed Foldout Workstation</text>' +
              '</svg>';
          }
        },
        {
          title: 'Enclosed Private Aft Lavatory',
          subtitle: 'Solid privacy door with belted seat option and vanity sink mirror',
          icon: '🚪',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#09060e"/>' +
              '<rect x="160" y="60" width="280" height="160" rx="8" fill="#181124" stroke="#a855f7" stroke-width="1"/>' +
              '<circle cx="300" cy="120" r="30" fill="#281a3d" stroke="#f59e0b" stroke-width="1"/>' +
              '<text x="300" y="195" fill="#c084fc" font-size="12" font-family="sans-serif" text-anchor="middle">Enclosed Aft Lavatory with Vanity Mirror</text>' +
              '</svg>';
          }
        },
        {
          title: 'Prodigy Touch Flight Deck',
          subtitle: 'Single-pilot certified avionics suite with runway overrun awareness system',
          icon: '🎛️',
          render: function (w, h) {
            return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
              '<rect width="100%" height="100%" fill="#07050b"/>' +
              '<polygon points="90,260 210,70 390,70 510,260" fill="#150e21" stroke="#a855f7" stroke-width="1.5"/>' +
              '<rect x="180" y="110" width="100" height="70" rx="4" fill="#1e1033" stroke="#c084fc" stroke-width="1.5"/>' +
              '<rect x="320" y="110" width="100" height="70" rx="4" fill="#1e1033" stroke="#c084fc" stroke-width="1.5"/>' +
              '<text x="300" y="225" fill="#c084fc" font-size="12" font-family="monospace" text-anchor="middle">ROAAS // RUNWAY OVERRUN ALERT SYSTEM</text>' +
              '</svg>';
          }
        }
      ],
      amenities: [
        'Short-Runway Alpine Access: Land at Courchevel, St. Moritz, Aspen, and London City',
        'Largest Baggage Volume in Light Jet Class (84 cu ft)',
        'Lufthansa Technik nice HD Cabin Management System with tactile controls',
        'High-Speed Air-to-Ground Connectivity & Satellite Phone',
        'Dual-Zone Temperature Controls for cockpit and passenger cabin independence',
        'Premium Chilled Refreshment Center for vintage champagne and delicacies'
      ]
    }
  ];

  var state = {
    category: 'all',
    hub: 'london',
    activeAircraft: FLEET_DATA[0],
    activePhotoIdx: 0,
    activeTab: 'photo', // 'photo' or 'range'
    currency: 'USD',
    period: 'hour' // 'hour' or 'day'
  };

  var CURRENCIES = {
    USD: { code: 'USD', symbol: '$', rate: 1.0, locale: 'en-US' },
    EUR: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-DE' },
    GBP: { code: 'GBP', symbol: '£', rate: 0.79, locale: 'en-GB' },
    AED: { code: 'AED', symbol: 'AED ', rate: 3.67, locale: 'en-AE' }
  };

  function formatCharterPrice(usdAmount) {
    var c = CURRENCIES[state.currency] || CURRENCIES.USD;
    var converted = Math.round(usdAmount * c.rate);
    return c.symbol + converted.toLocaleString(c.locale);
  }


  // DOM Elements
  var hubSelect = document.getElementById('departureHubSelect');
  var filterTabs = document.querySelectorAll('.fleet-tab');
  var modalOverlay = document.getElementById('fleetModalOverlay');
  var modalCloseBtn = document.getElementById('modalCloseBtn');
  var modalTitle = document.getElementById('modalAircraftTitle');
  var modalCategory = document.getElementById('modalAircraftCategory');
  var modalCallsign = document.getElementById('modalAircraftCallsign');
  var modalSpeed = document.getElementById('modalSpecSpeed');
  var modalPax = document.getElementById('modalSpecPax');
  var modalAltitude = document.getElementById('modalSpecAltitude');
  var modalBaggage = document.getElementById('modalSpecBaggage');
  var modalCharterRate = document.getElementById('modalCharterRate');
  var modalAmenitiesList = document.getElementById('modalAmenitiesList');
  var btnCharterInquire = document.getElementById('btnCharterInquire');
  var charterInquiryToast = document.getElementById('charterInquiryToast');

  var tabPhotoTour = document.getElementById('tabPhotoTour');
  var tabRangeMap = document.getElementById('tabRangeMap');
  var tourPhotoStage = document.getElementById('tourPhotoStage');
  var tourRangeStage = document.getElementById('tourRangeStage');

  var tourSlideCounter = document.getElementById('tourSlideCounter');
  var tourSlideCaption = document.getElementById('tourSlideCaption');
  var tourVisualCanvas = document.getElementById('tourVisualCanvas');
  var tourPrevBtn = document.getElementById('tourPrevBtn');
  var tourNextBtn = document.getElementById('tourNextBtn');
  var tourThumbs = document.getElementById('tourThumbs');

  var rangeDisplayMiles = document.getElementById('rangeDisplayMiles');
  var rangeDisplayKm = document.getElementById('rangeDisplayKm');
  var rangeMapCanvas = document.getElementById('rangeMapCanvas');
  var rangeReachableChips = document.getElementById('rangeReachableChips');

  function renderCardArtwork(ac) {
    return '<svg viewBox="0 0 340 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
      '<defs>' +
      '  <radialGradient id="cardGlow-' + ac.id + '" cx="50%" cy="50%" r="50%">' +
      '    <stop offset="0%" stop-color="' + ac.color + '" stop-opacity="0.25"/>' +
      '    <stop offset="100%" stop-color="transparent" stop-opacity="0"/>' +
      '  </radialGradient>' +
      '</defs>' +
      '<rect width="100%" height="100%" fill="#0d0c13"/>' +
      '<circle cx="170" cy="90" r="80" fill="url(#cardGlow-' + ac.id + ')"/>' +
      '<!-- Radar rings -->' +
      '<circle cx="170" cy="90" r="40" fill="none" stroke="rgba(245,158,11,0.15)" stroke-dasharray="3 3"/>' +
      '<circle cx="170" cy="90" r="70" fill="none" stroke="rgba(245,158,11,0.1)"/>' +
      '<!-- Jet Silhouette -->' +
      '<path d="M 170,30 L 176,80 L 260,110 L 260,120 L 178,105 L 178,140 L 205,155 L 205,162 L 170,154 L 135,162 L 135,155 L 162,140 L 162,105 L 80,120 L 80,110 L 164,80 Z" ' +
      'fill="' + ac.color + '" stroke="#fff" stroke-width="0.8" opacity="0.95"/>' +
      '<circle cx="170" cy="35" r="3" fill="#fff"/>' +
      '</svg>';
  }

  function renderFleetGrid() {
    fleetGrid.textContent = '';
    var filtered = FLEET_DATA.filter(function (ac) {
      if (state.category === 'all') return true;
      return ac.category === state.category;
    });

    filtered.forEach(function (ac) {
      var card = document.createElement('article');
      card.className = 'fleet-card';
      card.setAttribute('data-id', ac.id);

      var media = document.createElement('div');
      media.className = 'fleet-card-media';

      var badge = document.createElement('span');
      badge.className = 'fleet-card-badge';
      badge.textContent = ac.categoryLabel.toUpperCase();

      var rangeBadge = document.createElement('div');
      rangeBadge.className = 'fleet-card-range-badge';
      rangeBadge.innerHTML = '<span>⚡</span> ' + ac.rangeNm.toLocaleString() + ' NM';

      var artwork = document.createElement('div');
      artwork.className = 'fleet-card-artwork';
      artwork.innerHTML = renderCardArtwork(ac);

      media.appendChild(badge);
      media.appendChild(rangeBadge);
      media.appendChild(artwork);

      var content = document.createElement('div');
      content.className = 'fleet-card-content';

      var header = document.createElement('div');
      header.className = 'fleet-card-header';
      var h3 = document.createElement('h3');
      h3.textContent = ac.name;
      var callsign = document.createElement('div');
      callsign.className = 'fleet-card-callsign';
      callsign.textContent = ac.callsign;
      header.appendChild(h3);
      header.appendChild(callsign);

      var desc = document.createElement('p');
      desc.className = 'fleet-card-desc';
      desc.textContent = ac.desc;

      // Specs Pills
      var specs = document.createElement('div');
      specs.className = 'fleet-card-specs';
      specs.innerHTML = '' +
        '<div class="spec-pill">' +
        '  <span class="spec-pill-icon">🚀</span>' +
        '  <div class="spec-pill-info"><span class="spec-pill-label">Cruise Speed</span><span class="spec-pill-val">' + ac.speedMach + '</span></div>' +
        '</div>' +
        '<div class="spec-pill">' +
        '  <span class="spec-pill-icon">👥</span>' +
        '  <div class="spec-pill-info"><span class="spec-pill-label">Capacity</span><span class="spec-pill-val">' + ac.pax + ' Guests</span></div>' +
        '</div>' +
        '<div class="spec-pill">' +
        '  <span class="spec-pill-icon">🏔️</span>' +
        '  <div class="spec-pill-info"><span class="spec-pill-label">Cabin Alt</span><span class="spec-pill-val">' + ac.cabinAlt.split(' ')[0] + '</span></div>' +
        '</div>' +
        '<div class="spec-pill">' +
        '  <span class="spec-pill-icon">🧳</span>' +
        '  <div class="spec-pill-info"><span class="spec-pill-label">Baggage</span><span class="spec-pill-val">' + ac.baggage.split(' ')[0] + ' cu ft</span></div>' +
        '</div>';

      // Reachable from current hub
      var reachWrap = document.createElement('div');
      reachWrap.className = 'fleet-card-reach';
      var reachLabel = document.createElement('span');
      reachLabel.className = 'reach-label';
      var hubName = hubSelect.options[hubSelect.selectedIndex].text.split(' (')[0];
      reachLabel.textContent = 'Non-stop from ' + hubName + ':';
      reachWrap.appendChild(reachLabel);

      var pillsWrap = document.createElement('div');
      pillsWrap.className = 'reach-pills';
      var list = ac.reachableByHub[state.hub] || [];
      list.slice(0, 3).forEach(function (dest) {
        var p = document.createElement('span');
        p.className = 'reach-pill';
        p.textContent = dest;
        pillsWrap.appendChild(p);
      });
      reachWrap.appendChild(pillsWrap);

      // Footer
      var footer = document.createElement('div');
      footer.className = 'fleet-card-footer';
      var rateBox = document.createElement('div');
      rateBox.className = 'fleet-rate-box';

      var currentRate = state.period === 'day' ? ac.rateHour * 8 : ac.rateHour;
      var unitText = state.period === 'day' ? '/ 8h day block' : '/ flight hr';
      var basePortion = currentRate * 0.85;
      var incPortion = currentRate * 0.15;

      rateBox.innerHTML = '' +
        '<div class="rate-header-row">' +
        '  <span>Charter from</span>' +
        '  <button type="button" class="price-info-trigger" aria-label="View pricing inclusions and breakdown for ' + ac.name + '" aria-expanded="false" title="Click or hover for price breakdown">' +
        '    <span class="info-icon" aria-hidden="true">ⓘ</span>' +
        '    <span class="info-label">Inclusions</span>' +
        '  </button>' +
        '</div>' +
        '<div class="rate-amount-row">' +
        '  <strong>' + formatCharterPrice(currentRate) + '</strong>' +
        '  <small>' + unitText + '</small>' +
        '</div>' +
        '<div class="price-breakdown-tooltip" role="tooltip" aria-hidden="true">' +
        '  <div class="tooltip-gold-bar"></div>' +
        '  <div class="tooltip-header">' +
        '    <span class="tooltip-kicker">ALL-INCLUSIVE CHARTER PRICING</span>' +
        '    <h4 class="tooltip-title">' + ac.name + '</h4>' +
        '  </div>' +
        '  <div class="tooltip-inclusions-list">' +
        '    <div class="inc-item"><span class="inc-icon">👨‍✈️</span><div class="inc-desc"><strong>Two Type-Rated Captains &amp; VIP Cabin Attendant</strong><span>Professional flight crew &amp; white-glove service</span></div><span class="inc-tag">Included</span></div>' +
        '    <div class="inc-item"><span class="inc-icon">⛽</span><div class="inc-desc"><strong>Jet A-1 Fuel &amp; Reserve Tankage</strong><span>Maximum cruise range with zero hidden surcharges</span></div><span class="inc-tag">Included</span></div>' +
        '    <div class="inc-item"><span class="inc-icon">🥂</span><div class="inc-desc"><strong>Michelin-Caliber Gourmet Dining &amp; Cellar</strong><span>Custom hot dining menu &amp; vintage champagne</span></div><span class="inc-tag">Included</span></div>' +
        '    <div class="inc-item"><span class="inc-icon">🛫</span><div class="inc-desc"><strong>Private VIP FBO Terminal &amp; Landing Permits</strong><span>Dedicated executive lounge, de-icing &amp; handling</span></div><span class="inc-tag">Included</span></div>' +
        '    <div class="inc-item"><span class="inc-icon">🛜</span><div class="inc-desc"><strong>Ka-Band Ultra Satellite Connectivity</strong><span>Global uninterrupted Wi-Fi &amp; video calling</span></div><span class="inc-tag">Included</span></div>' +
        '  </div>' +
        '  <div class="tooltip-pricing-summary">' +
        '    <div class="tooltip-row"><span>Base Aircraft Rate:</span><strong>' + formatCharterPrice(basePortion) + '</strong></div>' +
        '    <div class="tooltip-row gold"><span>VIP Concierge Inclusions (15%):</span><strong>' + formatCharterPrice(incPortion) + '</strong></div>' +
        '    <div class="tooltip-row total"><span>Total Charter Rate:</span><strong>' + formatCharterPrice(currentRate) + ' ' + unitText + '</strong></div>' +
        '  </div>' +
        '  <div class="tooltip-hub-note">No repositioning fees from London, NY, Dubai, or Geneva.</div>' +
        '</div>';

      var infoTrigger = rateBox.querySelector('.price-info-trigger');
      if (infoTrigger) {
        infoTrigger.addEventListener('click', function (e) {
          e.stopPropagation();
          var isActive = infoTrigger.classList.toggle('is-active');
          infoTrigger.setAttribute('aria-expanded', String(isActive));
        });
      }

      var tourBtn = document.createElement('button');
      tourBtn.type = 'button';
      tourBtn.className = 'btn-open-tour';
      tourBtn.textContent = 'Walkthrough Cabin ↗';
      tourBtn.setAttribute('aria-label', 'Open cabin walkthrough modal for ' + ac.name);
      tourBtn.addEventListener('click', function () {
        openModal(ac);
      });

      footer.appendChild(rateBox);
      footer.appendChild(tourBtn);

      content.appendChild(header);
      content.appendChild(desc);
      content.appendChild(specs);
      content.appendChild(reachWrap);
      content.appendChild(footer);

      card.appendChild(media);
      card.appendChild(content);
      fleetGrid.appendChild(card);
    });
  }

  function renderRangeMapSVG(ac) {
    var hubNames = {
      london: { name: 'London Farnborough', code: 'EGLF', cx: 280, cy: 110 },
      newyork: { name: 'New York Teterboro', code: 'KTEB', cx: 180, cy: 130 },
      dubai: { name: 'Dubai Al Maktoum', code: 'DWC', cx: 390, cy: 150 },
      geneva: { name: 'Geneva Cointrin', code: 'LSGG', cx: 290, cy: 125 }
    };
    var origin = hubNames[state.hub] || hubNames.london;
    // Map radius in px mapped from rangeNm
    var radius = Math.min(240, Math.max(60, (ac.rangeNm / 8000) * 230));

    return '<svg viewBox="0 0 600 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
      '<defs>' +
      '  <radialGradient id="mapGlow" cx="' + origin.cx + '" cy="' + origin.cy + '" r="' + radius + '" gradientUnits="userSpaceOnUse">' +
      '    <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>' +
      '    <stop offset="70%" stop-color="#f59e0b" stop-opacity="0.08"/>' +
      '    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>' +
      '  </radialGradient>' +
      '</defs>' +
      '<!-- Global grid lines -->' +
      '<line x1="0" y1="70" x2="600" y2="70" stroke="rgba(255,255,255,0.06)"/>' +
      '<line x1="0" y1="140" x2="600" y2="140" stroke="rgba(255,255,255,0.06)"/>' +
      '<line x1="0" y1="210" x2="600" y2="210" stroke="rgba(255,255,255,0.06)"/>' +
      '<line x1="150" y1="0" x2="150" y2="280" stroke="rgba(255,255,255,0.06)"/>' +
      '<line x1="300" y1="0" x2="300" y2="280" stroke="rgba(255,255,255,0.06)"/>' +
      '<line x1="450" y1="0" x2="450" y2="280" stroke="rgba(255,255,255,0.06)"/>' +
      '<!-- World Landmass Abstract Outlines -->' +
      '<path d="M 120,80 Q 180,60 210,120 Q 230,170 180,240 Q 130,220 110,140 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>' +
      '<path d="M 270,70 Q 320,50 360,90 Q 330,150 290,250 Q 260,180 270,70 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>' +
      '<path d="M 370,60 Q 520,50 560,130 Q 500,210 430,220 Q 390,140 370,60 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>' +
      '<!-- Non-Stop Flight Reach Arc Area -->' +
      '<circle cx="' + origin.cx + '" cy="' + origin.cy + '" r="' + radius + '" fill="url(#mapGlow)"/>' +
      '<circle cx="' + origin.cx + '" cy="' + origin.cy + '" r="' + radius + '" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 3"/>' +
      '<circle cx="' + origin.cx + '" cy="' + origin.cy + '" r="' + (radius * 0.6) + '" fill="none" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>' +
      '<!-- Hub Origin Marker -->' +
      '<circle cx="' + origin.cx + '" cy="' + origin.cy + '" r="7" fill="#f59e0b"/>' +
      '<circle cx="' + origin.cx + '" cy="' + origin.cy + '" r="14" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.6"/>' +
      '<text x="' + origin.cx + '" y="' + (origin.cy - 16) + '" fill="#fef3c7" font-size="12" font-family="Cinzel, serif" font-weight="700" text-anchor="middle">' + origin.code + ' HUB</text>' +
      '<!-- Range Telemetry Tag -->' +
      '<rect x="20" y="240" width="220" height="28" rx="6" fill="rgba(10,9,13,0.85)" stroke="rgba(245,158,11,0.3)"/>' +
      '<text x="30" y="258" fill="#f59e0b" font-size="11" font-family="monospace">RADAR REACH: ' + ac.rangeNm.toLocaleString() + ' NM NON-STOP</text>' +
      '</svg>';
  }

  function updateModalVisuals() {
    var ac = state.activeAircraft;
    if (!ac) return;

    var curPhoto = ac.photos[state.activePhotoIdx];
    tourSlideCounter.textContent = (state.activePhotoIdx + 1) + ' / ' + ac.photos.length;
    tourSlideCaption.textContent = curPhoto.title;
    tourVisualCanvas.innerHTML = curPhoto.render(600, 380);

    // Update thumbnails active state
    var thumbBtns = tourThumbs.querySelectorAll('.tour-thumb-btn');
    thumbBtns.forEach(function (btn, idx) {
      btn.classList.toggle('active', idx === state.activePhotoIdx);
      btn.setAttribute('aria-selected', String(idx === state.activePhotoIdx));
    });

    // Range display stats
    rangeDisplayMiles.textContent = ac.rangeNm.toLocaleString() + ' NM';
    rangeDisplayKm.textContent = '(' + ac.rangeKm.toLocaleString() + ' KM)';
    rangeMapCanvas.innerHTML = renderRangeMapSVG(ac);

    // Reachable destination chips
    rangeReachableChips.textContent = '';
    var reachable = ac.reachableByHub[state.hub] || [];
    reachable.forEach(function (dest) {
      var chip = document.createElement('span');
      chip.className = 'range-chip';
      chip.textContent = '✈ ' + dest;
      rangeReachableChips.appendChild(chip);
    });
  }

  function openModal(ac) {
    state.activeAircraft = ac;
    state.activePhotoIdx = 0;
    state.activeTab = 'photo';

    modalTitle.textContent = ac.name;
    modalCategory.textContent = ac.categoryLabel.toUpperCase();
    modalCallsign.textContent = ac.callsign;
    modalSpeed.textContent = ac.speedMach + ' / ' + ac.speed;
    modalPax.textContent = ac.pax + ' Passengers (Sleeps ' + ac.paxSleep + ')';
    modalAltitude.textContent = ac.cabinAlt;
    modalBaggage.textContent = ac.baggage;
    var modalRate = state.period === 'day' ? ac.rateHour * 8 : ac.rateHour;
    var modalUnit = state.period === 'day' ? '/ 8h day block' : '/ flight hour';
    modalCharterRate.innerHTML = formatCharterPrice(modalRate) + ' <small>' + modalUnit + '</small>';

    // Build Amenities list
    modalAmenitiesList.textContent = '';
    ac.amenities.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'amenity-item';
      var check = document.createElement('span');
      check.className = 'amenity-check';
      check.textContent = '✓';
      var txt = document.createElement('span');
      txt.textContent = item;
      li.appendChild(check);
      li.appendChild(txt);
      modalAmenitiesList.appendChild(li);
    });

    // Build photo thumbnails
    tourThumbs.textContent = '';
    ac.photos.forEach(function (p, idx) {
      var tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = 'tour-thumb-btn' + (idx === 0 ? ' active' : '');
      tBtn.setAttribute('role', 'tab');
      tBtn.setAttribute('aria-selected', String(idx === 0));
      tBtn.setAttribute('aria-label', p.title);
      tBtn.innerHTML = '<span class="tour-thumb-icon">' + p.icon + '</span><span class="tour-thumb-label">' + p.title.split(' ')[0] + '</span>';
      tBtn.addEventListener('click', function () {
        state.activePhotoIdx = idx;
        updateModalVisuals();
      });
      tourThumbs.appendChild(tBtn);
    });

    // Reset tabs
    tabPhotoTour.classList.add('active');
    tabPhotoTour.setAttribute('aria-selected', 'true');
    tabRangeMap.classList.remove('active');
    tabRangeMap.setAttribute('aria-selected', 'false');
    tourPhotoStage.hidden = false;
    tourRangeStage.hidden = true;

    charterInquiryToast.hidden = true;
    updateModalVisuals();

    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  // Event Listeners
  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      filterTabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      state.category = tab.getAttribute('data-category');
      renderFleetGrid();
    });
  });

  hubSelect.addEventListener('change', function () {
    state.hub = hubSelect.value;
    renderFleetGrid();
    if (!modalOverlay.hidden) {
      updateModalVisuals();
    }
  });

  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  window.addEventListener('keydown', function (e) {
    if (modalOverlay.hidden) return;
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowLeft') {
      tourPrevBtn.click();
    } else if (e.key === 'ArrowRight') {
      tourNextBtn.click();
    }
  });

  tourPrevBtn.addEventListener('click', function () {
    var ac = state.activeAircraft;
    if (!ac) return;
    state.activePhotoIdx = (state.activePhotoIdx - 1 + ac.photos.length) % ac.photos.length;
    updateModalVisuals();
  });

  tourNextBtn.addEventListener('click', function () {
    var ac = state.activeAircraft;
    if (!ac) return;
    state.activePhotoIdx = (state.activePhotoIdx + 1) % ac.photos.length;
    updateModalVisuals();
  });

  tabPhotoTour.addEventListener('click', function () {
    tabPhotoTour.classList.add('active');
    tabPhotoTour.setAttribute('aria-selected', 'true');
    tabRangeMap.classList.remove('active');
    tabRangeMap.setAttribute('aria-selected', 'false');
    tourPhotoStage.hidden = false;
    tourRangeStage.hidden = true;
  });

  tabRangeMap.addEventListener('click', function () {
    tabRangeMap.classList.add('active');
    tabRangeMap.setAttribute('aria-selected', 'true');
    tabPhotoTour.classList.remove('active');
    tabPhotoTour.setAttribute('aria-selected', 'false');
    tourPhotoStage.hidden = true;
    tourRangeStage.hidden = false;
    updateModalVisuals();
  });

  btnCharterInquire.addEventListener('click', function () {
    var ac = state.activeAircraft;
    charterInquiryToast.textContent = '✓ VIP Flight Desk holds allocation ' + ac.callsign.split(' ')[1] + '. Our concierge will contact you in under 15 minutes.';
    charterInquiryToast.hidden = false;
  });

  // Currency & Rate Period Toggle Listeners
  var currencyPills = document.querySelectorAll('.currency-pill');
  var periodPills = document.querySelectorAll('.period-pill');

  currencyPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var curr = pill.dataset.currency;
      if (!CURRENCIES[curr]) return;
      state.currency = curr;
      currencyPills.forEach(function (p) {
        var isMatch = p === pill;
        p.classList.toggle('active', isMatch);
        p.setAttribute('aria-checked', String(isMatch));
      });
      renderFleetGrid();
      if (!modalOverlay.hidden && state.activeAircraft) {
        var modalRate = state.period === 'day' ? state.activeAircraft.rateHour * 8 : state.activeAircraft.rateHour;
        var modalUnit = state.period === 'day' ? '/ 8h day block' : '/ flight hour';
        modalCharterRate.innerHTML = formatCharterPrice(modalRate) + ' <small>' + modalUnit + '</small>';
      }
    });
  });

  periodPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var period = pill.dataset.period;
      if (period !== 'hour' && period !== 'day') return;
      state.period = period;
      periodPills.forEach(function (p) {
        p.classList.toggle('active', p === pill);
      });
      renderFleetGrid();
      if (!modalOverlay.hidden && state.activeAircraft) {
        var modalRate = state.period === 'day' ? state.activeAircraft.rateHour * 8 : state.activeAircraft.rateHour;
        var modalUnit = state.period === 'day' ? '/ 8h day block' : '/ flight hour';
        modalCharterRate.innerHTML = formatCharterPrice(modalRate) + ' <small>' + modalUnit + '</small>';
      }
    });
  });

  // Global click to dismiss active tooltips
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.price-info-trigger') && !e.target.closest('.price-breakdown-tooltip')) {
      document.querySelectorAll('.price-info-trigger.is-active').forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Initial render
  renderFleetGrid();
})();
/* ===== END issue #103 ===== */


/* ===== BEGIN issue #201: virtual video walkthrough player with chapters ===== */
(function () {
  'use strict';

  var W = 960;
  var H = 540;
  var DURATION = 170;
  var SPEEDS = [1, 1.5, 2];

  // Start times are in seconds. A chapter runs until the next one starts.
  var CHAPTERS = [
    { id: 'arrival', title: 'Estate Arrival', start: 0, scene: 'arrival', desc: 'Dusk approach along the lantern-lit drive.' },
    { id: 'suite', title: 'Master Suite', start: 28, scene: 'suite', desc: 'Sea-facing owner suite with a private dressing room.' },
    { id: 'helipad', title: 'Private Helipad', start: 62, scene: 'helipad', desc: 'Cliffside pad with a two minute transfer to the jet.' },
    { id: 'cellar', title: 'Wine Cellar', start: 98, scene: 'cellar', desc: 'Vaulted stone cellar holding 2,400 bottles.' },
    { id: 'terrace', title: 'Infinity Terrace', start: 132, scene: 'terrace', desc: 'Edgeless pool that melts into the horizon at sunset.' }
  ];

  var openBtn = document.getElementById('vt-open');
  var dialog = document.getElementById('vt-dialog');
  if (!openBtn || !dialog || typeof dialog.showModal !== 'function') return;

  var canvas = document.getElementById('vt-canvas');
  var seek = document.getElementById('vt-seek');
  var ticks = document.getElementById('vt-ticks');
  var playBtn = document.getElementById('vt-play');
  var prevBtn = document.getElementById('vt-prev');
  var nextBtn = document.getElementById('vt-next');
  var speedBtn = document.getElementById('vt-speed');
  var fullBtn = document.getElementById('vt-full');
  var closeBtn = document.getElementById('vt-close');
  var curEl = document.getElementById('vt-cur');
  var durEl = document.getElementById('vt-dur');
  var player = document.getElementById('vt-player');
  var stage = document.getElementById('vt-stage');
  var capNum = document.getElementById('vt-cap-num');
  var capTitle = document.getElementById('vt-cap-title');
  var chapterList = document.getElementById('vt-chapter-list');
  var chips = document.getElementById('vt-chips');
  var live = document.getElementById('vt-live');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = reduceMotion ? 0.25 : 1;

  var state = { t: 0, playing: false, speed: 1, chapter: -1, ended: false, opener: null };
  var rafId = 0;
  var lastStamp = 0;
  var chapterEls = [];

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + pad(sec % 60);
  }
  function spoken(sec) {
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m ? m + (m === 1 ? ' minute ' : ' minutes ') : '') + s + (s === 1 ? ' second' : ' seconds');
  }
  function chapterEnd(i) { return i + 1 < CHAPTERS.length ? CHAPTERS[i + 1].start : DURATION; }
  function chapterAt(t) {
    var idx = 0;
    for (var i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i].start) idx = i;
    return idx;
  }

  // ---------- Procedural footage (no video file, everything is drawn on canvas) ----------
  function rng(seed) {
    var s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  var rand = rng(2026);
  var STARS = [];
  for (var si = 0; si < 70; si++) STARS.push([rand(), rand(), rand()]);

  function vgrad(c, h, stops) {
    var g = c.createLinearGradient(0, 0, 0, h);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function glow(c, x, y, r, rgb, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function stars(c, t, limitY, alpha) {
    c.fillStyle = '#fff';
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      c.globalAlpha = alpha * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.1 + s[2] * 20)));
      c.fillRect(s[0] * W, s[1] * limitY, 1.8, 1.8);
    }
    c.globalAlpha = 1;
  }

  function sceneArrival(c, p, t) {
    var hz = H * 0.58;
    c.fillStyle = vgrad(c, hz, [[0, '#120b24'], [0.55, '#5b2a4a'], [1, '#f59e0b']]);
    c.fillRect(0, 0, W, hz);
    stars(c, t, hz * 0.55, 0.9);
    c.fillStyle = '#0c0a10';
    c.fillRect(0, hz, W, H - hz);
    // driveway
    c.fillStyle = '#1d1722';
    c.beginPath();
    c.moveTo(W / 2 - 10, hz);
    c.lineTo(W / 2 - 330, H);
    c.lineTo(W / 2 + 330, H);
    c.lineTo(W / 2 + 10, hz);
    c.closePath();
    c.fill();
    // villa, pushes in slowly
    c.save();
    c.translate(W / 2, hz);
    var sc = 1 + p * 0.28 * motion;
    c.scale(sc, sc);
    c.fillStyle = '#07050b';
    c.fillRect(-300, -64, 600, 64);
    c.fillRect(-190, -108, 250, 46);
    c.fillRect(-310, -70, 620, 6);
    c.fillRect(-200, -114, 270, 6);
    for (var i = 0; i < 9; i++) {
      var a = 0.75 + 0.25 * Math.sin(t * 1.7 + i * 2.3) * motion;
      c.fillStyle = 'rgba(252,211,77,' + a + ')';
      c.fillRect(-270 + i * 62, -48, 34, 30);
      if (i > 1 && i < 6) c.fillRect(-170 + (i - 2) * 58, -96, 30, 24);
    }
    c.restore();
    // cypress trees
    c.fillStyle = '#06050a';
    [[-420, 96], [-340, 70], [380, 90], [460, 64]].forEach(function (tr) {
      c.beginPath();
      c.ellipse(W / 2 + tr[0], hz - tr[1] + 18, 18, tr[1], 0, 0, Math.PI * 2);
      c.fill();
    });
    // receding lanterns
    for (var k = 0; k < 7; k++) {
      var f = ((k / 7) + p * 0.9 * motion + t * 0.01 * motion) % 1;
      var e = f * f;
      var y = hz + (H - hz) * e;
      var off = 14 + 320 * e;
      var r = 2 + 9 * e;
      [-1, 1].forEach(function (side) {
        glow(c, W / 2 + side * off, y - r * 2, r * 7, '253,224,138', 0.55);
        c.fillStyle = '#fde68a';
        c.beginPath();
        c.arc(W / 2 + side * off, y - r * 2, r * 0.7, 0, Math.PI * 2);
        c.fill();
      });
    }
  }

  function sceneSuite(c, p, t) {
    var pan = -p * 60 * motion;
    c.fillStyle = vgrad(c, H, [[0, '#2a1d14'], [1, '#150f0b']]);
    c.fillRect(0, 0, W, H);
    c.save();
    c.translate(pan, 0);
    // sea-view window
    c.fillStyle = vgrad(c, 330, [[0, '#07102a'], [0.6, '#12315c'], [1, '#0b1e3d']]);
    c.fillRect(560, 70, 340, 270);
    c.fillStyle = '#fef3c7';
    c.beginPath();
    c.arc(800, 140, 24, 0, Math.PI * 2);
    c.fill();
    glow(c, 800, 140, 90, '254,243,199', 0.25);
    c.strokeStyle = 'rgba(254,243,199,0.35)';
    c.lineWidth = 2;
    for (var i = 0; i < 9; i++) {
      var wy = 230 + i * 11;
      var wob = Math.sin(t * 0.9 + i) * 10 * motion;
      c.beginPath();
      c.moveTo(780 - i * 4 + wob, wy);
      c.lineTo(820 + i * 4 + wob, wy);
      c.stroke();
    }
    c.strokeStyle = '#3b2a18';
    c.lineWidth = 10;
    c.strokeRect(560, 70, 340, 270);
    c.beginPath();
    c.moveTo(730, 70);
    c.lineTo(730, 340);
    c.stroke();
    // curtains
    c.fillStyle = '#6b4a2a';
    [[520, 1], [900, -1]].forEach(function (cu) {
      c.beginPath();
      c.moveTo(cu[0], 50);
      c.lineTo(cu[0] + cu[1] * 70, 50);
      for (var y = 50; y <= 360; y += 10) {
        c.lineTo(cu[0] + cu[1] * (70 + Math.sin(y * 0.09 + t * 0.8) * 5 * motion), y);
      }
      c.lineTo(cu[0], 360);
      c.closePath();
      c.fill();
    });
    // floor and rug
    c.fillStyle = '#120d09';
    c.fillRect(-80, 390, W + 160, H);
    c.fillStyle = '#3a2a1b';
    rrect(c, 60, 440, 520, 70, 10);
    c.fill();
    // bed
    c.fillStyle = '#3a2616';
    rrect(c, 120, 170, 380, 150, 10);
    c.fill();
    c.fillStyle = vgrad(c, 400, [[0, '#e7c98a'], [0.75, '#c99a48'], [1, '#8c6a2c']]);
    rrect(c, 100, 300, 420, 100, 12);
    c.fill();
    c.fillStyle = '#f6efde';
    rrect(c, 150, 262, 130, 50, 14);
    c.fill();
    rrect(c, 330, 262, 130, 50, 14);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(100, 340, 420, 6);
    // bedside lamp
    c.fillStyle = '#2a1b0f';
    c.fillRect(548, 330, 70, 60);
    var fl = 0.55 + 0.1 * Math.sin(t * 6) * motion;
    glow(c, 583, 290, 170, '255,200,110', fl);
    c.fillStyle = '#fde68a';
    c.beginPath();
    c.moveTo(560, 330);
    c.lineTo(606, 330);
    c.lineTo(596, 286);
    c.lineTo(570, 286);
    c.closePath();
    c.fill();
    c.restore();
  }

  function sceneHelipad(c, p, t) {
    var hz = H * 0.5;
    c.fillStyle = vgrad(c, hz, [[0, '#1d1240'], [0.5, '#a3345b'], [1, '#fb923c']]);
    c.fillRect(0, 0, W, hz);
    c.fillStyle = vgrad(c, H - hz, [[0, '#7c2d3a'], [0.15, '#14213d'], [1, '#080d1c']]);
    c.save();
    c.translate(0, hz);
    c.fillRect(0, 0, W, H - hz);
    c.restore();
    // sun glint on water
    c.strokeStyle = 'rgba(253,186,116,0.35)';
    c.lineWidth = 2;
    for (var i = 0; i < 10; i++) {
      var y = hz + 8 + i * 10;
      c.beginPath();
      c.moveTo(W * 0.3 + Math.sin(t + i) * 14 * motion, y);
      c.lineTo(W * 0.7 + Math.sin(t * 1.2 + i) * 14 * motion, y);
      c.stroke();
    }
    // cliff pad
    c.fillStyle = '#0f0c14';
    c.beginPath();
    c.moveTo(0, H);
    c.lineTo(0, 380);
    c.lineTo(W, 370);
    c.lineTo(W, H);
    c.closePath();
    c.fill();
    var cx = W / 2;
    var cy = 430;
    c.fillStyle = '#26212c';
    c.beginPath();
    c.ellipse(cx, cy, 250, 56, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#f59e0b';
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(cx, cy, 218, 47, 0, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#f59e0b';
    c.font = '700 64px Cinzel, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.save();
    c.translate(cx, cy);
    c.scale(1, 0.32);
    c.fillText('H', 0, 0);
    c.restore();
    // pulsing perimeter lights
    for (var j = 0; j < 16; j++) {
      var ang = (j / 16) * Math.PI * 2;
      var on = 0.45 + 0.55 * Math.max(0, Math.sin(t * 3 - j * 0.6));
      var lx = cx + Math.cos(ang) * 240;
      var ly = cy + Math.sin(ang) * 54;
      glow(c, lx, ly, 18, '253,224,138', on * 0.8);
      c.fillStyle = 'rgba(254,243,199,' + (0.4 + on * 0.6) + ')';
      c.fillRect(lx - 2, ly - 2, 4, 4);
    }
    // helicopter descends over the chapter and settles
    var land = Math.min(1, p / 0.7);
    var ease = 1 - Math.pow(1 - land, 3);
    var hx = cx + (1 - ease) * 260 * motion;
    var hy = 150 + ease * 205;
    c.fillStyle = '#0a0810';
    c.beginPath();
    c.ellipse(hx, hy, 62, 24, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(hx + 40, hy - 6, 88, 8);
    c.beginPath();
    c.moveTo(hx + 126, hy - 24);
    c.lineTo(hx + 138, hy - 24);
    c.lineTo(hx + 128, hy + 2);
    c.closePath();
    c.fill();
    c.strokeStyle = '#0a0810';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(hx - 40, hy + 34);
    c.lineTo(hx + 40, hy + 34);
    c.moveTo(hx - 22, hy + 20);
    c.lineTo(hx - 26, hy + 34);
    c.moveTo(hx + 22, hy + 20);
    c.lineTo(hx + 26, hy + 34);
    c.stroke();
    c.fillStyle = 'rgba(125,211,252,0.55)';
    c.beginPath();
    c.ellipse(hx - 24, hy - 4, 24, 12, 0, 0, Math.PI * 2);
    c.fill();
    // rotor
    var spinning = land < 1 || p < 0.9;
    c.fillStyle = 'rgba(10,8,16,' + (spinning ? 0.35 : 0.8) + ')';
    c.beginPath();
    c.ellipse(hx, hy - 30, 150, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#0a0810';
    c.lineWidth = 3;
    var blade = Math.cos(t * 28) * 150;
    c.beginPath();
    c.moveTo(hx - blade, hy - 30);
    c.lineTo(hx + blade, hy - 30);
    c.stroke();
    c.fillRect(hx - 3, hy - 30, 6, 10);
  }

  function sceneCellar(c, p, t) {
    var pan = -p * 80 * motion;
    c.fillStyle = vgrad(c, H, [[0, '#120d0a'], [1, '#050403']]);
    c.fillRect(0, 0, W, H);
    c.save();
    c.translate(pan, 0);
    // stone arches
    for (var a = 0; a < 5; a++) {
      var ax = 40 + a * 240;
      c.strokeStyle = '#4a3b2c';
      c.lineWidth = 14;
      c.beginPath();
      c.moveTo(ax, 380);
      c.lineTo(ax, 190);
      c.arc(ax + 110, 190, 110, Math.PI, 0);
      c.lineTo(ax + 220, 380);
      c.stroke();
      // rack lattice inside the arch
      c.fillStyle = '#1b130d';
      c.fillRect(ax + 10, 190, 200, 190);
      c.strokeStyle = '#3a2a1a';
      c.lineWidth = 3;
      for (var ry = 0; ry < 4; ry++) {
        c.strokeRect(ax + 10, 200 + ry * 44, 200, 44);
        for (var rx = 0; rx < 5; rx++) {
          var bx = ax + 30 + rx * 40;
          var by = 222 + ry * 44;
          c.fillStyle = '#2b3a22';
          c.beginPath();
          c.arc(bx, by, 14, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#0d1409';
          c.beginPath();
          c.arc(bx, by, 9, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.18)';
          c.fillRect(bx - 7, by - 8, 4, 4);
        }
      }
    }
    // stone floor and tasting table
    c.fillStyle = '#1a140f';
    c.fillRect(-100, 380, W + 600, H);
    c.fillStyle = '#4a3220';
    rrect(c, 300, 400, 260, 26, 6);
    c.fill();
    c.fillRect(320, 426, 14, 80);
    c.fillRect(526, 426, 14, 80);
    // glasses
    c.strokeStyle = 'rgba(254,243,199,0.7)';
    c.lineWidth = 2;
    [350, 430, 500].forEach(function (gx) {
      c.beginPath();
      c.moveTo(gx - 10, 360);
      c.quadraticCurveTo(gx, 388, gx + 10, 360);
      c.moveTo(gx, 380);
      c.lineTo(gx, 400);
      c.stroke();
    });
    // candle
    var flick = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 5.3);
    glow(c, 430, 360, 280, '255,190,100', 0.42 * (1 - (1 - flick) * motion));
    c.fillStyle = '#f5ecd7';
    c.fillRect(424, 372, 12, 28);
    c.fillStyle = '#fbbf24';
    c.beginPath();
    c.ellipse(430, 364, 4, 9 * (0.85 + 0.15 * flick), 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function sceneTerrace(c, p, t) {
    var hz = H * 0.5;
    var push = 1 + p * 0.12 * motion;
    c.save();
    c.translate(W / 2, hz);
    c.scale(push, push);
    c.translate(-W / 2, -hz);
    c.fillStyle = vgrad(c, hz, [[0, '#2b1458'], [0.45, '#d9486b'], [0.85, '#fbbf24'], [1, '#fde68a']]);
    c.fillRect(-60, -60, W + 120, hz + 60);
    var sunY = hz - 90 + p * 86;
    glow(c, W / 2, sunY, 240, '253,224,138', 0.55);
    c.fillStyle = '#fff3c4';
    c.beginPath();
    c.arc(W / 2, sunY, 42, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.beginPath();
    c.rect(-60, hz, W + 120, H);
    c.clip();
    c.fillStyle = vgrad(c, H, [[0, '#0c3a5c'], [1, '#07182b']]);
    c.fillRect(-60, hz, W + 120, H - hz);
    c.fillStyle = 'rgba(255,230,160,0.4)';
    for (var i = 0; i < 12; i++) {
      var y = hz + 6 + i * i * 1.3;
      var w = 40 + i * 14 + Math.sin(t * 1.5 + i) * 18 * motion;
      c.fillRect(W / 2 - w / 2, y, w, 2 + i * 0.2);
    }
    c.restore();
    c.restore();
    // pool deck and infinity pool
    c.fillStyle = '#1b1620';
    c.fillRect(0, 392, W, H - 392);
    c.fillStyle = vgrad(c, 530, [[0, '#2dd4bf'], [0.55, '#0e9aa7'], [1, '#0a6e86']]);
    c.fillRect(70, 404, W - 140, 108);
    // pool shimmer, reflection of the sun
    c.fillStyle = 'rgba(255,243,196,0.28)';
    for (var k = 0; k < 7; k++) {
      var sx = W / 2 - 120 + k * 36 + Math.sin(t * 1.6 + k * 1.7) * 10 * motion;
      c.fillRect(sx, 412 + k * 12, 70, 3);
    }
    c.fillStyle = '#f8fafc';
    c.fillRect(70, 400, W - 140, 5);
    // loungers
    c.fillStyle = '#0a0810';
    [[120, 1], [W - 120, -1]].forEach(function (l) {
      c.beginPath();
      c.moveTo(l[0] - l[1] * 50, 470);
      c.lineTo(l[0] + l[1] * 20, 470);
      c.lineTo(l[0] + l[1] * 56, 440);
      c.lineTo(l[0] + l[1] * 48, 434);
      c.lineTo(l[0] + l[1] * 10, 456);
      c.lineTo(l[0] - l[1] * 50, 456);
      c.closePath();
      c.fill();
    });
  }

  var SCENES = {
    arrival: sceneArrival,
    suite: sceneSuite,
    helipad: sceneHelipad,
    cellar: sceneCellar,
    terrace: sceneTerrace
  };

  function paint(target, sceneName, p, t) {
    var c = target.getContext('2d');
    var sx = target.width / W;
    c.save();
    c.scale(sx, sx);
    c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    SCENES[sceneName](c, p, t);
    // vignette
    var v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  function renderFrame() {
    var i = chapterAt(state.t);
    var ch = CHAPTERS[i];
    var span = chapterEnd(i) - ch.start;
    var local = state.t - ch.start;
    paint(canvas, ch.scene, Math.min(1, local / span), state.t);
  }

  // ---------- UI ----------
  function setPlayIcon() {
    var mode = state.ended ? 'replay' : state.playing ? 'pause' : 'play';
    playBtn.setAttribute('data-mode', mode);
    playBtn.setAttribute('aria-label', mode === 'pause' ? 'Pause' : mode === 'replay' ? 'Replay tour' : 'Play');
    stage.classList.toggle('is-paused', !state.playing);
  }

  function announce(msg) {
    if (!dialog.open) return;
    live.textContent = '';
    window.setTimeout(function () { live.textContent = msg; }, 30);
  }

  function showCaption(i) {
    capNum.textContent = 'CHAPTER ' + (i + 1) + ' / ' + CHAPTERS.length;
    capTitle.textContent = CHAPTERS[i].title;
    // restart the CSS animation so the lower third fades in on each change
    var cap = capNum.parentNode;
    cap.classList.remove('vt-cap-show');
    void cap.offsetWidth;
    cap.classList.add('vt-cap-show');
    canvas.setAttribute('aria-label', 'Simulated walkthrough footage: ' + CHAPTERS[i].title);
  }

  function updateChapterUI(i, userDriven) {
    for (var k = 0; k < chapterEls.length; k++) {
      var on = k === i;
      chapterEls[k].btn.classList.toggle('is-active', on);
      chapterEls[k].btn.classList.toggle('is-done', k < i);
      if (on) chapterEls[k].btn.setAttribute('aria-current', 'true');
      else chapterEls[k].btn.removeAttribute('aria-current');
      if (k < i) chapterEls[k].fill.style.width = '100%';
      else if (k > i) chapterEls[k].fill.style.width = '0%';
    }
    showCaption(i);
    announce('Chapter ' + (i + 1) + ' of ' + CHAPTERS.length + ': ' + CHAPTERS[i].title + ', starts at ' + fmt(CHAPTERS[i].start));
    if (userDriven) {
      var cur = chapterEls[i].btn;
      if (cur.scrollIntoView && chapterList.scrollHeight > chapterList.clientHeight) cur.scrollIntoView({ block: 'nearest' });
    }
  }

  function updateTime() {
    var i = state.chapter;
    var ch = CHAPTERS[i];
    var pct = (state.t - ch.start) / (chapterEnd(i) - ch.start);
    chapterEls[i].fill.style.width = Math.max(0, Math.min(100, pct * 100)) + '%';
    curEl.textContent = fmt(state.t);
    seek.value = String(Math.floor(state.t));
    seek.setAttribute('aria-valuetext', spoken(state.t) + ' of ' + spoken(DURATION) + ', chapter ' + ch.title);
    seek.style.setProperty('--vt-pos', (state.t / DURATION * 100) + '%');
  }

  function setTime(t, userDriven) {
    state.t = Math.max(0, Math.min(DURATION, t));
    var idx = chapterAt(state.t);
    if (idx !== state.chapter) {
      state.chapter = idx;
      updateChapterUI(idx, userDriven);
    }
    updateTime();
    renderFrame();
  }

  function tick(stamp) {
    if (!state.playing) return;
    var dt = Math.min((stamp - lastStamp) / 1000, 0.1);
    lastStamp = stamp;
    var next = state.t + dt * state.speed;
    if (next >= DURATION) {
      setTime(DURATION, false);
      state.ended = true;
      pause();
      announce('End of the tour. Press play to watch again.');
      return;
    }
    setTime(next, false);
    rafId = window.requestAnimationFrame(tick);
  }

  function play() {
    if (state.ended || state.t >= DURATION) {
      state.ended = false;
      state.chapter = -1;
      setTime(0, true);
    }
    state.playing = true;
    setPlayIcon();
    lastStamp = performance.now();
    window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(tick);
  }

  function pause() {
    state.playing = false;
    window.cancelAnimationFrame(rafId);
    setPlayIcon();
  }

  function toggle() {
    if (state.playing) pause();
    else play();
  }

  function seekTo(t) {
    state.ended = false;
    setTime(t, true);
    setPlayIcon();
  }

  function goChapter(i, autoplay) {
    i = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    state.chapter = -1;
    seekTo(CHAPTERS[i].start);
    if (autoplay) play();
  }

  // Previous chapter restarts the current one when we are more than 3s into it.
  function prevChapter() {
    var i = chapterAt(state.t);
    if (state.t - CHAPTERS[i].start > 3) goChapter(i, state.playing);
    else goChapter(i - 1, state.playing);
  }
  function nextChapter() {
    var i = chapterAt(state.t);
    if (i + 1 < CHAPTERS.length) goChapter(i + 1, state.playing);
  }

  function cycleSpeed() {
    var i = SPEEDS.indexOf(state.speed);
    state.speed = SPEEDS[(i + 1) % SPEEDS.length];
    speedBtn.textContent = state.speed + 'x';
    speedBtn.setAttribute('aria-label', 'Playback speed ' + state.speed + 'x. Activate to change.');
  }

  function fullscreenEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function toggleFullscreen() {
    if (fullscreenEl()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (player.requestFullscreen || player.webkitRequestFullscreen) {
      var r = (player.requestFullscreen || player.webkitRequestFullscreen).call(player);
      if (r && r.catch) r.catch(function () {});
    }
  }
  function syncFullscreenUI() {
    var on = fullscreenEl() === player;
    fullBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Enter full screen');
    player.classList.toggle('is-fullscreen', on);
  }
  if (!(player.requestFullscreen || player.webkitRequestFullscreen)) fullBtn.hidden = true;
  document.addEventListener('fullscreenchange', syncFullscreenUI);
  document.addEventListener('webkitfullscreenchange', syncFullscreenUI);

  // ---------- Build chapters, ticks, chips and posters ----------
  CHAPTERS.forEach(function (ch, i) {
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vt-chapter';
    btn.setAttribute('data-index', String(i));

    var thumb = document.createElement('canvas');
    thumb.className = 'vt-chapter-thumb';
    thumb.width = 240;
    thumb.height = 135;
    thumb.setAttribute('aria-hidden', 'true');
    paint(thumb, ch.scene, 0.4, ch.start + (chapterEnd(i) - ch.start) * 0.4);

    var text = document.createElement('span');
    text.className = 'vt-chapter-text';
    var time = document.createElement('span');
    time.className = 'vt-chapter-time';
    time.textContent = fmt(ch.start);
    var name = document.createElement('span');
    name.className = 'vt-chapter-name';
    name.textContent = ch.title;
    var desc = document.createElement('span');
    desc.className = 'vt-chapter-desc';
    desc.textContent = ch.desc + ' (' + fmt(chapterEnd(i) - ch.start) + ')';
    text.appendChild(time);
    text.appendChild(name);
    text.appendChild(desc);

    var bar = document.createElement('span');
    bar.className = 'vt-chapter-bar';
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('span');
    fill.className = 'vt-chapter-fill';
    bar.appendChild(fill);

    btn.appendChild(thumb);
    btn.appendChild(text);
    btn.appendChild(bar);
    btn.addEventListener('click', function () { goChapter(i, true); });
    li.appendChild(btn);
    chapterList.appendChild(li);
    chapterEls.push({ btn: btn, fill: fill });

    var tickEl = document.createElement('span');
    tickEl.className = 'vt-tick';
    tickEl.style.left = (ch.start / DURATION * 100) + '%';
    ticks.appendChild(tickEl);

    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'vt-chip';
    chip.setAttribute('aria-haspopup', 'dialog');
    var chipTime = document.createElement('span');
    chipTime.className = 'vt-chip-time';
    chipTime.textContent = fmt(ch.start);
    var chipName = document.createElement('span');
    chipName.textContent = ch.title;
    chip.appendChild(chipTime);
    chip.appendChild(chipName);
    chip.addEventListener('click', function () { openTour(i, chip); });
    chips.appendChild(chip);
  });

  durEl.textContent = fmt(DURATION);
  seek.max = String(DURATION);
  paint(document.getElementById('vt-poster-canvas'), 'terrace', 0.3, 144);

  // ---------- Open and close ----------
  function openTour(chapterIndex, opener) {
    state.opener = opener || openBtn;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('vt-lock');
    if (typeof chapterIndex === 'number') {
      state.chapter = -1;
      state.ended = false;
      setTime(CHAPTERS[chapterIndex].start, true);
    } else if (state.t === 0 || state.ended) {
      state.chapter = -1;
      state.ended = false;
      setTime(0, true);
    } else {
      renderFrame();
    }
    play();
    playBtn.focus();
  }

  function onClosed() {
    pause();
    document.documentElement.classList.remove('vt-lock');
    if (fullscreenEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    if (state.opener && state.opener.focus) state.opener.focus();
  }

  openBtn.addEventListener('click', function () { openTour(undefined, openBtn); });
  closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', onClosed);
  // Click on the dark backdrop (the dialog element itself) closes the tour.
  dialog.addEventListener('mousedown', function (e) {
    if (e.target === dialog) dialog.close();
  });

  playBtn.addEventListener('click', toggle);
  prevBtn.addEventListener('click', prevChapter);
  nextBtn.addEventListener('click', nextChapter);
  speedBtn.addEventListener('click', cycleSpeed);
  fullBtn.addEventListener('click', toggleFullscreen);
  stage.addEventListener('click', toggle);
  stage.addEventListener('dblclick', toggleFullscreen);
  seek.addEventListener('input', function () { seekTo(Number(seek.value)); });

  dialog.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target.tagName;
    var onSeek = e.target === seek;
    var onButton = tag === 'BUTTON';
    var key = e.key;
    if (key === 'k' || key === 'K') {
      e.preventDefault();
      toggle();
    } else if (key === ' ' && !onButton) {
      e.preventDefault();
      toggle();
    } else if ((key === 'ArrowLeft' || key === 'ArrowRight') && !onSeek) {
      e.preventDefault();
      seekTo(state.t + (key === 'ArrowRight' ? 5 : -5));
    } else if (key === 'n' || key === 'N') {
      e.preventDefault();
      nextChapter();
    } else if (key === 'p' || key === 'P') {
      e.preventDefault();
      prevChapter();
    } else if (key === 'f' || key === 'F') {
      e.preventDefault();
      toggleFullscreen();
    } else if (key >= '1' && key <= String(CHAPTERS.length)) {
      e.preventDefault();
      goChapter(Number(key) - 1, true);
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.playing) pause();
  });

  setTime(0, false);
  setPlayIcon();
})();
/* ===== END issue #201 ===== */
