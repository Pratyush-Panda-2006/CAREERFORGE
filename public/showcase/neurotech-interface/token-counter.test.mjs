import test from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceTokenAnalyzer } from './token-counter.js';

test('NeurotechInterfaceTokenAnalyzer - estimateTokens accurately segments and counts tokens', () => {
  const analyzer = new NeurotechInterfaceTokenAnalyzer();
  const res = analyzer.estimateTokens('Hello world! 123');

  assert.ok(res.count >= 4);
  assert.ok(res.tokens.length === res.count);
  assert.equal(analyzer.estimateTokens('').count, 0);
});

test('NeurotechInterfaceTokenAnalyzer - getWordCount computes total word frequency', () => {
  const analyzer = new NeurotechInterfaceTokenAnalyzer();
  assert.equal(analyzer.getWordCount('The quick brown fox jumps'), 5);
  assert.equal(analyzer.getWordCount('   '), 0);
  assert.throws(() => analyzer.getWordCount(123), TypeError);
});

test('NeurotechInterfaceTokenAnalyzer - calculateByteSize computes utf-8 byte size', () => {
  const analyzer = new NeurotechInterfaceTokenAnalyzer();
  assert.equal(analyzer.calculateByteSize('hello'), 5);
  assert.equal(analyzer.calculateByteSize('🚀'), 4);
  assert.throws(() => analyzer.calculateByteSize(null), TypeError);
});
