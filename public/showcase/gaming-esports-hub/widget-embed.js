/**
 * Gaming Esports Hub - Portable Embeddable Component & Iframe PostMessage Communication Bridge
 * Issue #760 - NSoC '26 Level 3 Feature
 */

const CHANNEL = 'gaming-esports-hub';
const OUTBOUND_EVENTS = new Set(['ready', 'state', 'theme-applied', 'action', 'match-selected']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateTheme(theme) {
  return isRecord(theme) && Object.keys(theme).length > 0 &&
    Object.keys(theme).every((key) => key === 'mode' || key === 'accent') &&
    (!Object.hasOwn(theme, 'mode') || ['light', 'dark'].includes(theme.mode)) &&
    (!Object.hasOwn(theme, 'accent') ||
      (typeof theme.accent === 'string' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(theme.accent)));
}

export class GamingEsportsHubWidgetBridge {
  constructor({ parentOrigin, host = globalThis.window, root = host?.document?.documentElement }) {
    if (!parentOrigin) {
      throw new TypeError('parentOrigin is required');
    }
    const origin = new URL(parentOrigin);
    if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash) {
      throw new TypeError('parentOrigin must be an HTTP(S) origin without a path');
    }
    this.parentOrigin = origin.origin;
    this.host = host;
    this.root = root;
    this.theme = { mode: 'dark', accent: '#a855f7' };
    this.listeners = new Set();
    this.active = true;

    this.handleMessage = (event) => {
      if (!this.active || event.origin !== this.parentOrigin || event.source !== host.parent ||
          host.parent === host) return;
      const message = event.data;
      if (!isRecord(message) || message.channel !== CHANNEL || message.version !== 1 ||
          !isRecord(message.data)) return;

      if (message.event === 'set-theme') {
        if (!this.setTheme(message.data)) return;
        this.postToParent('theme-applied', { theme: { ...this.theme } });
      } else if (message.event === 'request-state' && Object.keys(message.data).length === 0) {
        this.postToParent('state', { theme: { ...this.theme }, activeTournament: 'NSoC Masters 2026' });
      } else {
        return;
      }

      for (const listener of this.listeners) {
        try {
          listener(structuredClone(message));
        } catch (error) {
          host.reportError?.(error);
        }
      }
    };

    if (this.host && typeof this.host.addEventListener === 'function') {
      this.host.addEventListener('message', this.handleMessage);
    }
  }

  postToParent(event, data = {}) {
    if (!this.active || !OUTBOUND_EVENTS.has(event) || !isRecord(data)) return false;
    const envelope = {
      channel: CHANNEL,
      version: 1,
      event,
      data
    };
    try {
      this.host?.parent?.postMessage(envelope, this.parentOrigin);
      return true;
    } catch {
      return false;
    }
  }

  onParentMessage(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setTheme(themeObj) {
    if (!validateTheme(themeObj)) return false;
    if (themeObj.mode) this.theme.mode = themeObj.mode;
    if (themeObj.accent) this.theme.accent = themeObj.accent;

    if (this.root) {
      if (this.root.dataset) this.root.dataset.theme = this.theme.mode;
      if (this.root.style && typeof this.root.style.setProperty === 'function') {
        this.root.style.setProperty('--widget-accent', this.theme.accent);
      }
    }
    return true;
  }

  destroy() {
    this.active = false;
    this.listeners.clear();
    if (this.host && typeof this.host.removeEventListener === 'function') {
      this.host.removeEventListener('message', this.handleMessage);
    }
  }
}

// Browser bootstrap
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.GamingEsportsHubWidgetBridge = GamingEsportsHubWidgetBridge;

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const parentOrigin = params.get('parentOrigin') || window.location.origin;

    try {
      const bridge = new GamingEsportsHubWidgetBridge({ parentOrigin });
      bridge.postToParent('ready', { widget: 'gaming-esports-hub-embed' });

      document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
          const matchId = card.getAttribute('data-match-id');
          bridge.postToParent('match-selected', { matchId });
        });
      });
    } catch {
      // Standalone preview fallback
    }
  });
}
