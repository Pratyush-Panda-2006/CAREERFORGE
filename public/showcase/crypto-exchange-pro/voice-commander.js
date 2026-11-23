/**
 * Crypto Exchange Pro - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 *
 * Captures spoken voice input, parses crypto trading grammars, manages order staging,
 * validates safety limits, dispatches accessibility controls, and synthesizes speech responses.
 */

export const SUPPORTED_CRYPTO_ASSETS = [
  'BTC', 'ETH', 'SOL', 'USDT', 'AVAX',
  'DOGE', 'LINK', 'MATIC', 'ADA', 'XRP', 'BNB'
];

export const DEFAULT_CRYPTO_TICKERS = {
  BTC: { price: 68500.50, change24h: '+3.42%', high24h: 69200.00, low24h: 66800.00 },
  ETH: { price: 3540.20, change24h: '+2.15%', high24h: 3610.00, low24h: 3480.00 },
  SOL: { price: 185.75, change24h: '+5.80%', high24h: 192.00, low24h: 176.50 },
  USDT: { price: 1.00, change24h: '0.00%', high24h: 1.001, low24h: 0.999 },
  AVAX: { price: 38.60, change24h: '-1.20%', high24h: 40.10, low24h: 37.80 },
  DOGE: { price: 0.165, change24h: '+8.40%', high24h: 0.178, low24h: 0.152 },
  LINK: { price: 19.40, change24h: '+1.65%', high24h: 20.10, low24h: 18.90 },
  MATIC: { price: 0.72, change24h: '-0.45%', high24h: 0.76, low24h: 0.70 },
  ADA: { price: 0.55, change24h: '+0.85%', high24h: 0.58, low24h: 0.53 },
  XRP: { price: 0.62, change24h: '+1.10%', high24h: 0.65, low24h: 0.60 },
  BNB: { price: 590.30, change24h: '+1.90%', high24h: 602.00, low24h: 582.00 }
};

export const ASSET_ALIASES = {
  bitcoin: 'BTC',
  bitcoins: 'BTC',
  btc: 'BTC',
  ethereum: 'ETH',
  ether: 'ETH',
  eth: 'ETH',
  solana: 'SOL',
  sol: 'SOL',
  tether: 'USDT',
  usdt: 'USDT',
  dollar: 'USDT',
  dollars: 'USDT',
  usd: 'USDT',
  avalanche: 'AVAX',
  avax: 'AVAX',
  dogecoin: 'DOGE',
  doge: 'DOGE',
  chainlink: 'LINK',
  link: 'LINK',
  polygon: 'MATIC',
  matic: 'MATIC',
  cardano: 'ADA',
  ada: 'ADA',
  ripple: 'XRP',
  xrp: 'XRP',
  binance: 'BNB',
  bnb: 'BNB'
};

export const WORD_NUMBERS = {
  'zero': 0,
  'point five': 0.5,
  'half': 0.5,
  'a half': 0.5,
  'quarter': 0.25,
  'a quarter': 0.25,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'hundred': 100,
  'thousand': 1000
};

