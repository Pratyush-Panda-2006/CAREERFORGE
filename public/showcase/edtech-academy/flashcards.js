/* Spaced-repetition coding flashcards (Leitner boxes). Issue #100.
   Logic is pure and exposed as FlashcardSRS so it can be tested with node. */
var FlashcardSRS = (function () {
  var MIN = 60 * 1000;
  var DAY = 24 * 60 * MIN;
  // Wait before a card in box N (1-based) is due again.
  var INTERVALS = [10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY];
  var MAX_BOX = INTERVALS.length;
  var RATINGS = { again: 'again', good: 'good', easy: 'easy' };

  var CARDS = [
    { id: 'py-mutable-default', topic: 'Python', q: 'Why is def f(x, items=[]) a bug?', a: 'The default list is created once, when the function is defined, and shared by every call that omits it. Use items=None and create a new list inside the function.' },
    { id: 'js-closure', topic: 'JavaScript', q: 'What does a closure capture?', a: 'The variables of the scope where the function was created, not copies of their values. The function keeps seeing later changes to those variables.' },
    { id: 'big-o-binary-search', topic: 'Algorithms', q: 'What is the time complexity of binary search on a sorted array?', a: 'O(log n). Each comparison halves the remaining range.' },
    { id: 'rust-ownership', topic: 'Rust', q: 'What happens to a String after it is moved into another variable?', a: 'The original binding can no longer be used. Ownership transferred, so only the new owner drops the value when it goes out of scope.' },
    { id: 'http-idempotent', topic: 'Distributed systems', q: 'What does it mean for an HTTP method to be idempotent?', a: 'Sending the same request several times leaves the server in the same state as sending it once. GET, PUT and DELETE are idempotent; POST is not.' },
    { id: 'cap-theorem', topic: 'Distributed systems', q: 'State the CAP theorem in one sentence.', a: 'During a network partition a distributed store must choose between consistency and availability; it cannot guarantee both.' },
    { id: 'ebpf-verifier', topic: 'eBPF', q: 'What does the eBPF verifier do?', a: 'It statically checks a program before it is loaded into the kernel, for example that it terminates and makes only safe memory accesses.' },
    { id: 'kv-cache', topic: 'LLM serving', q: 'Why do LLM servers keep a KV cache?', a: 'Keys and values of earlier tokens do not change while decoding, so caching them avoids recomputing them for the whole prefix at every step.' }
  ];

  function nextBox(box, rating) {
    if (rating === RATINGS.again) return 1;
    if (rating === RATINGS.good) return Math.min(box + 1, MAX_BOX);
    if (rating === RATINGS.easy) return Math.min(box + 2, MAX_BOX);
    throw new Error('Unknown rating: ' + rating);
  }

  function newState() { return { cards: {} }; }

  function entry(state, id) {
    return state.cards[id] || { box: 0, due: 0, reviews: 0 };
  }

  // Returns a new state; the input is not modified.
  function review(state, id, rating, now) {
    var cur = entry(state, id);
    var box = nextBox(cur.box || 1, rating);
    var cards = {};
    Object.keys(state.cards).forEach(function (k) { cards[k] = state.cards[k]; });
    cards[id] = { box: box, due: now + INTERVALS[box - 1], reviews: cur.reviews + 1 };
    return { cards: cards };
  }

  function isNew(state, id) { return !state.cards[id]; }

  // Due cards: never reviewed, or due time reached. Lowest box first, then oldest due.
  function dueIds(state, now) {
    return CARDS.map(function (c) { return c.id; }).filter(function (id) {
      return isNew(state, id) || state.cards[id].due <= now;
    }).sort(function (a, b) {
      var ea = entry(state, a), eb = entry(state, b);
      return (ea.box - eb.box) || (ea.due - eb.due);
    });
  }

  function stats(state, now) {
    var s = { total: CARDS.length, due: 0, fresh: 0, learning: 0, mastered: 0 };
    CARDS.forEach(function (c) {
      var e = state.cards[c.id];
      if (!e) { s.fresh++; s.due++; return; }
      if (e.due <= now) s.due++;
      if (e.box >= MAX_BOX - 1) s.mastered++; else s.learning++;
    });
    return s;
  }

  function sanitize(raw) {
    var out = newState();
    if (!raw || typeof raw !== 'object' || !raw.cards || typeof raw.cards !== 'object') return out;
    CARDS.forEach(function (c) {
      var e = raw.cards[c.id];
      if (e && Number.isInteger(e.box) && e.box >= 1 && e.box <= MAX_BOX && typeof e.due === 'number' && isFinite(e.due) && Number.isInteger(e.reviews) && e.reviews >= 0) {
        out.cards[c.id] = { box: e.box, due: e.due, reviews: e.reviews };
      }
    });
    return out;
  }

  function formatWait(ms) {
    if (ms < DAY) return Math.round(ms / MIN) + ' min';
    var d = Math.round(ms / DAY);
    return d + (d === 1 ? ' day' : ' days');
  }

  return { CARDS: CARDS, INTERVALS: INTERVALS, MAX_BOX: MAX_BOX, nextBox: nextBox, newState: newState, review: review, dueIds: dueIds, stats: stats, sanitize: sanitize, formatWait: formatWait };
})();

