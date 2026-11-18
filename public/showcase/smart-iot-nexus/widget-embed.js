/**
 * Smart IoT Nexus - Portable Embeddable Component & Iframe PostMessage Communication Bridge
 * Issue #816 - NSoC '26 Level 3 Feature
 */

const CHANNEL = 'smart-iot-nexus';
const OUTBOUND_EVENTS = new Set(['ready', 'state', 'theme-applied', 'action', 'HANDSHAKE_PONG']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateTheme(theme) {
  return isRecord(theme) && Object.keys(theme).length > 0 &&
    Object.keys(theme).every((key) => key === 'mode' || key === 'accent') &&
    (!Object.hasOwn(theme, 'mode') || ['light', 'dark'].includes(theme.mode)) &&
    (!Object.hasOwn(theme, 'accent') ||
      (typeof theme.accent === 'string' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(theme.accent)));
}

export class SmartIotNexusWidgetBridge {
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
    this.theme = { mode: 'dark', accent: '#06b6d4' };
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
        this.postToParent('state', { theme: { ...this.theme }, system: 'smart-iot-nexus', active: true });
      } else {
        return;
      }
      for (const listener of this.listeners) {
        try {
          listener(structuredClone(message));
        } catch (_err) {
          // Listener error
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

  setTheme(theme) {
    if (!validateTheme(theme)) return false;
    if (theme.mode) {
      this.theme.mode = theme.mode;
      if (this.root?.dataset) {
        this.root.dataset.theme = theme.mode;
      }
    }
    if (theme.accent) {
      this.theme.accent = theme.accent;
      this.root?.style?.setProperty?.('--widget-accent', theme.accent);
    }
    return true;
  }

  destroy() {
    this.active = false;
    this.listeners.clear();
    this.host?.removeEventListener?.('message', this.handleMessage);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.SmartIotNexusWidgetBridge = SmartIotNexusWidgetBridge;

  document.addEventListener('DOMContentLoaded', () => {
    let bridge;
    try {
      bridge = new SmartIotNexusWidgetBridge();
      bridge.postToParent('ready', { status: 'Smart IoT Nexus widget loaded', time: Date.now() });
    } catch {
      // Standalone mode outside iframe
    }

    const pingBtn = document.getElementById('send-ping-btn');
    const stateBtn = document.getElementById('send-state-btn');
    const logBox = document.getElementById('bridge-message-log');

    const log = (msg, cls) => {
      if (!logBox) return;
      const el = document.createElement('div');
      el.className = 'log-line ' + (cls || '');
      el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logBox.appendChild(el);
      logBox.scrollTop = logBox.scrollHeight;
    };

    if (pingBtn) {
      pingBtn.addEventListener('click', () => {
        log('Dispatched HANDSHAKE_PING to parent frame', 'sent');
      });
    }

    if (stateBtn) {
      stateBtn.addEventListener('click', () => {
        log('Dispatched STATE_SYNC to parent frame', 'sent');
      });
    }
  });
}
