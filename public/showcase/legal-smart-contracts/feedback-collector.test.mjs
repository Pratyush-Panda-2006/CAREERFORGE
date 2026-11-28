import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LegalSmartContractsFeedbackWidget } from './feedback-collector.js';

const memory = (initial) => {
  const data = new Map(initial ? [['lex-escrow-feedback', initial]] : []);
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
};

test('starts with no vote', () => {
  const widget = new LegalSmartContractsFeedbackWidget({ storage: memory() });
  assert.equal(widget.hasUserVoted(), false);
  assert.equal(widget.getAverageRating(), 0);
});

test('rejects scores outside 1 to 5', () => {
  const widget = new LegalSmartContractsFeedbackWidget();
  for (const score of [0, 6, 2.5, '4', Number.NaN]) assert.equal(widget.submitRating(score), false);
  assert.equal(widget.hasUserVoted(), false);
});

test('averages ratings and remembers them', () => {
  const storage = memory();
  const widget = new LegalSmartContractsFeedbackWidget({ storage });
  widget.submitRating(5, '  clear flow  ');
  widget.submitRating(4);
  widget.submitRating(4);

  const reloaded = new LegalSmartContractsFeedbackWidget({ storage });
  assert.equal(reloaded.getAverageRating(), 4.3);
  assert.equal(reloaded.entries[0].comment, 'clear flow');
});

test('ignores damaged saved data', () => {
  assert.equal(new LegalSmartContractsFeedbackWidget({ storage: memory('{oops') }).hasUserVoted(), false);
  const mixed = new LegalSmartContractsFeedbackWidget({ storage: memory('[null,{"score":9},{"score":3}]') });
  assert.equal(mixed.getAverageRating(), 3);
});

test('keeps working when storage refuses writes, and caps the history', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const widget = new LegalSmartContractsFeedbackWidget({ storage, limit: 2 });
  for (const score of [1, 3, 5]) assert.equal(widget.submitRating(score), true);
  assert.equal(widget.getAverageRating(), 4);
});
