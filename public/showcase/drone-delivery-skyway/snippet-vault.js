/**
 * Drone Delivery Skyway - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores autonomous flight corridors, fail-safe payload release profiles, and geofence specs.
 */

export class DroneDeliverySkywaySnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'skyway-corridor-nav',
        title: 'Urban Altitude Corridor Nav Vector Spec',
        code: `{\n  "corridor_id": "COR-NY-09",\n  "min_altitude_agl_m": 80,\n  "max_altitude_agl_m": 120,\n  "speed_limit_mps": 22.5,\n  "spacing_interval_sec": 4.0,\n  "lateral_tolerance_m": 2.5\n}`,
        tags: ['navigation', 'corridor', 'telemetry', 'flight-ops']
      },
      {
        id: 'dynamic-geofence-nofly',
        title: 'Emergency Dynamic No-Fly Exclusion Zone',
        code: `{\n  "zone_type": "TemporaryFlightRestriction",\n  "center": { "lat": 40.7128, "lon": -74.0060 },\n  "radius_meters": 650,\n  "effective_until": "2026-12-31T23:59:59Z",\n  "auto_reroute_buffer_m": 50\n}`,
        tags: ['geofence', 'safety', 'compliance', 'airspace']
      },
      {
        id: 'winch-tether-release',
        title: 'Precision Tether Winch Drop Protocol',
        code: `{\n  "delivery_mode": "TetherDescent",\n  "hover_ceiling_m": 15,\n  "cable_speed_mps": 1.2,\n  "weight_sensor_threshold_g": 80,\n  "auto_cut_on_entanglement": true,\n  "landing_pad_marker": "AR_APRILTAG_36H11"\n}`,
        tags: ['payload', 'delivery', 'winch', 'hardware']
      },
      {
        id: 'rth-battery-failsafe',
        title: 'Return-to-Home Battery Critical Threshold',
        code: `{\n  "low_battery_rth_percent": 24.5,\n  "emergency_glide_cutoff_percent": 12.0,\n  "wind_headwind_compensation_factor": 1.35,\n  "alternative_landing_waypoint": "PAD-EMERGENCY-03"\n}`,
        tags: ['battery', 'failsafe', 'power', 'avionics']
      },
      {
        id: 'lidar-obstacle-avoidance',
        title: '360 Solid-State LiDAR Collision Matrix',
        code: `{\n  "scan_rate_hz": 40,\n  "detection_range_m": 60,\n  "safe_bubble_radius_m": 4.5,\n  "vector_divergence_angle_deg": 35,\n  "birds_filtering_enabled": true\n}`,
        tags: ['sensors', 'lidar', 'safety', 'perception']
      }
    ];
  }

  getAllSnippets() {
    return [...this.snippets];
  }

  addSnippet(title, code, tags = []) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Snippet title is required');
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new Error('Snippet code content is required');
    }

    const trimmedTitle = title.trim();
    const id = trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const duplicate = this.snippets.some(s => s.id === id || s.title.toLowerCase() === trimmedTitle.toLowerCase());
    if (duplicate) {
      throw new Error(`Snippet with title or ID '${trimmedTitle}' already exists in vault.`);
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    const newSnippet = {
      id,
      title: trimmedTitle,
      code: code.trim(),
      tags: [...new Set(normalizedTags)]
    };

    this.snippets.push(newSnippet);
    return newSnippet;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') {
      return [...this.snippets];
    }
    const cleanTag = tag.trim().toLowerCase();
    return this.snippets.filter(s => s.tags.includes(cleanTag));
  }

  searchSnippets(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [...this.snippets];
    }

    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

    return this.snippets.filter(snippet => {
      const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
      return tokens.every(token => fullText.includes(token));
    });
  }

  getAllTags() {
    const tagSet = new Set();
    this.snippets.forEach(s => s.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('snippetsGrid');
    if (!grid) return;

    const vault = new DroneDeliverySkywaySnippetVault();
    let activeTag = 'all';
    let searchQuery = '';

    const searchInput = document.getElementById('searchQueryInput');
    const tagBar = document.getElementById('tagFilterBar');
    const toast = document.getElementById('copyToast');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function renderTagFilters() {
      if (!tagBar) return;
      tagBar.replaceChildren();

      const tags = ['all', ...vault.getAllTags()];
      tags.forEach(tag => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `filter-chip ${activeTag === tag ? 'active' : ''}`;
        chip.textContent = tag === 'all' ? '🛸 All Avionics' : `#${tag}`;
        chip.addEventListener('click', () => {
          activeTag = tag;
          renderTagFilters();
          renderCards();
        });
        tagBar.appendChild(chip);
      });
    }

    function renderCards() {
      grid.replaceChildren();

      let results = activeTag === 'all' ? vault.getAllSnippets() : vault.filterByTag(activeTag);
      if (searchQuery) {
        const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        results = results.filter(snippet => {
          const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
          return tokens.every(token => fullText.includes(token));
        });
      }

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.gridColumn = '1 / -1';
        empty.style.textAlign = 'center';
        empty.style.padding = '3rem 1rem';
        empty.textContent = 'No drone telemetry or flight path specs found matching query.';
        grid.appendChild(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'card-top';

        const title = document.createElement('h3');
        title.className = 'snippet-title';
        title.textContent = item.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.textContent = '📋 Copy Spec';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}" spec!`);
          }).catch(() => {
            showToast('Spec copied!');
          });
        });

        topRow.append(title, copyBtn);

        const codeBox = document.createElement('div');
        codeBox.className = 'code-container';
        const pre = document.createElement('pre');
        pre.textContent = item.code;
        codeBox.appendChild(pre);

        const tagList = document.createElement('div');
        tagList.className = 'tag-list';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'card-tag';
          tSpan.textContent = `#${t}`;
          tagList.appendChild(tSpan);
        }

        card.append(topRow, codeBox, tagList);
        grid.appendChild(card);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCards();
      });
    }

    renderTagFilters();
    renderCards();
  });
}
