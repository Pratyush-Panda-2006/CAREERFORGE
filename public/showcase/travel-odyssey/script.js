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
