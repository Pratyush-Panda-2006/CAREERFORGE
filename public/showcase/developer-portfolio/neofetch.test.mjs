import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/developer-portfolio/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    window: {},
    console,
    Math,
    Date,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return context;
}

test('formatAsciiBar generates valid ASCII progress bars across percentage spectrum', () => {
  const ctx = loadContext();
  const formatAsciiBar = ctx.formatAsciiBar;
  assert.equal(typeof formatAsciiBar, 'function');

  // 0%
  assert.equal(formatAsciiBar(0, 10), '[----------]');

  // 100%
  assert.equal(formatAsciiBar(100, 10), '[==========]');

  // 50%
  const bar50 = formatAsciiBar(50, 10);
  assert.equal(bar50.length, 12); // '[' + 10 chars + ']'
  assert.ok(bar50.includes('>'), 'Active bar should have head marker');
  assert.ok(bar50.startsWith('[====>'));

  // Negative and over 100 clamping
  assert.equal(formatAsciiBar(-10, 10), '[----------]');
  assert.equal(formatAsciiBar(150, 10), '[==========]');
});

test('HELP_LINES includes neofetch command documentation', () => {
  const ctx = loadContext();
  const helpLines = ctx.HELP_LINES;
  assert.ok(Array.isArray(helpLines), 'HELP_LINES should be an array');
  const neofetchEntry = helpLines.find(([cmd]) => cmd.includes('neofetch'));
  assert.ok(neofetchEntry, 'neofetch should be listed in HELP_LINES');
});
