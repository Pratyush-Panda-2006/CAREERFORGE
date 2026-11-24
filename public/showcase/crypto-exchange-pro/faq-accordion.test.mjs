import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProFaqAccordion } from './faq-accordion.js';

describe('CryptoExchangeProFaqAccordion', () => {
  it('loads FAQ items with default closed states', () => {
    const faq = new CryptoExchangeProFaqAccordion();
    assert.equal(faq.items.length, 3);
    assert.equal(faq.items[0].open, false);
  });

  it('toggles item open state correctly', () => {
    const faq = new CryptoExchangeProFaqAccordion();
    faq.toggle(1);
    assert.equal(faq.items[0].open, true);
    faq.toggle(1);
    assert.equal(faq.items[0].open, false);
  });

  it('searches questions and answers by query string', () => {
    const faq = new CryptoExchangeProFaqAccordion();
    const results = faq.search('offline');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 3);
  });
});
