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

