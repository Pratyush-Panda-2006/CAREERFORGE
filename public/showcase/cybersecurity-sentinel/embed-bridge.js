/**
 * Cybersecurity Sentinel - Portable Embeddable Component & Iframe PostMessage Communication Bridge
 */

export class CybersecuritySentinelEmbedBridge {
  constructor(options = {}) {
    this.allowedOrigins = options.allowedOrigins || ['*'];
    this.appId = options.appId || 'sentinel-embed';
  }

  validateOrigin(origin) {
    if (this.allowedOrigins.includes('*')) return true;
    return this.allowedOrigins.includes(origin);
  }

  createPayload(action, data = {}) {
    return {
      appId: this.appId,
      action,
      data,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 9)
    };
  }

  serialize(payload) {
    return JSON.stringify(payload);
  }

  deserialize(raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || parsed.appId !== this.appId) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}
