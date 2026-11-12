import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('copies a section URL and shows toast feedback when its heading link is clicked', async () => {
  const source = await readFile(new URL('./script.js', import.meta.url), 'utf8');
  const listeners = {};
  const anchors = [];
  const timeouts = [];
  const toast = {
    textContent: '',
    setAttribute() {},
    classList: { add(name) { this.visible = name === 'visible'; }, remove() { this.visible = false; } },
  };
  const body = { appendChild(child) { this.child = child; } };
  const headings = ['h2', 'h3'].map((tagName, index) => ({
    tagName,
    textContent: `Section ${index + 1}`,
    id: `section-${index + 1}`,
    querySelector: () => null,
    appendChild(child) { anchors.push(child); },
  }));
  const article = {
    innerText: 'Documentation',
    querySelectorAll: selector => selector === 'h2, h3' ? headings : [],
  };
  const document = {
    addEventListener: (name, callback) => { listeners[name] = callback; },
    body,
    getElementById: id => id === 'docArticle' ? article : null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: tagName => tagName === 'div' ? toast : ({
      tagName,
      classList: { add() {} },
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { this[name] = callback; },
    }),
  };

  let copiedUrl;
  const window = {
    location: { origin: 'https://docs.example', pathname: '/api', hash: '' },
    addEventListener() {},
    requestAnimationFrame() {},
    setTimeout(callback, delay) { timeouts.push({ callback, delay }); },
    scrollY: 0,
    innerHeight: 800,
  };
  vm.runInNewContext(source, {
    document,
    window,
    navigator: { clipboard: { writeText: async url => { copiedUrl = url; } } },
    console,
    alert() {},
    prompt() {},
  });
  listeners.DOMContentLoaded();

  assert.equal(anchors.length, 2, 'expected one copy-link anchor for each h2 and h3');
  assert.equal(anchors[0].href, '#section-1');
  assert.equal(anchors[0]['aria-label'], 'Copy link to Section 1');

  let prevented = false;
  await anchors[0].click({ preventDefault() { prevented = true; } });

  assert.equal(prevented, true, 'heading link click should be handled for copying');
  assert.equal(copiedUrl, 'https://docs.example/api#section-1');
  assert.equal(toast.textContent, 'Section link copied');
  assert.equal(toast.classList.visible, true, 'toast should be shown after copying');
  assert.equal(timeouts[0].delay, 1800, 'toast should be dismissed after its display interval');
  timeouts[0].callback();
  assert.equal(toast.classList.visible, false, 'toast should be hidden after its display interval');
});

test('opens the section and shows fallback toast feedback when clipboard copying fails', async () => {
  const source = await readFile(new URL('./script.js', import.meta.url), 'utf8');
  const listeners = {};
  let anchor;
  const toast = {
    textContent: '',
    setAttribute() {},
    classList: { add() { this.visible = true; }, remove() { this.visible = false; } },
  };
  const heading = {
    id: 'fallback-section',
    textContent: 'Fallback Section',
    appendChild(child) { anchor = child; },
  };
  const article = { innerText: '', querySelectorAll: () => [heading] };
  const document = {
    addEventListener: (name, callback) => { listeners[name] = callback; },
    body: { appendChild() {} },
    getElementById: id => id === 'docArticle' ? article : null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: tagName => tagName === 'div' ? toast : ({
      setAttribute() {},
      addEventListener(name, callback) { this[name] = callback; },
    }),
  };
  const window = {
    location: { origin: 'https://docs.example', pathname: '/api', hash: '' },
    addEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, scrollY: 0, innerHeight: 800,
  };
  vm.runInNewContext(source, {
    document,
    window,
    navigator: { clipboard: { writeText: async () => { throw new Error('clipboard unavailable'); } } },
    console,
  });
  listeners.DOMContentLoaded();

  await anchor.click({ preventDefault() {} });

  assert.equal(window.location.hash, 'fallback-section');
  assert.equal(toast.textContent, 'Section link opened');
  assert.equal(toast.classList.visible, true, 'fallback toast should be shown');
});

test('injects copy code button into pre blocks, copies snippet, and shows checkmark and toast feedback', async () => {
  const source = await readFile(new URL('./script.js', import.meta.url), 'utf8');
  const listeners = {};
  const timeouts = [];
  let copiedText = '';

  const toast = {
    textContent: '',
    setAttribute() {},
    classList: { add(name) { this.visible = name === 'visible'; }, remove() { this.visible = false; } },
  };

  const codeEl = { textContent: 'Authorization: Bearer prisma_live_12345' };
  let copyBtn = null;
  const preEl = {
    classList: { add() {} },
    querySelector: selector => selector === 'code' ? codeEl : selector === '.copy-code-btn' ? copyBtn : null,
    appendChild(child) { copyBtn = child; },
    textContent: 'Authorization: Bearer prisma_live_12345',
  };

  const document = {
    addEventListener: (name, callback) => { listeners[name] = callback; },
    body: { appendChild() {} },
    getElementById: () => null,
    querySelector: selector => selector === '.copy-link-toast' ? toast : null,
    querySelectorAll: selector => selector === 'pre' ? [preEl] : [],
    createElement: tagName => {
      const elem = {
        tagName,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        setAttribute(k, v) { this[k] = v; },
        appendChild(c) { this.children = this.children || []; this.children.push(c); },
        addEventListener(ev, cb) { this[ev] = cb; },
        textContent: '',
      };
      return elem;
    },
  };

  const window = {
    location: { origin: 'https://docs.example', pathname: '/api', hash: '' },
    addEventListener() {},
    requestAnimationFrame() {},
    setTimeout(cb, d) { timeouts.push({ cb, d }); },
    clearTimeout() {},
  };

  vm.runInNewContext(source, {
    document,
    window,
    navigator: { clipboard: { writeText: async txt => { copiedText = txt; } } },
    console,
  });

  listeners.DOMContentLoaded();

  assert.ok(copyBtn, 'copy button should be injected into the pre element');
  assert.equal(copyBtn.className, 'copy-code-btn');
  assert.equal(copyBtn['aria-label'], 'Copy code snippet to clipboard');

  // Trigger click
  let prevented = false;
  let stopped = false;
  await copyBtn.click({ preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });

  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(copiedText, 'Authorization: Bearer prisma_live_12345');
  assert.equal(copyBtn.classList.contains('copied'), true);
  assert.equal(toast.textContent, 'Code snippet copied to clipboard');
  assert.equal(toast.classList.visible, true);

  // Advance timer for feedback reset
  timeouts.forEach(t => t.cb());
  assert.equal(copyBtn.classList.contains('copied'), false);
  assert.equal(toast.classList.visible, false);
});

