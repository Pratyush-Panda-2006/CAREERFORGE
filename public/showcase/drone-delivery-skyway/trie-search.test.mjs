import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DroneDeliverySkywayTrieEngine } from './trie-search.js'

test('initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) assert.throws(() => new DroneDeliverySkywayTrieEngine(value), TypeError)
})

test('prefix traversal preserves complete words, descendants and a deterministic order', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['Asset allocation', 'Asset', 'APR', 'Balance'])
  assert.deepEqual(engine.findWordsWithPrefix(' asS '), ['Asset', 'Asset allocation'])
  assert.deepEqual(engine.findWordsWithPrefix(''), ['APR', 'Asset', 'Asset allocation', 'Balance'])
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), [])
})
test('duplicates are case-insensitive and do not consume capacity', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['Ledger'])
  assert.equal(engine.insert(' LEDGER '), false)
  assert.equal(engine.size, 1)
  assert.deepEqual(engine.findWordsWithPrefix('led'), ['Ledger'])
})
test('fuzzy matching implements insertion, deletion, substitution and exact distance', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['Liquidity', 'Ledger', 'Yield'])
  assert.deepEqual(engine.fuzzySearch('liqidity', 1), [{ word: 'Liquidity', distance: 1 }])
  assert.deepEqual(engine.fuzzySearch('ledgerr', 1), [{ word: 'Ledger', distance: 1 }])
  assert.deepEqual(engine.fuzzySearch('yeld', 1), [{ word: 'Yield', distance: 1 }])
  assert.deepEqual(engine.fuzzySearch('yiald', 1), [{ word: 'Yield', distance: 1 }])
  assert.deepEqual(engine.fuzzySearch('LEDGER', 0), [{ word: 'Ledger', distance: 0 }])
  assert.deepEqual(engine.fuzzySearch('zzzzz', 1), [])
})
test('classic distance boundary: kitten to sitting costs three edits', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['sitting'])
  assert.deepEqual(engine.fuzzySearch('kitten', 2), [])
  assert.deepEqual(engine.fuzzySearch('kitten', 3), [{ word: 'sitting', distance: 3 }])
})
test('empty fuzzy queries follow true edit distance instead of matching everything', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['APR', 'APY', 'Bond'])
  assert.deepEqual(engine.fuzzySearch('', 0), [])
  assert.deepEqual(engine.fuzzySearch('', 3), [{ word: 'APR', distance: 3 }, { word: 'APY', distance: 3 }])
})
test('distance ties are stable and results are ordered by closest distance first', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['cot', 'cut', 'cat', 'coat'])
  assert.deepEqual(engine.fuzzySearch('cat', 1), [{ word: 'cat', distance: 0 }, { word: 'coat', distance: 1 }, { word: 'cot', distance: 1 }, { word: 'cut', distance: 1 }])
})
test('Unicode normalization and code-point edits preserve accented and astral characters', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['Cafe\u0301', '💳card'])
  assert.equal(engine.insert('CAFÉ'), false)
  assert.deepEqual(engine.fuzzySearch('cafe', 1), [{ word: 'Café', distance: 1 }])
  assert.deepEqual(engine.fuzzySearch('card', 1), [{ word: '💳card', distance: 1 }])
})
test('malformed, empty and oversized terms and invalid distances fail explicitly', () => {
  const engine = new DroneDeliverySkywayTrieEngine()
  for (const word of ['', ' ', 'x'.repeat(65), 'bad\nterm', null, {}, 7]) assert.throws(() => engine.insert(word))
  for (const distance of [-1, 4, 0.5, NaN, Infinity, '1']) assert.throws(() => engine.fuzzySearch('a', distance), RangeError)
  assert.throws(() => engine.findWordsWithPrefix(null), TypeError)
  assert.equal(engine.size, 0)
})
test('term cap is enforced without losing prior records or rejecting existing duplicates', () => {
  const engine = new DroneDeliverySkywayTrieEngine(Array.from({ length: 1000 }, (_, i) => `term-${i}`))
  assert.equal(engine.size, 1000)
  assert.equal(engine.insert('TERM-0'), false)
  assert.throws(() => engine.insert('overflow'), RangeError)
  assert.equal(engine.findWordsWithPrefix('term-').length, 1000)
})
test('tree view identifies terminal nodes and the exact selected prefix', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['Asset', 'Asset allocation'])
  const tree = engine.getTree('asset')
  assert.equal(tree.label, 'asset')
  assert.equal(tree.word, 'Asset')
  assert.equal(tree.children[0].label, ' ')
  assert.equal(engine.getTree('absent'), null)
})
test('tree projection stays bounded for a large lexicon', () => {
  const engine = new DroneDeliverySkywayTrieEngine(Array.from({ length: 300 }, (_, i) => `finance-${i}`))
  const count = (tree) => 1 + tree.children.reduce((sum, child) => sum + count(child), 0)
  assert.ok(count(engine.getTree()) <= 120)
})
test('pruned trie matching agrees with known exhaustive short-string distances', () => {
  const engine = new DroneDeliverySkywayTrieEngine(['a', 'ab', 'abc', 'b', 'ba', 'bb'])
  assert.deepEqual(engine.fuzzySearch('ab', 1).map(result => [result.word, result.distance]), [['ab', 0], ['a', 1], ['abc', 1], ['b', 1], ['bb', 1]])
})

test('drone-delivery-skyway domain vocabulary and prefix typeahead navigation (#3798)', () => {
  const flightTerms = [
    'Skyway Alpha',
    'Skyway Beta',
    'Skyway Charlie',
    'Waypoint Hub 1',
    'Waypoint Hub 2',
    'Landing Zone North',
    'Landing Zone South',
    'Altitude',
    'Telemetry',
    'Battery Failsafe'
  ]
  const engine = new DroneDeliverySkywayTrieEngine(flightTerms)

  // Prefix matching
  const skywayMatches = engine.findWordsWithPrefix('skyway')
  assert.equal(skywayMatches.length, 3)
  assert.deepEqual(skywayMatches, ['Skyway Alpha', 'Skyway Beta', 'Skyway Charlie'])

  const waypointMatches = engine.findWordsWithPrefix('waypoint')
  assert.equal(waypointMatches.length, 2)

  // Fuzzy search on typos (edit distance <= 2)
  const fuzzyAltitude = engine.fuzzySearch('Altidude', 2)
  assert.ok(fuzzyAltitude.length >= 1)
  assert.equal(fuzzyAltitude[0].word, 'Altitude')

  const fuzzyTelemetry = engine.fuzzySearch('Telemetri', 2)
  assert.ok(fuzzyTelemetry.length >= 1)
  assert.equal(fuzzyTelemetry[0].word, 'Telemetry')
})

