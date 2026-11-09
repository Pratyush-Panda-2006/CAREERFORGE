import { TypingRound, readScores, saveScore } from './typing-model.js';

const panel = document.getElementById('terminal-game');
if (panel) {
  const input = panel.querySelector('input');
  const form = panel.querySelector('form');
  const status = panel.querySelector('[role="status"]');
  const target = panel.querySelector('#game-target');
  const commandForm = document.getElementById('vterm-form');
  const shortcuts = document.getElementById('vterm-shortcuts');
  const replay = panel.querySelector('#game-replay');
  const quit = panel.querySelector('#game-quit');
  let round = null, timer = null, ended = false;
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  function scores(items = readScores(storage)) {
    const list = panel.querySelector('ol'); list.textContent = '';
    items.forEach(item => {
      const line = document.createElement('li');
      line.textContent = `${item.score} points · ${item.words} words · ${item.accuracy}% accuracy`;
      list.append(line);
    });
    if (!items.length) list.textContent = 'No completed rounds saved in this browser.';
  }
  function render() {
    const result = round.result();
    panel.querySelector('#game-clock').textContent = `${(Math.max(0, round.deadline - round.lastTime) / 1000).toFixed(1)}s`;
    panel.querySelector('#game-score').textContent = String(result.score);
    panel.querySelector('#game-accuracy').textContent = `${result.accuracy}%`;
    target.textContent = round.target;
    panel.querySelector('#game-word-count').textContent = `${result.words} words completed`;
  }
  function finish() {
    if (ended) return;
    ended = true; clearInterval(timer); timer = null;
    const result = round.result();
    const saved = saveScore(storage, result);
    status.textContent = result.state === 'cancelled' ? 'Round cancelled. No score was saved.'
      : `Game over: ${result.score} points, ${result.words} words, ${result.accuracy}% accuracy. ${saved.saved ? 'Local scores updated.' : 'Browser storage unavailable; scores remain visible for this round.'}`;
    scores(saved.scores); render();
    input.disabled = true; form.querySelector('button').disabled = true; quit.disabled = true; replay.hidden = false;
    commandForm.hidden = false; shortcuts.hidden = false;
    document.getElementById('vterm-input').focus({ preventScroll: true });
  }
  function update() {
    if (!round || ended) return;
    round.tick(performance.now()); render();
    if (round.state !== 'playing') finish();
  }
  function start() {
    panel.hidden = false;
    if (round?.state === 'playing') { input.focus(); return; }
    round = new TypingRound(performance.now()); ended = false;
    input.value = ''; input.disabled = false; form.querySelector('button').disabled = false; input.removeAttribute('aria-invalid');
    quit.disabled = false; replay.hidden = true;
    commandForm.hidden = true; shortcuts.hidden = true;
    status.textContent = 'Round started. Type the target exactly and press Enter. Escape cancels. The timer continues if you leave this tab.';
    scores(); render(); input.focus();
    timer = setInterval(update, 100);
  }
  document.addEventListener('portfolio:play', start);
  replay.addEventListener('click', start);
  input.addEventListener('input', event => {
    if (event.isComposing || ended) return;
    round.type(input.value, performance.now()); render();
    input.removeAttribute('aria-invalid');
    if (round.state !== 'playing') finish();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!round || ended) return;
    // Read the final text too, including a just-finished IME composition.
    round.type(input.value, performance.now());
    const accepted = round.submit(performance.now());
    if (accepted) { input.value = ''; input.removeAttribute('aria-invalid'); status.textContent = `Correct. ${round.words} words completed. Next target: ${round.target}.`; }
    else if (round.state === 'playing') { input.setAttribute('aria-invalid', 'true'); status.textContent = 'That word does not match. Correct it and try again; mistakes remain in the accuracy count.'; }
    render(); if (round.state !== 'playing') finish();
  });
  function cancel() { if (round?.state === 'playing') { round.cancel(); finish(); } }
  quit.addEventListener('click', cancel);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape' && round?.state === 'playing') { event.preventDefault(); cancel(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}
