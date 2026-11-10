const STORAGE_KEY = 'odyssey_expedition_checklist';

const DEFAULT_GEAR = [
  // Clothing
  { id: 'c1', name: 'Thermal Base Layer (Merino Wool)', category: 'Clothing', checked: true },
  { id: 'c2', name: 'Gore-Tex Waterproof Mountain Shell', category: 'Clothing', checked: true },
  { id: 'c3', name: 'Insulated Down Parka (-20°C Rated)', category: 'Clothing', checked: false },
  { id: 'c4', name: 'Extreme Weather Glacier Gloves', category: 'Clothing', checked: false },

  // Navigation Gear
  { id: 'n1', name: 'Garmin InReach Satellite Messenger', category: 'Navigation Gear', checked: true },
  { id: 'n2', name: 'Topographic Map & Prismatic Compass', category: 'Navigation Gear', checked: true },
  { id: 'n3', name: 'Solar Expedition Power Bank (24000mAh)', category: 'Navigation Gear', checked: false },
  { id: 'n4', name: 'High-Precision Altimeter & Barometer', category: 'Navigation Gear', checked: false },

  // First Aid
  { id: 'f1', name: 'Wilderness Trauma & Hemostatic Kit', category: 'First Aid', checked: true },
  { id: 'f2', name: 'Blister Care & Hydrocolloid Dressings', category: 'First Aid', checked: false },
  { id: 'f3', name: 'Water Purification Tablets & Filter Straw', category: 'First Aid', checked: false },
  { id: 'f4', name: 'High-Altitude Sickness Acclimatization Pills', category: 'First Aid', checked: false },

  // Photography Equipment
  { id: 'p1', name: 'Weather-Sealed Mirrorless Camera Body', category: 'Photography Equipment', checked: true },
  { id: 'p2', name: 'Ultra-Wide Expedition Lens (16-35mm f/2.8)', category: 'Photography Equipment', checked: false },
  { id: 'p3', name: 'Carbon Fiber Lightweight Travel Tripod', category: 'Photography Equipment', checked: false },
  { id: 'p4', name: 'Cold-Resistant Battery Packs & Memory Vault', category: 'Photography Equipment', checked: false }
];

let gearList = [];
let activeCategory = 'all';

// Circle circumference for r=42: 2 * Math.PI * 42 = ~263.894
const CIRCUMFERENCE = 2 * Math.PI * 42;

function loadGear() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      gearList = JSON.parse(saved);

      if (!Array.isArray(gearList) || gearList.length === 0) {
        gearList = JSON.parse(JSON.stringify(DEFAULT_GEAR));
      }
    } else {
      gearList = JSON.parse(JSON.stringify(DEFAULT_GEAR));
    }
  } catch (e) {
    console.error('Error loading checklist from localStorage:', e);
    gearList = JSON.parse(JSON.stringify(DEFAULT_GEAR));
  }
}

function saveGear() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gearList));
  } catch (e) {
    console.error('Error saving checklist to localStorage:', e);
  }
}

function updateProgress() {
  const total = gearList.length;
  const packed = gearList.filter(item => item.checked).length;
  const percent = total === 0 ? 0 : Math.round((packed / total) * 100);

  const percentEl = document.getElementById('readiness-percent');
  if (percentEl) percentEl.textContent = `${percent}%`;

  const countEl = document.getElementById('readiness-count');
  if (countEl) countEl.textContent = `${packed} of ${total} items packed`;

  const statusEl = document.getElementById('readiness-status');

  if (statusEl) {
    if (percent === 100) {
      statusEl.textContent = '🎉 Mission Ready!';
      statusEl.style.color = '#10b981';
    } else if (percent >= 75) {
      statusEl.textContent = '🚀 Final Preparations';
      statusEl.style.color = '#38bdf8';
    } else if (percent >= 40) {
      statusEl.textContent = '🧭 Packing in Progress';
      statusEl.style.color = '#38bdf8';
    } else if (percent > 0) {
      statusEl.textContent = '🎒 Gear Gathering';
      statusEl.style.color = '#94a3b8';
    } else {
      statusEl.textContent = '⚠️ Preparation Needed';
      statusEl.style.color = '#f59e0b';
    }
  }

  // Animate circular SVG stroke.
  const circleEl = document.getElementById('progress-circle');

  if (circleEl) {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    circleEl.style.strokeDashoffset = offset;
    circleEl.style.stroke = percent === 100 ? '#10b981' : '#38bdf8';
  }

  updateCategoryBadges();
}

function updateCategoryBadges() {
  const totalCount = gearList.length;
  const clothingCount = gearList.filter(i => i.category === 'Clothing').length;
  const navCount = gearList.filter(i => i.category === 'Navigation Gear').length;
  const firstAidCount = gearList.filter(i => i.category === 'First Aid').length;
  const photoCount = gearList.filter(i => i.category === 'Photography Equipment').length;

  const bAll = document.getElementById('badge-all');
  if (bAll) bAll.textContent = totalCount;

  const bClothing = document.getElementById('badge-clothing');
  if (bClothing) bClothing.textContent = clothingCount;

  const bNav = document.getElementById('badge-navigation');
  if (bNav) bNav.textContent = navCount;

  const bFirstAid = document.getElementById('badge-firstaid');
  if (bFirstAid) bFirstAid.textContent = firstAidCount;

  const bPhoto = document.getElementById('badge-photo');
  if (bPhoto) bPhoto.textContent = photoCount;
}

function getCategoryIcon(cat) {
  switch (cat) {
    case 'Clothing': return '🧥';
    case 'Navigation Gear': return '🧭';
    case 'First Aid': return '🩹';
    case 'Photography Equipment': return '📷';
    default: return '🎒';
  }
}

