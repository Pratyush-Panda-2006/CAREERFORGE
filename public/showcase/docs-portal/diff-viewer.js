/**
 * DocsPortalDiffInspector
 * Visual state & text change diff inspector with line highlighting for API documentation specs, schema evolution, and endpoint revisions.
 */
export class DocsPortalDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentPresetId = this.presets[0]?.id || null;
    this.viewMode = options.viewMode || 'split'; // 'split' | 'unified'
  }

  getDefaultPresets() {
    return [
      {
        id: 'openapi-auth-migration',
        title: 'OpenAPI 3.1.0 Endpoint Schema Migration',
        description: 'Breaking change deprecating query parameter API keys in favor of Bearer JWT Authorization headers.',
        original: `paths:
  /v1/telemetry/events:
    post:
      summary: Ingest telemetry batch
      parameters:
        - name: api_key
          in: query
          required: true
          schema:
            type: string
            description: Legacy raw access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TelemetryBatch'
      responses:
        '200':
          description: Event stream accepted`,
        modified: `paths:
  /v1/telemetry/events:
    post:
      summary: Ingest telemetry batch
      security:
        - BearerAuth: []
        - OAuth2Scope:
            - telemetry:write
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TelemetryBatch'
      responses:
        '200':
          description: Event stream accepted
        '401':
          description: Missing or expired bearer signature`
      },
      {
        id: 'rate-limiting-quota',
        title: 'Rate Limiting Tier Quota Policy Evolution',
        description: 'Upgrade from in-memory fixed-window counter to distributed Redis token bucket with burst tolerance.',
        original: `ratelimit:
  strategy: fixed_window_counter
  backend: memory
  window_seconds: 60
  max_requests: 120
  headers:
    remaining: X-RateLimit-Remaining
    reset: X-RateLimit-Reset`,
        modified: `ratelimit:
  strategy: distributed_token_bucket
  backend: redis_cluster
  window_seconds: 60
  refill_rate_per_sec: 10
  burst_capacity: 500
  headers:
    remaining: X-RateLimit-Remaining
    reset: X-RateLimit-Reset
    retry_after: Retry-After`
      },
      {
        id: 'graphql-schema-union',
        title: 'GraphQL Schema Type Definition Evolution',
        description: 'Transition from nullable customer entity payload to strict Result Union pattern with typed error objects.',
        original: `type Query {
  userProfile(id: ID!): UserProfile
}

type UserProfile {
  id: ID!
  displayName: String!
  billingEmail: String
}`,
        modified: `type Query {
  userProfile(id: ID!): UserProfileResult!
}

union UserProfileResult = UserProfile | UserNotFoundError | AccountSuspendedError

type UserProfile {
  id: ID!
  displayName: String!
  billingEmail: String!
  securityTier: SecurityTier!
}`
      }
    ];
  }

  getPresets() {
    return this.presets;
  }

  getPresetById(id) {
    return this.presets.find((p) => p.id === id) || null;
  }

  computeDiff(originalText = '', modifiedText = '') {
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');

    const diff = [];
    const maxLen = Math.max(originalLines.length, modifiedLines.length);

    let oldLineNum = 1;
    let newLineNum = 1;

    for (let i = 0; i < maxLen; i++) {
      const orig = originalLines[i];
      const mod = modifiedLines[i];

      if (orig === undefined) {
        diff.push({
          type: 'added',
          oldLineNumber: null,
          newLineNumber: newLineNum++,
          content: mod
        });
      } else if (mod === undefined) {
        diff.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
          content: orig
        });
      } else if (orig === mod) {
        diff.push({
          type: 'unchanged',
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
          content: orig
        });
      } else {
        diff.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
          content: orig
        });
        diff.push({
          type: 'added',
          oldLineNumber: null,
          newLineNumber: newLineNum++,
          content: mod
        });
      }
    }

    return diff;
  }

  getDiffStats(diff) {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diff.forEach((item) => {
      if (item.type === 'added') added++;
      else if (item.type === 'removed') removed++;
      else if (item.type === 'unchanged') unchanged++;
    });

    const netChange = added - removed;
    const totalLines = added + removed + unchanged;

    return {
      added,
      removed,
      unchanged,
      totalLines,
      netChange
    };
  }

  renderToDOM(container, presetId = this.currentPresetId) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    const preset = this.getPresetById(presetId) || this.presets[0];
    if (!preset) return;

    this.currentPresetId = preset.id;
    const diff = this.computeDiff(preset.original, preset.modified);
    const stats = this.getDiffStats(diff);

    container.replaceChildren();

    const diffContainer = document.createElement('div');
    diffContainer.className = 'docs-diff-container';

    // Header
    const header = document.createElement('div');
    header.className = 'docs-diff-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'docs-diff-title-group';

    const title = document.createElement('h3');
    title.textContent = 'API Spec & Documentation Schema Diff Inspector';

    const desc = document.createElement('p');
    desc.className = 'docs-diff-desc';
    desc.textContent = preset.description;

    titleGroup.append(title, desc);

    // Preset selector
    const selector = document.createElement('select');
    selector.className = 'docs-preset-select';
    this.presets.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title;
      opt.selected = p.id === preset.id;
      selector.append(opt);
    });

    selector.addEventListener('change', (e) => {
      this.renderToDOM(container, e.target.value);
    });

    header.append(titleGroup, selector);
    diffContainer.append(header);

    // Stats bar
    const statsBar = document.createElement('div');
    statsBar.className = 'docs-diff-stats';

    const addedBadge = document.createElement('span');
    addedBadge.className = 'docs-stat-badge stat-added';
    addedBadge.textContent = `+${stats.added} added`;

    const removedBadge = document.createElement('span');
    removedBadge.className = 'docs-stat-badge stat-removed';
    removedBadge.textContent = `-${stats.removed} removed`;

    const unchangedBadge = document.createElement('span');
    unchangedBadge.className = 'docs-stat-badge stat-unchanged';
    unchangedBadge.textContent = `${stats.unchanged} unchanged`;

    statsBar.append(addedBadge, removedBadge, unchangedBadge);
    diffContainer.append(statsBar);

    // Diff table
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'docs-diff-table-wrapper';

    const table = document.createElement('table');
    table.className = 'docs-diff-table';

    diff.forEach((line) => {
      const row = document.createElement('tr');
      row.className = `docs-diff-row row-${line.type}`;

      const oldNumCell = document.createElement('td');
      oldNumCell.className = 'docs-line-num';
      oldNumCell.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNumCell = document.createElement('td');
      newNumCell.className = 'docs-line-num';
      newNumCell.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const markerCell = document.createElement('td');
      markerCell.className = 'docs-diff-marker';
      if (line.type === 'added') markerCell.textContent = '+';
      else if (line.type === 'removed') markerCell.textContent = '-';
      else markerCell.textContent = ' ';

      const contentCell = document.createElement('td');
      contentCell.className = 'docs-diff-content';
      contentCell.textContent = line.content;

      row.append(oldNumCell, newNumCell, markerCell, contentCell);
      table.append(row);
    });

    tableWrapper.append(table);
    diffContainer.append(tableWrapper);

    container.append(diffContainer);
  }
}
