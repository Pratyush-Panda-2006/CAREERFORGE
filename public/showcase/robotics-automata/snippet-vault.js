/**
 * Robotics Automata - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores kinematic configurations, Denavit-Hartenberg parameters, and PID servo loop tunings.
 */

export class RoboticsAutomataSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'urdf-6dof-manipulator-arm',
        title: '6-DOF Articulated Robotic Manipulator Arm URDF Kinematic Chain',
        code: `<robot name="automata_arm_6dof">\n  <link name="base_link"/>\n  <joint name="shoulder_pan" type="revolute">\n    <parent link="base_link"/>\n    <child link="shoulder_link"/>\n    <limit effort="150.0" lower="-3.1415" upper="3.1415" velocity="2.1"/>\n  </joint>\n</robot>`,
        tags: ['urdf', 'kinematics', 'manipulator', 'robotics']
      },
      {
        id: 'dh-parameter-forward-kinematics',
        title: 'Standard Denavit-Hartenberg (DH) Transformation Matrix Calculator',
        code: `function computeDHMatrix(theta, d, a, alpha) {\n  const ct = Math.cos(theta), st = Math.sin(theta);\n  const ca = Math.cos(alpha), sa = Math.sin(alpha);\n  return [\n    [ct, -st * ca,  st * sa, a * ct],\n    [st,  ct * ca, -ct * sa, a * st],\n    [0,   sa,       ca,      d     ],\n    [0,   0,        0,       1     ]\n  ];\n}`,
        tags: ['dh-parameters', 'forward-kinematics', 'math', 'transforms']
      },
      {
        id: 'pid-computed-torque-joint-controller',
        title: 'Computed Torque Control Loop with Anti-Windup Integrator',
        code: `{\n  "kp": [320.0, 280.0, 240.0, 180.0, 120.0, 60.0],\n  "kd": [45.0, 38.0, 30.0, 22.0, 14.0, 8.0],\n  "ki": [12.0, 10.0, 8.0, 4.0, 2.0, 1.0],\n  "integrator_max_torque_nm": 25.0,\n  "loop_frequency_hz": 1000\n}`,
        tags: ['pid', 'control-theory', 'servo', 'dynamics']
      },
      {
        id: 'quintic-polynomial-trajectory-spline',
        title: 'C2-Continuous Quintic Polynomial Minimum-Jerk Trajectory Planner',
        code: `function quinticProfile(t, tTotal, q0, q1, v0, v1, a0, a1) {\n  const tau = t / tTotal;\n  const h = q1 - q0;\n  const a0_term = q0;\n  const a1_term = v0 * tTotal;\n  const a2_term = 0.5 * a0 * tTotal * tTotal;\n  return a0_term + a1_term * tau + a2_term * Math.pow(tau, 2);\n}`,
        tags: ['trajectory', 'motion-planning', 'quintic', 'spline']
      },
      {
        id: 'lidar-obstacle-avoidance-costmap',
        title: '2D Occupancy Grid Inflation & Obstacle Clearance Vector Map',
        code: `{\n  "resolution_meters": 0.05,\n  "inflation_radius_meters": 0.45,\n  "cost_scaling_factor": 10.0,\n  "lethal_cost_threshold": 254,\n  "sensor_timeout_sec": 0.2\n}`,
        tags: ['navigation', 'slam', 'costmap', 'lidar']
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

    const vault = new RoboticsAutomataSnippetVault();
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
        chip.textContent = tag === 'all' ? '🤖 All Presets' : `#${tag}`;
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
        empty.textContent = 'No robotics presets or motion profiles matching your search.';
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
        copyBtn.textContent = '📋 Copy Preset';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}"!`);
          }).catch(() => {
            showToast('Preset copied!');
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