(function initFlashcards() {
  if (typeof document === 'undefined') return;
  var KEY = 'synapse-flashcards-v1';
  var S = FlashcardSRS;
  var state = S.newState();
  try { state = S.sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { state = S.newState(); }
  var queue = [];
  var flipped = false;

  function $(id) { return document.getElementById(id); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: progress lasts for this visit only */ } }
  function byId(id) { return S.CARDS.filter(function (c) { return c.id === id; })[0]; }

  function renderStats() {
    var s = S.stats(state, Date.now());
    $('fcStats').textContent = s.due + ' due now · ' + s.fresh + ' new · ' + s.learning + ' learning · ' + s.mastered + ' mastered';
  }

  function setFlipped(v) {
    flipped = v;
    $('fcCard').classList.toggle('is-flipped', v);
    $('fcFlip').setAttribute('aria-pressed', String(v));
    $('fcFlip').textContent = v ? 'Hide answer' : 'Show answer';
    $('fcFront').setAttribute('aria-hidden', String(v));
    $('fcBack').setAttribute('aria-hidden', String(!v));
    $('fcRate').hidden = !v;
  }

  function render() {
    renderStats();
    var done = queue.length === 0;
    $('fcStudy').hidden = done;
    $('fcDone').hidden = !done;
    if (done) {
      var times = S.CARDS.map(function (c) { return state.cards[c.id] && state.cards[c.id].due; }).filter(Boolean);
      var soon = times.length ? Math.min.apply(null, times) - Date.now() : 0;
      $('fcDoneText').textContent = soon > 0 ? 'No cards are due. The next one is due in ' + S.formatWait(soon) + '.' : 'No cards are due.';
      return;
    }
    var card = byId(queue[0]);
    var e = state.cards[card.id];
    $('fcTopic').textContent = card.topic;
    $('fcBox').textContent = e ? 'Box ' + e.box + ' of ' + S.MAX_BOX : 'New card';
    $('fcQ').textContent = card.q;
    $('fcA').textContent = card.a;
    $('fcCounter').textContent = queue.length + (queue.length === 1 ? ' card' : ' cards') + ' left in this session';
    setFlipped(false);
  }

  function rate(rating) {
    if (!flipped || !queue.length) return;
    var id = queue.shift();
    state = S.review(state, id, rating, Date.now());
    save();
    $('fcLive').textContent = 'Marked ' + rating + '. Next review in ' + S.formatWait(S.INTERVALS[state.cards[id].box - 1]) + '.';
    render();
    if (queue.length) $('fcFlip').focus(); else $('fcRestart').focus();
  }

  function start() {
    queue = S.dueIds(state, Date.now());
    render();
  }

  $('fcFlip').addEventListener('click', function () { setFlipped(!flipped); });
  ['again', 'good', 'easy'].forEach(function (r) {
    $('fcRate-' + r).addEventListener('click', function () { rate(r); });
  });
  $('fcRestart').addEventListener('click', start);
  $('fcReset').addEventListener('click', function () {
    state = S.newState();
    save();
    $('fcLive').textContent = 'Progress reset.';
    start();
  });
  $('flashcards').addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    var map = { '1': 'again', '2': 'good', '3': 'easy' };
    if (flipped && map[event.key]) { event.preventDefault(); rate(map[event.key]); }
  });
  start();
})();