export const CRYPTO_GRAMMAR_PATTERNS = {
  buy_order: /^(?:buy|purchase|long)\s+([+\-]?[a-z0-9\.\s]+?)\s+([a-z0-9\/]+)$/i,
  sell_order: /^(?:sell|short|dump)\s+([+\-]?[a-z0-9\.\s]+?)\s+([a-z0-9\/]+)$/i,
  check_price: /^(?:check\s+price|price\s+of|quote|what\s+is\s+the\s+price\s+of|ticker)\s+([a-z0-9\/]+)$/i,
  cancel_order: /^(?:cancel\s+order\s+#?(\d+|all)|cancel\s+(all\s+orders|orders)|abort\s+orders?)$/i,
  switch_market: /^(?:switch\s+market|switch\s+to|open\s+market|select\s+pair)\s+([a-z0-9\/\-]+)$/i,
  portfolio_summary: /^(?:read\s+portfolio(?:\s+balance)?|portfolio\s+summary|check\s+balance|what\s+is\s+my\s+balance|account\s+balance)$/i,
  accessibility_action: /^(?:toggle\s+contrast|high\s+contrast(?:\s+mode)?|activate\s+dark\s+mode|toggle\s+theme|increase\s+font(?:\s+size)?|decrease\s+font(?:\s+size)?|reset\s+font(?:\s+size)?)$/i,
  confirm_order: /^(?:confirm|confirm\s+order|execute|execute\s+order|yes\s+confirm)$/i,
  reject_order: /^(?:reject|reject\s+order|dismiss|cancel\s+confirmation|abort\s+confirmation)$/i,
  help: /^(?:help|commands|what\s+can\s+i\s+say|list\s+commands)$/i,
  status: /^(?:status|system\s+status|telemetry|connection\s+status)$/i,
  reset: /^(?:reset|clear\s+history|restart)$/i
};

export const DEFAULT_FALLBACK_PHRASE = "Trading voice command not recognized. Say 'help' for command grammar or check microphone input.";

/**
 * Normalizes speech input tokens and replaces word numbers and aliases.
 */
export function normalizeTranscript(text = '') {
  let cleaned = String(text || '').trim().toLowerCase();

  // Protect decimal numbers like 0.5, 1.25, .5
  cleaned = cleaned.replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');
  cleaned = cleaned.replace(/^([.])(\d+)/g, '0__DOT__$2');
  cleaned = cleaned.replace(/\s([.])(\d+)/g, ' 0__DOT__$2');

  // Strip punctuation but keep hyphens and slashes
  cleaned = cleaned.replace(/[.,?!;:!#]/g, ' ');
  cleaned = cleaned.replace(/__DOT__/g, '.');

  // Convert phrase words like "point five" or "half"
  cleaned = cleaned.replace(/\bpoint five\b/g, '0.5');
  cleaned = cleaned.replace(/\ba half\b/g, '0.5');
  cleaned = cleaned.replace(/\bhalf\b/g, '0.5');
  cleaned = cleaned.replace(/\ba quarter\b/g, '0.25');
  cleaned = cleaned.replace(/\bquarter\b/g, '0.25');

  // Replace single word numbers if standalone
  for (const [w, n] of Object.entries(WORD_NUMBERS)) {
    const rx = new RegExp(`\\b${w}\\b`, 'g');
    cleaned = cleaned.replace(rx, String(n));
  }

  // Handle multiplier compounds like "5 100" (from five hundred) or "2 thousand"
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*(?:100|hundred)\b/g, (m, n) => String(parseFloat(n) * 100));
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*(?:1000|thousand)\b/g, (m, n) => String(parseFloat(n) * 1000));
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*(?:1000000|million)\b/g, (m, n) => String(parseFloat(n) * 1000000));

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Resolves symbol/pair alias, e.g. "bitcoin" -> "BTC", "btc/usdt" -> "BTC/USDT"
 */
export function resolveAssetSymbol(raw = '') {
  const norm = String(raw || '').trim().toLowerCase().replace(/[\s\-]/g, '');
  if (norm.includes('/')) {
    const parts = norm.split('/');
    const base = ASSET_ALIASES[parts[0]] || parts[0].toUpperCase();
    const quote = ASSET_ALIASES[parts[1]] || parts[1].toUpperCase();
    return `${base}/${quote}`;
  }
  return ASSET_ALIASES[norm] || raw.toUpperCase().trim();
}

/**
 * Main Crypto Exchange Pro Voice Commander Class
 */
export class CryptoExchangeProVoiceCommander {
  constructor(options = {}) {
    this.tickers = { ...DEFAULT_CRYPTO_TICKERS, ...(options.tickers || {}) };
    this.portfolio = {
      BTC: 1.25,
      ETH: 8.50,
      SOL: 65.0,
      USDT: 25400.00,
      ...(options.portfolio || {})
    };
    this.activeMarket = options.activeMarket || 'BTC/USDT';
    this.maxHistory = options.maxHistory || 50;
    this.maxOrderCapUsd = options.maxOrderCapUsd || 1000000; // Trading safety cap $1M USD

    this.isListening = false;
    this.history = [];
    this.pendingOrder = null;
    this.customCommands = [];
    this.listeners = {};

    this.speechSynth = options.speechSynth !== undefined
      ? options.speechSynth
      : (typeof window !== 'undefined' ? window.speechSynthesis : null);

    this.SpeechRecognitionCtor = options.speechRecognition ||
      (typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null);
    this.recognition = null;

    // UI element bindings
    this.micBtn = null;
    this.statusBadge = null;
    this.historyEl = null;
    this.waveEl = null;
    this.toastEl = null;
    this.toastTimer = null;
    this.modalEl = null;
    this.tickerEl = null;
  }

  /**
   * Event Emitter: register listener
   */
  on(event, fn) {
    if (typeof fn !== 'function') return;
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
  }

  /**
   * Event Emitter: remove listener
   */
  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(listener => listener !== fn);
  }

  /**
   * Event Emitter: emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const fn of this.listeners[event]) {
      try {
        fn(data);
      } catch (err) {
        console.error(`Error in voice commander event listener for "${event}":`, err);
      }
    }
  }

  /**
   * Register custom command grammar
   */
  registerCommand(patternOrId, handlerOrPattern, descriptionOrHandler, descText) {
    let id, pattern, handler, description;

    if (typeof patternOrId === 'object' && patternOrId.pattern && patternOrId.handler) {
      ({ id, pattern, handler, description } = patternOrId);
      id = id || `custom_${this.customCommands.length + 1}`;
    } else if (typeof handlerOrPattern === 'function') {
      pattern = patternOrId;
      handler = handlerOrPattern;
      description = descriptionOrHandler || 'Custom Command';
      id = `custom_${this.customCommands.length + 1}`;
    } else {
      id = patternOrId;
      pattern = handlerOrPattern;
      handler = descriptionOrHandler;
      description = descText || 'Custom Command';
    }

    this.customCommands.unshift({ id, pattern, handler, description });
  }

  /**
   * Parse spoken grammar transcript into structured intent and execution callback
   */
  parseVoiceGrammar(transcript = '') {
    const raw = String(transcript || '').trim();
    if (!raw) {
      return {
        matched: false,
        intent: 'UNKNOWN',
        command: 'unknown',
        action: 'UNKNOWN',
        transcript: '',
        confidence: 0,
        response: 'No audible speech detected.',
        params: {}
      };
    }

    const normalized = normalizeTranscript(raw);

    // 1. Check custom commands first
    for (const cmd of this.customCommands) {
      let matched = false;
      let matchRes = null;

      if (cmd.pattern instanceof RegExp) {
        matchRes = raw.match(cmd.pattern) || normalized.match(cmd.pattern);
        matched = !!matchRes;
      } else if (typeof cmd.pattern === 'string') {
        matched = normalized.includes(cmd.pattern.toLowerCase());
      }

      if (matched) {
        let customResponse = `Executed custom command: ${cmd.description || cmd.id}`;
        let customParams = { match: matchRes };

        if (typeof cmd.handler === 'function') {
          try {
            const handlerResult = cmd.handler(raw, matchRes, this);
            if (typeof handlerResult === 'string') {
              customResponse = handlerResult;
            } else if (handlerResult && typeof handlerResult === 'object') {
              if (handlerResult.response) customResponse = handlerResult.response;
              if (handlerResult.params) customParams = { ...customParams, ...handlerResult.params };
            }
          } catch (e) {
            customResponse = `Custom command error: ${e.message}`;
          }
        }

        const result = {
          matched: true,
          id: cmd.id,
          intent: 'CUSTOM_COMMAND',
          command: cmd.id,
          action: 'CUSTOM_COMMAND',
          transcript: raw,
          normalized,
          confidence: 0.98,
          response: customResponse,
          params: customParams,
          timestamp: Date.now(),
          execute: () => {
            if (typeof cmd.handler === 'function') cmd.handler(raw, matchRes, this);
          }
        };
        this._recordHistory(result);
        this.emit('command', result);
        return result;
      }
    }

    // 2. Buy Order
    const buyMatch = normalized.match(CRYPTO_GRAMMAR_PATTERNS.buy_order);
    if (buyMatch) {
      const parsedAmount = parseFloat(buyMatch[1].trim());
      const rawAsset = buyMatch[2].trim();
      const asset = resolveAssetSymbol(rawAsset);
      const baseAsset = asset.includes('/') ? asset.split('/')[0] : asset;
      const pair = asset.includes('/') ? asset : `${asset}/USDT`;

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        const result = {
          matched: false,
          intent: 'INVALID_ORDER',
          command: 'buy_order',
          action: 'VALIDATION_FAILED',
          transcript: raw,
          confidence: 0.8,
          response: `Invalid purchase amount "${buyMatch[1]}". Order amount must be a positive number.`,
          params: { amount: parsedAmount, asset }
        };
        this._recordHistory(result);
        this.emit('error', result);
        return result;
      }

      const tickerInfo = this.tickers[baseAsset] || { price: 100.0 };
      const estTotal = parsedAmount * tickerInfo.price;

      // Trading safety limit check
      if (estTotal > this.maxOrderCapUsd) {
        const result = {
          matched: false,
          intent: 'SAFETY_LIMIT_EXCEEDED',
          command: 'buy_order',
          action: 'SAFETY_LIMIT_EXCEEDED',
          transcript: raw,
          confidence: 0.9,
          response: `Trading safety alert: Order value of $${estTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} exceeds risk threshold ($${this.maxOrderCapUsd.toLocaleString()}). Execution blocked.`,
          params: { amount: parsedAmount, asset: baseAsset, pair, estimatedCost: estTotal }
        };
        this._recordHistory(result);
        this.emit('error', result);
        return result;
      }

      const orderData = {
        id: `ORD-BUY-${Date.now().toString().slice(-6)}`,
        side: 'BUY',
        amount: parsedAmount,
        asset: baseAsset,
        pair,
        unitPrice: tickerInfo.price,
        estimatedTotalUsd: estTotal,
        timestamp: Date.now()
      };

      this.pendingOrder = orderData;
      const formattedTotal = estTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const response = `Buy order staged: ${parsedAmount} ${baseAsset} (${pair}) for approximately $${formattedTotal} USD. Say 'confirm' to execute.`;

      const result = {
        matched: true,
        intent: 'BUY_ORDER',
        command: 'buy_order',
        action: 'BUY',
        transcript: raw,
        confidence: 0.95,
        response,
        params: orderData,
        timestamp: Date.now(),
        execute: (cb) => this.confirmPendingOrder(cb)
      };

      this._recordHistory(result);
      this.emit('order:staged', orderData);
      this.emit('command', result);
      return result;
    }

    // 3. Sell Order
    const sellMatch = normalized.match(CRYPTO_GRAMMAR_PATTERNS.sell_order);
    if (sellMatch) {
      const parsedAmount = parseFloat(sellMatch[1].trim());
      const rawAsset = sellMatch[2].trim();
      const asset = resolveAssetSymbol(rawAsset);
      const baseAsset = asset.includes('/') ? asset.split('/')[0] : asset;
      const pair = asset.includes('/') ? asset : `${asset}/USDT`;

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        const result = {
          matched: false,
          intent: 'INVALID_ORDER',
          command: 'sell_order',
          action: 'VALIDATION_FAILED',
          transcript: raw,
          confidence: 0.8,
          response: `Invalid sell amount "${sellMatch[1]}". Order amount must be a positive number.`,
          params: { amount: parsedAmount, asset }
        };
        this._recordHistory(result);
        this.emit('error', result);
        return result;
      }

      const tickerInfo = this.tickers[baseAsset] || { price: 100.0 };
      const estTotal = parsedAmount * tickerInfo.price;

      if (estTotal > this.maxOrderCapUsd) {
        const result = {
          matched: false,
          intent: 'SAFETY_LIMIT_EXCEEDED',
          command: 'sell_order',
          action: 'SAFETY_LIMIT_EXCEEDED',
          transcript: raw,
          confidence: 0.9,
          response: `Trading safety alert: Order value of $${estTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} exceeds risk threshold ($${this.maxOrderCapUsd.toLocaleString()}). Execution blocked.`,
          params: { amount: parsedAmount, asset: baseAsset, pair, estimatedProceeds: estTotal }
        };
        this._recordHistory(result);
        this.emit('error', result);
        return result;
      }

      const orderData = {
        id: `ORD-SELL-${Date.now().toString().slice(-6)}`,
        side: 'SELL',
        amount: parsedAmount,
        asset: baseAsset,
        pair,
        unitPrice: tickerInfo.price,
        estimatedTotalUsd: estTotal,
        timestamp: Date.now()
      };

      this.pendingOrder = orderData;
      const formattedTotal = estTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const response = `Sell order staged: ${parsedAmount} ${baseAsset} (${pair}) for approximately $${formattedTotal} USD. Say 'confirm' to execute.`;

      const result = {
        matched: true,
        intent: 'SELL_ORDER',
        command: 'sell_order',
        action: 'SELL',
        transcript: raw,
        confidence: 0.95,
        response,
        params: orderData,
        timestamp: Date.now(),
        execute: (cb) => this.confirmPendingOrder(cb)
      };

      this._recordHistory(result);
      this.emit('order:staged', orderData);
      this.emit('command', result);
      return result;
    }

    // 4. Check Price / Ticker Lookup
    const priceMatch = normalized.match(CRYPTO_GRAMMAR_PATTERNS.check_price);
    if (priceMatch) {
      const rawAsset = priceMatch[1].trim();
      const asset = resolveAssetSymbol(rawAsset);
      const baseAsset = asset.includes('/') ? asset.split('/')[0] : asset;
      const tickerInfo = this.tickers[baseAsset];

      let response;
      let params;
      if (tickerInfo) {
        const formattedPrice = tickerInfo.price.toLocaleString('en-US', {
          minimumFractionDigits: tickerInfo.price < 1 ? 4 : 2,
          maximumFractionDigits: tickerInfo.price < 1 ? 4 : 2
        });
        response = `${baseAsset} quote: $${formattedPrice} USD (${tickerInfo.change24h} 24h change). 24h high: $${tickerInfo.high24h.toLocaleString()}, low: $${tickerInfo.low24h.toLocaleString()}.`;
        params = { asset: baseAsset, ...tickerInfo };
      } else {
        response = `Quote for asset "${baseAsset}" not currently in local cache.`;
        params = { asset: baseAsset, found: false };
      }

      const result = {
        matched: true,
        intent: 'CHECK_PRICE',
        command: 'check_price',
        action: 'PRICE_QUOTE',
        transcript: raw,
        confidence: 0.95,
        response,
        params,
        timestamp: Date.now()
      };

      this._recordHistory(result);
      this.emit('price:quote', params);
      this.emit('command', result);
      return result;
    }

    // 5. Order Management (Cancel order / Cancel all)
    const cancelMatch = normalized.match(CRYPTO_GRAMMAR_PATTERNS.cancel_order);
    if (cancelMatch) {
      const target = (cancelMatch[1] || cancelMatch[2] || 'all').toLowerCase();
      let response;
      let params;

      if (target === 'all' || target.includes('all') || target.includes('orders')) {
        this.pendingOrder = null;
        response = 'Cancelled all pending and staged orders on Crypto Exchange Pro.';
        params = { all: true, cancelledCount: 1 };
        this.emit('order:cancelled', { all: true });
      } else {
        const orderId = cancelMatch[1];
        if (this.pendingOrder && this.pendingOrder.id.includes(orderId)) {
          this.pendingOrder = null;
        }
        response = `Order #${orderId} has been successfully cancelled.`;
        params = { orderId, all: false };
        this.emit('order:cancelled', { orderId });
      }

      const result = {
        matched: true,
        intent: 'CANCEL_ORDER',
        command: 'cancel_order',
        action: 'CANCEL_ORDER',
        transcript: raw,
        confidence: 0.95,
        response,
        params,
        timestamp: Date.now()
      };

      this._recordHistory(result);
      this.emit('command', result);
      return result;
    }

    // 6. Switch Market
    const switchMatch = normalized.match(CRYPTO_GRAMMAR_PATTERNS.switch_market);
    if (switchMatch) {
      const rawPair = switchMatch[1].trim();
      const resolvedPair = resolveAssetSymbol(rawPair);
      const market = resolvedPair.includes('/') ? resolvedPair : `${resolvedPair}/USDT`;
      this.activeMarket = market;

      const response = `Active market switched to ${market}. Orderbook and chart re-indexed.`;
      const params = { market, base: market.split('/')[0], quote: market.split('/')[1] };

      const result = {
        matched: true,
        intent: 'SWITCH_MARKET',
        command: 'switch_market',
        action: 'SWITCH_MARKET',
        transcript: raw,
        confidence: 0.95,
        response,
        params,
        timestamp: Date.now()
      };

      this._recordHistory(result);
      this.emit('market:switched', params);
      this.emit('command', result);
      return result;
    }

    // 7. Portfolio Summary
    if (CRYPTO_GRAMMAR_PATTERNS.portfolio_summary.test(normalized)) {
      let totalUsd = 0;
      const breakdowns = [];

      for (const [coin, amt] of Object.entries(this.portfolio)) {
        const px = this.tickers[coin]?.price || 1.0;
        const val = amt * px;
        totalUsd += val;
        breakdowns.push(`${amt.toLocaleString()} ${coin} ($${Math.round(val).toLocaleString()})`);
      }

      const formattedTotal = totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const response = `Portfolio summary: Total estimated value $${formattedTotal} USD. Holdings: ${breakdowns.join(', ')}.`;
      const params = { totalUsd, holdings: { ...this.portfolio } };

      const result = {
        matched: true,
        intent: 'PORTFOLIO_BALANCE',
        command: 'portfolio_summary',
        action: 'PORTFOLIO_READ',
        transcript: raw,
        confidence: 0.95,
        response,
        params,
        timestamp: Date.now()
      };

      this._recordHistory(result);
      this.emit('portfolio:read', params);
      this.emit('command', result);
      return result;
    }

    // 8. Accessibility Action
    if (CRYPTO_GRAMMAR_PATTERNS.accessibility_action.test(normalized)) {
      let actionType = 'toggle_contrast';
      let response = 'High contrast trading display mode toggled.';

      if (normalized.includes('dark')) {
        actionType = 'activate_dark_mode';
        response = 'Terminal dark mode activated with obsidian styling.';
      } else if (normalized.includes('increase font')) {
        actionType = 'increase_font';
        response = 'Terminal font size increased for enhanced readability.';
      } else if (normalized.includes('decrease font')) {
        actionType = 'decrease_font';
        response = 'Terminal font size decreased.';
      } else if (normalized.includes('reset font')) {
        actionType = 'reset_font';
        response = 'Terminal typography scaled to default.';
      }

      const params = { action: actionType };
      const result = {
        matched: true,
        intent: 'ACCESSIBILITY_ACTION',
        command: 'accessibility_action',
        action: 'A11Y_DISPATCH',
        transcript: raw,
        confidence: 0.95,
        response,
        params,
        timestamp: Date.now()
      };

      this._recordHistory(result);
      this.emit('accessibility:toggle', params);
      this.emit('command', result);
      return result;
    }

    // 9. Confirm Staged Order
    if (CRYPTO_GRAMMAR_PATTERNS.confirm_order.test(normalized)) {
      if (this.pendingOrder) {
        const order = { ...this.pendingOrder };
        this.confirmPendingOrder();
        const response = `Voice confirmation accepted. Executed ${order.side} for ${order.amount} ${order.asset} on ${order.pair}.`;
        const result = {
          matched: true,
          intent: 'CONFIRM_ORDER',
          command: 'confirm_order',
          action: 'ORDER_EXECUTED',
          transcript: raw,
          confidence: 0.98,
          response,
          params: order,
          timestamp: Date.now()
        };
        this._recordHistory(result);
        this.emit('command', result);
        return result;
      } else {
        const response = 'No pending order awaiting confirmation.';
        const result = {
          matched: true,
          intent: 'CONFIRM_ORDER',
          command: 'confirm_order',
          action: 'NOOP',
          transcript: raw,
          confidence: 0.9,
          response,
          params: {},
          timestamp: Date.now()
        };
        this._recordHistory(result);
        return result;
      }
    }

    // 10. Reject Staged Order
    if (CRYPTO_GRAMMAR_PATTERNS.reject_order.test(normalized)) {
      if (this.pendingOrder) {
        const rejected = { ...this.pendingOrder };
        this.cancelPendingOrder();
        const response = `Staged ${rejected.side} order for ${rejected.amount} ${rejected.asset} was dismissed.`;
        const result = {
          matched: true,
          intent: 'REJECT_ORDER',
          command: 'reject_order',
          action: 'ORDER_DISMISSED',
          transcript: raw,
          confidence: 0.95,
          response,
          params: rejected,
          timestamp: Date.now()
        };
        this._recordHistory(result);
        this.emit('command', result);
        return result;
      } else {
        const response = 'No pending order to dismiss.';
        const result = {
          matched: true,
          intent: 'REJECT_ORDER',
          command: 'reject_order',
          action: 'NOOP',
          transcript: raw,
          confidence: 0.9,
          response,
          params: {},
          timestamp: Date.now()
        };
        this._recordHistory(result);
        return result;
      }
    }

    // 11. Help
    if (CRYPTO_GRAMMAR_PATTERNS.help.test(normalized)) {
      const response = "Available vocal commands: 'buy <amount> <asset>', 'sell <amount> <asset>', 'check price <asset>', 'cancel order <id>', 'switch market <pair>', 'read portfolio balance', and 'toggle contrast'.";
      const result = {
        matched: true,
        intent: 'HELP',
        command: 'help',
        action: 'HELP_INFO',
        transcript: raw,
        confidence: 0.95,
        response,
        params: {},
        timestamp: Date.now()
      };
      this._recordHistory(result);
      this.emit('command', result);
      return result;
    }

    // 12. System Status
    if (CRYPTO_GRAMMAR_PATTERNS.status.test(normalized)) {
      const response = `Crypto Exchange Pro terminal operational. Active pair: ${this.activeMarket}. Web Speech engine active.`;
      const result = {
        matched: true,
        intent: 'STATUS',
        command: 'status',
        action: 'STATUS_CHECK',
        transcript: raw,
        confidence: 0.95,
        response,
        params: { activeMarket: this.activeMarket },
        timestamp: Date.now()
      };
      this._recordHistory(result);
      this.emit('command', result);
      return result;
    }

    // 13. Reset / Clear
    if (CRYPTO_GRAMMAR_PATTERNS.reset.test(normalized)) {
      this.clearHistory();
      this.pendingOrder = null;
      const response = 'Voice command history and staged buffers cleared.';
      const result = {
        matched: true,
        intent: 'RESET',
        command: 'reset',
        action: 'RESET_BUFFER',
        transcript: raw,
        confidence: 0.95,
        response,
        params: {},
        timestamp: Date.now()
      };
      this._recordHistory(result);
      this.emit('command', result);
      return result;
    }

    // 14. Fallback for unrecognized phrases
    const fallback = {
      matched: false,
      intent: 'FALLBACK',
      command: 'fallback',
      action: 'FALLBACK',
      transcript: raw,
      normalized,
      confidence: 0,
      response: DEFAULT_FALLBACK_PHRASE,
      params: {},
      timestamp: Date.now()
    };
    this._recordHistory(fallback);
    this.emit('command', fallback);
    return fallback;
  }

  /**
   * Confirms and executes currently staged pending order
   */
  confirmPendingOrder(callback) {
    if (!this.pendingOrder) return null;
    const order = { ...this.pendingOrder, status: 'FILLED', executedAt: Date.now() };

    // Update internal portfolio
    if (order.side === 'BUY') {
      this.portfolio[order.asset] = (this.portfolio[order.asset] || 0) + order.amount;
      this.portfolio.USDT = Math.max(0, (this.portfolio.USDT || 0) - order.estimatedTotalUsd);
    } else if (order.side === 'SELL') {
      this.portfolio[order.asset] = Math.max(0, (this.portfolio[order.asset] || 0) - order.amount);
      this.portfolio.USDT = (this.portfolio.USDT || 0) + order.estimatedTotalUsd;
    }

    this.pendingOrder = null;
    this.emit('order:executed', order);

    if (typeof callback === 'function') {
      callback(order);
    }

    this.hideOrderModal();
    return order;
  }

  /**
   * Cancels currently staged pending order
   */
  cancelPendingOrder() {
    if (!this.pendingOrder) return false;
    const order = { ...this.pendingOrder, status: 'CANCELLED', cancelledAt: Date.now() };
    this.pendingOrder = null;
    this.emit('order:cancelled', order);
    this.hideOrderModal();
    return true;
  }

  /**
   * Headless / test / manual simulator
   */
  simulateVoiceInput(transcript) {
    const parsed = this.parseVoiceGrammar(transcript);
    this.showToast(parsed.response);
    this.synthesizeResponse(parsed.response);
    this.renderUIState(parsed);
    return parsed;
  }

  /**
   * Synthesize spoken response via SpeechSynthesis
   */
  synthesizeResponse(text, options = {}) {
    return new Promise((resolve) => {
      if (!this.speechSynth || typeof this.speechSynth.speak !== 'function') {
        resolve(false);
        return;
      }

      try {
        const UtteranceCtor = (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) || globalThis.SpeechSynthesisUtterance;
        if (!UtteranceCtor) {
          resolve(false);
          return;
        }

        const utterance = new UtteranceCtor(text);
        utterance.lang = options.lang || 'en-US';
        utterance.rate = options.rate || 1.05;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        // Cancel previous speaking to prevent buffer buildup
        if (typeof this.speechSynth.cancel === 'function') {
          this.speechSynth.cancel();
        }

        this.speechSynth.speak(utterance);
      } catch (err) {
        resolve(false);
      }
    });
  }

  /**
   * Start microphone listening via Web Speech API
   */
  async startListening() {
    if (this.isListening) return true;

    if (!this.SpeechRecognitionCtor) {
      this.showToast('Web Speech API is not supported in this browser environment.');
      return false;
    }

    try {
      this.recognition = new this.SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.setListening(true);
      };

      this.recognition.onend = () => {
        this.setListening(false);
      };

      this.recognition.onerror = (e) => {
        this.setListening(false);
        this.showToast(`Voice input error: ${e.error || 'Microphone error'}`);
        this.emit('error', e);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        this.simulateVoiceInput(transcript);
      };

      this.recognition.start();
      return true;
    } catch (err) {
      this.setListening(false);
      this.showToast('Failed to initialize microphone access.');
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Stop microphone listening
   */
  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.setListening(false);
    return true;
  }

  /**
   * Toggle listening state
   */
  toggleListening() {
    if (this.isListening) {
      return this.stopListening();
    }
    return this.startListening();
  }

  setListening(isListening) {
    this.isListening = isListening;
    this.emit('listening', isListening);

    if (this.micBtn) {
      this.micBtn.classList.toggle('listening', isListening);
      const label = this.micBtn.querySelector('.mic-label');
      if (label) {
        label.textContent = isListening ? 'Listening...' : 'Activate Voice Mic';
      }
    }
    if (this.statusBadge) {
      this.statusBadge.textContent = isListening
        ? 'Active Listening • Awaiting crypto trading vocal directive'
        : 'Terminal Idle • Ready for spoken voice commands';
    }
    if (this.waveEl) {
      this.waveEl.classList.toggle('listening', isListening);
    }
  }

  _recordHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    this.renderHistory();
  }

  getCommandHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
    this.renderHistory();
  }

  // --- Browser UI Renderers ---

  showToast(msg, duration = 3200) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, duration);
  }

  renderHistory() {
    if (!this.historyEl) return;
    if (this.history.length === 0) {
      this.historyEl.innerHTML = '<div class="history-entry empty">No trading voice commands captured yet.</div>';
      return;
    }

    this.historyEl.innerHTML = this.history.map((item) => {
      let badgeClass = 'badge-general';
      if (item.action === 'BUY') badgeClass = 'badge-buy';
      else if (item.action === 'SELL') badgeClass = 'badge-sell';
      else if (item.action === 'PRICE_QUOTE') badgeClass = 'badge-quote';
      else if (item.action === 'CANCEL_ORDER' || item.action === 'ORDER_DISMISSED') badgeClass = 'badge-danger';
      else if (item.action === 'SWITCH_MARKET') badgeClass = 'badge-market';
      else if (item.action === 'A11Y_DISPATCH') badgeClass = 'badge-a11y';
      else if (item.action === 'FALLBACK' || !item.matched) badgeClass = 'badge-fallback';

      return `
        <div class="history-entry ${badgeClass}">
          <div class="entry-header">
            <span class="entry-command">"${this.escapeHtml(item.transcript)}"</span>
            <span class="entry-badge">${item.action}</span>
          </div>
          <p class="entry-response">${this.escapeHtml(item.response)}</p>
        </div>
      `;
    }).join('');
  }

  renderUIState(parsed) {
    // Show order confirmation modal if buy/sell is staged
    if (parsed.intent === 'BUY_ORDER' || parsed.intent === 'SELL_ORDER') {
      this.showOrderModal(parsed.params);
    } else if (parsed.intent === 'CONFIRM_ORDER' || parsed.intent === 'REJECT_ORDER') {
      this.hideOrderModal();
    }

    // Update Ticker Readout Panel if price quote
    if (parsed.intent === 'CHECK_PRICE' && parsed.params?.price && this.tickerEl) {
      this.updateTickerPanel(parsed.params);
    }

    // Accessibility high contrast toggle
    if (parsed.intent === 'ACCESSIBILITY_ACTION' && typeof document !== 'undefined') {
      if (parsed.params?.action === 'toggle_contrast') {
        document.body.classList.toggle('high-contrast');
      } else if (parsed.params?.action === 'increase_font') {
        document.body.style.fontSize = '1.15rem';
      } else if (parsed.params?.action === 'decrease_font') {
        document.body.style.fontSize = '0.9rem';
      } else if (parsed.params?.action === 'reset_font') {
        document.body.style.fontSize = '';
      }
    }
  }

  showOrderModal(order) {
    if (!this.modalEl) return;
    const sideEl = this.modalEl.querySelector('.modal-side');
    const assetEl = this.modalEl.querySelector('.modal-asset');
    const amountEl = this.modalEl.querySelector('.modal-amount');
    const totalEl = this.modalEl.querySelector('.modal-total');

    if (sideEl) {
      sideEl.textContent = order.side;
      sideEl.className = `modal-side badge-${order.side.toLowerCase()}`;
    }
    if (assetEl) assetEl.textContent = order.pair;
    if (amountEl) amountEl.textContent = `${order.amount} ${order.asset}`;
    if (totalEl) totalEl.textContent = `$${order.estimatedTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    this.modalEl.classList.add('visible');
    this.modalEl.setAttribute('aria-hidden', 'false');
  }

  hideOrderModal() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('visible');
    this.modalEl.setAttribute('aria-hidden', 'true');
  }

  updateTickerPanel(params) {
    if (!this.tickerEl) return;
    const symbolEl = this.tickerEl.querySelector('.ticker-symbol');
    const priceEl = this.tickerEl.querySelector('.ticker-price');
    const changeEl = this.tickerEl.querySelector('.ticker-change');
    const rangeEl = this.tickerEl.querySelector('.ticker-range');

    if (symbolEl) symbolEl.textContent = `${params.asset}/USDT`;
    if (priceEl) priceEl.textContent = `$${params.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (changeEl) {
      changeEl.textContent = params.change24h;
      changeEl.className = `ticker-change ${params.change24h.startsWith('+') ? 'text-emerald' : 'text-crimson'}`;
    }
    if (rangeEl && params.high24h && params.low24h) {
      rangeEl.textContent = `24h H: $${params.high24h.toLocaleString()} | L: $${params.low24h.toLocaleString()}`;
    }
    this.tickerEl.classList.add('highlight-flash');
    setTimeout(() => this.tickerEl?.classList.remove('highlight-flash'), 800);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global window registration in browser
if (typeof window !== 'undefined') {
  window.CryptoExchangeProVoiceCommander = CryptoExchangeProVoiceCommander;
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new CryptoExchangeProVoiceCommander();

    commander.micBtn = document.getElementById('micBtn');
    commander.statusBadge = document.getElementById('statusBadge');
    commander.historyEl = document.getElementById('commandHistory');
    commander.waveEl = document.getElementById('waveVisualizer');
    commander.toastEl = document.getElementById('speechToast');
    commander.modalEl = document.getElementById('orderModal');
    commander.tickerEl = document.getElementById('tickerReadout');

    const manualInput = document.getElementById('manualInput');
    const submitBtn = document.getElementById('submitBtn');
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const a11yContrastBtn = document.getElementById('a11yContrastBtn');

    if (commander.micBtn) {
      commander.micBtn.addEventListener('click', () => {
        commander.toggleListening();
      });
    }

    function handleManualDispatch() {
      const text = manualInput?.value?.trim();
      if (text) {
        commander.simulateVoiceInput(text);
        if (manualInput) manualInput.value = '';
      }
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', handleManualDispatch);
    }

    if (manualInput) {
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleManualDispatch();
      });
    }

    if (confirmOrderBtn) {
      confirmOrderBtn.addEventListener('click', () => {
        commander.simulateVoiceInput('confirm');
      });
    }

    if (cancelOrderBtn) {
      cancelOrderBtn.addEventListener('click', () => {
        commander.simulateVoiceInput('reject');
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        commander.clearHistory();
      });
    }

    if (a11yContrastBtn) {
      a11yContrastBtn.addEventListener('click', () => {
        commander.simulateVoiceInput('toggle contrast');
      });
    }

    // Voice quick-action chips
    const chips = document.querySelectorAll('.chip-cmd');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd') || chip.textContent.trim();
        commander.simulateVoiceInput(cmd);
      });
    });
  });
}
