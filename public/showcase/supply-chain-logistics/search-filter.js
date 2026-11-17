/**
 * Supply Chain Logistics - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #684 - NSoC '26 Level 3 Feature
 */

export class SupplyChainLogisticsFilterEngine {
  constructor(initialItems = []) {
    this.items = [...initialItems];
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'trackingNumber';
    this.sortDirection = 'asc';
  }

  setItems(items) {
    this.items = Array.isArray(items) ? [...items] : [];
    return this.getFilteredAndSorted();
  }

  filterByKeyword(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
    return this.getFilteredAndSorted();
  }

  toggleTag(tag) {
    if (!tag) return this.getFilteredAndSorted();
    const normalized = tag.trim().toLowerCase();
    if (this.selectedTags.has(normalized)) {
      this.selectedTags.delete(normalized);
    } else {
      this.selectedTags.add(normalized);
    }
    return this.getFilteredAndSorted();
  }

  getActiveTags() {
    return Array.from(this.selectedTags);
  }

  clearTags() {
    this.selectedTags.clear();
    return this.getFilteredAndSorted();
  }

  sort(field, direction = 'asc') {
    this.sortField = field || 'trackingNumber';
    this.sortDirection = direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
    return this.getFilteredAndSorted();
  }

  getFilteredAndSorted() {
    let result = this.items.filter((item) => {
      // 1. Keyword search across tracking, origin, destination, courier, status
      if (this.searchQuery) {
        const textPayload = [
          item.trackingNumber || '',
          item.origin || '',
          item.destination || '',
          item.carrier || '',
          item.status || '',
          item.notes || ''
        ].join(' ').toLowerCase();

        if (!textPayload.includes(this.searchQuery)) {
          return false;
        }
      }

      // 2. Compound Tag filtering
      if (this.selectedTags.size > 0) {
        const itemTags = Array.isArray(item.tags)
          ? item.tags.map((t) => String(t).toLowerCase())
          : [];
        for (const tag of this.selectedTags) {
          if (!itemTags.includes(tag)) {
            return false;
          }
        }
      }

      return true;
    });

    // 3. Multi-attribute sorting
    if (this.sortField) {
      result.sort((a, b) => {
        let valA = a[this.sortField];
        let valB = b[this.sortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        }

        return this.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedTags.clear();
    this.sortField = 'trackingNumber';
    this.sortDirection = 'asc';
    return this.getFilteredAndSorted();
  }
}

// Sample Supply Chain Freight & Shipment Consignments
export const SAMPLE_SHIPMENTS_DATA = [
  { id: 1, trackingNumber: 'SC-98214-US', origin: 'Los Angeles Port', destination: 'Chicago Distribution Hub', carrier: 'Pacific Rail Express', weightKg: 14200, etaHours: 24, status: 'IN_TRANSIT', tags: ['intermodal', 'heavy-freight', 'priority'] },
  { id: 2, trackingNumber: 'SC-44012-DE', origin: 'Frankfurt Air Cargo', destination: 'London Heathrow Gateway', carrier: 'AeroFreight Cargo', weightKg: 850, etaHours: 4, status: 'CUSTOMS', tags: ['air-cargo', 'express', 'international'] },
  { id: 3, trackingNumber: 'SC-11983-JP', origin: 'Tokyo Yokohama Pier', destination: 'Singapore Mega Port', carrier: 'Oceanic Wave Lines', weightKg: 42000, etaHours: 72, status: 'IN_TRANSIT', tags: ['sea-freight', 'cold-chain', 'international'] },
  { id: 4, trackingNumber: 'SC-66321-SG', origin: 'Singapore Jurong East', destination: 'Kuala Lumpur Central', carrier: 'Overland Logistics', weightKg: 3400, etaHours: 12, status: 'OUT_FOR_DELIVERY', tags: ['express', 'priority', 'last-mile'] },
  { id: 5, trackingNumber: 'SC-77091-NL', origin: 'Rotterdam Terminal', destination: 'Antwerp Gateway', carrier: 'Rhine Barge Line', weightKg: 18500, etaHours: 18, status: 'DELIVERED', tags: ['barge', 'intermodal', 'eco-friendly'] }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.SupplyChainLogisticsFilterEngine = SupplyChainLogisticsFilterEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new SupplyChainLogisticsFilterEngine(SAMPLE_SHIPMENTS_DATA);
    const searchInput = document.getElementById('search-filter-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const sortSelect = document.getElementById('sort-select');
    const tagChipsContainer = document.getElementById('tag-chips-container');
    const resultsContainer = document.getElementById('results-list');
    const emptyState = document.getElementById('empty-state-alert');

    const render = () => {
      const filtered = engine.getFilteredAndSorted();
      if (resultsContainer) {
        if (filtered.length === 0) {
          resultsContainer.innerHTML = '';
          if (emptyState) emptyState.style.display = 'block';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          resultsContainer.innerHTML = filtered.map((item) => `
            <div class="shipment-card">
              <div class="card-header">
                <h3>${item.trackingNumber}</h3>
                <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>
              </div>
              <p>Route: <strong>${item.origin} &rarr; ${item.destination}</strong></p>
              <p>Carrier: <strong>${item.carrier}</strong> | Weight: <strong>${item.weightKg.toLocaleString()} kg</strong> | ETA: <strong>${item.etaHours}h</strong></p>
              <div class="card-tags">
                ${item.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
              </div>
            </div>
          `).join('');
        }
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        engine.filterByKeyword(e.target.value);
        render();
      });
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        engine.filterByKeyword('');
        render();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, dir] = e.target.value.split(':');
        engine.sort(field, dir);
        render();
      });
    }

    if (tagChipsContainer) {
      const chips = tagChipsContainer.querySelectorAll('.filter-chip');
      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          const tag = chip.getAttribute('data-tag');
          chip.classList.toggle('active');
          engine.toggleTag(tag);
          render();
        });
      });
    }

    render();
  });
}
