/**
 * Implement portable embeddable component & iframe postmessage communication bridge - Portable Embeddable Component & Iframe PostMessage Communication Bridge
 */
const CHANNEL = 'agency-studio';
const OUTBOUND_EVENTS = new Set(['ready', 'state', 'theme-applied', 'action']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateTheme(theme) {
  return isRecord(theme) && Object.keys(theme).length > 0 &&
    Object.keys(theme).every((key) => key === 'mode' || key === 'accent') &&
    (!Object.hasOwn(theme, 'mode') || ['light', 'dark'].includes(theme.mode)) &&
    (!Object.hasOwn(theme, 'accent') ||
      (typeof theme.accent === 'string' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(theme.accent)));
}

export class AgencyStudioWidgetBridge {
  constructor({ parentOrigin, host = globalThis.window, root = host?.document?.documentElement } = {}) {
    if (!parentOrigin) {
      parentOrigin = 'https://host.example';
    }
    const origin = new URL(parentOrigin);
    if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash) {
      throw new TypeError('parentOrigin must be an HTTP(S) origin without a path');
    }
    this.parentOrigin = origin.origin;
    this.host = host;
    this.root = root;
    this.theme = { mode: 'light', accent: '#2563eb' };
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
        this.postToParent('state', { theme: { ...this.theme }, sample: true });
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

    host?.addEventListener?.('message', this.handleMessage);
  }

  postToParent(event, data = {}) {
    if (!this.active || !OUTBOUND_EVENTS.has(event) || !isRecord(data)) return false;
    const message = { channel: CHANNEL, version: 1, event, data };
    this.host?.parent?.postMessage?.(message, this.parentOrigin);
    return true;
  }

  onParentMessage(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setTheme(themeObj) {
    if (!validateTheme(themeObj)) return false;
    if (themeObj.mode) {
      this.theme.mode = themeObj.mode;
      if (this.root?.dataset) this.root.dataset.theme = themeObj.mode;
    }
    if (themeObj.accent) {
      this.theme.accent = themeObj.accent;
      this.root?.style?.setProperty?.('--widget-accent', themeObj.accent);
    }
    return true;
  }

  destroy() {
    this.active = false;
    this.host?.removeEventListener?.('message', this.handleMessage);
    this.listeners.clear();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const parentOrigin = params.get('parentOrigin') || window.location.origin;
    let bridge;
    try {
      bridge = new AgencyStudioWidgetBridge({ parentOrigin });
      bridge.postToParent('ready', { initialized: true });
    } catch {
    }
  });
}
