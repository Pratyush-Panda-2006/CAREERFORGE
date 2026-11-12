import { simulateMatch } from './match-model.js';
const root = document.getElementById('tactical-simulator');
if (root) {
  const form = root.querySelector('form'); const log = root.querySelector('ol'); const table = root.querySelector('tbody');
  const status = root.querySelector('[role="status"]'); const pause = root.querySelector('#tactical-pause');
  const speed = root.querySelector('#tactical-speed'); const score = root.querySelector('#tactical-score');
  const chart = root.querySelector('svg'); let match = null; let cursor = 0; let timer = null; let playing = false; const shown = [];
  const node = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
  function stop() { clearTimeout(timer); timer = null; playing = false; pause.textContent = 'Resume'; }
  function economyChart() {
    chart.replaceChildren();
    for (let team = 0; team < 2; team++) {
      const points = [800, ...shown.map(round => round.credits[team])];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('points', points.map((cash, index) => `${10 + index / Math.max(1, shown.length) * 580},${150 - cash / 16000 * 140}`).join(' '));
      line.setAttribute('fill', 'none'); line.setAttribute('stroke', team ? '#f0abfc' : '#67e8f9'); line.setAttribute('stroke-width', '3'); chart.append(line);
    }
  }
  function consume() {
    const event = match.events[cursor++]; if (!event) return;
    const item = node('li', `R${event.round} ${event.at.toFixed(1)}s · ${event.text}`); item.dataset.kind = event.type; log.append(item);
    while (log.children.length > 100) log.firstElementChild.remove();
    if (event.type === 'round_end') {
      const round = event.summary; shown.push(round); score.textContent = `Aurora ${round.scores[0]} — ${round.scores[1]} Umbra`;
      const tr = node('tr'); [round.round, match.teams[round.winner].name, `${round.scores[0]}–${round.scores[1]}`,
        round.plans[0].name, round.plans[1].name, round.credits[0], round.credits[1]].forEach(value => tr.append(node('td', value))); table.append(tr);
      const badge = node('span', `R${round.round} ${match.teams[round.winner].name}`); badge.className = `tactical-team-${round.winner}`;
      root.querySelector('#tactical-history').append(badge); economyChart(); status.textContent = event.text;
    }
    if (cursor >= match.events.length) {
      stop(); pause.disabled = true; status.textContent = `Simulation complete. ${match.teams[match.winner].name} wins. Seed ${match.seed} reproduces this match.`;
    }
  }
  function tick() {
    if (!playing || !match) return;
    if (speed.value === 'instant') { while (cursor < match.events.length) consume(); return; }
    consume(); if (playing) timer = setTimeout(tick, 400 / Number(speed.value));
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); stop(); match = null; cursor = 0; shown.length = 0;
    log.replaceChildren(); table.replaceChildren(); root.querySelector('#tactical-history').replaceChildren(); chart.replaceChildren(); score.textContent = 'Aurora 0 — 0 Umbra'; pause.disabled = true;
    try {
      match = simulateMatch({ seed: Number(form.elements.namedItem('seed').value), ratingA: Number(form.elements.namedItem('ratingA').value), ratingB: Number(form.elements.namedItem('ratingB').value), firstTo: Number(form.elements.namedItem('firstTo').value) });
      playing = true; pause.disabled = false; pause.textContent = 'Pause'; status.textContent = `Playing fictional match with seed ${match.seed}.`; tick();
    } catch (error) { status.textContent = error.message; }
  });
  pause.addEventListener('click', () => { if (playing) stop(); else if (match && cursor < match.events.length) { playing = true; pause.textContent = 'Pause'; tick(); } });
  speed.addEventListener('change', () => { if (playing) { clearTimeout(timer); tick(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) { stop(); status.textContent = 'Simulation paused while the tab is hidden. Resume when ready.'; } });
  window.addEventListener('pagehide', stop);
}
