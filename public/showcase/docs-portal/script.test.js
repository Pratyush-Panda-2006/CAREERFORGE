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