test('DocsSearchEngine correctly builds index and executes full-text search with highlighting and fuzzy matching', async () => {
  const source = await readFile(new URL('./script.js', import.meta.url), 'utf8');
  const listeners = {};
  const mockSections = [
    {
      id: 'agents',
      querySelector(sel) {
        if (sel === 'h1, h2') return { textContent: 'Agent Dispatcher API' };
        return null;
      },
      querySelectorAll(sel) {
        if (sel === 'h1, h2, h3, h4') {
          return [
            { id: 'agents-dispatch', tagName: 'H2', textContent: 'Agent Dispatcher API' },
            { id: 'agents-orchestrator', tagName: 'H3', textContent: 'Multi-Agent Orchestrator Node' }
          ];
        }
        if (sel === 'p, .callout-body') {
          return [
            { textContent: 'Interact with high-throughput vector RAG pipelines and coordinate multi-agent worker nodes.' }
          ];
        }
        if (sel === 'pre code, pre.code-block') {
          return [
            { textContent: 'curl -X POST https://api.prisma.io/v1/agents/dispatch -H "Authorization: Bearer token"' }
          ];
        }
        return [];
      }
    },
    {
      id: 'streaming',
      querySelector(sel) {
        if (sel === 'h1, h2') return { textContent: 'SSE Event Stream' };
        return null;
      },
      querySelectorAll(sel) {
        if (sel === 'h1, h2, h3, h4') {
          return [
            { id: 'streaming-sse', tagName: 'H2', textContent: 'SSE Event Stream' }
          ];
        }
        if (sel === 'p, .callout-body') {
          return [
            { textContent: 'Real-time server-sent events for streaming token responses with zero latency.' }
          ];
        }
        if (sel === 'pre code, pre.code-block') {
          return [];
        }
        return [];
      }
    }
  ];

  const document = {
    addEventListener: (name, cb) => { listeners[name] = cb; },
    readyState: 'complete',
    body: { appendChild() {}, style: {} },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.doc-section') return mockSections;
      return [];
    },
    createElement: () => ({
      setAttribute() {},
      classList: { add() {}, remove() {} },
      addEventListener() {}
    })
  };

  const window = {
    addEventListener() {},
    location: { origin: 'https://docs.example', pathname: '/api', hash: '' },
    history: { pushState() {} }
  };

  const ctx = {
    document,
    window,
    console,
    setTimeout() {},
    clearTimeout() {}
  };

  vm.runInNewContext(source, ctx);

  const DocsSearchEngine = ctx.window.DocsSearchEngine;
  assert.ok(DocsSearchEngine, 'DocsSearchEngine should be attached to window');

  const engine = new DocsSearchEngine();
  const index = engine.buildIndex();

  assert.ok(index.length >= 4, 'index should contain headings, paragraphs, and code blocks');

  // Exact heading search
  const agentResults = engine.search('Agent Dispatcher');
  assert.ok(agentResults.length > 0, 'should return results for Agent Dispatcher');
  assert.equal(agentResults[0].sectionId, 'agents');
  assert.ok(agentResults[0].highlightedTitle.includes('<mark class="search-highlight">Agent</mark>'));

  // Content token search
  const ragResults = engine.search('vector RAG');
  assert.ok(ragResults.length > 0, 'should match paragraph content containing vector RAG');
  assert.ok(ragResults[0].snippet.includes('<mark class="search-highlight">vector</mark>'));

  // Code snippet search
  const codeResults = engine.search('Authorization Bearer');
  assert.ok(codeResults.length > 0, 'should match code blocks');
  assert.equal(codeResults[0].type, 'code');

  // Fuzzy subsequence search
  const fuzzyResults = engine.search('agtdisp');
  assert.ok(fuzzyResults.length > 0, 'fuzzy subsequence agtdisp should match Agent Dispatcher');

  // Empty search should return empty array
  assert.equal(engine.search('').length, 0);
  assert.equal(engine.search('   ').length, 0);

  // Non-matching search should return empty array
  assert.equal(engine.search('completelyunrelatedqueryxyz123').length, 0);
});
