/**
 * Embed widget-embed.html?parentOrigin=https%3A%2F%2Fyour-site.example in an iframe.
 * Messages use { channel: 'nonprofit-impact', version: 1, event, data }.
 * The parent may send set-theme ({ mode: 'dark', accent: '#32a879' }) or
 * request-state ({}). Replies are ready, state, theme-applied and action.
 * In the parent, also check event.origin AND event.source === iframe.contentWindow.
 * This showcase sends donation interest only; it never processes payments.
 */
const CHANNEL = 'nonprofit-impact';
const OUTBOUND_EVENTS = new Set(['ready', 'state', 'theme-applied', 'action']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateTheme(theme) {
  return isRecord(theme) && Object.keys(theme).length > 0 &&
    Object.keys(theme).every((key) => key === 'mode' || key === 'accent') &&
    (!Object.hasOwn(theme, 'mode') || ['light', 'dark'].includes(theme.mode)) &&
    (!Object.hasOwn(theme, 'accent') ||
      (typeof theme.accent === 'string' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(theme.accent)));
}

export class NonprofitImpactWidgetBridge {
  constructor({ parentOrigin, host = globalThis.window, root = host?.document?.documentElement }) {
    const origin = new URL(parentOrigin);
    if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash) {
      throw new TypeError('parentOrigin must be an HTTP(S) origin without a path');
    }
    this.parentOrigin = origin.origin;
    this.host = host;
    this.root = root;
    this.theme = { mode: 'light', accent: '#1b6b45' };
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
      // Give each listener an independent snapshot, so one cannot alter another's data.
      for (const listener of this.listeners) {
        try {
          listener(structuredClone(message));
        } catch (error) {
          host.reportError?.(error);
        }
      }
    };
    host.addEventListener('message', this.handleMessage);
  }

  postToParent(event, data = {}) {
    if (!this.active || this.host.parent === this.host || !OUTBOUND_EVENTS.has(event) ||
        !isRecord(data)) return false;
    try {
      this.host.parent.postMessage({ channel: CHANNEL, version: 1, event, data }, this.parentOrigin);
      return true;
    } catch {
      return false;
    }
  }

  onParentMessage(listener) {
    if (!this.active || typeof listener !== 'function') throw new TypeError('A live listener is required');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setTheme(theme) {
    if (!this.active || !validateTheme(theme)) return false;
    this.theme = { ...this.theme, ...theme };
    if (this.root) {
      this.root.dataset.theme = this.theme.mode;
      this.root.style.setProperty('--widget-accent', this.theme.accent);
    }
    return true;
  }

  destroy() {
    this.host.removeEventListener('message', this.handleMessage);
    this.listeners.clear();
    this.active = false;
  }
}

if (typeof document !== 'undefined' && document.querySelector('[data-nonprofit-widget]')) {
  const status = document.querySelector('[data-widget-status]');
  const action = document.querySelector('[data-widget-action]');
  let bridge;
  try {
    if (window.parent === window) throw new Error('standalone');
    bridge = new NonprofitImpactWidgetBridge({
      parentOrigin: new URLSearchParams(window.location.search).get('parentOrigin'),
    });
    bridge.onParentMessage(() => { status.textContent = 'Connected to the host site.'; });
    bridge.postToParent('ready', { theme: { ...bridge.theme }, sample: true });
    action.disabled = false;
    status.textContent = 'Ready for the host site. Demo only; no payments.';
  } catch {
    status.textContent = window.parent === window
      ? 'Widget preview. Explore the project below.'
      : 'Host connection unavailable. Open the project below.';
  }
  action.addEventListener('click', () => {
    if (bridge?.postToParent('action', { name: 'donation-interest' })) {
      status.textContent = 'Interest sent to the host. No payment was made.';
    }
  });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) bridge?.destroy();
  });
}
