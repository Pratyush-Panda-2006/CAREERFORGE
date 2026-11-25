/**
 * CybersecuritySentinelPacketAnalyzer
 * Autonomous client-side network packet inspection and heuristic cyber threat detection engine.
 * Computes Shannon byte entropy, detects volumetric traffic flooding anomalies,
 * and matches exploit threat signatures.
 */

class CybersecuritySentinelPacketAnalyzer {
  constructor(options = {}) {
    this.entropyHighThreshold = options.entropyHighThreshold || 7.2;
    this.entropyLowThreshold = options.entropyLowThreshold || 1.5;
    this.floodRateThreshold = options.floodRateThreshold || 50; // packets per second
    this.signatures = options.signatures || [
      { id: 'SIG-SQLI-01', name: 'SQL Injection: Tautology', type: 'SQLI', severity: 'HIGH', pattern: /\bor\b\s+(?:'|\")?[^=\s]+(?:'|\")?\s*=\s*(?:'|\")?[^=\s;]+(?:'|\")?/i },
      { id: 'SIG-SQLI-02', name: 'SQL Injection: Union Select', type: 'SQLI', severity: 'CRITICAL', pattern: /union\s+(?:all\s+)?select\b/i },
      { id: 'SIG-XSS-01', name: 'Cross-Site Scripting: Script Tag', type: 'XSS', severity: 'HIGH', pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/i },
      { id: 'SIG-XSS-02', name: 'Cross-Site Scripting: Event Handler Injection', type: 'XSS', severity: 'HIGH', pattern: /(?:onerror|onload|onclick|onmouseover)\s*=\s*(?:'|\"|`)[^'\"]*(?:'|\"|`)/i },
      { id: 'SIG-RCE-01', name: 'Remote Code Execution: Shell Pipeline', type: 'RCE', severity: 'CRITICAL', pattern: /(?:;|\||`|\$\()\s*(?:bash|sh|cmd|powershell|curl|wget|nc|python)\b/i },
      { id: 'SIG-NOPSLED-01', name: 'Buffer Overflow: x86 NOP Sled', type: 'SHELLCODE', severity: 'CRITICAL', pattern: /(?:\x90){8,}|(?:90909090){2,}/i },
      { id: 'SIG-TRAVERSAL-01', name: 'Directory Traversal: Dot-Dot Slash', type: 'TRAVERSAL', severity: 'MEDIUM', pattern: /(?:\.\.[\/\\]){2,}/i }
    ];
  }

  /**
   * Calculates Shannon Byte Entropy: H(X) = -sum(p(x) * log2(p(x)))
   * @param {Uint8Array|Array<number>|string} data
   * @returns {{
   *   entropy: number,
   *   byteLength: number,
   *   isEncryptedOrPacked: boolean,
   *   byteDistribution: Array<{byte: number, count: number, probability: number}>
   * }}
   */
  calculateShannonEntropy(data) {
    if (!data || data.length === 0) {
      return {
        entropy: 0.0,
        byteLength: 0,
        isEncryptedOrPacked: false,
        byteDistribution: []
      };
    }

    let bytes;
    if (typeof data === 'string') {
      const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
      bytes = encoder ? encoder.encode(data) : Buffer.from(data, 'utf-8');
    } else if (data instanceof Uint8Array || Array.isArray(data)) {
      bytes = data;
    } else {
      throw new TypeError('Invalid input: data must be a string, Uint8Array, or Array of numbers');
    }

    const N = bytes.length;
    if (N === 0) {
      return { entropy: 0.0, byteLength: 0, isEncryptedOrPacked: false, byteDistribution: [] };
    }

    const freqMap = new Map();
    for (let i = 0; i < N; i++) {
      const b = bytes[i];
      freqMap.set(b, (freqMap.get(b) || 0) + 1);
    }

    let entropy = 0.0;
    const byteDistribution = [];

    for (const [b, count] of freqMap.entries()) {
      const p = count / N;
      entropy -= p * Math.log2(p);
      byteDistribution.push({
        byte: b,
        count,
        probability: Number(p.toFixed(5))
      });
    }

    // Sort distribution by byte value ascending
    byteDistribution.sort((a, b) => a.byte - b.byte);

    const roundedEntropy = Number(entropy.toFixed(4));
    return {
      entropy: roundedEntropy,
      byteLength: N,
      isEncryptedOrPacked: roundedEntropy >= this.entropyHighThreshold,
      byteDistribution
    };
  }

  /**
   * Detects volumetric flood anomalies using sliding-window rate calculation
   * @param {Array<number>} timestamps - Array of packet arrival timestamps in ms
   * @param {number} windowMs - Window duration in ms (default: 1000ms = 1 sec)
   * @param {number} thresholdRate - Max allowed packets per window
   * @returns {{
   *   isAnomalous: boolean,
   *   maxPacketsInWindow: number,
   *   averageRatePps: number,
   *   windowMs: number,
   *   thresholdRate: number,
   *   burstWindowsDetected: number
   * }}
   */
  detectVolumetricFlooding(timestamps, windowMs = 1000, thresholdRate = null) {
    const limit = thresholdRate || this.floodRateThreshold;
    if (!timestamps || timestamps.length === 0) {
      return {
        isAnomalous: false,
        maxPacketsInWindow: 0,
        averageRatePps: 0,
        windowMs,
        thresholdRate: limit,
        burstWindowsDetected: 0
      };
    }

    const sorted = [...timestamps].sort((a, b) => a - b);
    let maxPackets = 0;
    let burstCount = 0;
    let left = 0;

    for (let right = 0; right < sorted.length; right++) {
      while (sorted[right] - sorted[left] > windowMs) {
        left++;
      }
      const countInWindow = right - left + 1;
      if (countInWindow > maxPackets) {
        maxPackets = countInWindow;
      }
      if (countInWindow >= limit) {
        burstCount++;
      }
    }

    const totalDurationSec = Math.max(1, (sorted[sorted.length - 1] - sorted[0]) / 1000);
    const averageRatePps = Number((sorted.length / totalDurationSec).toFixed(2));

    return {
      isAnomalous: maxPackets >= limit,
      maxPacketsInWindow: maxPackets,
      averageRatePps,
      windowMs,
      thresholdRate: limit,
      burstWindowsDetected: burstCount
    };
  }

  /**
   * Matches payload against known cyber attack signatures
   * @param {string} payloadText
   * @returns {{
   *   matches: Array<{id: string, name: string, type: string, severity: string, snippet: string}>,
   *   matchCount: number,
   *   highestSeverity: string
   * }}
   */
  matchThreatSignatures(payloadText) {
    if (!payloadText || typeof payloadText !== 'string') {
      return { matches: [], matchCount: 0, highestSeverity: 'NONE' };
    }

    const matches = [];
    const severityHierarchy = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    let highestSeverityVal = 0;
    let highestSeverity = 'NONE';

    for (const sig of this.signatures) {
      const match = sig.pattern.exec(payloadText);
      if (match) {
        matches.push({
          id: sig.id,
          name: sig.name,
          type: sig.type,
          severity: sig.severity,
          snippet: match[0].slice(0, 80)
        });

        const val = severityHierarchy[sig.severity] || 1;
        if (val > highestSeverityVal) {
          highestSeverityVal = val;
          highestSeverity = sig.severity;
        }
      }
    }

    return {
      matches,
      matchCount: matches.length,
      highestSeverity
    };
  }

  /**
   * Classifies aggregate threat severity and risk profile
   * @param {number} entropy
   * @param {Object} rateResult
   * @param {Object} signatureResult
   * @returns {{
   *   threatScore: number,
   *   threatLevel: string,
   *   color: string,
   *   recommendation: string,
   *   indicators: Array<string>
   * }}
   */
  classifyThreatLevel(entropy, rateResult = {}, signatureResult = {}) {
    let score = 0;
    const indicators = [];

    // Entropy scoring (high entropy indicates packed shellcode / encryption)
    if (entropy >= this.entropyHighThreshold) {
      score += 40;
      indicators.push(`High Shannon Entropy (${entropy.toFixed(2)} bits/byte) indicates encrypted/obfuscated payload`);
    } else if (entropy >= 6.0) {
      score += 15;
      indicators.push(`Moderate Shannon Entropy (${entropy.toFixed(2)} bits/byte) suggests compressed or tokenized stream`);
    }

    // Rate flood scoring
    if (rateResult.isAnomalous) {
      score += 35;
      indicators.push(`Volumetric anomaly detected: ${rateResult.maxPacketsInWindow} pkts/window exceeds limit (${rateResult.thresholdRate})`);
    }

    // Signature matches scoring
    if (signatureResult.matchCount > 0) {
      if (signatureResult.highestSeverity === 'CRITICAL') {
        score += 50;
      } else if (signatureResult.highestSeverity === 'HIGH') {
        score += 30;
      } else {
        score += 15;
      }
      indicators.push(`Detected ${signatureResult.matchCount} exploit signature match(es) (Max: ${signatureResult.highestSeverity})`);
    }

    // Normalized score cap 100
    score = Math.min(100, score);

    let threatLevel = 'LOW';
    let color = '#10b981';
    let recommendation = 'Traffic conforms to standard baseline parameters. No defensive mitigation required.';

    if (score >= 75) {
      threatLevel = 'CRITICAL';
      color = '#ef4444';
      recommendation = 'IMMEDIATE ACTION: Activate firewall state drop, isolate client IP, and trigger automated threat incident response.';
    } else if (score >= 45) {
      threatLevel = 'HIGH';
      color = '#f97316';
      recommendation = 'ELEVATED RISK: Rate-limit offending subnet, route payload to quarantine honeypot, and log full packet headers.';
    } else if (score >= 20) {
      threatLevel = 'MEDIUM';
      color = '#eab308';
      recommendation = 'SUSPICIOUS ACTIVITY: Increase sliding-window inspection sampling and alert SOC analyst.';
    }

    return {
      threatScore: score,
      threatLevel,
      color,
      recommendation,
      indicators
    };
  }

  /**
   * End-to-end packet audit
   */
  analyzePacket(payload, timestamps = []) {
    const entropyResult = this.calculateShannonEntropy(payload);
    const floodResult = this.detectVolumetricFlooding(timestamps);
    const payloadStr = typeof payload === 'string' ? payload : (new TextDecoder()).decode(payload);
    const signatureResult = this.matchThreatSignatures(payloadStr);
    const classification = this.classifyThreatLevel(entropyResult.entropy, floodResult, signatureResult);

    return {
      entropy: entropyResult,
      flooding: floodResult,
      signatures: signatureResult,
      classification
    };
  }

  /**
   * UI Workbench DOM Initializer
   */
  initUI(containerId = 'sentinel-analyzer-container') {
    const root = document.getElementById(containerId);
    if (!root) return;

    const presets = {
      benign: {
        title: 'Benign HTTPS Request Header',
        payload: 'GET /api/v1/user/profile HTTP/1.1\r\nHost: api.enterprise.internal\r\nAuthorization: Bearer eyJhbGciOi...\r\nAccept: application/json\r\n',
        rateCount: 15
      },
      sqli: {
        title: 'SQL Injection Exfiltration Attack',
        payload: 'POST /v1/auth/login HTTP/1.1\r\nHost: target.internal\r\n\r\n{"username": "admin\' OR \'1\'=\'1\' --", "pass": "secret", "query": "UNION SELECT username, password_hash FROM admin_users"}',
        rateCount: 18
      },
      synflood: {
        title: 'Volumetric SYN Flood DDoS Surge',
        payload: 'SYN-REQ SEQ=394857 ACK=0 WIN=65535 LEN=0',
        rateCount: 95
      },
      shellcode: {
        title: 'High-Entropy Encrypted Shellcode Exploit',
        payload: '9090909090909090\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x53\x89\xe1\xb0\x0b\xcd\x80\xa4\xf3\x12\x89\xdd\xfe\xca\x01\xbc\xde\xad\xbe\xef\x7a\x8b\x9c\x0d\x1e\x2f\x4a\x5b\x6c\x7d\x8e\x9f',
        rateCount: 65
      }
    };

    let activeScenario = 'sqli';

    const render = () => {
      const cfg = presets[activeScenario];
      const now = Date.now();
      const timestamps = [];
      for (let i = 0; i < cfg.rateCount; i++) {
        timestamps.push(now - Math.floor(Math.random() * 950));
      }

      const res = this.analyzePacket(cfg.payload, timestamps);

      // Render Entropy Metric
      const entEl = document.getElementById('metric-entropy-val');
      if (entEl) entEl.textContent = `${res.entropy.entropy} bits/byte`;

      const entBadge = document.getElementById('metric-entropy-badge');
      if (entBadge) {
        entBadge.textContent = res.entropy.isEncryptedOrPacked ? 'HIGH ENTROPY / PACKED' : 'NORMAL DISTRIBUTION';
        entBadge.className = `metric-pill ${res.entropy.isEncryptedOrPacked ? 'pill-alert' : 'pill-normal'}`;
      }

      // Render Flood Metric
      const rateEl = document.getElementById('metric-rate-val');
      if (rateEl) rateEl.textContent = `${res.flooding.maxPacketsInWindow} pkts/sec`;

      const rateBadge = document.getElementById('metric-rate-badge');
      if (rateBadge) {
        rateBadge.textContent = res.flooding.isAnomalous ? 'FLOOD BURST DETECTED' : 'RATE NORMAL';
        rateBadge.className = `metric-pill ${res.flooding.isAnomalous ? 'pill-alert' : 'pill-normal'}`;
      }

      // Render Severity Score
      const scoreEl = document.getElementById('metric-threat-score');
      if (scoreEl) {
        scoreEl.textContent = `${res.classification.threatScore}/100`;
        scoreEl.style.color = res.classification.color;
      }

      const levelEl = document.getElementById('metric-threat-level');
      if (levelEl) {
        levelEl.textContent = res.classification.threatLevel;
        levelEl.style.color = res.classification.color;
      }

      const recEl = document.getElementById('metric-recommendation');
      if (recEl) recEl.textContent = res.classification.recommendation;

      // Render Byte Histogram Canvas
      const histCanvas = document.getElementById('entropy-hist-canvas');
      if (histCanvas && histCanvas.getContext) {
        const ctx = histCanvas.getContext('2d');
        const W = histCanvas.width;
        const H = histCanvas.height;
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, W, H);

        const dist = res.entropy.byteDistribution;
        if (dist.length > 0) {
          const barW = Math.max(2, W / 256);
          const maxP = Math.max(...dist.map(d => d.probability), 0.05);

          for (const d of dist) {
            const barH = (d.probability / maxP) * (H - 20);
            const x = d.byte * (W / 256);
            const y = H - barH;

            ctx.fillStyle = res.entropy.isEncryptedOrPacked ? '#ef4444' : '#06b6d4';
            ctx.fillRect(x, y, barW, barH);
          }
        }
      }

      // Render Signatures List
      const sigList = document.getElementById('signature-matches-list');
      if (sigList) {
        if (res.signatures.matches.length === 0) {
          sigList.innerHTML = '<div class="empty-state">No known exploit signatures identified in payload buffer.</div>';
        } else {
          sigList.innerHTML = res.signatures.matches.map(m => `
            <div class="sig-card sig-${m.severity.toLowerCase()}">
              <div class="sig-header">
                <span class="sig-badge">${m.type}</span>
                <strong>${m.id}: ${m.name}</strong>
                <span class="sig-sev">${m.severity}</span>
              </div>
              <div class="sig-snippet"><code>${m.snippet.replace(/</g, '&lt;')}</code></div>
            </div>
          `).join('');
        }
      }
    };

    const sel = document.getElementById('scenario-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        activeScenario = e.target.value;
        render();
      });
    }

    const retestBtn = document.getElementById('run-audit-btn');
    if (retestBtn) {
      retestBtn.addEventListener('click', () => {
        render();
      });
    }

    render();
  }
}

// Support dual export: ES Module and Browser Global
if (typeof window !== 'undefined') {
  window.CybersecuritySentinelPacketAnalyzer = CybersecuritySentinelPacketAnalyzer;
  window.addEventListener('DOMContentLoaded', () => {
    const autoRoot = document.getElementById('sentinel-analyzer-container');
    if (autoRoot) {
      const analyzer = new CybersecuritySentinelPacketAnalyzer();
      analyzer.initUI();
    }
  });
}

export { CybersecuritySentinelPacketAnalyzer };
