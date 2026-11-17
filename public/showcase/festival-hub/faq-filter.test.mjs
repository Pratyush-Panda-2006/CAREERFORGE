import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(readFileSync(new URL('./faq-filter.js', import.meta.url), 'utf8'), context);
const { matches } = context.FestivalFaqFilter;

const ticket = { category: 'ticketing', text: 'Can I change my Ticket? Contact the festival support team.' };
const camping = { category: 'camping', text: 'Where can I reserve a locker?' };

test('category filters questions independently of text search', () => {
  assert.equal(matches(ticket, 'ticketing', ''), true);
  assert.equal(matches(camping, 'ticketing', ''), false);
  assert.equal(matches(camping, 'all', ''), true);
});

test('keyword search matches question and answer text without case sensitivity', () => {
  assert.equal(matches(ticket, 'all', ' SUPPORT '), true);
  assert.equal(matches(ticket, 'ticketing', 'ticket'), true);
  assert.equal(matches(ticket, 'ticketing', 'locker'), false);
  assert.equal(matches(camping, 'ticketing', 'locker'), false);
});
