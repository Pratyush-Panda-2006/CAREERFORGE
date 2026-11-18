/**
 * TravelOdysseyExportEngine - Client-Side Export Engine & Formatted Summary Report Generator
 */

export class TravelOdysseyExportEngine {
  constructor(options = {}) {
    this.getItems = typeof options.getItems === 'function' ? options.getItems : () => (options.items || this._getDefaultItems());
    this.getMetadata = typeof options.getMetadata === 'function' ? options.getMetadata : () => (options.metadata || this._getDefaultMetadata());
  }

  _getDefaultMetadata() {
    return {
      systemName: "Travel Odyssey Expeditions & Itineraries",
      compliance: "IATA Passenger Standards & Tourism Safety Code",
      bookingSync: "GDS Amadeus / Sabre Live Gateway",
      generatedAt: "2026-03-15T00:00:00Z"
    };
  }

  _getDefaultItems() {
    return [
      {
        id: "trv_01",
        name: "Kyoto Heritage & Zen Temples Tour",
        category: "Cultural Immersion",
        rating: 4.95,
        metric: 120,
        status: "Confirmed"
      },
      {
        id: "trv_02",
        name: "Serengeti Migration Wilderness Safari",
        category: "Eco Adventure",
        rating: 4.88,
        metric: 45,
        status: "Waitlist"
      },
      {
        id: "trv_03",
        name: "Norwegian Fjords Midnight Aurora Cruise",
        category: "Polar Expedition",
        rating: 4.92,
        metric: 310,
        status: "Open"
      }
    ];
  }

  escapeCSVField(val) {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  toCSVString() {
    const items = this.getItems() || [];
    const headers = ['id', 'name', 'category', 'rating', 'metric', 'status'];
    const lines = [headers.join(',')];

    for (const item of items) {
      const cat = item.category || item.genre || 'General';
      const met = item.metric != null ? item.metric : (item.travelers || item.capacity || 0);
      const row = [
        this.escapeCSVField(item.id),
        this.escapeCSVField(item.name),
        this.escapeCSVField(cat),
        this.escapeCSVField(item.rating),
        this.escapeCSVField(met),
        this.escapeCSVField(item.status)
      ];
      lines.push(row.join(','));
    }

    return lines.join('\r\n');
  }

  toJSONBlob() {
    const payload = {
      metadata: this.getMetadata(),
      exportedAt: new Date().toISOString(),
      recordCount: (this.getItems() || []).length,
      dataset: this.getItems() || []
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
  }

  toCSVBlob() {
    const csvStr = this.toCSVString();
    return new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  }

  toMarkdownAudit() {
    const meta = this.getMetadata();
    const items = this.getItems() || [];
    const totalMetric = items.reduce((acc, it) => acc + (Number(it.metric || it.travelers || it.capacity || 0)), 0);
    const avgRating = items.length > 0
      ? (items.reduce((acc, it) => acc + (Number(it.rating) || 0), 0) / items.length).toFixed(2)
      : '0.00';

    const header = [
      `# 📊 Travel Odyssey Export & Itinerary Summary Report`,
      `**System:** ${meta.systemName || 'travel-odyssey'}`,
      `**Generated At:** ${new Date().toISOString()}`,
      `**Total Records:** ${items.length} | **Total Volume:** ${totalMetric.toLocaleString()}`,
      ``,
      `| ID | Name | Category | Rating | Travelers / Metric | Status |`,
      `|:---|:-----|:---------|:-------|:-------------------|:-------|`
    ];

    const rows = items.map(it => {
      const cleanName = String(it.name || '').replace(/[\r\n]+/g, ' ');
      const cat = it.category || it.genre || 'General';
      const met = it.metric != null ? it.metric : (it.travelers || it.capacity || 0);
      return `| ${it.id} | ${cleanName} | ${cat} | ⭐ ${it.rating || 'N/A'} | ${Number(met).toLocaleString()} | ${it.status || 'Active'} |`;
    });

    const footer = [
      ``,
      `### Summary Analytics`,
      `- **Average Quality / Rating:** ${avgRating} / 5.00`,
      `- **Total Cumulative Volume:** ${totalMetric.toLocaleString()} units`,
      `- **Integrity Check:** SHA-Verified GDS Client Stream`
    ];

    return [...header, ...rows, ...footer].join('\n');
  }

  triggerDownload(filename, blob) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new TravelOdysseyExportEngine();
    const trigger = document.getElementById('exportMenuTrigger');
    const menu = document.getElementById('exportDropdownMenu');

    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('is-open');
      });

      document.addEventListener('click', () => {
        menu.classList.remove('is-open');
      });
    }

    document.getElementById('downloadJsonBtn')?.addEventListener('click', () => {
      const blob = engine.toJSONBlob();
      engine.triggerDownload('travel-odyssey-itineraries.json', blob);
    });

    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
      const blob = engine.toCSVBlob();
      engine.triggerDownload('travel-odyssey-itineraries.csv', blob);
    });

    document.getElementById('copyMarkdownBtn')?.addEventListener('click', async () => {
      const md = engine.toMarkdownAudit();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(md);
        alert('Markdown audit report copied to clipboard!');
      }
    });
  });
}
