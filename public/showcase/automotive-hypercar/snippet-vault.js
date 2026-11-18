/**
 * AutomotiveHypercarSnippetVault
 * Reusable preset snippet library & tag-based search vault for aerodynamic profiles, torque vectoring maps, and chassis setups.
 */
export class AutomotiveHypercarSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'hyper-snip-1',
        title: 'High-Downforce Monza Aero Trim',
        description: 'Low-drag active rear wing angle of attack and front splitter venturi tunnel flap profile.',
        category: 'Aerodynamics',
        tags: ['aero', 'downforce', 'monza', 'wing', 'drag'],
        code: JSON.stringify({
          front_splitter_angle_deg: 2.2,
          rear_wing_aoa_deg: 4.8,
          venturi_throat_height_mm: 38,
          target_cd: 0.312,
          target_cl: 0.840,
          drs_reduction_pct: 35.0
        }, null, 2),
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'hyper-snip-2',
        title: 'Quad-Motor Torque Vectoring Yaw Matrix',
        description: 'Corner-entry yaw damping and corner-exit full traction differential torque allocation.',
        category: 'Powertrain',
        tags: ['torque', 'yaw', 'powertrain', 'differential', 'motors'],
        code: JSON.stringify({
          front_left_bias_pct: 22.5,
          front_right_bias_pct: 22.5,
          rear_left_bias_pct: 27.5,
          rear_right_bias_pct: 27.5,
          yaw_moment_gain: 1.45,
          inner_wheel_drag_torque_nm: -120
        }, null, 2),
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'hyper-snip-3',
        title: 'Magnetorheological Dynamic Damper Curve',
        description: 'Variable frequency valve resistance curves for curbs, braking dive, and aero platform stability.',
        category: 'Chassis',
        tags: ['chassis', 'suspension', 'damping', 'magnetorheological'],
        code: JSON.stringify({
          front_bump_rate_kn_s_m: 4.2,
          front_rebound_kn_s_m: 6.8,
          rear_bump_rate_kn_s_m: 4.8,
          rear_rebound_kn_s_m: 7.4,
          heave_damper_stiffness_n_mm: 320
        }, null, 2),
        createdAt: '2026-03-01T10:30:00.000Z'
      },
      {
        id: 'hyper-snip-4',
        title: '800V Regenerative Braking & Friction Split',
        description: 'Blended electro-hydraulic deceleration strategy optimizing cell pack charging thermal margins.',
        category: 'Braking & Regen',
        tags: ['regen', 'braking', 'thermal', 'battery', 'kers'],
        code: JSON.stringify({
          max_regen_power_kw: 350,
          friction_brake_threshold_g: 0.65,
          front_to_rear_bias_ratio: 0.62,
          rotor_temp_soft_limit_c: 680,
          battery_regen_derate_c: 58
        }, null, 2),
        createdAt: '2026-03-01T10:45:00.000Z'
      },
      {
        id: 'hyper-snip-5',
        title: 'Closed-Loop Launch Control & Slip Target',
        description: 'Optimal tire contact patch slip target for sub-2.0 second 0-100 km/h sprint.',
        category: 'ECU & Launch',
        tags: ['launch', 'ecu', 'acceleration', 'traction'],
        code: JSON.stringify({
          optimal_longitudinal_slip_pct: 8.5,
          initial_inverter_current_limit_a: 1400,
          clutchless_torque_ramp_ms: 18,
          pre_spool_motor_rpm: 0,
          traction_cut_frequency_hz: 200
        }, null, 2),
        createdAt: '2026-03-01T11:00:00.000Z'
      }
    ];
  }

  getSnippets() {
    return [...this.snippets];
  }

  getAllTags() {
    const set = new Set();
    for (const item of this.snippets) {
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          set.add(tag);
        }
      }
    }
    return Array.from(set).sort();
  }

  getAllCategories() {
    const set = new Set();
    for (const item of this.snippets) {
      if (item.category) {
        set.add(item.category);
      }
    }
    return Array.from(set).sort();
  }

  addSnippet(snippet) {
    if (!snippet || !snippet.title || !snippet.code) {
      throw new Error('Snippet must provide title and code');
    }
    const newSnippet = {
      id: snippet.id || `hyper-snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: snippet.title.trim(),
      description: (snippet.description || '').trim(),
      category: snippet.category || 'General',
      tags: Array.isArray(snippet.tags) ? snippet.tags.map(t => String(t).trim().toLowerCase()) : [],
      code: snippet.code,
      createdAt: snippet.createdAt || new Date().toISOString()
    };
    this.snippets.push(newSnippet);
    return newSnippet;
  }

  removeSnippet(id) {
    const idx = this.snippets.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.snippets.splice(idx, 1);
      return true;
    }
    return false;
  }

  search(query = '', selectedTag = '', selectedCategory = '') {
    const q = query.trim().toLowerCase();
    const tag = selectedTag.trim().toLowerCase();
    const cat = selectedCategory.trim().toLowerCase();

    return this.snippets.filter(item => {
      const matchesQuery = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q);

      const matchesTag = !tag || (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase() === tag));
      const matchesCat = !cat || (item.category && item.category.toLowerCase() === cat);

      return matchesQuery && matchesTag && matchesCat;
    });
  }

  render(container, onSelect = null) {
    if (!container) return;
    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'ah-vault-wrapper';

    const header = document.createElement('div');
    header.className = 'ah-vault-header';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'ah-vault-search-input';
    searchInput.placeholder = 'Search hypercar telemetry maps, aero configs, torque specs...';

    const tagFilterWrap = document.createElement('div');
    tagFilterWrap.className = 'ah-vault-tag-filters';

    let activeTag = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'ah-tag-pill ah-tag-pill-active';
    allBtn.textContent = 'All Telemetry';
    tagFilterWrap.append(allBtn);

    const tags = this.getAllTags();
    const tagButtons = [allBtn];

    const listContainer = document.createElement('div');
    listContainer.className = 'ah-vault-list';

    const refreshList = () => {
      listContainer.replaceChildren();
      const results = this.search(searchInput.value, activeTag);

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ah-vault-empty';
        empty.textContent = 'No hypercar tune configs match the specified criteria.';
        listContainer.append(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'ah-snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'ah-card-top';

        const title = document.createElement('h3');
        title.className = 'ah-card-title';
        title.textContent = item.title;

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'ah-cat-badge';
        categoryBadge.textContent = item.category;

        topRow.append(title, categoryBadge);

        const desc = document.createElement('p');
        desc.className = 'ah-card-desc';
        desc.textContent = item.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'ah-card-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = item.code;
        codeBlock.append(codeElem);

        const footer = document.createElement('div');
        footer.className = 'ah-card-footer';

        const tagList = document.createElement('div');
        tagList.className = 'ah-card-tags';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'ah-card-tag-item';
          tSpan.textContent = `#${t}`;
          tagList.append(tSpan);
        }

        const useBtn = document.createElement('button');
        useBtn.className = 'ah-btn-use-snippet';
        useBtn.textContent = 'Flash to ECU';
        useBtn.addEventListener('click', () => {
          if (typeof onSelect === 'function') {
            onSelect(item);
          }
        });

        footer.append(tagList, useBtn);
        card.append(topRow, desc, codeBlock, footer);
        listContainer.append(card);
      }
    };

    allBtn.addEventListener('click', () => {
      activeTag = '';
      tagButtons.forEach(b => b.classList.remove('ah-tag-pill-active'));
      allBtn.classList.add('ah-tag-pill-active');
      refreshList();
    });

    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.className = 'ah-tag-pill';
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        activeTag = tag;
        tagButtons.forEach(b => b.classList.remove('ah-tag-pill-active'));
        btn.classList.add('ah-tag-pill-active');
        refreshList();
      });
      tagButtons.push(btn);
      tagFilterWrap.append(btn);
    }

    searchInput.addEventListener('input', () => refreshList());

    header.append(searchInput, tagFilterWrap);
    wrapper.append(header, listContainer);
    container.append(wrapper);

    refreshList();
  }
}
