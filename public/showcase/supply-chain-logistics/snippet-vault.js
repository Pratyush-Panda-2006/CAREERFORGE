/**
 * Supply Chain Logistics - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores EDI transactions, Incoterms liability contracts, and customs tariff classifications.
 */

export class SupplyChainLogisticsSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'edi-214-shipment-status-message',
        title: 'ANSI X12 EDI 214 Transportation Carrier Shipment Status',
        code: `ISA*00*          *00*          *ZZ*LOGISTICS_EXP  *ZZ*RECEIVER_HUB   *261117*2230*U*00401*000000101*0*P*>~\\nGS*QM*LOGISTICS_EXP*RECEIVER_HUB*20261117*2230*101*X*004010~\\nST*214*0001~\\nB10*BOL99182*SHIP_551*CARRIER_EXP~\\nLX*1~\\nAT7*D*NS***20261117*1430*LT~\\nMS1*ROTTERDAM*NL*N~\\nSE*7*0001~\\nGE*1*101~\\nIEA*1*000000101~`,
        tags: ['edi', 'freight', 'tracking', 'standards']
      },
      {
        id: 'incoterms-2020-cif-dap-matrix',
        title: 'Incoterms 2020 Risk Transfer & Freight Cost Division Matrix',
        code: `{\n  "term": "DAP (Delivered at Place)",\n  "seller_obligations": ["Export customs clearance", "Main international carriage", "Transit insurance"],\n  "buyer_obligations": ["Import duty and VAT", "Unloading at final destination"],\n  "risk_transfer_point": "When goods placed at disposal of buyer on arriving means of transport"\n}`,
        tags: ['incoterms', 'trade', 'legal', 'compliance']
      },
      {
        id: 'hs-tariff-classification-electronics',
        title: 'Harmonized System (HS) Code 8542.31 Integrated Circuits Spec',
        code: `{\n  "hs_code": "8542.31.00",\n  "description": "Processors and controllers, whether or not combined with memories",\n  "general_duty_rate": "0.0%",\n  "export_control_eccn": "3A090.a",\n  "origin_country_rule": "Substantial Transformation"\n}`,
        tags: ['customs', 'tariff', 'hs-codes', 'cross-border']
      },
      {
        id: 'reefer-cold-chain-telemetry-payload',
        title: 'IoT Cold Chain Temperature & Humidity Logging JSON Schema',
        code: `{\n  "container_id": "MSCU-882194",\n  "sensor_id": "REEF_SENS_04",\n  "temp_celsius": 3.2,\n  "humidity_rh_percent": 85.0,\n  "compressor_power_draw_kw": 4.6,\n  "battery_reserve_hours": 72.0,\n  "alert_status": "NORMAL"\n}`,
        tags: ['cold-chain', 'telemetry', 'reefer', 'iot']
      },
      {
        id: 'ocean-bill-of-lading-contract',
        title: 'Multimodal Ocean Bill of Lading (FBL) Standard Consignment',
        code: `{\n  "bol_number": "MEDU99182741",\n  "shipper": "Global Tech Logistics Ltd, Shenzhen",\n  "consignee": "To Order of Bank of London",\n  "vessel_imo": "9811000",\n  "port_of_loading": "Shenzhen Yantian",\n  "port_of_discharge": "Rotterdam Maasvlakte",\n  "freight_terms": "FREIGHT PREPAID"\n}`,
        tags: ['maritime', 'bill-of-lading', 'shipping', 'documentation']
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

    const vault = new SupplyChainLogisticsSnippetVault();
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
        chip.textContent = tag === 'all' ? '📦 All Presets' : `#${tag}`;
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
        empty.textContent = 'No trade templates or customs presets matching your search.';
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
