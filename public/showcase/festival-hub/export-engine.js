/**
 * Festival Hub - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #582 - NSoC '26 Level 3 Feature
 */

export class FestivalHubExportEngine {
  constructor(options = {}) {
    this.getItems = typeof options.getItems === 'function' ? options.getItems : () => (options.items || this._getDefaultItems());
    this.getMetadata = typeof options.getMetadata === 'function' ? options.getMetadata : () => (options.metadata || this._getDefaultMetadata());
  }

  _getDefaultMetadata() {
    return {
      festivalName: 'Nexus Festival 2026',
      edition: 'Spring Edition',
      generatedAt: new Date().toISOString(),
      location: 'Silicon Grounds Arena',
      totalStages: 4
    };
  }

  _getDefaultItems() {
    return [
      { id: 'perf_01', name: 'Cyber Bloom Headliner', stage: 'Neon Apex', genre: 'Synthwave', rating: 4.9, attendees: 12500, status: 'Confirmed' },
      { id: 'perf_02', name: 'Acoustic Horizon, "Live"', stage: 'Meadow Pavilion', genre: 'Indie Folk', rating: 4.7, attendees: 4200, status: 'Confirmed' },
      { id: 'perf_03', name: 'Sub-Bass Odyssey\nNightfall', stage: 'Bass Vault', genre: 'Dubstep', rating: 4.8, attendees: 8900, status: 'Live Now' }
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
    const headers = ['id', 'name', 'stage', 'genre', 'rating', 'attendees', 'status'];
    const lines = [headers.join(',')];

    for (const item of items) {
      const row = [
        this.escapeCSVField(item.id),
        this.escapeCSVField(item.name),
        this.escapeCSVField(item.stage),
        this.escapeCSVField(item.genre),
        this.escapeCSVField(item.rating),
        this.escapeCSVField(item.attendees),
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
      schedule: this.getItems() || []
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
    const totalAttendees = items.reduce((acc, it) => acc + (Number(it.attendees) || 0), 0);
    const avgRating = items.length > 0
      ? (items.reduce((acc, it) => acc + (Number(it.rating) || 0), 0) / items.length).toFixed(2)
      : '0.00';

    const header = [
      `# 🌸 Festival Hub Program Export & Audit Report`,
      `**Festival:** ${meta.festivalName || 'Festival Hub'} (${meta.edition || '2026'})`,
      `**Audit Generated:** ${new Date().toISOString()}`,
      `**Location:** ${meta.location || 'Silicon Grounds'} | **Total Acts:** ${items.length}`,
      ``,
      `| ID | Performance / Artist | Stage | Genre | Rating | Attendees | Status |`,
      `|:---|:---------------------|:------|:------|:-------|:----------|:-------|`
    ];

    const rows = items.map(it => {
      const cleanName = String(it.name || '').replace(/[\r\n]+/g, ' ');
      return `| ${it.id} | ${cleanName} | ${it.stage || 'TBD'} | ${it.genre || 'General'} | ⭐ ${it.rating || 'N/A'} | ${Number(it.attendees || 0).toLocaleString()} | ${it.status || 'Scheduled'} |`;
    });

    const footer = [
      ``,
      `---`,
      `**Total Expected Attendance:** ${totalAttendees.toLocaleString()} visitors`,
      `**Average Overall Rating:** ${avgRating} / 5.00`,
      `*Generated autonomously by FestivalHubExportEngine*`
    ];

    return [...header, ...rows, ...footer].join('\n');
  }

  triggerDownload(filename, blob) {
    if (typeof window === 'undefined' || !window.document) return false;
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Trigger download failed:', e);
      return false;
    }
  }

  initUI(container = document) {
    if (typeof window === 'undefined' || !container) return;

    const toggleBtn = container.querySelector('#festivalExportMenuTrigger');
    const menu = container.querySelector('#festivalExportDropdownMenu');
    const dlJsonBtn = container.querySelector('#festivalDownloadJsonBtn');
    const dlCsvBtn = container.querySelector('#festivalExportCsvBtn');
    const copyMdBtn = container.querySelector('#festivalCopyMarkdownBtn');
    const toast = container.querySelector('#festivalExportToast');

    const showToast = (msg) => {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 2800);
    };

    if (toggleBtn && menu) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== toggleBtn) {
          menu.classList.remove('active');
        }
      });
    }

    if (dlJsonBtn) {
      dlJsonBtn.addEventListener('click', () => {
        const blob = this.toJSONBlob();
        this.triggerDownload('festival-hub-lineup.json', blob);
        if (menu) menu.classList.remove('active');
        showToast('✅ Downloaded JSON Data');
      });
    }

    if (dlCsvBtn) {
      dlCsvBtn.addEventListener('click', () => {
        const blob = this.toCSVBlob();
        this.triggerDownload('festival-hub-schedule.csv', blob);
        if (menu) menu.classList.remove('active');
        showToast('✅ Exported CSV Table');
      });
    }

    if (copyMdBtn) {
      copyMdBtn.addEventListener('click', async () => {
        const md = this.toMarkdownAudit();
        if (navigator && navigator.clipboard) {
          await navigator.clipboard.writeText(md);
          showToast('📋 Copied Markdown Audit to Clipboard');
        } else {
          showToast('📋 Markdown Audit Generated');
        }
        if (menu) menu.classList.remove('active');
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.FestivalHubExportEngine = FestivalHubExportEngine;
}
if (typeof globalThis !== 'undefined') {
  globalThis.FestivalHubExportEngine = FestivalHubExportEngine;
}

export default FestivalHubExportEngine;
