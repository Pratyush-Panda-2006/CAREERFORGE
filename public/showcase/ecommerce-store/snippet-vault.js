/**
 * E-Commerce Store - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores checkout rules, promotion schemas, dynamic pricing tiers, and webhook payloads.
 */

export class EcommerceStoreSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'promo-flash-discount',
        title: 'Flash Sale Percentage & Tiered Cart Discount',
        code: `{\n  "rule_id": "FLASH_2026",\n  "type": "percentage_off",\n  "value_percent": 25.0,\n  "minimum_cart_subtotal_usd": 75.0,\n  "stackable_with_coupons": false,\n  "auto_apply": true\n}`,
        tags: ['discount', 'promo', 'checkout', 'pricing']
      },
      {
        id: 'free-shipping-threshold',
        title: 'Geographic Free Shipping Threshold Matrix',
        code: `{\n  "zone": "DOMESTIC_STANDARD",\n  "qualifying_subtotal_usd": 50.0,\n  "excluded_product_categories": ["heavy_freight", "hazmat"],\n  "carrier_service_fallback": "USPS_GROUND_ADVANTAGE"\n}`,
        tags: ['shipping', 'logistics', 'checkout', 'fulfillment']
      },
      {
        id: 'wholesale-b2b-tier',
        title: 'B2B Wholesale Quantity Break Matrix',
        code: `{\n  "customer_group": "verified_reseller",\n  "tiers": [\n    { "min_qty": 50, "unit_discount_percent": 15.0 },\n    { "min_qty": 200, "unit_discount_percent": 30.0 },\n    { "min_qty": 1000, "unit_discount_percent": 45.0 }\n  ],\n  "payment_terms": "NET_30"\n}`,
        tags: ['wholesale', 'b2b', 'pricing', 'volume']
      },
      {
        id: 'cart-abandonment-webhook',
        title: 'Abandoned Cart Recovery Notification Webhook',
        code: `{\n  "event": "cart.abandoned",\n  "trigger_delay_minutes": 60,\n  "payload": {\n    "cart_id": "cart_99214",\n    "recovery_discount_code": "COMEBACK10",\n    "expiry_hours": 24\n  }\n}`,
        tags: ['recovery', 'webhook', 'automation', 'retention']
      },
      {
        id: 'currency-formatting-schema',
        title: 'Multi-Currency Locale Formatting Config',
        code: `{\n  "base_currency": "USD",\n  "supported_currencies": ["USD", "EUR", "GBP", "JPY", "CAD"],\n  "fx_provider": "ecb_daily_sync",\n  "rounding_precision": 2,\n  "price_ending_format": 0.99\n}`,
        tags: ['currency', 'localization', 'pricing', 'global']
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

    const vault = new EcommerceStoreSnippetVault();
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
        chip.textContent = tag === 'all' ? '🛒 All Store Snippets' : `#${tag}`;
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
        empty.style.padding = '3rem';
        empty.textContent = 'No matching snippets found.';
        grid.appendChild(empty);
        return;
      }

      results.forEach(snippet => {
        const card = document.createElement('article');
        card.className = 'snippet-card';

        const header = document.createElement('div');
        header.className = 'card-header';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = snippet.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(snippet.code);
            showToast('Copied to clipboard!');
          } catch {
            showToast('Failed to copy');
          }
        });

        header.appendChild(title);
        header.appendChild(copyBtn);

        const body = document.createElement('div');
        body.className = 'card-body';
        const pre = document.createElement('pre');
        pre.className = 'code-block';
        pre.textContent = snippet.code;
        body.appendChild(pre);

        const footer = document.createElement('div');
        footer.className = 'card-footer';
        snippet.tags.forEach(t => {
          const span = document.createElement('span');
          span.className = 'card-tag';
          span.textContent = `#${t}`;
          footer.appendChild(span);
        });

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        grid.appendChild(card);
      });
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
