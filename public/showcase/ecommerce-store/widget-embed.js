/**
 * E-Commerce Store - Portable Embeddable Component & Iframe PostMessage Communication Bridge
 * Issue #724 - NSoC '26 Level 3 Feature
 */

export class EcommerceStoreWidgetBridge {
  constructor(options = {}) {
    this.targetWindow = options.targetWindow || (typeof window !== 'undefined' ? window : null);
    this.allowedOrigins = new Set(options.allowedOrigins || ['*']);
    this.listeners = new Map();
    this.isConnected = false;
    this.prefix = options.prefix || 'ECOMMERCE_WIDGET';

    this.handleIncomingMessage = this.handleIncomingMessage.bind(this);
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('message', this.handleIncomingMessage);
    }
  }

  isOriginAllowed(origin) {
    if (this.allowedOrigins.has('*')) return true;
    return this.allowedOrigins.has(origin);
  }

  post(action, payload = {}, targetOrigin = '*') {
    if (!this.targetWindow) return false;
    const message = {
      type: `${this.prefix}:${action}`,
      action,
      payload,
      timestamp: Date.now()
    };
    if (typeof this.targetWindow.postMessage === 'function') {
      this.targetWindow.postMessage(message, targetOrigin);
      return true;
    }
    return false;
  }

  handleIncomingMessage(event) {
    if (!event || !event.data) return;
    if (!this.isOriginAllowed(event.origin)) return;

    const { type, action, payload } = event.data;
    if (!type || !type.startsWith(this.prefix)) return;

    const eventAction = action || type.replace(`${this.prefix}:`, '');

    if (eventAction === 'HANDSHAKE_PING') {
      this.isConnected = true;
      this.post('HANDSHAKE_PONG', { status: 'connected', version: '1.0' }, event.origin || '*');
    }

    if (this.listeners.has(eventAction)) {
      const callbacks = this.listeners.get(eventAction);
      callbacks.forEach((cb) => {
        try {
          cb(payload, event);
        } catch {
          // Non-blocking listener error
        }
      });
    }
  }

  on(action, callback) {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, new Set());
    }
    this.listeners.get(action).add(callback);
    return () => this.off(action, callback);
  }

  off(action, callback) {
    if (this.listeners.has(action)) {
      this.listeners.get(action).delete(callback);
    }
  }

  destroy() {
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('message', this.handleIncomingMessage);
    }
    this.listeners.clear();
    this.isConnected = false;
  }
}

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.EcommerceStoreWidgetBridge = EcommerceStoreWidgetBridge;

  document.addEventListener('DOMContentLoaded', () => {
    const bridge = new EcommerceStoreWidgetBridge({
      allowedOrigins: ['*']
    });

    const statusBadge = document.getElementById('connection-status-badge');
    const logContainer = document.getElementById('bridge-message-log');
    const sendPingBtn = document.getElementById('send-ping-btn');
    const sendCartUpdateBtn = document.getElementById('send-cart-update-btn');

    const logMessage = (direction, msg) => {
      if (!logContainer) return;
      const row = document.createElement('div');
      row.className = `log-row log-${direction.toLowerCase()}`;
      row.innerHTML = `
        <span class="log-direction">[${direction}]</span>
        <span class="log-time">${new Date().toLocaleTimeString()}</span>
        <code class="log-content">${JSON.stringify(msg)}</code>
      `;
      logContainer.prepend(row);
    };

    bridge.on('HANDSHAKE_PONG', (data) => {
      bridge.isConnected = true;
      if (statusBadge) {
        statusBadge.textContent = 'Connected (Bridge Active)';
        statusBadge.className = 'status-pill status-connected';
      }
      logMessage('RECV', { action: 'HANDSHAKE_PONG', data });
    });

    bridge.on('CART_SYNC', (data) => {
      logMessage('RECV', { action: 'CART_SYNC', data });
    });

    if (sendPingBtn) {
      sendPingBtn.addEventListener('click', () => {
        bridge.post('HANDSHAKE_PING', { clientTime: Date.now() });
        logMessage('SENT', { action: 'HANDSHAKE_PING' });
      });
    }

    if (sendCartUpdateBtn) {
      sendCartUpdateBtn.addEventListener('click', () => {
        const payload = {
          itemsCount: 3,
          subtotal: 129.97,
          currency: 'USD',
          cartId: `CART-${Date.now().toString().slice(-4)}`
        };
        bridge.post('CART_UPDATED', payload);
        logMessage('SENT', { action: 'CART_UPDATED', payload });
      });
    }
  });
}