function renderList() {
  const listEl = document.getElementById('checklist-items');
  const emptyStateEl = document.getElementById('empty-state');

  if (!listEl) return;

  listEl.innerHTML = '';

  const filtered = activeCategory === 'all'
    ? gearList
    : gearList.filter(item => item.category === activeCategory);

  if (filtered.length === 0) {
    if (emptyStateEl) emptyStateEl.style.display = 'block';
  } else {
    if (emptyStateEl) emptyStateEl.style.display = 'none';

    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = `checklist-item ${item.checked ? 'completed' : ''}`;
      li.id = `item-${item.id}`;

      li.innerHTML = `
        <label class="item-checkbox-label">
          <input
            type="checkbox"
            class="item-checkbox"
            data-id="${item.id}"
            ${item.checked ? 'checked' : ''}
          />

          <span class="custom-checkbox">
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3.5 8.5 6.5 11.5 12.5 4.5"></polyline>
            </svg>
          </span>

          <span class="item-text-group">
            <span class="item-label">${escapeHtml(item.name)}</span>
            <span class="item-cat-badge">
              ${getCategoryIcon(item.category)} ${escapeHtml(item.category)}
            </span>
          </span>
        </label>

        <button
          type="button"
          class="delete-btn"
          data-id="${item.id}"
          title="Remove item"
          aria-label="Remove ${escapeHtml(item.name)}"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      listEl.appendChild(li);
    });
  }

  const headingEl = document.getElementById('current-filter-heading');

  if (headingEl) {
    headingEl.textContent = activeCategory === 'all'
      ? 'All Gear Items'
      : `${getCategoryIcon(activeCategory)} ${activeCategory}`;
  }

  updateProgress();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toggleItem(id) {
  const item = gearList.find(i => String(i.id) === String(id));

  if (item) {
    item.checked = !item.checked;
    saveGear();

    const el = document.getElementById(`item-${id}`);

    if (el) {
      if (item.checked) {
        el.classList.add('completed');
      } else {
        el.classList.remove('completed');
      }
    }

    updateProgress();
  }
}

function deleteItem(id) {
  gearList = gearList.filter(i => String(i.id) !== String(id));
  saveGear();
  renderList();
}

function addItem(name, category) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const newItem = {
    id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: trimmed,
    category,
    checked: false,
    isCustom: true
  };

  gearList.push(newItem);
  saveGear();

  if (activeCategory !== 'all' && activeCategory !== category) {
    activeCategory = category;

    document.querySelectorAll('.cat-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-category') === category);
      t.setAttribute('aria-selected', t.getAttribute('data-category') === category);
    });
  }

  renderList();
}

function checkAllCurrent() {
  const currentCategory = activeCategory;

  gearList.forEach(item => {
    if (currentCategory === 'all' || item.category === currentCategory) {
      item.checked = true;
    }
  });

  saveGear();
  renderList();
}

function uncheckAllCurrent() {
  const currentCategory = activeCategory;

  gearList.forEach(item => {
    if (currentCategory === 'all' || item.category === currentCategory) {
      item.checked = false;
    }
  });

  saveGear();
  renderList();
}

function resetDefaults() {
  if (confirm('Reset checklist back to expedition standard defaults? Custom items will be reset.')) {
    gearList = JSON.parse(JSON.stringify(DEFAULT_GEAR));
    saveGear();
    renderList();
  }
}

/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initDestinationFilters();
  initFlightCalculator();
  initExpeditionTimeline();
  initVisaAdvisory();

  // Initialize ring circle stroke properties.
  const circleEl = document.getElementById('progress-circle');

  if (circleEl) {
    circleEl.style.strokeDasharray = CIRCUMFERENCE;
    circleEl.style.strokeDashoffset = CIRCUMFERENCE;
  }

  loadGear();
  renderList();

  // Event delegation for checkbox and delete button.
  const listEl = document.getElementById('checklist-items');

  if (listEl) {
    listEl.addEventListener('click', e => {
      const checkbox = e.target.closest('.item-checkbox');

      if (checkbox) {
        toggleItem(checkbox.dataset.id);
        return;
      }

      const delBtn = e.target.closest('.delete-btn');

      if (delBtn) {
        e.stopPropagation();
        deleteItem(delBtn.dataset.id);
      }
    });
  }

  // Category tab clicks.
  const tabsWrap = document.getElementById('category-tabs');

  if (tabsWrap) {
    tabsWrap.addEventListener('click', e => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;

      document.querySelectorAll('.cat-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      activeCategory = tab.getAttribute('data-category');
      renderList();
    });
  }

  // Add gear form submission.
  const formEl = document.getElementById('add-gear-form');

  if (formEl) {
    formEl.addEventListener('submit', e => {
      e.preventDefault();

      const input = document.getElementById('gear-name-input');
      const select = document.getElementById('gear-category-select');

      if (input && select) {
        addItem(input.value, select.value);
        input.value = '';
        input.focus();
      }
    });
  }

  // Checklist action buttons.
  const checkAllBtn = document.getElementById('check-all-btn');
  if (checkAllBtn) {
    checkAllBtn.addEventListener('click', checkAllCurrent);
  }

  const uncheckAllBtn = document.getElementById('uncheck-all-btn');
  if (uncheckAllBtn) {
    uncheckAllBtn.addEventListener('click', uncheckAllCurrent);
  }

  const resetDefaultBtn = document.getElementById('reset-default-btn');
  if (resetDefaultBtn) {
    resetDefaultBtn.addEventListener('click', resetDefaults);
  }
});

/* =========================================================
   DESTINATION FILTERS
   ========================================================= */

function initDestinationFilters() {
  const destinations = document.querySelector('.destinations');
  if (!destinations) return;

  const buttons = destinations.querySelectorAll('[data-region-filter]');
  const cards = destinations.querySelectorAll('.card[data-region]');
  const status = document.getElementById('destination-filter-status');

  function selectRegion(selected) {
    const region = selected.dataset.regionFilter;
    let visibleCount = 0;

    cards.forEach(card => {
      card.hidden = region !== 'all' && card.dataset.region !== region;

      if (!card.hidden) visibleCount += 1;
    });

    buttons.forEach(button => {
      const active = button === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (status) {
      status.textContent = visibleCount === 0
        ? 'No voyages available in this region yet.'
        : `Showing ${region === 'all' ? 'all ' : ''}${visibleCount} ${
            visibleCount === 1 ? 'voyage' : 'voyages'
          }.`;
    }
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => selectRegion(button));
  });
}


/* =========================================================
   FLIGHT DURATION & TIME-ZONE CALCULATOR — Issue #210
   ========================================================= */

// Approximate flight durations in minutes, not live schedules.
// Kyoto routes use Osaka Kansai (KIX) as the arrival-area reference.
const FLIGHT_ROUTES = {
  JFK: {
    reykjavik: 345,
    kyoto: 870
  },
  LHR: {
    reykjavik: 190,
    kyoto: 830
  },
  DEL: {
    reykjavik: 630,
    kyoto: 480
  }
};

const AIRPORT_TIME_ZONES = {
  JFK: 'America/New_York',
  LHR: 'Europe/London',
  DEL: 'Asia/Kolkata'
};

const DESTINATION_TIME_ZONES = {
  reykjavik: 'Atlantic/Reykjavik',
  kyoto: 'Asia/Tokyo'
};

function getTimeZoneOffsetMinutes(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = {};

  parts.forEach(part => {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value);
    }
  });

  const localTimeAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute
  );

  const roundedTimestamp = Math.floor(date.getTime() / 60000) * 60000;

  return (localTimeAsUtc - roundedTimestamp) / 60000;
}

function formatFlightDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

function formatTimeDifference(minutes) {
  if (minutes === 0) return 'Same time';

  const sign = minutes > 0 ? '+' : '−';
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;

  const duration = remainingMinutes
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;

  return `${sign}${duration}`;
}

function initFlightCalculator() {
  const airportSelect = document.getElementById('departure-airport');
  const destinations = document.querySelector('.destinations');

  if (!airportSelect || !destinations) return;

  const cards = destinations.querySelectorAll('.card[data-destination]');

  function updateFlightBadges() {
    const airport = airportSelect.value;
    const departureTimeZone = AIRPORT_TIME_ZONES[airport];
    const now = new Date();

    cards.forEach(card => {
      const destination = card.dataset.destination;
      const durationBadge = card.querySelector('[data-flight-duration]');
      const differenceBadge = card.querySelector('[data-time-difference]');

      const duration = FLIGHT_ROUTES[airport]?.[destination];
      const destinationTimeZone = DESTINATION_TIME_ZONES[destination];

      if (
        !departureTimeZone ||
        !destinationTimeZone ||
        !Number.isFinite(duration)
      ) {
        if (durationBadge) durationBadge.textContent = '✈️ Duration unavailable';
        if (differenceBadge) differenceBadge.textContent = '🌐 Difference unavailable';
        return;
      }

      const difference =
        getTimeZoneOffsetMinutes(destinationTimeZone, now) -
        getTimeZoneOffsetMinutes(departureTimeZone, now);

      if (durationBadge) {
        durationBadge.textContent =
          `✈️ ${formatFlightDuration(duration)} from ${airport}`;
        durationBadge.title = 'Estimated flight duration; not a live flight schedule.';
      }

      if (differenceBadge) {
        differenceBadge.textContent = `🌐 ${formatTimeDifference(difference)}`;
        differenceBadge.title =
          `${difference === 0 ? 'No time difference' : `${formatTimeDifference(difference)} at the destination`} compared with ${airport}, using current time-zone offsets.`;
      }
    });
  }

  airportSelect.addEventListener('change', updateFlightBadges);
  updateFlightBadges();
}

/* =========================================================
   INTERACTIVE EXPEDITION TIMELINE — NSoC Issue #85
   ========================================================= */

const EXPEDITION_DATA = {
  antarctic: {
    name: 'Antarctic Crossing',
    days: [
      {
        location: 'Ushuaia, Argentina',
        coordinates: '54.8019° S, 68.3030° W',
        activity: 'Expedition briefing, equipment inspection, and embarkation.',
        elevation: 23,
        highlight: 'Gateway to Antarctica'
      },
      {
        location: 'Drake Passage',
        coordinates: '57.0000° S, 65.0000° W',
        activity: 'Cross the Southern Ocean and attend wildlife observation sessions.',
        elevation: 0,
        highlight: 'Southern Ocean crossing'
      },
      {
        location: 'Antarctic Peninsula',
        coordinates: '64.0000° S, 62.0000° W',
        activity: 'Explore dramatic ice formations and observe penguin colonies.',
        elevation: 120,
        highlight: 'First continental landing'
      },
      {
        location: 'Paradise Bay',
        coordinates: '64.9000° S, 62.8700° W',
        activity: 'Navigate among icebergs and photograph glacial landscapes.',
        elevation: 85,
        highlight: 'Glacier and iceberg exploration'
      },
      {
        location: 'Port Lockroy',
        coordinates: '64.8250° S, 63.4940° W',
        activity: 'Discover the historic research station and local wildlife.',
        elevation: 15,
        highlight: 'Historic Antarctic outpost'
      },
      {
        location: 'Neko Harbour',
        coordinates: '64.8330° S, 62.5330° W',
        activity: 'Visit a glacial landing site and observe the surrounding peaks.',
        elevation: 40,
        highlight: 'Glacial shoreline'
      },
      {
        location: 'Lemaire Channel',
        coordinates: '65.1000° S, 63.9000° W',
        activity: 'Sail through a narrow passage surrounded by steep mountain walls.',
        elevation: 0,
        highlight: 'Scenic polar passage'
      },
      {
        location: 'South Shetland Islands',
        coordinates: '62.0000° S, 58.0000° W',
        activity: 'Explore volcanic landscapes and observe seabirds from designated sites.',
        elevation: 180,
        highlight: 'Volcanic island landscapes'
      },
      {
        location: 'Drake Passage Return',
        coordinates: '58.0000° S, 64.0000° W',
        activity: 'Review expedition photographs and reflect on the journey.',
        elevation: 0,
        highlight: 'Return voyage'
      },
      {
        location: 'Ushuaia, Argentina',
        coordinates: '54.8019° S, 68.3030° W',
        activity: 'Disembark, complete the expedition debrief, and celebrate the journey.',
        elevation: 23,
        highlight: 'Expedition complete'
      }
    ]
  },

  'silk-road': {
    name: 'Silk Road Odyssey',
    days: [
      {
        location: 'Xi’an, China',
        coordinates: '34.3416° N, 108.9398° E',
        activity: 'Explore the ancient city walls and learn about the historic Silk Road.',
        elevation: 405,
        highlight: 'Eastern gateway of the Silk Road'
      },
      {
        location: 'Lanzhou, China',
        coordinates: '36.0611° N, 103.8343° E',
        activity: 'Discover riverside markets and regional cultural traditions.',
        elevation: 1520,
        highlight: 'Yellow River heritage'
      },
      {
        location: 'Zhangye, China',
        coordinates: '38.9259° N, 100.4498° E',
        activity: 'Visit the region’s famous multicoloured rock formations.',
        elevation: 1480,
        highlight: 'Rainbow mountain landscapes'
      },
      {
        location: 'Dunhuang, China',
        coordinates: '40.1421° N, 94.6618° E',
        activity: 'Discover historic cave art and desert trading routes.',
        elevation: 1138,
        highlight: 'Mogao cultural heritage'
      },
      {
        location: 'Turpan, China',
        coordinates: '42.9513° N, 89.1895° E',
        activity: 'Learn about traditional oasis irrigation and desert settlements.',
        elevation: -30,
        highlight: 'Ancient oasis engineering'
      },
      {
        location: 'Kashgar, China',
        coordinates: '39.4704° N, 75.9898° E',
        activity: 'Explore traditional bazaars and the historic old town.',
        elevation: 1290,
        highlight: 'Historic trading crossroads'
      },
      {
        location: 'Bishkek, Kyrgyzstan',
        coordinates: '42.8746° N, 74.5698° E',
        activity: 'Discover local markets and learn about Central Asian culture.',
        elevation: 800,
        highlight: 'Central Asian cultural stop'
      },
      {
        location: 'Samarkand, Uzbekistan',
        coordinates: '39.6270° N, 66.9750° E',
        activity: 'Explore monumental architecture and historic trading squares.',
        elevation: 705,
        highlight: 'Registan architectural heritage'
      },
      {
        location: 'Bukhara, Uzbekistan',
        coordinates: '39.7681° N, 64.4556° E',
        activity: 'Walk through preserved historic streets and traditional bazaars.',
        elevation: 225,
        highlight: 'Historic caravan city'
      },
      {
        location: 'Tashkent, Uzbekistan',
        coordinates: '41.2995° N, 69.2401° E',
        activity: 'Conclude the journey with local cuisine and a cultural debrief.',
        elevation: 455,
        highlight: 'Journey complete'
      }
    ]
  }
};

function initExpeditionTimeline() {
  const timeline = document.getElementById('expedition-timeline-list');
  const selector = document.getElementById('expedition-select');

  // The timeline may not exist on other pages that reuse this script.
  if (!timeline || !selector) return;

  const nameEl = document.getElementById('expedition-name');
  const durationEl = document.getElementById('expedition-duration');
  const statusEl = document.getElementById('active-day-status');
  const feedbackEl = document.getElementById('timeline-feedback');

  let activeDay = 0;

  let currentExpedition = selector.value in EXPEDITION_DATA
    ? selector.value
    : 'antarctic';

  const expandedDays = new Set([0]);

  function renderElevationChart(days, selectedIndex) {
    const values = days.map(day => day.elevation);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    const width = 320;
    const height = 92;
    const padding = 12;

    const points = values.map((value, index) => {
      const x = padding + (
        index * (width - padding * 2) / Math.max(values.length - 1, 1)
      );

      const y = height - padding - (
        (value - minValue) / range * (height - padding * 2)
      );

      return { x, y, value, index };
    });

    const line = points
      .map(point => `${point.x},${point.y}`)
      .join(' ');

    const area = [
      `${points[0].x},${height - padding}`,
      ...points.map(point => `${point.x},${point.y}`),
      `${points[points.length - 1].x},${height - padding}`
    ].join(' ');

    const markers = points.map(point => `
      <circle
        cx="${point.x}"
        cy="${point.y}"
        r="${point.index === selectedIndex ? 5 : 3}"
        class="${point.index === selectedIndex
          ? 'elevation-point is-active'
          : 'elevation-point'}"
      >
        <title>Day ${point.index + 1}: ${point.value} m</title>
      </circle>
    `).join('');

    return `
      <div class="elevation-chart">
        <div class="elevation-chart-header">
          <span>ROUTE ELEVATION</span>
          <span>${minValue} m – ${maxValue} m</span>
        </div>

        <svg
          viewBox="0 0 ${width} ${height}"
          role="img"
          aria-label="Elevation profile across the ten expedition days"
          preserveAspectRatio="none"
        >
          <polygon class="elevation-area" points="${area}"></polygon>
          <polyline class="elevation-line" points="${line}"></polyline>
          ${markers}
        </svg>

        <div class="elevation-chart-labels">
          <span>Day 1</span>
          <span>Day ${days.length}</span>
        </div>
      </div>
    `;
  }

  function renderTimeline() {
    const expedition = EXPEDITION_DATA[currentExpedition];

    if (!expedition) return;

    if (nameEl) nameEl.textContent = expedition.name;

    if (durationEl) {
      durationEl.textContent = `${expedition.days.length} days`;
    }

    if (statusEl) {
      statusEl.textContent = `Day ${activeDay + 1} · ${
        expedition.days[activeDay].location
      }`;
    }

    timeline.innerHTML = expedition.days.map((day, index) => {
      const expanded = expandedDays.has(index);

      return `
        <article
          class="timeline-day ${expanded ? 'is-expanded' : ''} ${
            index === activeDay ? 'is-active' : ''
          }"
          data-day="${index}"
        >
          <button
            type="button"
            class="timeline-day-toggle"
            data-timeline-day="${index}"
            aria-expanded="${expanded}"
            aria-controls="timeline-details-${index}"
          >
            <span class="timeline-day-number">
              <span>DAY</span>
              <strong>${String(index + 1).padStart(2, '0')}</strong>
            </span>

            <span class="timeline-day-heading">
              <span class="timeline-day-location">
                ${escapeHtml(day.location)}
              </span>

              <span class="timeline-day-highlight">
                ${escapeHtml(day.highlight)}
              </span>
            </span>

            <span class="timeline-day-chevron" aria-hidden="true">
              ${expanded ? '−' : '+'}
            </span>
          </button>

          <div
            class="timeline-day-details"
            id="timeline-details-${index}"
            ${expanded ? '' : 'hidden'}
          >
            <div class="timeline-day-content">
              <div class="waypoint-coordinate">
                <span class="detail-label">COORDINATES</span>
                <strong>${escapeHtml(day.coordinates)}</strong>
              </div>

              <div class="waypoint-elevation">
                <span class="detail-label">ELEVATION</span>
                <strong>${day.elevation} m</strong>
              </div>

              <div class="waypoint-activity">
                <span class="detail-label">DAY HIGHLIGHTS</span>
                <p>${escapeHtml(day.activity)}</p>
              </div>

              <button
                type="button"
                class="timeline-activate-btn"
                data-activate-day="${index}"
                ${index === activeDay ? 'disabled' : ''}
              >
                ${index === activeDay
                  ? '✓ Active Waypoint'
                  : 'Set as Active Waypoint'}
              </button>
            </div>

            ${renderElevationChart(expedition.days, index)}
          </div>
        </article>
      `;
    }).join('');

    if (feedbackEl) {
      feedbackEl.textContent =
        `Showing ${expedition.days.length} days for ${expedition.name}.`;
    }
  }

  timeline.addEventListener('click', event => {
    const toggle = event.target.closest('[data-timeline-day]');
    const activate = event.target.closest('[data-activate-day]');

    if (toggle) {
      const index = Number(toggle.dataset.timelineDay);

      if (expandedDays.has(index)) {
        expandedDays.delete(index);
      } else {
        expandedDays.add(index);
      }

      renderTimeline();
      return;
    }

    if (activate) {
      activeDay = Number(activate.dataset.activateDay);
      expandedDays.add(activeDay);
      renderTimeline();

      const activeCard = timeline.querySelector(
        `[data-day="${activeDay}"]`
      );

      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  });

  selector.addEventListener('change', () => {
    currentExpedition = selector.value in EXPEDITION_DATA
      ? selector.value
      : 'antarctic';

    activeDay = 0;
    expandedDays.clear();
    expandedDays.add(0);

    renderTimeline();
  });

  renderTimeline();
}

/* ===== BEGIN Issue #211: Expedition Budget Planner with Currency Converter ===== */
(function initExpeditionBudgetPlanner() {
  'use strict';

  const CURRENCIES = {
    USD: { symbol: '$', rate: 1.0, code: 'USD' },
    EUR: { symbol: '€', rate: 0.92, code: 'EUR' },
    GBP: { symbol: '£', rate: 0.79, code: 'GBP' },
    AUD: { symbol: 'A$', rate: 1.54, code: 'AUD' }
  };

  const ACCOMMODATION_RATES_USD = {
    standard: 95,
    premium: 220,
    luxury: 390
  };

  const GEAR_RATES_USD = {
    none: 0,
    essential: 180,
    technical: 340,
    cinema: 520
  };

  const ADDONS_CONFIG_USD = {
    heli: { cost: 450, perPerson: true, name: 'Heli-Rescue Cover' },
    guide: { cost: 850, perPerson: false, name: 'Mountain Master Guide' },
    photo: { cost: 220, perPerson: true, name: 'Aurora Masterclass' },
    gourmet: { cost: 380, perPerson: true, name: 'Wilderness Gourmet Dining' }
  };

  const plannerState = {
    currency: 'USD',
    travelers: 2,
    duration: 10,
    expeditionId: 'antarctic',
    tier: 'premium',
    gearPackage: 'essential',
    addons: {
      heli: true,
      guide: true,
      photo: false,
      gourmet: false
    }
  };

  function formatCurrency(amountUSD) {
    const curr = CURRENCIES[plannerState.currency] || CURRENCIES.USD;
    const converted = Math.round(amountUSD * curr.rate);
    return `${curr.symbol}${converted.toLocaleString()}`;
  }

  function getActiveTierRateUSD() {
    return ACCOMMODATION_RATES_USD[plannerState.tier] || ACCOMMODATION_RATES_USD.premium;
  }

  function getBaseLogisticsUSD() {
    const routeSelect = document.getElementById('planner-expedition-select');
    if (!routeSelect) return 3200;
    const selectedOpt = routeSelect.options[routeSelect.selectedIndex];
    const base = Number(selectedOpt.getAttribute('data-base')) || 3200;
    const defaultDays = Number(selectedOpt.getAttribute('data-days')) || 10;
    return Math.round(base * (plannerState.duration / defaultDays));
  }

  function recalculateBudget() {
    const travelers = plannerState.travelers;
    const duration = plannerState.duration;

    // 1. Logistics & Permits
    const logisticsUSD = getBaseLogisticsUSD();

    // 2. Accommodation
    const tierRateUSD = getActiveTierRateUSD();
    const accommodationUSD = tierRateUSD * duration * travelers;

    // 3. Gear Packages
    const gearRateUSD = GEAR_RATES_USD[plannerState.gearPackage] || 0;
    const gearUSD = gearRateUSD * travelers;

    // 4. Addons
    let addonsUSD = 0;
    Object.keys(ADDONS_CONFIG_USD).forEach((key) => {
      if (plannerState.addons[key]) {
        const item = ADDONS_CONFIG_USD[key];
        addonsUSD += item.perPerson ? item.cost * travelers : item.cost;
      }
    });

    // 5. Environmental Offset Fee (2.5%)
    const subtotalUSD = logisticsUSD + accommodationUSD + gearUSD + addonsUSD;
    const ecoFeeUSD = Math.round(subtotalUSD * 0.025);
    const totalUSD = subtotalUSD + ecoFeeUSD;
    const perPersonUSD = Math.round(totalUSD / travelers);

    // Update DOM Display
    const curr = CURRENCIES[plannerState.currency] || CURRENCIES.USD;

    const symbolEl = document.getElementById('summary-currency-symbol');
    if (symbolEl) symbolEl.textContent = curr.symbol;

    const totalValEl = document.getElementById('summary-total-budget');
    if (totalValEl) {
      const convertedTotal = Math.round(totalUSD * curr.rate);
      totalValEl.textContent = convertedTotal.toLocaleString();
    }

    const codeEl = document.getElementById('summary-currency-code');
    if (codeEl) codeEl.textContent = curr.code;

    const perPersonEl = document.getElementById('summary-per-person');
    if (perPersonEl) perPersonEl.textContent = formatCurrency(perPersonUSD);

    // Update Itemized Receipt
    const recBase = document.getElementById('receipt-base');
    if (recBase) recBase.textContent = formatCurrency(logisticsUSD);

    const recAccLabel = document.getElementById('receipt-acc-label');
    if (recAccLabel) {
      const tierName = plannerState.tier.charAt(0).toUpperCase() + plannerState.tier.slice(1);
      recAccLabel.textContent = `${tierName} Accommodation (${duration} nights × ${travelers} guests)`;
    }

    const recAcc = document.getElementById('receipt-accommodation');
    if (recAcc) recAcc.textContent = formatCurrency(accommodationUSD);

    const recGearLabel = document.getElementById('receipt-gear-label');
    if (recGearLabel) {
      const gearSelect = document.getElementById('gear-package-select');
      const gearName = gearSelect ? gearSelect.options[gearSelect.selectedIndex].text.split('(')[0].trim() : 'Gear Package';
      recGearLabel.textContent = `${gearName} (${travelers}x)`;
    }

    const recGear = document.getElementById('receipt-gear');
    if (recGear) recGear.textContent = formatCurrency(gearUSD);

    const recServices = document.getElementById('receipt-services');
    if (recServices) recServices.textContent = formatCurrency(addonsUSD);

    const recEco = document.getElementById('receipt-eco');
    if (recEco) recEco.textContent = formatCurrency(ecoFeeUSD);

    // Update Stacked Bar Allocation
    const pctAcc = Math.max(5, Math.round((accommodationUSD / totalUSD) * 100));
    const pctLog = Math.max(5, Math.round((logisticsUSD / totalUSD) * 100));
    const pctGear = Math.max(3, Math.round((gearUSD / totalUSD) * 100));
    const pctServ = Math.max(5, 100 - (pctAcc + pctLog + pctGear));

    const segAcc = document.getElementById('bar-seg-accommodation');
    if (segAcc) segAcc.style.width = `${pctAcc}%`;

    const segLog = document.getElementById('bar-seg-logistics');
    if (segLog) segLog.style.width = `${pctLog}%`;

    const segGear = document.getElementById('bar-seg-gear');
    if (segGear) segGear.style.width = `${pctGear}%`;

    const segServ = document.getElementById('bar-seg-services');
    if (segServ) segServ.style.width = `${pctServ}%`;

    const lblAcc = document.getElementById('pct-accommodation');
    if (lblAcc) lblAcc.textContent = `${pctAcc}%`;

    const lblLog = document.getElementById('pct-logistics');
    if (lblLog) lblLog.textContent = `${pctLog}%`;

    const lblGear = document.getElementById('pct-gear');
    if (lblGear) lblGear.textContent = `${pctGear}%`;

    const lblServ = document.getElementById('pct-services');
    if (lblServ) lblServ.textContent = `${pctServ}%`;

    // Update Tier Rate Labels in converted currency
    const rateStd = document.getElementById('tier-rate-standard');
    if (rateStd) rateStd.textContent = `${formatCurrency(ACCOMMODATION_RATES_USD.standard)} / night`;

    const ratePrem = document.getElementById('tier-rate-premium');
    if (ratePrem) ratePrem.textContent = `${formatCurrency(ACCOMMODATION_RATES_USD.premium)} / night`;

    const rateLux = document.getElementById('tier-rate-luxury');
    if (rateLux) rateLux.textContent = `${formatCurrency(ACCOMMODATION_RATES_USD.luxury)} / night`;

    // Update Addon Price Labels in converted currency
    Object.keys(ADDONS_CONFIG_USD).forEach((k) => {
      const el = document.getElementById(`addon-cost-${k}`);
      if (el) {
        const item = ADDONS_CONFIG_USD[k];
        el.textContent = `+${formatCurrency(item.cost)} / ${item.perPerson ? 'person' : 'expedition'}`;
      }
    });
  }

  function handlePlannerConfigChange() {
    // Read route
    const routeSelect = document.getElementById('planner-expedition-select');
    if (routeSelect) {
      plannerState.expeditionId = routeSelect.value;
    }

    // Read tier
    const selectedTier = document.querySelector('input[name="accommodation-tier"]:checked');
    if (selectedTier) {
      plannerState.tier = selectedTier.value;
      document.querySelectorAll('.tier-card').forEach((card) => {
        const input = card.querySelector('input');
        card.classList.toggle('active', input && input.checked);
      });
    }

    // Read gear
    const gearSelect = document.getElementById('gear-package-select');
    if (gearSelect) {
      plannerState.gearPackage = gearSelect.value;
    }

    // Read addons
    Object.keys(ADDONS_CONFIG_USD).forEach((key) => {
      const cb = document.getElementById(`addon-${key}`);
      if (cb) {
        plannerState.addons[key] = cb.checked;
        const parentCard = cb.closest('.addon-checkbox-card');
        if (parentCard) parentCard.classList.toggle('active', cb.checked);
      }
    });

    recalculateBudget();
  }

  function handleCurrencyChange(curr) {
    if (CURRENCIES[curr]) {
      plannerState.currency = curr;
      recalculateBudget();
    }
  }

  function adjustTravelers(delta) {
    plannerState.travelers = Math.max(1, Math.min(10, plannerState.travelers + delta));
    const countEl = document.getElementById('travelers-count');
    if (countEl) countEl.textContent = plannerState.travelers;
    recalculateBudget();
  }

  function handleDurationChange(val) {
    const days = Number(val) || 10;
    plannerState.duration = days;
    const dispEl = document.getElementById('duration-display');
    if (dispEl) dispEl.textContent = `${days} Days`;
    recalculateBudget();
  }

  function saveExpeditionEstimate() {
    try {
      localStorage.setItem('odyssey_saved_budget_estimate', JSON.stringify(plannerState));
      const statusEl = document.getElementById('saved-estimate-status');
      const textEl = document.getElementById('saved-estimate-text');
      if (statusEl && textEl) {
        statusEl.hidden = false;
        textEl.textContent = `Expedition estimate (${formatCurrency(getBaseLogisticsUSD() + 3000)}) saved successfully to session!`;
        setTimeout(() => {
          statusEl.hidden = true;
        }, 3500);
      }
    } catch {
      // Storage unavailable fallback
    }
  }

  function resetExpeditionBudget() {
    plannerState.currency = 'USD';
    plannerState.travelers = 2;
    plannerState.duration = 10;
    plannerState.expeditionId = 'antarctic';
    plannerState.tier = 'premium';
    plannerState.gearPackage = 'essential';
    plannerState.addons = { heli: true, guide: true, photo: false, gourmet: false };

    const routeSelect = document.getElementById('planner-expedition-select');
    if (routeSelect) routeSelect.value = 'antarctic';

    const currSelect = document.getElementById('currency-select');
    if (currSelect) currSelect.value = 'USD';

    const countEl = document.getElementById('travelers-count');
    if (countEl) countEl.textContent = '2';

    const range = document.getElementById('expedition-duration-range');
    if (range) range.value = '10';

    const dispEl = document.getElementById('duration-display');
    if (dispEl) dispEl.textContent = '10 Days';

    const premRadio = document.getElementById('tier-premium');
    if (premRadio) premRadio.checked = true;

    const gearSelect = document.getElementById('gear-package-select');
    if (gearSelect) gearSelect.value = 'essential';

    const cbHeli = document.getElementById('addon-heli');
    if (cbHeli) cbHeli.checked = true;

    const cbGuide = document.getElementById('addon-guide');
    if (cbGuide) cbGuide.checked = true;

    const cbPhoto = document.getElementById('addon-photo');
    if (cbPhoto) cbPhoto.checked = false;

    const cbGourmet = document.getElementById('addon-gourmet');
    if (cbGourmet) cbGourmet.checked = false;

    handlePlannerConfigChange();
  }

  // Load saved estimate if available
  try {
    const saved = localStorage.getItem('odyssey_saved_budget_estimate');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.duration) {
        Object.assign(plannerState, parsed);
        const currSelect = document.getElementById('currency-select');
        if (currSelect) currSelect.value = plannerState.currency;

        const countEl = document.getElementById('travelers-count');
        if (countEl) countEl.textContent = plannerState.travelers;

        const range = document.getElementById('expedition-duration-range');
        if (range) range.value = String(plannerState.duration);

        const dispEl = document.getElementById('duration-display');
        if (dispEl) dispEl.textContent = `${plannerState.duration} Days`;

        const tierRadio = document.getElementById(`tier-${plannerState.tier}`);
        if (tierRadio) tierRadio.checked = true;

        const gearSelect = document.getElementById('gear-package-select');
        if (gearSelect) gearSelect.value = plannerState.gearPackage;

        Object.keys(ADDONS_CONFIG_USD).forEach((k) => {
          const cb = document.getElementById(`addon-${k}`);
          if (cb) cb.checked = Boolean(plannerState.addons[k]);
        });
      }
    }
  } catch {
    // Use defaults
  }

  // Bind handlers to global window for inline HTML attributes
  window.handlePlannerConfigChange = handlePlannerConfigChange;
  window.handleCurrencyChange = handleCurrencyChange;
  window.adjustTravelers = adjustTravelers;
  window.handleDurationChange = handleDurationChange;
  window.saveExpeditionEstimate = saveExpeditionEstimate;
  window.resetExpeditionBudget = resetExpeditionBudget;

  // Initial calculation
  handlePlannerConfigChange();
})();
/* ===== END Issue #211 ===== */

// ===== START Issue #304: Visa & Entry Requirements Checker =====

const VISA_ADVISORY_DATA = {
  iceland: {
    destinationName: 'Iceland (Reykjavik Aurora Glaciers)',
    requirements: {
      US: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Schengen)',
        category: 'Eco-Tourism & Glacier Expedition',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days within any 180-day period',
        processing: 'Immediate',
        fee: 'Free / €7.50 (ETIAS)',
        passportRules: 'Passport must be valid for at least 3 months beyond intended departure date from the Schengen area and issued within the last 10 years. Must have at least 2 blank pages.',
        healthRules: 'Routine immunizations recommended (MMR, DTaP). Comprehensive extreme-cold wilderness travel insurance with search & rescue evacuation coverage strongly advised.',
        entryRules: 'Valid passport, return or onward airline ticket, and proof of sufficient funds (~€30/day). ETIAS authorization required prior to boarding starting 2025/2026.',
        specialNote: 'Mandatory route registration with the Icelandic SafeTravel mountain rescue system before traversing Vatnajökull glacier.'
      },
      UK: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Schengen)',
        category: 'Eco-Tourism & Glacier Expedition',
        heading: 'Visa-Free Short Stay Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days in any 180-day rolling window',
        processing: 'Immediate',
        fee: 'Free (Post-Brexit ETIAS applies)',
        passportRules: 'Must be issued less than 10 years before entry date and valid for at least 3 months after departure from Schengen zone. Minimum 2 blank pages.',
        healthRules: 'GHIC or valid EHIC card accepted for emergency medical care; full arctic expedition health insurance is required for off-grid backcountry zones.',
        entryRules: 'Passport must be stamped at border control. Return ticket and accommodation confirmation required at border entry.',
        specialNote: 'Winter driving permits and safety beacon rental required when operating 4x4 vehicles across highland F-roads.'
      },
      EU: {
        badgeType: 'visa-free',
        badgeText: 'Freedom of Movement (EEA/Schengen)',
        category: 'EEA Citizen Rights',
        heading: 'Unrestricted Free Entry & Stay',
        stayDuration: 'Maximum Stay: Unlimited for tourism and exploration',
        processing: 'None / Immediate',
        fee: 'Free',
        passportRules: 'Valid EU National Identity Card or National Passport valid for the full duration of your intended stay.',
        healthRules: 'European Health Insurance Card (EHIC) provides full reciprocal state healthcare access across Iceland.',
        entryRules: 'No visa, ETIAS, or entry permits required. Simply show national ID or passport at border gates.',
        specialNote: 'Geothermal nature reserve conservation rules apply to all travelers; stay on marked trail pathways.'
      },
      IN: {
        badgeType: 'visa-required',
        badgeText: 'Schengen Visa Required',
        category: 'Uniform Schengen Tourist Visa (Type C)',
        heading: 'Consular Visa Required Prior to Travel',
        stayDuration: 'Maximum Stay: Up to 90 days as authorized on visa sticker',
        processing: '15 – 20 Business Days',
        fee: '€80 (~₹7,200 INR)',
        passportRules: 'Passport must have at least 6 months validity from the date of return and at least 2 blank visa pages, issued within the last 10 years.',
        healthRules: 'Mandatory Schengen travel medical insurance covering minimum €30,000 for emergency medical treatment and repatriation.',
        entryRules: 'Confirmed return flight tickets, hotel vouchers, 3-month stamped bank statements, and pre-approved Icelandic/Schengen embassy visa sticker.',
        specialNote: 'Submit biometrics and expedition tour itinerary via VFS Global Icelandic visa application center in advance.'
      },
      AU: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Schengen)',
        category: 'Eco-Tourism & Wilderness Expedition',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days within any 180-day period',
        processing: 'Immediate',
        fee: 'Free (ETIAS ~$7.50)',
        passportRules: 'Passport must be valid for at least 3 months beyond the intended date of departure from the Schengen territory with 2 blank pages.',
        healthRules: 'No mandatory vaccines. Recommended: Tetanus booster and medical evacuation insurance for ice-climbing expeditions.',
        entryRules: 'Onward or return ticket, proof of sufficient expedition funds, and ETIAS pre-travel authorization.',
        specialNote: 'Severe sub-polar wind advisory alerts: check SafeTravel.is daily when outside Reykjavik urban zones.'
      },
      CA: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Schengen)',
        category: 'Eco-Tourism & Heli-Hiking',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days within any 180-day period',
        processing: 'Immediate',
        fee: 'Free (ETIAS required)',
        passportRules: 'Passport must have at least 3 months validity beyond intended departure date from Iceland. At least 2 blank pages.',
        healthRules: 'Routine vaccines. Private Canadian travel health insurance covering winter extreme sports & glacier heli-hiking.',
        entryRules: 'ETIAS pre-travel authorization, confirmed lodging, and return ticket ready for border inspection.',
        specialNote: 'Certified mountain guide supervision is mandatory when hiking on Sólheimajökull glacier tongue.'
      }
    }
  },

  japan: {
    destinationName: 'Japan (Kyoto Bamboo Sanctuary)',
    requirements: {
      US: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Temporary Visitor)',
        category: 'Cultural & Leisure Exploration',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days for tourism purposes',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Passport must be valid for the entire duration of your stay in Japan. Minimum 1 blank visa page required.',
        healthRules: 'No mandatory vaccinations or quarantine required. Comprehensive travel medical insurance recommended.',
        entryRules: 'Complete Visit Japan Web online for rapid immigration & customs clearance QR codes. Proof of onward/return flight required.',
        specialNote: 'Strict local heritage etiquette in Kyoto Gion district: photography is prohibited in private preservation alleys.'
      },
      UK: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Temporary Visitor)',
        category: 'Cultural & Leisure Tourism',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days (extendable up to 180 days)',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'British Citizen passport must be valid for the duration of stay in Japan. At least 1 blank visa page.',
        healthRules: 'Routine immunizations. Travel insurance with coverage for Japanese emergency hospital visits.',
        entryRules: 'Visit Japan Web registration prior to boarding; onward or return ticket inspection at Kansai/Narita airports.',
        specialNote: 'Japan Rail Pass voucher exchange can be completed at Kyoto Station or Kansai International Airport.'
      },
      EU: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Temporary Visitor)',
        category: 'Bilateral Visa Exemption',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days (Austrian, German & Swiss citizens may extend to 6 months)',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Valid EU passport for the duration of your stay. Minimum 1 blank visa page.',
        healthRules: 'Routine vaccines. Travel insurance covering private Japanese clinical services.',
        entryRules: 'Visit Japan Web digital customs QR code, return ticket, and address of primary accommodation.',
        specialNote: 'Kyoto municipal accommodation tax (¥200 to ¥1,000 per guest per night) paid directly upon check-in.'
      },
      IN: {
        badgeType: 'evisa',
        badgeText: 'Japan eVisa Available',
        category: 'Short-Term Tourism eVisa',
        heading: 'Electronic Tourist Visa (eVisa) Available',
        stayDuration: 'Maximum Stay: Up to 30 or 90 days single-entry',
        processing: '5 – 7 Business Days',
        fee: '¥3,000 JPY (~₹1,700 INR)',
        passportRules: 'Indian passport with minimum 6 months validity from travel date and at least 2 blank visa pages.',
        healthRules: 'No mandatory health certificates. Travel insurance covering medical hospitalization strongly recommended.',
        entryRules: 'Approved electronic visa issuance notice (displayable online via smartphone) plus Visit Japan Web declaration QR code.',
        specialNote: 'Apply online through the official Japan eVISA portal or authorized VFS centers with confirmed flight bookings.'
      },
      AU: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Temporary Visitor)',
        category: 'Tourism & Cultural Tour',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days for tourism and visiting',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Australian passport must be valid for the duration of intended stay with at least 1 blank page.',
        healthRules: 'Routine immunizations. Standard international travel medical insurance.',
        entryRules: 'Return airfare, confirmed accommodation details, and digital clearance via Visit Japan Web.',
        specialNote: 'Pre-book reservations for Arashiyama monkey park and imperial villas (Katsura & Shugakuin) 2 weeks ahead.'
      },
      CA: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Temporary Visitor)',
        category: 'Tourism & Exploration',
        heading: 'Visa-Free Entry Permitted',
        stayDuration: 'Maximum Stay: Up to 90 days for leisure travel',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Canadian passport must be valid for the full period of intended stay. At least 1 blank page.',
        healthRules: 'Routine vaccines. Comprehensive travel insurance covering medical emergency and baggage protection.',
        entryRules: 'Digital immigration declaration via Visit Japan Web, return or onward airline boarding pass.',
        specialNote: 'Suica/ICOCA transit cards are recommended for all Kyoto municipal bus and subways.'
      }
    }
  },

  antarctica: {
    destinationName: 'Antarctica (Polar Crossing via Argentina)',
    requirements: {
      US: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free Transit (Argentina)',
        category: 'IAATO Antarctic Expedition Protocol',
        heading: 'Visa-Free Argentine Gateway + IAATO Permit',
        stayDuration: 'Transit Stay: Up to 90 days in Argentina + 10-day sea crossing',
        processing: 'Immediate (Permit managed by ship operator)',
        fee: 'Free (Included in expedition berth)',
        passportRules: 'Passport must be valid for at least 6 months beyond the date of departure from Ushuaia, with at least 2 blank pages.',
        healthRules: 'Mandatory Polar Expedition Medical Fitness Form signed by a physician within 60 days of sailing. Mandatory $100,000+ medical evacuation insurance.',
        entryRules: 'Confirmed expedition vessel berth reservation, return flight from Ushuaia (USH), and signed IAATO environmental pledge.',
        specialNote: 'Strict biosecurity check: all outer garments, backpacks, and boots are decontaminated prior to continental zodiac landings.'
      },
      UK: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free Transit (Argentina)',
        category: 'Polar Maritime Expedition',
        heading: 'Visa-Free Argentine Gateway + IAATO Clearance',
        stayDuration: 'Transit Stay: Up to 90 days in Argentina for expedition transit',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Valid for at least 6 months after the return date from the Antarctic Peninsula. Minimum 2 blank pages.',
        healthRules: 'Physician polar fitness sign-off required by maritime law. Emergency search & rescue evacuation coverage minimum £100,000.',
        entryRules: 'Return flight itinerary, expedition cruise booking confirmation, and IAATO wildlife distance code agreement.',
        specialNote: 'Zero-waste policy: no organic or inorganic material may be left on the continent. Smoking prohibited ashore.'
      },
      EU: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free Transit (Argentina)',
        category: 'Antarctic Treaty Scientific & Eco-Tour',
        heading: 'Visa-Free Argentine Gateway Access',
        stayDuration: 'Transit Stay: Up to 90 days in Argentina without visa',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Passport must be valid for a minimum of 6 months beyond intended departure date from Argentina. 2 blank pages.',
        healthRules: 'Completed polar medical questionnaire signed by licensed MD. Mandatory medical repatriation & evacuation insurance.',
        entryRules: 'Confirmed expedition voyage manifest and onward airline boarding pass from Buenos Aires / Ushuaia.',
        specialNote: 'Compliance with Protocol on Environmental Protection to the Antarctic Treaty is strictly monitored by expedition leaders.'
      },
      IN: {
        badgeType: 'voa',
        badgeText: 'Argentina ETA / Visa Required',
        category: 'Electronic Travel Authorization (AVE / Consular)',
        heading: 'Argentina ETA (with US/Schengen Visa) or Consular Visa',
        stayDuration: 'Transit Stay: Up to 90 days authorized + Antarctic expedition berth',
        processing: 'ETA: 3–5 Business Days | Consular: 20 Days',
        fee: '$50 USD (ETA) / $200 USD (Consular Visa)',
        passportRules: 'Must have at least 6 months validity from date of entry into Argentina and minimum 3 blank pages for transit stamps.',
        healthRules: 'Mandatory doctor-certified polar medical clearance and $150,000 emergency medevac insurance policy.',
        entryRules: 'Approved Argentine AVE (electronic authorization if holding valid US B1/B2 or Schengen visa) or stamped consular visa, plus ship contract.',
        specialNote: 'Yellow fever vaccination card required only if transiting through specified endemic zones in South America prior to Ushuaia.'
      },
      AU: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free Transit (Argentina)',
        category: 'Polar Maritime Expedition',
        heading: 'Visa-Free Argentine Gateway Clearance',
        stayDuration: 'Transit Stay: Up to 90 days in Argentina',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Passport valid for at least 6 months beyond the conclusion of the Antarctic voyage. Minimum 2 blank pages.',
        healthRules: 'Mandatory medical fitness sign-off by doctor within 30 days of boarding. Arctic/Antarctic evacuation insurance policy.',
        entryRules: 'Return airfare from Ushuaia, ship expedition confirmation, and IAATO tourist safety compliance declaration.',
        specialNote: 'Severe sea condition preparation: motion sickness medication strongly recommended for crossing Drake Passage.'
      },
      CA: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free Transit (Argentina)',
        category: 'IAATO Polar Expedition',
        heading: 'Visa-Free Argentine Transit Entry',
        stayDuration: 'Transit Stay: Up to 90 days in Argentina',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Passport must be valid for at least 6 months past arrival date in Argentina, with at least 2 blank pages.',
        healthRules: 'Expedition physician health authorization certificate and $100,000 emergency medical evacuation insurance.',
        entryRules: 'Expedition cruise contract, return flight confirmation, and IAATO biosecurity protocols acceptance.',
        specialNote: 'Strict 5-meter minimum wildlife distance to penguin colonies and 100-meter distance to marine mammals enforced.'
      }
    }
  },

  'silk-road': {
    destinationName: 'Silk Road (Central Asia & China)',
    requirements: {
      US: {
        badgeType: 'evisa',
        badgeText: 'eVisa / Visa Required',
        category: 'Caravan Overland Expedition',
        heading: 'Uzbekistan eVisa + China Visa / Transit Exemption',
        stayDuration: 'Uzbekistan: 30 days (eVisa) | China: 144-hr transit or L-Visa',
        processing: '3 – 5 Business Days',
        fee: '~$20 (UZB) + $140 (China L-Visa)',
        passportRules: 'Passport must be valid for at least 6 months beyond the scheduled departure date from Central Asia. 3 blank pages.',
        healthRules: 'Recommended: Hepatitis A & B, Typhoid, Tetanus. High-altitude medication for high Tian Shan & Pamir mountain passes.',
        entryRules: 'Approved Uzbekistan eVisa printout, confirmed caravan expedition itinerary, and hotel registration certificates (talon).',
        specialNote: 'Retain all official hotel registration receipts in Uzbekistan; border officials verify them upon departure.'
      },
      UK: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Uzbekistan 30d)',
        category: 'Overland Silk Road Exploration',
        heading: 'Visa-Free for Uzbekistan; Visa Required for China',
        stayDuration: 'Uzbekistan: Up to 30 days Visa-Free | China: Visa required',
        processing: 'UZB: Immediate | China: 4–6 Business Days',
        fee: 'UZB: Free | China Visa: £130',
        passportRules: 'Valid for at least 6 months beyond stay in Central Asia. At least 2 blank visa pages.',
        healthRules: 'Routine vaccines, Hepatitis A, Typhoid. Wilderness travel insurance with mountain rescue coverage.',
        entryRules: 'Return or onward flight ticket, proof of lodging, and official registration slips from licensed guesthouses.',
        specialNote: 'Registration within 72 hours of arrival in each regional province is legally required across Central Asian jurisdictions.'
      },
      EU: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Uzbekistan & China 15d)',
        category: 'Bilateral Visa Waiver',
        heading: 'Visa-Free Entry for Key Silk Road Corridors',
        stayDuration: 'Uzbekistan: Up to 30 days Visa-Free | China: 15 days Visa-Free (for select EU citizens)',
        processing: 'Immediate',
        fee: 'Free',
        passportRules: 'Passport must be valid for at least 6 months beyond departure date. Minimum 2 blank pages.',
        healthRules: 'Routine immunizations, Hepatitis A. Comprehensive overland adventure travel insurance.',
        entryRules: 'Proof of onward travel, confirmed tour itinerary with certified Silk Road guides, and hotel booking receipts.',
        specialNote: 'Antiquities and historic rug purchases in Bukhara require export authorization certificates from the Ministry of Culture.'
      },
      IN: {
        badgeType: 'evisa',
        badgeText: 'eVisa Required (UZB & China)',
        category: 'Electronic & Consular Tourist Visas',
        heading: 'Uzbekistan eVisa & Chinese Tourist Visa Required',
        stayDuration: 'Uzbekistan: Up to 30 days single entry | China: As issued',
        processing: '3 – 7 Business Days',
        fee: '$20 USD (UZB) + ~$65 USD (China)',
        passportRules: 'Indian passport with minimum 6 months validity from planned departure date and at least 3 blank pages.',
        healthRules: 'Hepatitis A, Typhoid, Tetanus recommended. Adequate medical travel insurance covering high-altitude trekking.',
        entryRules: 'Approved Uzbekistan eVisa printout, hotel booking confirmations, return flight tickets, and local guide vouchers.',
        specialNote: 'Registration slips issued by registered accommodations must be strictly retained until airport immigration check.'
      },
      AU: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Uzbekistan 30d)',
        category: 'Cultural Caravan Expedition',
        heading: 'Visa-Free for Uzbekistan; Visa Required for China',
        stayDuration: 'Uzbekistan: Up to 30 days Visa-Free | China: Tourist Visa required',
        processing: 'UZB: Immediate | China: 4–5 Business Days',
        fee: 'UZB: Free | China Visa: ~$110 AUD',
        passportRules: 'Passport valid for minimum 6 months from arrival date with at least 2 blank pages.',
        healthRules: 'Routine immunizations, Hepatitis A, Typhoid. Desert hydration and high-altitude gear preparation.',
        entryRules: 'Onward travel booking, hotel accommodation proof, and local migration registration slips.',
        specialNote: 'Cash in clean US Dollars or local Som is essential for transactions in remote desert bazaars outside Samarkand.'
      },
      CA: {
        badgeType: 'visa-free',
        badgeText: 'Visa-Free (Uzbekistan 30d)',
        category: 'Highland Caravan & Eco-Tour',
        heading: 'Visa-Free for Uzbekistan; Visa Required for China',
        stayDuration: 'Uzbekistan: Up to 30 days Visa-Free | China: Tourist Visa required',
        processing: 'UZB: Immediate | China: 4–5 Business Days',
        fee: 'UZB: Free | China Visa: ~$140 CAD',
        passportRules: 'Canadian passport must be valid for at least 6 months after intended departure date. 2 blank pages.',
        healthRules: 'Recommended travel vaccines: Hepatitis A, Typhoid, Tetanus. Travel medical insurance including medical evacuation.',
        entryRules: 'Proof of onward flights, confirmed itinerary, and registered accommodation slips kept for border control.',
        specialNote: 'Certified expedition guides are mandatory when traversing the Kyzylkum desert and high mountain passes.'
      }
    }
  }
};

function initVisaAdvisory() {
  const destSelect = document.getElementById('advisory-destination-select');
  const natSelect = document.getElementById('advisory-nationality-select');
  const resultCard = document.getElementById('advisory-result-card');

  if (!destSelect || !natSelect || !resultCard) return;

  function updateAdvisory() {
    const destKey = destSelect.value;
    const natKey = natSelect.value;

    const destData = VISA_ADVISORY_DATA[destKey];
    if (!destData) return;

    const req = destData.requirements[natKey];
    if (!req) return;

    // Update Badge
    const badgeEl = document.getElementById('advisory-status-badge');
    if (badgeEl) {
      badgeEl.className = `advisory-status-badge badge-${req.badgeType}`;
      badgeEl.textContent = req.badgeText;
    }

    // Update Category
    const catEl = document.getElementById('advisory-category-tag');
    if (catEl) catEl.textContent = req.category;

    // Update Heading & Duration
    const headingEl = document.getElementById('advisory-status-heading');
    if (headingEl) headingEl.textContent = req.heading;

    const durationEl = document.getElementById('advisory-stay-duration');
    if (durationEl) durationEl.textContent = req.stayDuration;

    // Update Summary Stats
    const procEl = document.getElementById('advisory-processing');
    if (procEl) procEl.textContent = req.processing;

    const feeEl = document.getElementById('advisory-fee');
    if (feeEl) feeEl.textContent = req.fee;

    // Update Detail Rules
    const passportEl = document.getElementById('advisory-passport-rules');
    if (passportEl) passportEl.textContent = req.passportRules;

    const healthEl = document.getElementById('advisory-health-rules');
    if (healthEl) healthEl.textContent = req.healthRules;

    const entryEl = document.getElementById('advisory-entry-rules');
    if (entryEl) entryEl.textContent = req.entryRules;

    const noteEl = document.getElementById('advisory-special-note');
    if (noteEl) noteEl.textContent = req.specialNote;
  }

  // Hook change listeners
  destSelect.addEventListener('change', updateAdvisory);
  natSelect.addEventListener('change', updateAdvisory);

  // Hook into Featured Voyage cards so clicking a card updates the destination in the advisory
  const cards = document.querySelectorAll('.destinations .card[data-destination]');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const dest = card.dataset.destination;
      if (dest === 'reykjavik' && destSelect.querySelector('option[value="iceland"]')) {
        destSelect.value = 'iceland';
        updateAdvisory();
      } else if (dest === 'kyoto' && destSelect.querySelector('option[value="japan"]')) {
        destSelect.value = 'japan';
        updateAdvisory();
      }
    });
  });

  // Initial render
  updateAdvisory();
}

// Ensure initVisaAdvisory runs even if DOMContentLoaded already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisaAdvisory);
} else {
  initVisaAdvisory();
}
/* ===== END Issue #304 ===== */


/* ===== BEGIN Issue #361: Interactive Altitude Sickness Risk Calculator & Acclimatization Scheduler ===== */
(function initAltitudeSafetyCalculator() {
  const section = document.getElementById('altitude-safety-section');
  if (!section) return;

  // Preset Treks Itineraries
  const TREKS_DATA = {
    kilimanjaro: {
      name: 'Mount Kilimanjaro — Machame Route',
      summitAlt: 5895,
      summitFt: '19,341 ft ASL',
      difficulty: 'EXTREME ALTITUDE (UHURU PEAK)',
      days: 7,
      itinerary: [
        { day: 1, name: 'Machame Gate → Machame Camp', alt: 3000, desc: 'Rainforest zone trek. Gradual steady ascent.', isRest: false },
        { day: 2, name: 'Machame Camp → Shira Camp', alt: 3840, desc: 'Moorland plateau. Exceeds 3,000m threshold.', isRest: false },
        { day: 3, name: 'Shira → Lava Tower (4630m) → Barranco', alt: 3950, desc: 'Climb high to 4,630m, sleep low at 3,950m (Optimal).', isRest: false },
        { day: 4, name: 'Barranco Camp → Karanga Camp', alt: 4035, desc: 'Scramble Barranco Wall. Short acclimatization day.', isRest: true },
        { day: 5, name: 'Karanga Camp → Barafu High Camp', alt: 4680, desc: 'Alpine desert. Rest and hydrate before midnight summit push.', isRest: false },
        { day: 6, name: 'Barafu → Uhuru Peak (5895m) → Mweka', alt: 3100, desc: 'Summit sunrise! Rapid descent to oxygen-rich camp.', isRest: false },
        { day: 7, name: 'Mweka Camp → Mweka Gate', alt: 1800, desc: 'Final descent through lush montane forest to park exit.', isRest: false }
      ]
    },
    'everest-ebc': {
      name: 'Everest Base Camp & Kala Patthar',
      summitAlt: 5545,
      summitFt: '18,192 ft ASL',
      difficulty: 'HIGH HIMALAYAN EXPEDITION',
      days: 10,
      itinerary: [
        { day: 1, name: 'Lukla Flight → Phakding', alt: 2610, desc: 'Scenic airstrip landing, gentle riverside trek.', isRest: false },
        { day: 2, name: 'Phakding → Namche Bazaar', alt: 3440, desc: 'Hillary suspension bridges. Enter High Altitude zone.', isRest: false },
        { day: 3, name: 'Namche Bazaar Acclimatization Day', alt: 3440, desc: 'Hike to Everest View Hotel (3,880m), sleep Namche.', isRest: true },
        { day: 4, name: 'Namche Bazaar → Tengboche Monastery', alt: 3860, desc: 'Rhododendron forest & spiritual blessing.', isRest: false },
        { day: 5, name: 'Tengboche → Dingboche', alt: 4410, desc: 'Imja Valley stone pastures. Tree line ends.', isRest: false },
        { day: 6, name: 'Dingboche Acclimatization Day', alt: 4410, desc: 'Climb Nangkartshang Peak (5,080m), sleep Dingboche.', isRest: true },
        { day: 7, name: 'Dingboche → Lobuche', alt: 4940, desc: 'Memorial moraine pass. Very thin air.', isRest: false },
        { day: 8, name: 'Lobuche → Gorak Shep → Everest Base Camp', alt: 5164, desc: 'Walk on Khumbu Glacier ice edge. EBC milestone!', isRest: false },
        { day: 9, name: 'Gorak Shep → Kala Patthar (5545m) → Pheriche', alt: 4240, desc: 'Dawn panoramic summit of Kala Patthar, descent to Pheriche.', isRest: false },
        { day: 10, name: 'Pheriche → Namche Bazaar', alt: 3440, desc: 'Accelerated descent into thicker atmospheric pressure.', isRest: false }
      ]
    },
    'inca-salkantay': {
      name: 'Inca Trail & Salkantay Pass',
      summitAlt: 4630,
      summitFt: '15,190 ft ASL',
      difficulty: 'ANDEAN CORDILLERA PASS',
      days: 5,
      itinerary: [
        { day: 1, name: 'Mollepata → Soraypampa', alt: 3900, desc: 'Steep climb to Humantay glacial base lake.', isRest: false },
        { day: 2, name: 'Soraypampa → Salkantay Pass (4630m) → Chaullay', alt: 2900, desc: 'High alpine pass crossing then descent to cloud forest.', isRest: false },
        { day: 3, name: 'Chaullay → Lucmabamba', alt: 2000, desc: 'Warm subtropical coffee plantations and waterfalls.', isRest: false },
        { day: 4, name: 'Lucmabamba → Llactapata → Aguas Calientes', alt: 2040, desc: 'Original Inca road hike with first distant view of citadel.', isRest: false },
        { day: 5, name: 'Aguas Calientes → Machu Picchu Sanctuary', alt: 2430, desc: 'Sunrise exploration of the Lost City of the Incas.', isRest: false }
      ]
    },
    'mont-blanc': {
      name: 'Mont Blanc Alpine Haute Route',
      summitAlt: 4810,
      summitFt: '15,781 ft ASL',
      difficulty: 'ALPINE GLACIAL TRAVERSE',
      days: 6,
      itinerary: [
        { day: 1, name: 'Chamonix Valley → Les Contamines', alt: 1167, desc: 'Lower valley forest approach along Roman road.', isRest: false },
        { day: 2, name: 'Les Contamines → Refuge de la Croix', alt: 2443, desc: 'Ascent over Col du Bonhomme pass.', isRest: false },
        { day: 3, name: 'Refuge de la Croix → Rifugio Elisabetta', alt: 2195, desc: 'Crossing into Italian Val Veny moraines.', isRest: false },
        { day: 4, name: 'Courmayeur Valley Rest & Acclimatization', alt: 1224, desc: 'Active recovery day. Carb loading and gear inspection.', isRest: true },
        { day: 5, name: 'Val Ferret → Grand Col Ferret → La Fouly', alt: 2537, desc: 'Swiss alpine border crossing with grand glacier vistas.', isRest: false },
        { day: 6, name: 'Aiguille du Midi Traverse Summit Point', alt: 3842, desc: 'Glacier rope team ascent to High Alpine ridge.', isRest: false }
      ]
    }
  };

  // State
  let selectedTrekKey = 'kilimanjaro';
  let activeItinerary = JSON.parse(JSON.stringify(TREKS_DATA.kilimanjaro.itinerary));
  let trekDays = 7;
  let experienceLevel = 'moderate';
  let hasDiamox = false;

  // DOM Elements
  const trekSelect = document.getElementById('trekSelect');
  const customTrekInputs = document.getElementById('customTrekInputs');
  const startAltInput = document.getElementById('startAltInput');
  const targetAltInput = document.getElementById('targetAltInput');
  const trekDaysRange = document.getElementById('trekDaysRange');
  const trekDaysVal = document.getElementById('trekDaysVal');
  const experienceSelect = document.getElementById('experienceSelect');
  const diamoxCheckbox = document.getElementById('diamoxCheckbox');
  const btnOptimizeAscent = document.getElementById('btnOptimizeAscent');

  // Results elements
  const trekDifficultyBadge = document.getElementById('trekDifficultyBadge');
  const amsRiskPill = document.getElementById('amsRiskPill');
  const amsScoreVal = document.getElementById('amsScoreVal');
  const riskBarFill = document.getElementById('riskBarFill');
  const summitElevationVal = document.getElementById('summitElevationVal');
  const summitElevationFt = document.getElementById('summitElevationFt');
  const effectiveOxygenVal = document.getElementById('effectiveOxygenVal');
  const maxDailyGainVal = document.getElementById('maxDailyGainVal');
  const guidelineCompare = document.getElementById('guidelineCompare');
  const restDaysCountVal = document.getElementById('restDaysCountVal');
  const restDayStatus = document.getElementById('restDayStatus');
  const clinicalHeader = document.getElementById('clinicalHeader');
  const clinicalAdvice = document.getElementById('clinicalAdvice');

  // Table & Chart Elements
  const scheduleTableBody = document.getElementById('altitudeScheduleBody');
  const _elevationSvg = document.getElementById('elevationSvg');
  const elevationAreaPath = document.getElementById('elevationAreaPath');
  const elevationLinePath = document.getElementById('elevationLinePath');
  const chartWaypointsGroup = document.getElementById('chartWaypointsGroup');

  // Atmospheric Pressure & Effective Oxygen Equation
  // Barometric formula approximation: O2% ~ 20.9% * exp(-alt / 7000) relative to sea level
  function calculateEffectiveOxygen(altMeters) {
    const seaLevelO2 = 100;
    const factor = Math.exp(-altMeters / 7400);
    return Math.round(seaLevelO2 * factor);
  }

  // Trek Selection Handler
  trekSelect.addEventListener('change', () => {
    selectedTrekKey = trekSelect.value;
    if (selectedTrekKey === 'custom') {
      customTrekInputs.style.display = 'block';
      buildCustomItinerary();
    } else {
      customTrekInputs.style.display = 'none';
      const trek = TREKS_DATA[selectedTrekKey];
      activeItinerary = JSON.parse(JSON.stringify(trek.itinerary));
      trekDays = trek.days;
      trekDaysRange.value = trekDays;
      trekDaysVal.textContent = trekDays + ' Days';
      trekDifficultyBadge.textContent = trek.difficulty;
      summitElevationVal.textContent = trek.summitAlt.toLocaleString() + 'm';
      summitElevationFt.textContent = trek.summitFt;
    }
    evaluateAltitudeSafety();
  });

  // Custom Trek Generator
  function buildCustomItinerary() {
    const startAlt = parseInt(startAltInput.value, 10) || 1800;
    const summitAlt = parseInt(targetAltInput.value, 10) || 5200;
    const days = parseInt(trekDaysRange.value, 10) || 7;

    activeItinerary = [];
    const altDelta = summitAlt - startAlt;
    const altStep = altDelta / Math.max(1, days - 1);

    for (let d = 1; d <= days; d++) {
      let curAlt = Math.round(startAlt + (d - 1) * altStep);
      let isRest = false;
      let name = `Camp ${d} Waypoint`;

      if (d === days) {
        curAlt = summitAlt;
        name = 'Summit Ridge & Descent Camp';
      } else if (d === 3 && days >= 6) {
        isRest = true;
        name = 'Camp 3 Acclimatization Staging Day';
      }

      activeItinerary.push({
        day: d,
        name: name,
        alt: curAlt,
        desc: isRest ? 'Active rest: hike high, sleep low.' : 'Steady daily elevation gain.',
        isRest: isRest
      });
    }

    summitElevationVal.textContent = summitAlt.toLocaleString() + 'm';
    summitElevationFt.textContent = Math.round(summitAlt * 3.28084).toLocaleString() + ' ft ASL';
    trekDifficultyBadge.textContent = summitAlt > 5000 ? 'EXTREME HAZARD ALTITUDE' : 'HIGH ALTITUDE';
  }

  // Days Slider
  trekDaysRange.addEventListener('input', () => {
    trekDays = parseInt(trekDaysRange.value, 10);
    trekDaysVal.textContent = trekDays + ' Days';
    if (selectedTrekKey === 'custom') {
      buildCustomItinerary();
    }
    evaluateAltitudeSafety();
  });

  // Custom Input Listeners
  [startAltInput, targetAltInput].forEach(inp => {
    if (inp) inp.addEventListener('input', () => {
      if (selectedTrekKey === 'custom') {
        buildCustomItinerary();
        evaluateAltitudeSafety();
      }
    });
  });

  // Experience Select
  experienceSelect.addEventListener('change', () => {
    experienceLevel = experienceSelect.value;
    evaluateAltitudeSafety();
  });

  // Diamox Checkbox
  diamoxCheckbox.addEventListener('change', () => {
    hasDiamox = diamoxCheckbox.checked;
    evaluateAltitudeSafety();
  });

  // Auto-Optimize Button (Wilderness Medicine 500m/day Rule)
  btnOptimizeAscent.addEventListener('click', () => {
    optimizeAscentItinerary();
  });

  function optimizeAscentItinerary() {
    let prevAlt = activeItinerary[0].alt;
    const optimized = [];

    activeItinerary.forEach((wpt, idx) => {
      if (idx === 0) {
        optimized.push(wpt);
        return;
      }

      const gain = wpt.alt - prevAlt;
      // If above 3,000m and single day gain > 500m, clamp and insert rest
      if (wpt.alt > 3000 && gain > 500 && !wpt.isRest) {
        // Safe capped elevation
        const safeAlt = prevAlt + 480;
        optimized.push({
          day: optimized.length + 1,
          name: wpt.name + ' (Staged Acclimatization Camp)',
          alt: safeAlt,
          desc: 'Recalibrated to <= 500m daily gain per Wilderness Medical Society guidelines.',
          isRest: true
        });
        prevAlt = safeAlt;
      } else {
        wpt.day = optimized.length + 1;
        optimized.push(wpt);
        prevAlt = wpt.alt;
      }
    });

    activeItinerary = optimized;
    evaluateAltitudeSafety();
  }

  // Clinical Evaluation Engine
  function evaluateAltitudeSafety() {
    let maxGain = 0;
    let prevAlt = activeItinerary.length > 0 ? activeItinerary[0].alt : 1800;
    let restDaysCount = 0;
    let exceeds500mCount = 0;
    let highestSleepingAlt = 0;

    activeItinerary.forEach((wpt, idx) => {
      if (wpt.alt > highestSleepingAlt) highestSleepingAlt = wpt.alt;
      if (wpt.isRest) restDaysCount++;

      if (idx > 0) {
        const gain = wpt.alt - prevAlt;
        if (gain > maxGain) maxGain = gain;
        if (prevAlt >= 3000 && gain > 500) {
          exceeds500mCount++;
        }
      }
      prevAlt = wpt.alt;
    });

    // Effective Oxygen at highest camp
    const effO2 = calculateEffectiveOxygen(highestSleepingAlt);
    effectiveOxygenVal.textContent = effO2 + '% of Sea Level';

    // Max Daily Gain display
    maxDailyGainVal.textContent = (maxGain > 0 ? '+' : '') + maxGain + 'm / day';
    if (maxGain > 500) {
      maxDailyGainVal.className = 'astat-val text-red';
      guidelineCompare.textContent = 'Exceeds 500m safe limit!';
      guidelineCompare.className = 'astat-sub text-red';
    } else {
      maxDailyGainVal.className = 'astat-val hl-green';
      guidelineCompare.textContent = 'Within medical guidelines (<=500m)';
      guidelineCompare.className = 'astat-sub hl-green';
    }

    // Rest Days summary
    restDaysCountVal.textContent = restDaysCount + (restDaysCount === 1 ? ' Rest Day' : ' Rest Days');
    if (restDaysCount >= 2) {
      restDayStatus.textContent = 'Well-staged protocol';
      restDayStatus.className = 'astat-sub hl-green';
    } else {
      restDayStatus.textContent = 'Recommended: 2+ Days';
      restDayStatus.className = 'astat-sub text-amber';
    }

    // Clinical Acute Mountain Sickness (AMS) Score (0 to 100)
    let amsScore = 15; // baseline

    // Altitude factor
    if (highestSleepingAlt > 5000) amsScore += 35;
    else if (highestSleepingAlt > 4000) amsScore += 24;
    else if (highestSleepingAlt > 3000) amsScore += 12;

    // Ascent rate factor (>500m/day penalty)
    if (exceeds500mCount > 0) amsScore += (exceeds500mCount * 18);
    if (maxGain > 800) amsScore += 15;

    // Rest days mitigating bonus
    amsScore -= (restDaysCount * 12);

    // Experience discount
    if (experienceLevel === 'experienced') amsScore -= 18;
    else if (experienceLevel === 'moderate') amsScore -= 8;

    // Diamox mitigating discount
    if (hasDiamox) amsScore -= 20;

    // Safety clamp
    amsScore = Math.max(8, Math.min(96, amsScore));
    amsScoreVal.textContent = amsScore;
    riskBarFill.style.width = amsScore + '%';

    // Risk Tiers
    if (amsScore < 30) {
      amsRiskPill.textContent = 'LOW AMS RISK (OPTIMAL)';
      amsRiskPill.className = 'risk-pill risk-low';
      riskBarFill.className = 'risk-bar-fill fill-low';
      clinicalHeader.textContent = 'Wilderness Medicine: Optimal Staging';
      clinicalAdvice.textContent = 'Your daily sleeping elevations adhere to conservative acclimatization guidelines. Continue abundant oral hydration (3-4 L/day) and watch for mild early morning headaches.';
    } else if (amsScore < 60) {
      amsRiskPill.textContent = 'MODERATE AMS RISK (CAUTION)';
      amsRiskPill.className = 'risk-pill risk-moderate';
      riskBarFill.className = 'risk-bar-fill fill-moderate';
      clinicalHeader.textContent = 'Wilderness Medicine: Staged Rest Advisory';
      clinicalAdvice.textContent = 'Sleeping elevation exceeds recommended thresholds on peak stages. Monitor team members with the Lake Louise Scoring system. Consider an additional acclimatization day before high camps.';
    } else {
      amsRiskPill.textContent = 'HIGH HAZARD AMS / HAPE RISK';
      amsRiskPill.className = 'risk-pill risk-high';
      riskBarFill.className = 'risk-bar-fill fill-high';
      clinicalHeader.textContent = 'URGENT: Dangerous Ascent Gradient';
      clinicalAdvice.textContent = 'Critical risk of Acute Mountain Sickness and High-Altitude Pulmonary Edema (HAPE). Click "Auto-Inject Medical Rest Days" or slow the schedule. Never ascend with persistent AMS symptoms.';
    }

    renderScheduleTable();
    renderElevationChart();
  }

  // Render Table
  function renderScheduleTable() {
    scheduleTableBody.innerHTML = '';
    let prevAlt = activeItinerary.length > 0 ? activeItinerary[0].alt : 1800;

    activeItinerary.forEach((wpt, idx) => {
      const gain = idx === 0 ? 0 : wpt.alt - prevAlt;
      prevAlt = wpt.alt;

      const effO2 = calculateEffectiveOxygen(wpt.alt);
      const isExceeded = wpt.alt > 3000 && gain > 500;

      const row = document.createElement('tr');
      row.className = wpt.isRest ? 'table-rest-row' : (isExceeded ? 'table-warning-row' : '');

      row.innerHTML = `
        <td><strong class="day-num">Day ${wpt.day}</strong></td>
        <td>
          <div class="waypoint-meta">
            <strong>${wpt.name}</strong>
            <small>${wpt.desc}</small>
          </div>
        </td>
        <td><strong class="alt-val-txt">${wpt.alt.toLocaleString()}m</strong></td>
        <td>
          <span class="gain-badge ${gain > 500 && wpt.alt > 3000 ? 'gain-excess' : ''}">
            ${gain >= 0 ? '+' : ''}${gain}m
          </span>
        </td>
        <td><span class="o2-pill">${effO2}%</span></td>
        <td>
          <span class="protocol-text">${wpt.isRest ? '🛌 Acclimatization Rest (Climb High, Sleep Low)' : (wpt.alt > 5000 ? '⚡ High-Altitude Hypoxia Zone' : 'Standard Ascent')}</span>
        </td>
        <td>
          <span class="status-chip ${wpt.isRest ? 'chip-rest' : (isExceeded ? 'chip-danger' : 'chip-safe')}">
            ${wpt.isRest ? 'REST DAY' : (isExceeded ? 'HAZARD GAIN' : 'SAFE PASS')}
          </span>
        </td>
      `;

      scheduleTableBody.appendChild(row);
    });
  }

  // Render SVG Chart
  function renderElevationChart() {
    chartWaypointsGroup.innerHTML = '';
    const pointsCount = activeItinerary.length;
    if (pointsCount < 2) return;

    // Chart Dimensions: x from 70 to 920, y from 30 (6000m) to 270 (1000m)
    const minX = 80;
    const maxX = 920;
    const minY = 30;  // 6000m
    const maxY = 270; // 1000m
    const altRange = 6000 - 1000;

    function getCoords(idx, alt) {
      const x = minX + (idx / (pointsCount - 1)) * (maxX - minX);
      const clampedAlt = Math.max(1000, Math.min(6000, alt));
      const y = maxY - ((clampedAlt - 1000) / altRange) * (maxY - minY);
      return { x, y };
    }

    let linePathD = '';
    let areaPathD = '';

    activeItinerary.forEach((wpt, idx) => {
      const pt = getCoords(idx, wpt.alt);
      if (idx === 0) {
        linePathD += `M ${pt.x} ${pt.y}`;
        areaPathD += `M ${pt.x} ${maxY} L ${pt.x} ${pt.y}`;
      } else {
        linePathD += ` L ${pt.x} ${pt.y}`;
        areaPathD += ` L ${pt.x} ${pt.y}`;
      }

      // Add SVG waypoint dot and text
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'chart-waypoint-item');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', wpt.isRest ? '7' : '5');
      circle.setAttribute('fill', wpt.isRest ? '#10b981' : (wpt.alt > 5000 ? '#ef4444' : '#38bdf8'));
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', pt.x);
      label.setAttribute('y', pt.y - 12);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#f1f5f9');
      label.setAttribute('font-size', '10.5');
      label.setAttribute('font-weight', '700');
      label.textContent = `D${wpt.day} (${wpt.alt}m)`;

      g.appendChild(circle);
      g.appendChild(label);
      chartWaypointsGroup.appendChild(g);
    });

    const lastPt = getCoords(pointsCount - 1, activeItinerary[pointsCount - 1].alt);
    areaPathD += ` L ${lastPt.x} ${maxY} Z`;

    elevationLinePath.setAttribute('d', linePathD);
    elevationAreaPath.setAttribute('d', areaPathD);
  }

  // Initial Run
  evaluateAltitudeSafety();
})();
/* ===== END Issue #361 ===== */

/* ===== BEGIN Issue #424: Celestial Navigation & Night Sky Stargazing Visibility Predictor ===== */
(function initCelestialNavigationPredictor() {
  'use strict';

  // Preset Expedition Campsites Catalog
  const CAMPSITE_PRESETS = Object.freeze({
    atacama: {
      name: 'Atacama Desert High Plateau Basecamp, Chile',
      lat: -23.8634,
      lon: -69.1328,
      elevation: 2400,
      bortle: 1
    },
    vatnajokull: {
      name: 'Vatnajökull Ice Cap Glacier Camp, Iceland',
      lat: 64.2559,
      lon: -16.8524,
      elevation: 850,
      bortle: 2
    },
    wadirum: {
      name: 'Wadi Rum Nomad Wilderness Outpost, Jordan',
      lat: 29.5735,
      lon: 35.4206,
      elevation: 1020,
      bortle: 2
    },
    maunakea: {
      name: 'Mauna Kea Summit Ridge, Hawaii',
      lat: 19.8207,
      lon: -155.4681,
      elevation: 4205,
      bortle: 1
    },
    patagonia: {
      name: 'Fitz Roy Glacial Basin Camp, Patagonia, Argentina',
      lat: -49.2712,
      lon: -72.9358,
      elevation: 1150,
      bortle: 2
    },
    banff: {
      name: 'Lake Minnewanka Backcountry, Banff, Canada',
      lat: 51.2486,
      lon: -115.4988,
      elevation: 1480,
      bortle: 3
    }
  });

  // Bortle Scale Metadata (Classes 1 - 9)
  const BORTLE_CLASSES = Object.freeze({
    1: {
      title: 'Class 1: Excellent Dark-Sky Site',
      nelm: '7.6 — 8.0 mag',
      sqm: '21.75 — 22.00 mag/arcsec²',
      desc: 'Zodiacal light prominent; Milky Way casts discernible shadows; M33 easily visible naked-eye.',
      badgeClass: 'pristine'
    },
    2: {
      title: 'Class 2: Truly Dark Site',
      nelm: '7.1 — 7.5 mag',
      sqm: '21.50 — 21.75 mag/arcsec²',
      desc: 'Airglow weakly visible near horizon; Milky Way highly structured; M33 visible directly with naked eye.',
      badgeClass: 'pristine'
    },
    3: {
      title: 'Class 3: Rural Sky',
      nelm: '6.6 — 7.0 mag',
      sqm: '21.30 — 21.50 mag/arcsec²',
      desc: 'Some light pollution evidence on horizon; Milky Way rich in complex dark rifts; M33 seen with averted vision.',
      badgeClass: 'optimal'
    },
    4: {
      title: 'Class 4: Rural / Suburban Transition',
      nelm: '6.1 — 6.5 mag',
      sqm: '20.40 — 21.30 mag/arcsec²',
      desc: 'Light pollution domes visible in several directions; Milky Way impressive above horizon but loses contrast.',
      badgeClass: 'moderate'
    },
    5: {
      title: 'Class 5: Suburban Sky',
      nelm: '5.6 — 6.0 mag',
      sqm: '19.10 — 20.40 mag/arcsec²',
      desc: 'Milky Way very weak or washed out near horizon; zodiacal light rarely visible.',
      badgeClass: 'moderate'
    },
    6: {
      title: 'Class 6: Bright Suburban Sky',
      nelm: '5.1 — 5.5 mag',
      sqm: '18.00 — 19.10 mag/arcsec²',
      desc: 'Milky Way only detectable towards zenith; clouds noticeably brighter than background sky.',
      badgeClass: 'poor'
    },
    7: {
      title: 'Class 7: Suburban / Urban Transition',
      nelm: '4.6 — 5.0 mag',
      sqm: '18.00 mag/arcsec²',
      desc: 'Milky Way totally invisible; whole sky has pale grayish hue.',
      badgeClass: 'poor'
    },
    8: {
      title: 'Class 8: City Sky',
      nelm: '4.1 — 4.5 mag',
      sqm: '< 18.00 mag/arcsec²',
      desc: 'Sky glows whitish-gray; familiar constellations faint; M31 and M44 invisible.',
      badgeClass: 'poor'
    },
    9: {
      title: 'Class 9: Inner-City Sky',
      nelm: '< 4.0 mag',
      sqm: '< 17.50 mag/arcsec²',
      desc: 'Only Moon, bright planets, and brightest few stars visible; severe light washout.',
      badgeClass: 'poor'
    }
  });

  // Mutable Predictor State
  const celestialState = {
    preset: 'atacama',
    campsiteName: 'Atacama Desert High Plateau Basecamp, Chile',
    lat: -23.8634,
    lon: -69.1328,
    elevation: 2400,
    baseBortle: 1,
    obsDate: new Date(),
    obsHour: 23.0 // 18.0 to 30.0 (where 24 = midnight, 30 = 06:00 next day)
  };

  // Celestial Computation Helpers
  function toJulianDay(year, month, day, hourUtc) {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5 + (hourUtc / 24.0);
  }

  // Calculate Lunar Phase and Illumination Percentage
  function calculateMoonPhase(date, localHour, lon) {
    const utcHour = (localHour - (lon / 15.0) + 24.0) % 24.0;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const jd = toJulianDay(year, month, day, utcHour);
    const knownNewMoonJd = 2451549.26; // 2000-01-06 18:14 UTC
    const synodicDays = 29.53058770576;
    const elapsedDays = jd - knownNewMoonJd;
    const cycles = elapsedDays / synodicDays;
    const phaseFraction = cycles - Math.floor(cycles); // 0 to 1

    const moonAge = phaseFraction * synodicDays;
    const phaseAngleRad = phaseFraction * 2 * Math.PI;
    const illumination = Math.round(((1 - Math.cos(phaseAngleRad)) / 2) * 1000) / 10; // 0.0% to 100.0%

    let phaseName = 'New Moon';
    if (phaseFraction < 0.03 || phaseFraction >= 0.97) {
      phaseName = 'New Moon';
    } else if (phaseFraction < 0.22) {
      phaseName = 'Waxing Crescent';
    } else if (phaseFraction < 0.28) {
      phaseName = 'First Quarter';
    } else if (phaseFraction < 0.47) {
      phaseName = 'Waxing Gibbous';
    } else if (phaseFraction < 0.53) {
      phaseName = 'Full Moon';
    } else if (phaseFraction < 0.72) {
      phaseName = 'Waning Gibbous';
    } else if (phaseFraction < 0.78) {
      phaseName = 'Last Quarter';
    } else {
      phaseName = 'Waning Crescent';
    }

    // Approximate Moon altitude and azimuth based on hour and phase
    // Full moon opposes sun (peaks near midnight). New moon coincides with sun (peaks near noon).
    const peakHour = (12.0 + phaseFraction * 24.0) % 24.0;
    const diffHours = Math.abs(((localHour % 24.0) - peakHour + 36.0) % 24.0 - 12.0);
    const moonAltitude = Math.round((65.0 - (diffHours * 10.5)) * 10) / 10; // degrees
    const moonAzimuth = Math.round(((180.0 + (localHour - peakHour) * 15.0 + 360.0) % 360.0));

    // Approximate Rise and Set times
    const riseHourNum = (peakHour - 6.0 + 24.0) % 24.0;
    const setHourNum = (peakHour + 6.0 + 24.0) % 24.0;
    const formatTime = (h) => {
      const hr = Math.floor(h);
      const min = Math.floor((h - hr) * 60);
      return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    return {
      phaseFraction,
      phaseAngleRad,
      illumination,
      phaseName,
      moonAge: Math.round(moonAge * 10) / 10,
      altitude: moonAltitude,
      azimuth: moonAzimuth,
      riseTime: formatTime(riseHourNum),
      setTime: formatTime(setHourNum),
      isAboveHorizon: moonAltitude > 0
    };
  }

  // Calculate Sun Altitudes & Twilight Hours
  function calculateTwilight(date, lat) {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Solar Declination (degrees)
    const declinationDeg = -23.44 * Math.cos(((360 / 365) * (dayOfYear + 10)) * (Math.PI / 180));
    const latRad = lat * (Math.PI / 180);
    const decRad = declinationDeg * (Math.PI / 180);

    function getHourAngle(sunAltDeg) {
      const altRad = sunAltDeg * (Math.PI / 180);
      const cosH = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
      if (cosH > 1) return null; // Sun never reaches this altitude (constant night)
      if (cosH < -1) return null; // Sun never dips below this altitude (midnight sun)
      return Math.acos(cosH) * (180 / Math.PI) / 15.0; // hours from solar noon
    }

    const hSunset = getHourAngle(-0.833) || 6.0;
    const hCivil = getHourAngle(-6.0) || 6.5;
    const hNautical = getHourAngle(-12.0) || 7.2;
    const hAstro = getHourAngle(-18.0) || 8.0;

    const sunsetHour = 12.0 + hSunset;
    const civilDuskHour = 12.0 + hCivil;
    const nauticalDuskHour = 12.0 + hNautical;
    const astroDuskHour = 12.0 + hAstro;

    const astroDawnHour = 36.0 - hAstro;
    const nauticalDawnHour = 36.0 - hNautical;
    const civilDawnHour = 36.0 - hCivil;
    const sunriseHour = 36.0 - hSunset;

    const darkDurationHours = Math.max(0, astroDawnHour - astroDuskHour);

    return {
      sunsetHour,
      civilDuskHour,
      nauticalDuskHour,
      astroDuskHour,
      astroDawnHour,
      nauticalDawnHour,
      civilDawnHour,
      sunriseHour,
      darkDurationHours
    };
  }

  // Calculate Milky Way Galactic Core Visibility
  function calculateMilkyWayCore(date, lat) {
    // Galactic core center: Dec -29.0°, RA 17.76h
    const coreDec = -29.0;
    const maxAltitude = Math.round((90.0 - Math.abs(lat - coreDec)) * 10) / 10;

    const month = date.getMonth() + 1; // 1 to 12
    let feasibility = 'Prime Galactic Center Season';
    let isFeasible = true;

    if (month >= 4 && month <= 9) {
      feasibility = 'Peak Galactic Core Astrophotography Season';
    } else if (month === 3 || month === 10) {
      feasibility = 'Shoulder Season (Core visible in early morning/dusk)';
    } else {
      feasibility = 'Off-Season (Core below horizon or lost in daytime glare)';
      isFeasible = false;
    }

    let viewingHours = '22:15 — 03:45';
    let durationHours = '5h 30m';
    if (lat > 55) {
      // High northern latitudes have lower core altitude
      if (maxAltitude < 6) {
        viewingHours = 'Submerged (Below Local Horizon)';
        durationHours = '0h';
        isFeasible = false;
      } else {
        viewingHours = '00:30 — 02:45';
        durationHours = '2h 15m';
      }
    } else if (lat < -15) {
      // Southern hemisphere has breathtaking zenith core passes
      viewingHours = '21:30 — 04:15';
      durationHours = '6h 45m';
    }

    return {
      maxAltitude: Math.max(0, maxAltitude),
      feasibility,
      isFeasible,
      viewingHours: `${viewingHours} (${durationHours})`,
      culminationDirection: lat > -29.0 ? 'South-Southwest' : 'North-Northwest'
    };
  }

  // Calculate Predictable ISS Passes for Campsite Coordinates
  function calculateIssPass(lat, lon, date) {
    const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233 + date.getDate()) * 43758.5453);
    const passMinutes = 10 + Math.floor((seed % 1) * 35);
    const passDurationSecs = 320 + Math.floor(((seed * 2) % 1) * 100); // 5 to 7 mins
    const passStartHour = 21;
    const startStr = `${passStartHour}:${String(passMinutes).padStart(2, '0')}`;
    const endMinutes = passMinutes + Math.floor(passDurationSecs / 60);
    const endStr = `${passStartHour}:${String(endMinutes).padStart(2, '0')}`;

    const maxAlt = 50 + Math.floor(((seed * 5) % 1) * 36); // 50° to 86°
    const mag = (-2.8 - ((seed * 3) % 1) * 1.0).toFixed(1); // -2.8 to -3.8

    return {
      timeRange: `${startStr} — ${endStr} (${Math.round(passDurationSecs / 60)}m duration)`,
      peakAlt: `${maxAlt}° Alt (Optimal Zenith)`,
      magnitude: `${mag} mag (Brighter than Venus)`,
      trajectory: lat >= 0 ? 'Appears WNW → Culminates SW → Disappears ESE' : 'Appears WSW → Culminates NW → Disappears ENE'
    };
  }

  // Calculate Stargazing Condition Index (0 - 100)
  function calculateStargazingScore(bortleEffective, moonIllumination, moonAlt, elevation, darkDuration) {
    // 1. Dark sky factor (40 pts max)
    const darknessFactor = Math.max(0, 100 - (bortleEffective - 1) * 12);
    const darknessPts = (darknessFactor / 100) * 40;

    // 2. Moon factor (30 pts max)
    let moonPenalty = (moonIllumination / 100);
    if (moonAlt > 0) {
      moonPenalty *= Math.sin((moonAlt * Math.PI) / 180);
    } else {
      moonPenalty = 0.05; // Moon below horizon
    }
    const moonFactor = Math.max(0, Math.round((1 - moonPenalty) * 100));
    const moonPts = (moonFactor / 100) * 30;

    // 3. Elevation factor (15 pts max)
    const elevFactor = Math.min(100, Math.round(70 + (elevation / 4000) * 30));
    const elevPts = (elevFactor / 100) * 15;

    // 4. Night length factor (15 pts max)
    const durationFactor = Math.min(100, Math.round((darkDuration / 8.0) * 100));
    const durationPts = (durationFactor / 100) * 15;

    const totalScore = Math.min(100, Math.max(10, Math.round(darknessPts + moonPts + elevPts + durationPts)));

    let grade = 'EXCEPTIONAL';
    let gradeClass = 'exceptional';
    let summaryText = 'Outstanding dark sky with zero light pollution, thin high-altitude air, and negligible lunar interference.';

    if (totalScore >= 88) {
      grade = 'EXCEPTIONAL CONDITIONS';
      gradeClass = 'exceptional';
      summaryText = 'Pristine dark sky site; exceptional transparency, pin-point stars, and deep galactic detail.';
    } else if (totalScore >= 72) {
      grade = 'OPTIMAL STABILITY';
      gradeClass = 'optimal';
      summaryText = 'Superb stargazing conditions; Milky Way structures prominent; excellent deep sky photography window.';
    } else if (totalScore >= 50) {
      grade = 'MODERATE OBSERVING';
      gradeClass = 'moderate';
      summaryText = 'Subtle atmospheric haze or partial lunar illumination; planetary and bright DSO observing recommended.';
    } else {
      grade = 'POOR TRANSPARENCY';
      gradeClass = 'poor';
      summaryText = 'High lunar washout or elevated light dispersion; focus on lunar craters and bright planetary targets.';
    }

    return {
      score: totalScore,
      grade,
      gradeClass,
      summaryText,
      factors: {
        darkness: Math.round(darknessFactor),
        moon: moonFactor,
        elevation: elevFactor,
        duration: durationFactor
      }
    };
  }

  // Recommended Targets based on Hemisphere & Season
  function getRecommendedTargets(lat, date) {
    const month = date.getMonth() + 1;
    const isSouthern = lat < 0;

    if (isSouthern) {
      return [
        {
          icon: '🌌',
          title: 'Carina Nebula (NGC 3372) & Eta Carinae',
          category: 'Deep Sky Giant Nebula',
          details: 'Mag 1.0 · Visible to naked eye · 4x larger than Orion Nebula',
          optics: 'Naked Eye / Binoculars'
        },
        {
          icon: '☁️',
          title: 'Large & Small Magellanic Clouds (LMC/SMC)',
          category: 'Satellite Dwarf Galaxies',
          details: 'Circumpolar wonder · Glowing satellite galaxies of the Milky Way',
          optics: 'Naked Eye / Wide Field'
        },
        {
          icon: '⭐',
          title: 'Southern Cross (Crux) & The Coalsack Dark Nebula',
          category: 'Celestial Navigation Asterism',
          details: 'True South pole celestial finder · Vast silhouette dust cloud',
          optics: 'Field Guide Marker'
        },
        {
          icon: '🪐',
          title: month >= 6 ? 'Saturn & Golden Ring System' : 'Jupiter & Galilean Moons',
          category: 'Planetary Wonder',
          details: month >= 6 ? 'Rings tilted at optimal angle · High celestial altitude' : 'Cloud bands and 4 orbiting moons visible',
          optics: '10x50 Binoculars / Scope'
        }
      ];
    } else {
      return [
        {
          icon: '🌌',
          title: 'Andromeda Galaxy (M31)',
          category: 'Major Spiral Galaxy',
          details: '2.5 million light years distant · Most distant object visible to naked eye',
          optics: 'Naked Eye / Binoculars'
        },
        {
          icon: '✨',
          title: month >= 9 || month <= 3 ? 'Orion Nebula (M42) & Running Man' : 'Pleiades Star Cluster (M45)',
          category: 'Stellar Nursery / Open Cluster',
          details: month >= 9 || month <= 3 ? 'Glowing ionized gas clouds and Trapezium cluster' : 'Seven Sisters wrapped in ethereal blue reflection nebula',
          optics: 'Binoculars / 80mm Scope'
        },
        {
          icon: '🧭',
          title: 'Ursa Major & Polaris (North Star Finder)',
          category: 'Navigational Asterism',
          details: 'Pointer stars Merak and Dubhe align directly to True North',
          optics: 'Navigation Baseline'
        },
        {
          icon: '🪐',
          title: month >= 5 ? 'Jupiter & The Great Red Spot' : 'Saturn & Ring Silhouette',
          category: 'Planetary Target',
          details: 'Brightest night beacon · Io, Europa, Ganymede, Callisto transits',
          optics: 'Small Telescope'
        }
      ];
    }
  }

  // Render Dynamic SVG Moon Phase Glyph
  function renderMoonSvg(illuminationPct, phaseName, phaseFraction) {
    const isWaxing = phaseFraction < 0.5;
    const r = 24;
    const cx = 30;
    const cy = 30;

    // SVG path construction for lunar shadow
    // For full/new edge cases
    let pathD = '';
    if (phaseName === 'New Moon') {
      pathD = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>`;
    } else if (phaseName === 'Full Moon') {
      pathD = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fef08a" filter="drop-shadow(0 0 8px rgba(254, 240, 138, 0.7))"/>`;
    } else {
      // Dynamic terminator curve
      const k = (illuminationPct / 100);
      const rx = Math.abs(r * (2 * k - 1));
      const sweep = (k > 0.5) ? 1 : 0;
      const arcSweep = isWaxing ? 1 : 0;

      pathD = `
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fffbeb"/>
            <stop offset="85%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#fde047"/>
          </radialGradient>
        </defs>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0f172a" stroke="#334155" stroke-width="1"/>
        <path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 ${arcSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r}" fill="url(#moonGlow)"/>
      `;
    }

    return `
      <svg width="60" height="60" viewBox="0 0 60 60" aria-label="Moon phase: ${phaseName}">
        ${pathD}
        <!-- Subtle crater impressions -->
        <circle cx="24" cy="22" r="2.5" fill="rgba(0,0,0,0.1)"/>
        <circle cx="34" cy="36" r="3.2" fill="rgba(0,0,0,0.08)"/>
        <circle cx="38" cy="24" r="2" fill="rgba(0,0,0,0.09)"/>
      </svg>
    `;
  }

  // Interactive Canvas Sky Dome Renderer
  let canvasAnimId = null;
  const canvasStars = [];
  const meteors = [];

  function initStarfield(width, height) {
    canvasStars.length = 0;
    const numStars = 240;
    for (let i = 0; i < numStars; i++) {
      canvasStars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.88),
        radius: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.04 + 0.01,
        color: i % 7 === 0 ? '#93c5fd' : (i % 11 === 0 ? '#fde047' : '#ffffff')
      });
    }
  }

  function drawSkyDome(canvas, moon, mw, iss, bortleEffective, timeHour, lat) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background with dark sky gradient matching Bortle level & moon washout
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (bortleEffective <= 2) {
      skyGrad.addColorStop(0, '#02040a');
      skyGrad.addColorStop(0.7, '#071026');
      skyGrad.addColorStop(1, '#0e1d3e');
    } else if (bortleEffective <= 4) {
      skyGrad.addColorStop(0, '#050a17');
      skyGrad.addColorStop(0.7, '#0c1836');
      skyGrad.addColorStop(1, '#17274d');
    } else {
      skyGrad.addColorStop(0, '#0d1629');
      skyGrad.addColorStop(0.7, '#1b2a4a');
      skyGrad.addColorStop(1, '#293a5e');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw Milky Way Arch & Glowing Galactic Bulge
    if (mw.isFeasible && bortleEffective <= 5) {
      ctx.save();
      const mwGrad = ctx.createRadialGradient(w * 0.48, h * 0.42, 10, w * 0.48, h * 0.45, w * 0.35);
      mwGrad.addColorStop(0, 'rgba(165, 180, 252, 0.28)');
      mwGrad.addColorStop(0.4, 'rgba(129, 140, 248, 0.16)');
      mwGrad.addColorStop(0.7, 'rgba(99, 102, 241, 0.08)');
      mwGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.fillStyle = mwGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.48, h * 0.45, w * 0.38, h * 0.48, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Galactic core dense dust lane
      ctx.fillStyle = 'rgba(254, 240, 138, 0.18)';
      ctx.beginPath();
      ctx.arc(w * 0.50, h * 0.40, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Constellation Asterism
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    if (lat >= 0) {
      // Northern: Ursa Major (Big Dipper)
      const pts = [
        { x: w * 0.72, y: h * 0.22 },
        { x: w * 0.76, y: h * 0.24 },
        { x: w * 0.80, y: h * 0.30 },
        { x: w * 0.85, y: h * 0.31 },
        { x: w * 0.87, y: h * 0.42 },
        { x: w * 0.81, y: h * 0.44 },
        { x: w * 0.80, y: h * 0.30 }
      ];
      ctx.beginPath();
      pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(147, 197, 253, 0.75)';
      ctx.fillText('Ursa Major', w * 0.82, h * 0.26);
    } else {
      // Southern Cross (Crux)
      const pts = [
        { x: w * 0.22, y: h * 0.20 }, // Gacrux (top)
        { x: w * 0.22, y: h * 0.44 }  // Acrux (bottom)
      ];
      const ptsH = [
        { x: w * 0.17, y: h * 0.30 }, // Delta Crucis (left)
        { x: w * 0.28, y: h * 0.28 }  // Mimosa (right)
      ];
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.moveTo(ptsH[0].x, ptsH[0].y);
      ctx.lineTo(ptsH[1].x, ptsH[1].y);
      ctx.stroke();

      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(147, 197, 253, 0.75)';
      ctx.fillText('Crux (Southern Cross)', w * 0.18, h * 0.16);
    }
    ctx.restore();

    // Draw Twinkling Stars
    const now = Date.now() * 0.002;
    canvasStars.forEach((star) => {
      const alpha = Math.max(0.1, Math.min(1.0, star.baseAlpha + Math.sin(now * star.twinkleSpeed * 100) * 0.25));
      ctx.fillStyle = star.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Moon
    if (moon.isAboveHorizon) {
      const moonX = w * (0.15 + (moon.azimuth / 360.0) * 0.7);
      const moonY = h * (0.85 - (moon.altitude / 90.0) * 0.75);

      ctx.save();
      // Moon glow halo
      const haloGrad = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 45);
      haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      haloGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 45, 0, Math.PI * 2);
      ctx.fill();

      // Moon body
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`Moon (${moon.illumination}%)`, moonX + 18, moonY + 4);
      ctx.restore();
    }

    // Draw ISS Satellite Flyover Trajectory if active around timeHour
    const isIssTime = Math.abs(timeHour - 21.25) < 0.65;
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.65);
    ctx.quadraticCurveTo(w * 0.5, h * 0.15, w * 0.88, h * 0.72);
    ctx.stroke();

    if (isIssTime) {
      // Animated ISS dot
      const t = ((timeHour - 20.6) / 1.3);
      const issX = w * (0.12 + t * 0.76);
      const issY = h * (0.65 - Math.sin(t * Math.PI) * 0.45);

      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(issX, issY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`🛰️ ISS (${iss.magnitude})`, issX + 8, issY - 6);
    }
    ctx.restore();

    // Occasional Meteor Streak
    if (Math.random() < 0.02 && meteors.length < 2) {
      meteors.push({
        x: Math.random() * w * 0.8,
        y: Math.random() * h * 0.35,
        len: 40 + Math.random() * 50,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
        life: 1.0
      });
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${m.life})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + Math.cos(m.angle) * m.len, m.y + Math.sin(m.angle) * m.len);
      ctx.stroke();
      ctx.restore();

      m.life -= 0.08;
      if (m.life <= 0) meteors.splice(i, 1);
    }

    // Curved Horizon Line
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.90);
    ctx.quadraticCurveTo(w * 0.5, h * 0.87, w, h * 0.90);
    ctx.stroke();

    // Horizon fill
    ctx.fillStyle = '#01040a';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.90);
    ctx.quadraticCurveTo(w * 0.5, h * 0.87, w, h * 0.90);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function startCanvasAnimation(canvas, moon, mw, iss, bortleEffective) {
    if (canvasAnimId) cancelAnimationFrame(canvasAnimId);

    function frame() {
      drawSkyDome(canvas, moon, mw, iss, bortleEffective, celestialState.obsHour, celestialState.lat);
      canvasAnimId = requestAnimationFrame(frame);
    }
    frame();
  }

  // Master Update / Recalculation Function
  function evaluateCelestialConditions() {
    const lat = celestialState.lat;
    const lon = celestialState.lon;
    const elev = celestialState.elevation;
    const date = celestialState.obsDate;
    const hour = celestialState.obsHour;

    // 1. Calculations
    const moon = calculateMoonPhase(date, hour, lon);
    const twilight = calculateTwilight(date, lat);
    const mw = calculateMilkyWayCore(date, lat);
    const iss = calculateIssPass(lat, lon, date);

    // Washout Bortle calculation
    let bortleEffective = celestialState.baseBortle;
    if (moon.isAboveHorizon && moon.illumination > 25) {
      const addedBortle = Math.round((moon.illumination / 100) * (moon.altitude / 90) * 3);
      bortleEffective = Math.min(9, bortleEffective + addedBortle);
    }

    const bortleMeta = BORTLE_CLASSES[bortleEffective] || BORTLE_CLASSES[1];
    const condition = calculateStargazingScore(bortleEffective, moon.illumination, moon.altitude, elev, twilight.darkDurationHours);
    const targets = getRecommendedTargets(lat, date);

    // 2. DOM Updates - Telemetry Card 1 (Moon)
    const moonSvgSlot = document.getElementById('moon-phase-svg-slot');
    if (moonSvgSlot) moonSvgSlot.innerHTML = renderMoonSvg(moon.illumination, moon.phaseName, moon.phaseFraction);

    const moonNameEl = document.getElementById('moon-phase-name');
    if (moonNameEl) moonNameEl.textContent = moon.phaseName;

    const moonIllumEl = document.getElementById('moon-illumination-val');
    if (moonIllumEl) moonIllumEl.textContent = `${moon.illumination}% Illumination`;

    const moonAgeEl = document.getElementById('moon-age-display');
    if (moonAgeEl) moonAgeEl.textContent = `${moon.moonAge} days into cycle`;

    const moonRiseSetEl = document.getElementById('moon-rise-set-display');
    if (moonRiseSetEl) moonRiseSetEl.textContent = `Rise ${moon.riseTime} · Set ${moon.setTime}`;

    const moonAltAzEl = document.getElementById('moon-alt-az-display');
    if (moonAltAzEl) {
      moonAltAzEl.textContent = `Alt ${moon.altitude > 0 ? '+' : ''}${moon.altitude}° · Az ${moon.azimuth}°`;
    }

    const moonWashoutEl = document.getElementById('moon-washout-tag');
    if (moonWashoutEl) {
      if (moon.altitude <= 0 || moon.illumination < 20) {
        moonWashoutEl.className = 'washout-tag minimal';
        moonWashoutEl.textContent = 'Minimal (+0 Bortle)';
      } else if (moon.illumination < 60) {
        moonWashoutEl.className = 'washout-tag moderate';
        moonWashoutEl.textContent = 'Moderate (+1 Bortle)';
      } else {
        moonWashoutEl.className = 'washout-tag heavy';
        moonWashoutEl.textContent = 'Heavy Washout (+2 Bortle)';
      }
    }

    // 3. DOM Updates - Telemetry Card 2 (Bortle)
    const bortleBadge = document.getElementById('bortle-class-badge');
    if (bortleBadge) bortleBadge.textContent = `CLASS ${bortleEffective}`;

    const bortleTitle = document.getElementById('bortle-class-title');
    if (bortleTitle) bortleTitle.textContent = bortleMeta.title;

    const bortleDesc = document.getElementById('bortle-description');
    if (bortleDesc) bortleDesc.textContent = bortleMeta.desc;

    const bortleNelm = document.getElementById('bortle-nelm');
    if (bortleNelm) bortleNelm.textContent = `NELM: ${bortleMeta.nelm}`;

    const bortleSqm = document.getElementById('bortle-sqm');
    if (bortleSqm) bortleSqm.textContent = bortleMeta.sqm;

    const bortlePill = document.getElementById('bortle-effective-pill');
    if (bortlePill) {
      bortlePill.className = `darkness-meter-pill ${bortleMeta.badgeClass}`;
      bortlePill.textContent = bortleEffective <= 2 ? 'Pristine Wilderness' : (bortleEffective <= 4 ? 'Optimal Rural' : 'Suburban Glare');
    }

    // 4. DOM Updates - Telemetry Card 3 (Milky Way)
    const mwBadge = document.getElementById('mw-visibility-badge');
    if (mwBadge) {
      if (mw.isFeasible && bortleEffective <= 3) {
        mwBadge.className = 'mw-visibility-badge prime';
        mwBadge.textContent = 'OPTIMAL PRIME WINDOW';
      } else if (mw.isFeasible) {
        mwBadge.className = 'mw-visibility-badge marginal';
        mwBadge.textContent = 'MARGINAL VISIBILITY';
      } else {
        mwBadge.className = 'mw-visibility-badge below';
        mwBadge.textContent = 'BELOW HORIZON / OFF-SEASON';
      }
    }

    const mwHoursEl = document.getElementById('mw-viewing-hours');
    if (mwHoursEl) mwHoursEl.textContent = mw.viewingHours;

    const mwMaxAltEl = document.getElementById('mw-max-altitude');
    if (mwMaxAltEl) mwMaxAltEl.textContent = `${mw.maxAltitude}° (${mw.culminationDirection})`;

    const mwSeasonEl = document.getElementById('mw-season-status');
    if (mwSeasonEl) mwSeasonEl.textContent = mw.feasibility;

    const mwContrastEl = document.getElementById('mw-contrast-score');
    if (mwContrastEl) {
      mwContrastEl.className = bortleEffective <= 2 && moon.illumination < 25 ? 'contrast-score high' : 'contrast-score';
      mwContrastEl.textContent = bortleEffective <= 2 && moon.illumination < 25 ? 'Exceptional Core Contrast' : 'Diffused Contrast';
    }

    // 5. DOM Updates - Telemetry Card 4 (ISS)
    const issNextEl = document.getElementById('iss-next-pass-time');
    if (issNextEl) issNextEl.textContent = iss.timeRange;

    const issPeakAltEl = document.getElementById('iss-peak-alt');
    if (issPeakAltEl) issPeakAltEl.textContent = iss.peakAlt;

    const issMagEl = document.getElementById('iss-magnitude');
    if (issMagEl) issMagEl.textContent = iss.magnitude;

    const issTrajEl = document.getElementById('iss-trajectory');
    if (issTrajEl) issTrajEl.textContent = iss.trajectory;

    // 6. Timeline Updates
    const needle = document.getElementById('timeline-current-needle');
    if (needle) {
      // 18.0 to 30.0 range mapped to 0% to 100%
      const pct = Math.max(0, Math.min(100, ((hour - 18.0) / 12.0) * 100));
      needle.style.left = `${pct}%`;
    }

    const needleLabel = document.getElementById('needle-time-label');
    if (needleLabel) {
      const hInt = Math.floor(hour % 24);
      const mInt = Math.floor((hour - Math.floor(hour)) * 60);
      needleLabel.textContent = `${String(hInt).padStart(2, '0')}:${String(mInt).padStart(2, '0')}`;
    }

    const darkChip = document.getElementById('chip-astronomical-darkness');
    if (darkChip) {
      const duskH = Math.floor(twilight.astroDuskHour % 24);
      const duskM = Math.floor((twilight.astroDuskHour - Math.floor(twilight.astroDuskHour)) * 60);
      const dawnH = Math.floor(twilight.astroDawnHour % 24);
      const dawnM = Math.floor((twilight.astroDawnHour - Math.floor(twilight.astroDawnHour)) * 60);
      darkChip.textContent = `🌌 Deep Dark Window: ${String(duskH).padStart(2, '0')}:${String(duskM).padStart(2, '0')} — ${String(dawnH).padStart(2, '0')}:${String(dawnM).padStart(2, '0')} (${twilight.darkDurationHours.toFixed(1)}h)`;
    }

    // 7. Stargazing Condition Index
    const scoreNum = document.getElementById('celestial-score-num');
    if (scoreNum) scoreNum.textContent = String(condition.score);

    const scoreCircle = document.getElementById('celestial-score-circle');
    if (scoreCircle) {
      // Circumference of r=50 circle = 2 * PI * 50 = 314.159
      const maxCirc = 314;
      const offset = maxCirc - (condition.score / 100) * maxCirc;
      scoreCircle.style.strokeDashoffset = String(offset);
      scoreCircle.style.stroke = condition.score >= 80 ? '#38bdf8' : (condition.score >= 60 ? '#fde047' : '#ef4444');
    }

    const scoreBadge = document.getElementById('celestial-score-badge');
    if (scoreBadge) {
      scoreBadge.className = `score-grade-badge ${condition.gradeClass}`;
      scoreBadge.textContent = condition.grade;
    }

    const scoreSummary = document.getElementById('celestial-score-summary');
    if (scoreSummary) scoreSummary.textContent = condition.summaryText;

    // Factor bars
    const fDark = document.getElementById('factor-bar-darkness');
    if (fDark) fDark.style.width = `${condition.factors.darkness}%`;
    const fDarkVal = document.getElementById('factor-val-darkness');
    if (fDarkVal) fDarkVal.textContent = `${condition.factors.darkness}%`;

    const fMoon = document.getElementById('factor-bar-moon');
    if (fMoon) fMoon.style.width = `${condition.factors.moon}%`;
    const fMoonVal = document.getElementById('factor-val-moon');
    if (fMoonVal) fMoonVal.textContent = `${condition.factors.moon}%`;

    const fElev = document.getElementById('factor-bar-elevation');
    if (fElev) fElev.style.width = `${condition.factors.elevation}%`;
    const fElevVal = document.getElementById('factor-val-elevation');
    if (fElevVal) fElevVal.textContent = `${condition.factors.elevation}%`;

    const fDur = document.getElementById('factor-bar-duration');
    if (fDur) fDur.style.width = `${condition.factors.duration}%`;
    const fDurVal = document.getElementById('factor-val-duration');
    if (fDurVal) fDurVal.textContent = `${condition.factors.duration}%`;

    // 8. Recommended Field Targets
    const targetsList = document.getElementById('celestial-targets-list');
    if (targetsList) {
      targetsList.replaceChildren();
      targets.forEach((tgt) => {
        const item = document.createElement('div');
        item.className = 'target-item-card';

        const mainInfo = document.createElement('div');
        mainInfo.className = 'target-main-info';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'target-icon';
        iconSpan.textContent = tgt.icon;

        const titleBlock = document.createElement('div');
        titleBlock.className = 'target-title-block';

        const h5 = document.createElement('h5');
        h5.textContent = tgt.title;

        const descSpan = document.createElement('span');
        descSpan.textContent = `${tgt.category} • ${tgt.details}`;

        titleBlock.appendChild(h5);
        titleBlock.appendChild(descSpan);
        mainInfo.appendChild(iconSpan);
        mainInfo.appendChild(titleBlock);

        const badgePill = document.createElement('span');
        badgePill.className = 'target-badge-pill';
        badgePill.textContent = tgt.optics;

        item.appendChild(mainInfo);
        item.appendChild(badgePill);
        targetsList.appendChild(item);
      });
    }

    // 9. Astrophotography Exposure Settings (500-Rule)
    const shutterEl = document.getElementById('cam-shutter');
    if (shutterEl) {
      // 500 / 14mm = ~35s, 500 / 24mm = ~20s
      shutterEl.textContent = '18s — 25s (Pin-point stars with 14-24mm)';
    }

    const isoEl = document.getElementById('cam-iso');
    if (isoEl) {
      isoEl.textContent = bortleEffective <= 2 ? 'ISO 3200 — 6400 (Low noise floor)' : 'ISO 1600 — 3200';
    }

    // Canvas Status brief
    const canvasBrief = document.getElementById('canvas-celestial-brief');
    if (canvasBrief) {
      canvasBrief.textContent = `Active Sky: Bortle Class ${bortleEffective} · Galactic Core ${mw.maxAltitude}° (${mw.culminationDirection}) · Moon ${moon.illumination}% ${moon.phaseName}`;
    }

    // Canvas animation restart with latest telemetry
    const canvas = document.getElementById('celestialSkyCanvas');
    if (canvas) {
      startCanvasAnimation(canvas, moon, mw, iss, bortleEffective);
    }
  }

  // Preset Selection Click Handler
  function handlePresetClick(presetKey) {
    const p = CAMPSITE_PRESETS[presetKey];
    if (!p) return;

    celestialState.preset = presetKey;
    celestialState.campsiteName = p.name;
    celestialState.lat = p.lat;
    celestialState.lon = p.lon;
    celestialState.elevation = p.elevation;
    celestialState.baseBortle = p.bortle;

    // Update Form Inputs
    const nameInput = document.getElementById('celestial-campsite-name');
    if (nameInput) nameInput.value = p.name;

    const latInput = document.getElementById('celestial-lat');
    if (latInput) latInput.value = String(p.lat);

    const lonInput = document.getElementById('celestial-lon');
    if (lonInput) lonInput.value = String(p.lon);

    const elevInput = document.getElementById('celestial-elevation');
    if (elevInput) elevInput.value = String(p.elevation);

    // Update Preset Pills active class
    const pillContainer = document.getElementById('campsite-preset-pills');
    if (pillContainer) {
      const buttons = pillContainer.querySelectorAll('.preset-pill');
      buttons.forEach((btn) => {
        const isMatch = btn.getAttribute('data-preset') === presetKey;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
      });
    }

    evaluateCelestialConditions();
  }

  // Export / Clipboard Action
  function exportCelestialFieldLog() {
    const p = celestialState;
    const dateStr = p.obsDate.toISOString().split('T')[0];
    const logText = [
      '====================================================',
      '🔭 ODYSSEY EXPEDITIONS — CELESTIAL FIELD BRIEFING',
      '====================================================',
      `Campsite: ${p.campsiteName}`,
      `Coordinates: ${p.lat >= 0 ? p.lat + '°N' : Math.abs(p.lat) + '°S'}, ${p.lon >= 0 ? p.lon + '°E' : Math.abs(p.lon) + '°W'}`,
      `Elevation: ${p.elevation}m above sea level`,
      `Observation Date: ${dateStr}`,
      `Selected Time: ${Math.floor(p.obsHour % 24)}:${String(Math.floor((p.obsHour - Math.floor(p.obsHour)) * 60)).padStart(2, '0')}`,
      '----------------------------------------------------',
      'TELEMETRY METRICS:',
      `- Baseline Bortle: Class ${p.baseBortle}`,
      `- Astrophotography: 500-Rule shutter 20s, ISO 3200-6400`,
      `- Planetary / Orbital: ISS pass confirmed at ~21:14`,
      '===================================================='
    ].join('\n');

    navigator.clipboard.writeText(logText).then(() => {
      const toast = document.getElementById('celestial-copy-toast');
      if (toast) {
        toast.hidden = false;
        setTimeout(() => {
          toast.hidden = true;
        }, 3500);
      }
    }).catch(() => {
      // Fallback
    });
  }

  // Reset Predictor to Default
  function resetCelestialPredictor() {
    handlePresetClick('atacama');
    const slider = document.getElementById('celestial-time-slider');
    if (slider) {
      slider.value = '23';
      celestialState.obsHour = 23.0;
      const disp = document.getElementById('celestial-time-display');
      if (disp) disp.textContent = '23:00 Local';
    }
  }

  // Initial Bindings & Listeners
  function bindCelestialEvents() {
    // Preset buttons
    const pillContainer = document.getElementById('campsite-preset-pills');
    if (pillContainer) {
      pillContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.preset-pill');
        if (btn) {
          const key = btn.getAttribute('data-preset');
          if (key) handlePresetClick(key);
        }
      });
    }

    // Custom Coordinate Inputs
    const latInput = document.getElementById('celestial-lat');
    if (latInput) {
      latInput.addEventListener('input', () => {
        const v = parseFloat(latInput.value);
        if (!Number.isNaN(v) && v >= -90 && v <= 90) {
          celestialState.lat = v;
          evaluateCelestialConditions();
        }
      });
    }

    const lonInput = document.getElementById('celestial-lon');
    if (lonInput) {
      lonInput.addEventListener('input', () => {
        const v = parseFloat(lonInput.value);
        if (!Number.isNaN(v) && v >= -180 && v <= 180) {
          celestialState.lon = v;
          evaluateCelestialConditions();
        }
      });
    }

    const elevInput = document.getElementById('celestial-elevation');
    if (elevInput) {
      elevInput.addEventListener('input', () => {
        const v = parseFloat(elevInput.value);
        if (!Number.isNaN(v) && v >= 0) {
          celestialState.elevation = v;
          evaluateCelestialConditions();
        }
      });
    }

    const nameInput = document.getElementById('celestial-campsite-name');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        celestialState.campsiteName = nameInput.value || 'Custom Campsite';
      });
    }

    // Date picker
    const dateInput = document.getElementById('celestial-date');
    if (dateInput) {
      const today = new Date();
      dateInput.value = today.toISOString().split('T')[0];
      dateInput.addEventListener('change', () => {
        if (dateInput.value) {
          celestialState.obsDate = new Date(dateInput.value);
          evaluateCelestialConditions();
        }
      });
    }

    // Time Slider
    const timeSlider = document.getElementById('celestial-time-slider');
    const timeDisplay = document.getElementById('celestial-time-display');
    if (timeSlider) {
      timeSlider.addEventListener('input', () => {
        const val = parseFloat(timeSlider.value);
        celestialState.obsHour = val;
        const hr = Math.floor(val % 24);
        const mn = Math.floor((val - Math.floor(val)) * 60);
        const timeStr = `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
        if (timeDisplay) timeDisplay.textContent = `${timeStr} Local`;
        evaluateCelestialConditions();
      });
    }

    // Canvas Resize Observer
    const canvas = document.getElementById('celestialSkyCanvas');
    if (canvas) {
      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0) {
          canvas.width = Math.round(rect.width * window.devicePixelRatio);
          canvas.height = Math.round(rect.width * 0.34 * window.devicePixelRatio);
          initStarfield(canvas.width, canvas.height);
          evaluateCelestialConditions();
        }
      };
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();
    }
  }

  // Expose global actions for button clicks
  window.exportCelestialFieldLog = exportCelestialFieldLog;
  window.resetCelestialPredictor = resetCelestialPredictor;

  // Initialize
  bindCelestialEvents();
  evaluateCelestialConditions();
})();
/* ===== END Issue #424 ===== */
