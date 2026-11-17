/**
 * VR Metaverse Hub - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #682 - NSoC '26 Level 3 Feature
 */

export class VrMetaverseHubExportEngine {
  constructor(options = {}) {
    this.getItems = typeof options.getItems === 'function' ? options.getItems : () => (options.items || this._getDefaultItems());
    this.getMetadata = typeof options.getMetadata === 'function' ? options.getMetadata : () => (options.metadata || this._getDefaultMetadata());
  }

  _getDefaultMetadata() {
    return {
      hubName: 'VR Metaverse Hub Matrix',
      version: 'v3.4.0-spatial',
      generatedAt: new Date().toISOString(),
      clusterRegion: 'Global CDN / Edge VR',
      activeRealms: 5
    };
  }

  _getDefaultItems() {
    return [
      { id: 'realm_01', name: 'Cyberpunk Plaza Neo-Tokyo', realm: 'Metropolis', userCount: 1420, fps: 90, status: 'LIVE', tags: ['social', 'cyberpunk'] },
      { id: 'realm_02', name: 'Zero-G Orbital Auditorium, "Event"', realm: 'Space Station', userCount: 350, fps: 120, status: 'LIVE', tags: ['auditorium', 'zero-g'] },
      { id: 'realm_03', name: 'Ancient Zen Bamboo Forest\nSanctuary', realm: 'Sanctuary', userCount: 88, fps: 90, status: 'IDLE', tags: ['chill', 'nature'] }
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
    const headers = ['id', 'name', 'realm', 'userCount', 'fps', 'status'];
    const lines = [headers.join(',')];

    for (const item of items) {
      const row = [
        this.escapeCSVField(item.id),
        this.escapeCSVField(item.name),
        this.escapeCSVField(item.realm),
        this.escapeCSVField(item.userCount),
        this.escapeCSVField(item.fps),
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
      realms: this.getItems() || []
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
    const totalUsers = items.reduce((acc, it) => acc + (Number(it.userCount) || 0), 0);
    const avgFps = items.length > 0
      ? (items.reduce((acc, it) => acc + (Number(it.fps) || 0), 0) / items.length).toFixed(1)
      : '0.0';

    const header = [
      `# 🌐 VR Metaverse Hub Realm Audit & Spatial Analytics`,
      `**Cluster:** ${meta.hubName || 'VR Metaverse Hub'} (${meta.version || 'v3'})`,
      `**Export Generated:** ${new Date().toISOString()}`,
      `**Region:** ${meta.clusterRegion || 'Edge VR'} | **Active Realms:** ${items.length}`,
      ``,
      `| ID | Realm Name | Biome / Type | Concurrency | Target FPS | Status |`,
      `|:---|:-----------|:-------------|:------------|:-----------|:-------|`
    ];

    const rows = items.map(it => {
      const cleanName = String(it.name || '').replace(/[\r\n]+/g, ' ');
      return `| ${it.id} | ${cleanName} | ${it.realm || 'Spatial'} | 👥 ${Number(it.userCount || 0).toLocaleString()} | ⚡ ${it.fps || 90} FPS | ${it.status || 'LIVE'} |`;
    });

    const footer = [
      ``,
      `---`,
      `**Total Spatial Concurrency:** ${totalUsers.toLocaleString()} concurrent avatars`,
      `**Average Frame Budget:** ${avgFps} FPS`,
      `*Generated autonomously by VrMetaverseHubExportEngine*`
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

    const toggleBtn = container.querySelector('#vrExportMenuTrigger');
    const menu = container.querySelector('#vrExportDropdownMenu');
    const dlJsonBtn = container.querySelector('#vrDownloadJsonBtn');
    const dlCsvBtn = container.querySelector('#vrExportCsvBtn');
    const copyMdBtn = container.querySelector('#vrCopyMarkdownBtn');
    const toast = container.querySelector('#vrExportToast');

    const showToast = (msg) => {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 2500);
    };

    if (toggleBtn && menu) {
      toggleBtn.addEventListener('click', () => {
        menu.classList.toggle('active');
      });
    }

    if (dlJsonBtn) {
      dlJsonBtn.addEventListener('click', () => {
        const blob = this.toJSONBlob();
        this.triggerDownload(`metaverse-realms-${Date.now()}.json`, blob);
        showToast('JSON Realm Data exported successfully');
      });
    }

    if (dlCsvBtn) {
      dlCsvBtn.addEventListener('click', () => {
        const blob = this.toCSVBlob();
        this.triggerDownload(`metaverse-realms-${Date.now()}.csv`, blob);
        showToast('CSV Realm Data exported successfully');
      });
    }

    if (copyMdBtn) {
      copyMdBtn.addEventListener('click', async () => {
        const md = this.toMarkdownAudit();
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(md);
          showToast('Markdown Summary Report copied to clipboard');
        }
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.VrMetaverseHubExportEngine = VrMetaverseHubExportEngine;
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new VrMetaverseHubExportEngine();
    engine.initUI();
  });
}
