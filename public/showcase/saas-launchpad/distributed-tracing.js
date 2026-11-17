/**
 * SaaS Launchpad - Interactive Distributed Tracing Flamegraph Waterfall Engine
 * Models OpenTelemetry-compatible hierarchical trace spans, bottleneck latency flags,
 * critical path execution trees, and microservice latency metrics.
 */

export const DEFAULT_TRACE_CATALOG = Object.freeze({
  'trace-8f4a21c9': {
    id: 'trace-8f4a21c9',
    title: 'Checkout Payment Authorization Flow',
    totalMs: 418.4,
    bottleneckText: 'postgres-db (57.8%)',
    healthText: '⚠️ 1 Cache Miss / Bottleneck',
    spans: [
      {
        id: 'sp_001_gw',
        parentId: null,
        service: 'api-gateway',
        operation: 'POST /v2/checkout/authorize',
        startMs: 0.0,
        durationMs: 418.4,
        status: '200 OK',
        isError: false,
        isCritical: true,
        tags: { 'http.method': 'POST', 'http.status_code': '200', 'net.host.name': 'edge-us-east-1' },
        logs: [{ ts: '0.0ms', msg: 'Request received at Edge Ingress Proxy' }, { ts: '418.4ms', msg: 'Response flushed to client' }]
      },
      {
        id: 'sp_002_auth',
        parentId: 'sp_001_gw',
        service: 'auth-service',
        operation: 'verify_jwt_session',
        startMs: 4.2,
        durationMs: 38.6,
        status: '200 OK',
        isError: false,
        isCritical: false,
        tags: { 'auth.provider': 'oauth2-oidc', 'user.tier': 'enterprise' },
        logs: [{ ts: '4.2ms', msg: 'Extracting Bearer token signature' }, { ts: '42.8ms', msg: 'Session claims verified' }]
      },
      {
        id: 'sp_003_redis_auth',
        parentId: 'sp_002_auth',
        service: 'redis-cache',
        operation: 'GET session:usr_9012f',
        startMs: 10.5,
        durationMs: 6.4,
        status: 'CACHE HIT',
        isError: false,
        isCritical: false,
        tags: { 'db.system': 'redis', 'cache.hit': 'true' },
        logs: [{ ts: '16.9ms', msg: 'Session payload hydrated from Redis' }]
      },
      {
        id: 'sp_004_bill',
        parentId: 'sp_001_gw',
        service: 'billing-engine',
        operation: 'calculate_ledger_settlement',
        startMs: 44.0,
        durationMs: 362.0,
        status: '200 OK',
        isError: false,
        isCritical: true,
        tags: { 'rpc.system': 'grpc', 'currency': 'USD' },
        logs: [{ ts: '44.0ms', msg: 'Acquiring distributed settlement lock' }]
      },
      {
        id: 'sp_005_pg',
        parentId: 'sp_004_bill',
        service: 'postgres-db',
        operation: 'UPDATE accounts SET balance = balance - 450.00',
        startMs: 62.0,
        durationMs: 242.0,
        status: '200 OK (LOCK CONTENTION)',
        isError: false,
        isCritical: true,
        tags: { 'db.system': 'postgresql', 'db.statement': 'UPDATE accounts...' },
        logs: [{ ts: '62.0ms', msg: 'Waiting on row-level write lock' }, { ts: '304.0ms', msg: 'Transaction committed' }]
      },
      {
        id: 'sp_006_stripe',
        parentId: 'sp_004_bill',
        service: 'payment-gateway',
        operation: 'POST /v1/payment_intents/confirm',
        startMs: 308.0,
        durationMs: 96.0,
        status: '200 OK',
        isError: false,
        isCritical: true,
        tags: { 'peer.service': 'stripe-api', 'http.status_code': '200' },
        logs: [{ ts: '404.0ms', msg: 'Stripe webhook payment confirmed' }]
      }
    ]
  },
  'trace-c3b71940': {
    id: 'trace-c3b71940',
    title: 'Semantic Vector Embedding Retrieval Flow',
    totalMs: 124.6,
    bottleneckText: 'vector-indexer (68.4%)',
    healthText: '✅ All Spans Healthy',
    spans: [
      {
        id: 'sp_101_gw',
        parentId: null,
        service: 'api-gateway',
        operation: 'POST /v1/embeddings/search',
        startMs: 0.0,
        durationMs: 124.6,
        status: '200 OK',
        isError: false,
        isCritical: true,
        tags: { 'http.method': 'POST' },
        logs: [{ ts: '0.0ms', msg: 'Embedding query dispatched' }]
      },
      {
        id: 'sp_102_vec',
        parentId: 'sp_101_gw',
        service: 'vector-indexer',
        operation: 'HNSW Cosine Similarity Query',
        startMs: 8.4,
        durationMs: 85.2,
        status: '200 OK',
        isError: false,
        isCritical: true,
        tags: { 'index.metric': 'cosine', 'top_k': '10' },
        logs: [{ ts: '93.6ms', msg: 'Found top 10 vectors in 85.2ms' }]
      }
    ]
  }
});

export class DistributedTracingEngine {
  constructor(catalog = DEFAULT_TRACE_CATALOG) {
    this.catalog = { ...catalog };
  }

  getTrace(traceId) {
    return this.catalog[traceId] || null;
  }

  getAllTraces() {
    return Object.values(this.catalog);
  }

  calculateBottleneck(traceId) {
    const trace = this.getTrace(traceId);
    if (!trace) throw new Error(`Trace '${traceId}' not found`);

    let maxSpan = null;
    let maxDuration = 0;

    for (const span of trace.spans) {
      // Exclude root span representing overall request
      if (span.parentId !== null && span.durationMs > maxDuration) {
        maxDuration = span.durationMs;
        maxSpan = span;
      }
    }

    if (!maxSpan) {
      maxSpan = trace.spans[0];
      maxDuration = maxSpan.durationMs;
    }

    const percentage = Number(((maxDuration / trace.totalMs) * 100).toFixed(1));
    return {
      service: maxSpan.service,
      operation: maxSpan.operation,
      durationMs: maxSpan.durationMs,
      percentage,
      summary: `${maxSpan.service} (${percentage}%)`
    };
  }

  calculateCriticalPath(traceId) {
    const trace = this.getTrace(traceId);
    if (!trace) throw new Error(`Trace '${traceId}' not found`);

    return trace.spans.filter(s => s.isCritical);
  }

  filterSpans(traceId, query) {
    const trace = this.getTrace(traceId);
    if (!trace) return [];
    if (!query || !query.trim()) return [...trace.spans];

    const q = query.toLowerCase().trim();
    return trace.spans.filter(span => {
      const matchText = `${span.service} ${span.operation} ${span.status} ${span.id}`.toLowerCase();
      return matchText.includes(q);
    });
  }

  exportTraceJSON(traceId) {
    const trace = this.getTrace(traceId);
    if (!trace) throw new Error(`Trace '${traceId}' not found`);
    return JSON.stringify(trace, null, 2);
  }
}
