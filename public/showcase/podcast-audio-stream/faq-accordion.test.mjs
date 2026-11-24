import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamFaqAccordion } from './faq-accordion.js';

describe('PodcastAudioStreamFaqAccordion', () => {
  it('loads FAQ items with default closed states', () => {
    const faq = new PodcastAudioStreamFaqAccordion();
    assert.equal(faq.items.length, 3);
    assert.equal(faq.items[0].open, false);
  });

  it('toggles item open state correctly', () => {
    const faq = new PodcastAudioStreamFaqAccordion();
    faq.toggle(1);
    assert.equal(faq.items[0].open, true);
    faq.toggle(1);
    assert.equal(faq.items[0].open, false);
  });

  it('searches questions and answers by query string', () => {
    const faq = new PodcastAudioStreamFaqAccordion();
    const results = faq.search('offline');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 3);
  });
});
