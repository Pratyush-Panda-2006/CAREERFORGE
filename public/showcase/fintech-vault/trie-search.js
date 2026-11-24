const LIMITS = { words: 1000, characters: 64, treeNodes: 120 }
const normalized = (value) => {
  if (typeof value !== 'string') throw new TypeError('Enter text, not another data type.')
  const text = value.trim().normalize('NFC')
  const characters = Array.from(text)
  if (characters.length > LIMITS.characters || characters.some(character => {
    const code = character.codePointAt(0)
    return code < 32 || code === 127
  })) {
    throw new RangeError('Use at most 64 characters without control characters.')
  }
  return text.toLowerCase()
}
const children = (node) => [...node.children].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
const node = () => ({ children: new Map(), word: null })

export class FintechVaultTrieEngine {
  constructor(words = []) {
    if (!Array.isArray(words)) throw new TypeError('Initial terms must be an array.')
    this.root = node()
    this.keys = new Set()
    for (const word of words) this.insert(word)
  }
  get size() { return this.keys.size }
  insert(word) {
    const key = normalized(word)
    if (!key) throw new RangeError('A term cannot be empty.')
    if (this.keys.has(key)) return false
    if (this.size >= LIMITS.words) throw new RangeError('The local lexicon holds up to 1,000 terms.')
    let current = this.root
    for (const character of key) {
      if (!current.children.has(character)) current.children.set(character, node())
      current = current.children.get(character)
    }
    current.word = word.trim().normalize('NFC')
    this.keys.add(key)
    return true
  }
  locate(prefix) {
    let current = this.root
    for (const character of normalized(prefix)) {
      current = current.children.get(character)
      if (!current) return null
    }
    return current
  }
  findWordsWithPrefix(prefix) {
    const start = this.locate(prefix)
    const words = []
    const visit = (current) => {
      if (current.word !== null) words.push(current.word)
      for (const [, child] of children(current)) visit(child)
    }
    if (start) visit(start)
    return words
  }
  /** Returns {word, distance} matches using code-point Levenshtein distance. */
  fuzzySearch(query, maxDistance = 2) {
    const letters = Array.from(normalized(query))
    if (!Number.isInteger(maxDistance) || maxDistance < 0 || maxDistance > 3) {
      throw new RangeError('Edit distance must be an integer from 0 to 3.')
    }
    const results = []
    const visit = (current, character, previous) => {
      const row = [previous[0] + 1]
      for (let i = 1; i <= letters.length; i++) {
        row[i] = Math.min(row[i - 1] + 1, previous[i] + 1,
          previous[i - 1] + (letters[i - 1] === character ? 0 : 1))
      }
      if (current.word !== null && row[letters.length] <= maxDistance) {
        results.push({ word: current.word, distance: row[letters.length] })
      }
      if (Math.min(...row) <= maxDistance) {
        for (const [letter, child] of children(current)) visit(child, letter, row)
      }
    }
    const first = Array.from({ length: letters.length + 1 }, (_, i) => i)
    for (const [letter, child] of children(this.root)) visit(child, letter, first)
    return results.sort((a, b) => a.distance - b.distance || normalized(a.word).localeCompare(normalized(b.word), 'en'))
  }
  getTree(prefix = '') {
    const start = this.locate(prefix)
    let remaining = LIMITS.treeNodes
    const visit = (current, label) => {
      if (remaining-- <= 0) return null
      return { label, word: current.word,
        children: children(current).map(([letter, child]) => visit(child, letter)).filter(Boolean) }
    }
    return start ? visit(start, normalized(prefix) || 'root') : null
  }
}

const VOCABULARY = ['APR', 'APY', 'Asset', 'Asset allocation', 'Balance', 'Bond', 'Collateral',
  'Credit', 'Debit', 'Dividend', 'Equity', 'Escrow', 'Interest', 'Ledger', 'Leverage',
  'Limit order', 'Liquidity', 'Liquidity pool', 'Market order', 'Portfolio', 'Settlement', 'Yield']

