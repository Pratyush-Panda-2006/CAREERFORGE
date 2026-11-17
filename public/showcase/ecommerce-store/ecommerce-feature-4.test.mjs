import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/ecommerce-store/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function createEnvironment() {
  const sandbox = {
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    JSON,
    URL: {
      createObjectURL: () => 'blob:mock-url',
      revokeObjectURL: () => {}
    },
    Blob: class MockBlob {
      constructor(chunks, options = {}) {
        this.chunks = chunks;
        this.type = options.type || '';
        this.size = chunks.reduce((acc, c) => acc + (typeof c === 'string' ? c.length : 0), 0);
      }
      async text() {
        return this.chunks.join('');
      }
    },
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => ({
        tag,
        setAttribute: () => {},
        appendChild: () => {},
        click: () => {},
        classList: { add: () => {}, remove: () => {} }
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    },
    window: {
      addEventListener: () => {},
      localStorage: {
        getItem: () => null,
        setItem: () => {}
      }
    }
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(scriptCode, sandbox);
  sandbox.EcommerceStoreExportEngine = sandbox.EcommerceStoreExportEngine || sandbox.window?.EcommerceStoreExportEngine;
  return sandbox;
}

test('EcommerceStoreExportEngine initializes correctly with data', () => {
  const env = createEnvironment();
  assert.ok(env.EcommerceStoreExportEngine, 'EcommerceStoreExportEngine should be defined');
  const items = [
    { id: '1', name: 'Wireless Headphones', price: 99.99, quantity: 2 }
  ];
  const engine = new env.EcommerceStoreExportEngine({ getItems: () => items });
  assert.ok(engine);
});

test('toCSVString correctly handles commas, quotes, and special characters', () => {
  const env = createEnvironment();
  const items = [
    { id: 'prod_1', name: 'Smart "Pro" Watch, 44mm', price: 299.5, quantity: 1 },
    { id: 'prod_2', name: 'Standard Cable', price: 15.0, quantity: 3 }
  ];
  const engine = new env.EcommerceStoreExportEngine({ getItems: () => items });
  const csv = engine.toCSVString();

  assert.ok(csv.includes('id,name,price,quantity,subtotal'));
  // Quotes should be escaped with double quotes: "Smart ""Pro"" Watch, 44mm"
  assert.ok(csv.includes('"Smart ""Pro"" Watch, 44mm"'));
  assert.ok(csv.includes('"prod_1"'));
  assert.ok(csv.includes('299.50'));
});

test('toJSONBlob generates valid JSON and correct MIME type', async () => {
  const env = createEnvironment();
  const items = [
    { id: 'item_101', name: 'Ergonomic Keyboard', price: 120.0, quantity: 1 }
  ];
  const engine = new env.EcommerceStoreExportEngine({
    getItems: () => items,
    getTotals: () => ({ subtotal: 120, total: 120 })
  });

  const blob = engine.toJSONBlob();
  assert.equal(blob.type, 'application/json');
  const text = await blob.text();
  const parsed = JSON.parse(text);
  assert.equal(parsed.cart.length, 1);
  assert.equal(parsed.cart[0].id, 'item_101');
  assert.ok(parsed.timestamp);
});

test('toCSVBlob generates valid Blob with text/csv MIME type', async () => {
  const env = createEnvironment();
  const items = [
    { id: 'item_202', name: 'USB-C Hub', price: 45.0, quantity: 2 }
  ];
  const engine = new env.EcommerceStoreExportEngine({ getItems: () => items });
  const blob = engine.toCSVBlob();
  assert.equal(blob.type, 'text/csv;charset=utf-8;');
  const content = await blob.text();
  assert.ok(content.startsWith('id,name,price,quantity,subtotal'));
  assert.ok(content.includes('90.00'));
});

test('toMarkdownAudit formats clean Markdown table and summary totals', () => {
  const env = createEnvironment();
  const items = [
    { id: 'aud_1', name: 'Mechanical Keycaps', price: 35.0, quantity: 2 },
    { id: 'aud_2', name: 'Desk Mat', price: 25.0, quantity: 1 }
  ];
  const engine = new env.EcommerceStoreExportEngine({ getItems: () => items });
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# E-Commerce Store Export Audit Report'));
  assert.ok(md.includes('| ID | Item Name | Unit Price | Qty | Subtotal |'));
  assert.ok(md.includes('| aud_1 | Mechanical Keycaps | $35.00 | 2 | $70.00 |'));
  assert.ok(md.includes('| aud_2 | Desk Mat | $25.00 | 1 | $25.00 |'));
  assert.ok(md.includes('**Grand Total:** $95.00'));
});
