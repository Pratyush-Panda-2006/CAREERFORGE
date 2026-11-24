import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsFaqAccordion } from './faq-accordion.js';

describe('BiotechGenomicsFaqAccordion', () => {
  it('loads FAQ items with default closed states', () => {
    const faq = new BiotechGenomicsFaqAccordion();
    assert.equal(faq.items.length, 3);
    assert.equal(faq.items[0].open, false);
  });

  it('toggles item open state correctly', () => {
    const faq = new BiotechGenomicsFaqAccordion();
    faq.toggle(1);
    assert.equal(faq.items[0].open, true);
    faq.toggle(1);
    assert.equal(faq.items[0].open, false);
  });

  it('searches questions and answers by query string', () => {
    const faq = new BiotechGenomicsFaqAccordion();
    const results = faq.search('offline');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 3);
  });
});
