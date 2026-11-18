/**
 * EcommerceDiffInspector
 * Visual state & text change diff inspector with line highlighting for product catalog schemas, promotional pricing matrices, and shipping rule revisions.
 */
export class EcommerceDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentPresetId = this.presets[0]?.id || null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'promo-discount-matrix',
        title: 'Black Friday Promotional Discount & Coupon Policy',
        description: 'Updates coupon validation threshold, stacks tiered VIP percentage off, and sets minimum basket amounts.',
        original: `promotions:
  campaign: "Early Bird Autumn"
  currency: "USD"
  min_cart_subtotal: 50.00
  discount_rate: 0.15
  stackable: false
  applicable_categories:
    - "apparel"
    - "footwear"
  free_shipping_threshold: 100.00`,
        modified: `promotions:
  campaign: "Black Friday Mega Deal"
  currency: "USD"
  min_cart_subtotal: 75.00
  discount_rate: 0.30
  stackable: true
  vip_bonus_multiplier: 1.10
  applicable_categories:
    - "apparel"
    - "footwear"
    - "electronics"
    - "accessories"
  free_shipping_threshold: 49.00`
      },
      {
        id: 'shipping-zone-tariffs',
        title: 'Cross-Border Carrier Shipping Rates & Zone Tariffs',
        description: 'Migrates flat-rate ground delivery to dynamic carrier weight brackets with carbon offset surcharges.',
        original: `shipping_policy:
  zone: "North America"
  method: "standard_ground"
  base_rate: 8.50
  per_kg_surcharge: 1.20
  max_delivery_days: 5`,
        modified: `shipping_policy:
  zone: "North America"
  method: "dynamic_green_express"
  base_rate: 6.95
  per_kg_surcharge: 0.90
  carbon_neutral_fee: 0.45
  guaranteed_delivery_days: 2
  tracking_webhook_enabled: true`
      },
      {
        id: 'product-sku-attributes',
        title: 'Product Variant SKU & Inventory Schema Migration',
        description: 'Transitions single inventory warehouse count into multi-location fulfillment node stock levels.',
        original: `sku: "AP-SHIRT-BLK-M"
name: "Merino Wool Performance Tee"
size: "Medium"
color: "Obsidian Black"
inventory:
  quantity_available: 45
  reorder_point: 10`,
        modified: `sku: "AP-SHIRT-BLK-M"
name: "Merino Wool Performance Tee"
size: "Medium"
color: "Obsidian Black"
inventory:
  fulfillment_nodes:
    - warehouse_id: "US-EAST-1"
      stock: 30
    - warehouse_id: "EU-CENTRAL-1"
      stock: 15
  global_available: 45
  reorder_point: 15
  backorder_allowed: true`
      }
    ];
  }

  getPresets() {
    return this.presets;
  }

  getPresetById(id) {
    return this.presets.find((p) => p.id === id) || null;
  }

  computeDiff(originalText = '', modifiedText = '') {
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');

    const diff = [];
    const maxLen = Math.max(originalLines.length, modifiedLines.length);

    let oldLineNum = 1;
    let newLineNum = 1;

    for (let i = 0; i < maxLen; i++) {
      const orig = originalLines[i];
      const mod = modifiedLines[i];

      if (orig === undefined) {
        diff.push({
          type: 'added',
          oldLineNumber: null,
          newLineNumber: newLineNum++,
          content: mod
        });
      } else if (mod === undefined) {
        diff.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
          content: orig
        });
      } else if (orig === mod) {
        diff.push({
          type: 'unchanged',
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
          content: orig
        });
      } else {
        diff.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
          content: orig
        });
        diff.push({
          type: 'added',
          oldLineNumber: null,
          newLineNumber: newLineNum++,
          content: mod
        });
      }
    }

    return diff;
  }

  getDiffStats(diff) {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diff.forEach((item) => {
      if (item.type === 'added') added++;
      else if (item.type === 'removed') removed++;
      else if (item.type === 'unchanged') unchanged++;
    });

    const netChange = added - removed;
    const totalLines = added + removed + unchanged;

    return {
      added,
      removed,
      unchanged,
      totalLines,
      netChange
    };
  }

  renderToDOM(container, presetId = this.currentPresetId) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    const preset = this.getPresetById(presetId) || this.presets[0];
    if (!preset) return;

    this.currentPresetId = preset.id;
    const diff = this.computeDiff(preset.original, preset.modified);
    const stats = this.getDiffStats(diff);

    container.replaceChildren();

    const diffContainer = document.createElement('div');
    diffContainer.className = 'ecom-diff-container';

    // Header
    const header = document.createElement('div');
    header.className = 'ecom-diff-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'ecom-diff-title-group';

    const title = document.createElement('h3');
    title.textContent = 'E-Commerce Catalog & Pricing Diff Inspector';

    const desc = document.createElement('p');
    desc.className = 'ecom-diff-desc';
    desc.textContent = preset.description;

    titleGroup.append(title, desc);

    const selector = document.createElement('select');
    selector.className = 'ecom-preset-select';
    this.presets.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title;
      opt.selected = p.id === preset.id;
      selector.append(opt);
    });

    selector.addEventListener('change', (e) => {
      this.renderToDOM(container, e.target.value);
    });

    header.append(titleGroup, selector);
    diffContainer.append(header);

    // Stats bar
    const statsBar = document.createElement('div');
    statsBar.className = 'ecom-diff-stats';

    const addedBadge = document.createElement('span');
    addedBadge.className = 'ecom-stat-badge stat-added';
    addedBadge.textContent = `+${stats.added} additions`;

    const removedBadge = document.createElement('span');
    removedBadge.className = 'ecom-stat-badge stat-removed';
    removedBadge.textContent = `-${stats.removed} deletions`;

    const unchangedBadge = document.createElement('span');
    unchangedBadge.className = 'ecom-stat-badge stat-unchanged';
    unchangedBadge.textContent = `${stats.unchanged} unchanged`;

    statsBar.append(addedBadge, removedBadge, unchangedBadge);
    diffContainer.append(statsBar);

    // Diff table
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'ecom-diff-table-wrapper';

    const table = document.createElement('table');
    table.className = 'ecom-diff-table';

    diff.forEach((line) => {
      const row = document.createElement('tr');
      row.className = `ecom-diff-row row-${line.type}`;

      const oldNumCell = document.createElement('td');
      oldNumCell.className = 'ecom-line-num';
      oldNumCell.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNumCell = document.createElement('td');
      newNumCell.className = 'ecom-line-num';
      newNumCell.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const markerCell = document.createElement('td');
      markerCell.className = 'ecom-diff-marker';
      if (line.type === 'added') markerCell.textContent = '+';
      else if (line.type === 'removed') markerCell.textContent = '-';
      else markerCell.textContent = ' ';

      const contentCell = document.createElement('td');
      contentCell.className = 'ecom-diff-content';
      contentCell.textContent = line.content;

      row.append(oldNumCell, newNumCell, markerCell, contentCell);
      table.append(row);
    });

    tableWrapper.append(table);
    diffContainer.append(tableWrapper);

    container.append(diffContainer);
  }
}
