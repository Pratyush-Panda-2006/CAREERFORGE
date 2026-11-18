/**
 * DeveloperPortfolioDiffInspector
 * Visual state & text change diff inspector with line highlighting for code review diffs, refactoring before/after, and git commits.
 */
export class DeveloperPortfolioDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentPresetId = this.presets[0]?.id || null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'abort-controller-refactor',
        title: 'Refactor fetch in useEffect to AbortController Signal',
        description: 'Eliminates memory leaks and unmounted component race conditions by attaching AbortSignal to async fetch.',
        original: `useEffect(() => {
  setIsLoading(true);
  fetchUserPortfolio(userId)
    .then((data) => {
      setProjects(data.projects);
      setIsLoading(false);
    })
    .catch((err) => {
      setError(err.message);
      setIsLoading(false);
    });
}, [userId]);`,
        modified: `useEffect(() => {
  const controller = new AbortController();
  setIsLoading(true);

  fetchUserPortfolio(userId, { signal: controller.signal })
    .then((data) => {
      setProjects(data.projects);
      setIsLoading(false);
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setIsLoading(false);
      }
    });

  return () => controller.abort();
}, [userId]);`
      },
      {
        id: 'discriminated-unions',
        title: 'Migrate Loose Types to Discriminated Unions',
        description: 'Replaces ambiguous nullable fields with exhaustive TypeScript discriminated union types.',
        original: `interface AsyncState {
  isLoading: boolean;
  data?: Project[];
  error?: string;
  statusCode?: number;
}`,
        modified: `type AsyncState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Project[]; statusCode: number }
  | { status: 'error'; error: Error; statusCode: number };`
      },
      {
        id: 'docker-multistage-build',
        title: 'Dockerfile Optimization to Multi-Stage Build',
        description: 'Reduces image size by 85% by separating build tools from minimal production node runtime.',
        original: `FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`,
        modified: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN npm ci --only=production
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]`
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
    diffContainer.className = 'devport-diff-container';

    // Header
    const header = document.createElement('div');
    header.className = 'devport-diff-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'devport-diff-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Git Refactor & Code Review Diff Inspector';

    const desc = document.createElement('p');
    desc.className = 'devport-diff-desc';
    desc.textContent = preset.description;

    titleGroup.append(title, desc);

    const selector = document.createElement('select');
    selector.className = 'devport-preset-select';
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
    statsBar.className = 'devport-diff-stats';

    const addedBadge = document.createElement('span');
    addedBadge.className = 'devport-stat-badge stat-added';
    addedBadge.textContent = `+${stats.added} additions`;

    const removedBadge = document.createElement('span');
    removedBadge.className = 'devport-stat-badge stat-removed';
    removedBadge.textContent = `-${stats.removed} deletions`;

    const unchangedBadge = document.createElement('span');
    unchangedBadge.className = 'devport-stat-badge stat-unchanged';
    unchangedBadge.textContent = `${stats.unchanged} unchanged`;

    statsBar.append(addedBadge, removedBadge, unchangedBadge);
    diffContainer.append(statsBar);

    // Diff table
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'devport-diff-table-wrapper';

    const table = document.createElement('table');
    table.className = 'devport-diff-table';

    diff.forEach((line) => {
      const row = document.createElement('tr');
      row.className = `devport-diff-row row-${line.type}`;

      const oldNumCell = document.createElement('td');
      oldNumCell.className = 'devport-line-num';
      oldNumCell.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNumCell = document.createElement('td');
      newNumCell.className = 'devport-line-num';
      newNumCell.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const markerCell = document.createElement('td');
      markerCell.className = 'devport-diff-marker';
      if (line.type === 'added') markerCell.textContent = '+';
      else if (line.type === 'removed') markerCell.textContent = '-';
      else markerCell.textContent = ' ';

      const contentCell = document.createElement('td');
      contentCell.className = 'devport-diff-content';
      contentCell.textContent = line.content;

      row.append(oldNumCell, newNumCell, markerCell, contentCell);
      table.append(row);
    });

    tableWrapper.append(table);
    diffContainer.append(tableWrapper);

    container.append(diffContainer);
  }
}