export function mountTrieSearch(document) {
  const engine = new FintechVaultTrieEngine(VOCABULARY)
  const search = document.getElementById('term-search')
  if (!search) return
  const list = document.getElementById('suggestions')
  const status = document.getElementById('search-status')
  const tree = document.getElementById('trie-tree')
  const count = document.getElementById('word-count')
  let matches = [], active = -1
  const close = () => { list.hidden = true; search.setAttribute('aria-expanded', 'false'); search.removeAttribute('aria-activedescendant'); active = -1 }
  const drawTree = (prefix) => {
    tree.replaceChildren()
    const projection = engine.getTree(prefix)
    if (!projection) { tree.textContent = 'No exact prefix subtree. Select a suggestion to inspect it.'; return }
    const draw = (item) => {
      const li = document.createElement('li')
      const content = document.createElement(item.children.length ? 'details' : 'span')
      const label = document.createElement(item.children.length ? 'summary' : 'span')
      label.textContent = `${item.label === ' ' ? '␠' : item.label}${item.word ? ` → ${item.word}` : ''}`
      content.append(label)
      if (item.children.length) {
        content.open = true
        const ul = document.createElement('ul')
        item.children.forEach(child => ul.append(draw(child)))
        content.append(ul)
      }
      li.append(content)
      return li
    }
    tree.append(draw(projection))
  }
  const choose = (word) => {
    search.value = word
    close()
    drawTree(word)
    status.textContent = `Selected ${word}. This lexicon is a local demonstration, not financial advice.`
    search.focus()
  }
  const refresh = () => {
    try {
      const prefix = engine.findWordsWithPrefix(search.value)
      const results = prefix.length ? prefix.map(word => ({ word, distance: 0 })) : engine.fuzzySearch(search.value, Number(document.getElementById('edit-distance').value))
      matches = results.slice(0, 8)
      active = -1
      list.replaceChildren()
      for (const [index, match] of matches.entries()) {
        const li = document.createElement('li')
        li.id = `suggestion-${index}`
        li.setAttribute('role', 'option')
        li.setAttribute('aria-selected', 'false')
        const length = prefix.length ? Array.from(normalized(search.value)).length : 0
        const letters = Array.from(match.word)
        const mark = document.createElement('mark')
        mark.textContent = letters.slice(0, length).join('')
        const term = document.createElement('span')
        term.append(mark, document.createTextNode(letters.slice(length).join('')))
        li.append(term)
        const detail = document.createElement('small')
        detail.textContent = prefix.length ? 'prefix match' : `${match.distance} edit${match.distance === 1 ? '' : 's'}`
        li.append(detail)
        li.addEventListener('mousedown', event => event.preventDefault())
        li.addEventListener('click', () => choose(match.word))
        list.append(li)
      }
      list.hidden = matches.length === 0
      search.setAttribute('aria-expanded', String(matches.length > 0))
      search.removeAttribute('aria-activedescendant')
      status.textContent = `${results.length} ${prefix.length ? 'prefix completions' : 'spelling suggestions'}; showing ${matches.length}.`
      count.textContent = String(engine.size)
      drawTree(search.value)
    } catch (error) {
      close()
      tree.replaceChildren(document.createTextNode('Enter a valid prefix to inspect its tree.'))
      status.textContent = error.message
    }
  }
  search.addEventListener('input', refresh)
  search.addEventListener('focus', refresh)
  search.addEventListener('blur', () => setTimeout(close, 0))
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); return }
    if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(matches[active].word); return }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    if (list.hidden) refresh()
    if (!matches.length) return
    active = active < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1)
      : (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length
    Array.from(list.children).forEach((option, index) => option.setAttribute('aria-selected', String(index === active)))
    search.setAttribute('aria-activedescendant', list.children[active].id)
    list.children[active].scrollIntoView({ block: 'nearest' })
  })
  document.getElementById('edit-distance').addEventListener('change', refresh)
  document.getElementById('add-term').addEventListener('submit', event => {
    event.preventDefault()
    const input = document.getElementById('new-term')
    try {
      const added = engine.insert(input.value)
      refresh()
      status.textContent = added ? `Added ${input.value.trim()}. Terms stay in this tab and reset on reload.` : 'That term is already in the lexicon.'
      if (added) input.value = ''
    } catch (error) { status.textContent = error.message }
  })
  refresh()
  close()
}
if (typeof document !== 'undefined') mountTrieSearch(document)
