import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dFaqAccordion } from './faq-accordion.js';

describe('VirtualMuseum3dFaqAccordion', () => {
  it('loads FAQ items with default closed states', () => {
    const faq = new VirtualMuseum3dFaqAccordion();
    assert.equal(faq.items.length, 3);
    assert.equal(faq.items[0].open, false);
  });

  it('toggles item open state correctly', () => {
    const faq = new VirtualMuseum3dFaqAccordion();
    faq.toggle(1);
    assert.equal(faq.items[0].open, true);
    faq.toggle(1);
    assert.equal(faq.items[0].open, false);
  });

  it('searches questions and answers by query string', () => {
    const faq = new VirtualMuseum3dFaqAccordion();
    const results = faq.search('offline');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 3);
  });
});
