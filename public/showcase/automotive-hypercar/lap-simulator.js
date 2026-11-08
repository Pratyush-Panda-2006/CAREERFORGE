import { CIRCUITS, COMPOUNDS, simulateLap, sampleLap } from './lap-physics.js';

const panel = document.getElementById('lap-simulator');
if (panel) {
  const form = panel.querySelector('form');
  const track = panel.querySelector('#lap-track');
  const compound = panel.querySelector('#lap-compound');
  const condition = panel.querySelector('#lap-condition');
  const age = panel.querySelector('#lap-age');
  const pace = panel.querySelector('#lap-pace');
  const start = panel.querySelector('#lap-start');
  const pause = panel.querySelector('#lap-pause');
  const skip = panel.querySelector('#lap-skip');
  const stop = panel.querySelector('#lap-stop');
  const status = panel.querySelector('#lap-status');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const bests = new Map();
  const fastest = new Map();
  let lap = null, elapsed = 0, lastStamp = null, frameId = null;
  let running = false, paused = false, recorded = false, previous = null, session = null;
  let configKey = '', trackKey = '';
  const timeLabel = value => `${Math.floor(value / 60)}:${(value % 60).toFixed(3).padStart(6, '0')}`;
  const fields = [track, compound, condition, age, pace];

  function announce(text) { status.textContent = text; }
  function controls() {
    fields.forEach(field => { field.disabled = running; });
    start.disabled = running;
    pause.disabled = !running;
    skip.disabled = !running;
    stop.disabled = !running;
    pause.textContent = paused ? 'Resume lap' : 'Pause lap';
  }
  function render() {
    const sample = sampleLap(lap, elapsed);
    panel.querySelector('#lap-clock').textContent = timeLabel(sample.time);
    panel.querySelector('#lap-speed').textContent = `${(sample.speed * 3.6).toFixed(0)} km/h`;
    panel.querySelector('#lap-g').textContent = `${sample.lateralG.toFixed(2)} g`;
    panel.querySelector('#lap-wear').textContent = `${(sample.wear * 100).toFixed(1)}% grip loss`;
    panel.querySelector('#lap-progress').value = sample.progress * 100;
    panel.querySelector('#lap-distance').textContent = `${(sample.distance / 1000).toFixed(2)} / ${(lap.distance / 1000).toFixed(2)} km`;
    const path = panel.querySelector('#lap-path');
    const length = path.getTotalLength();
    const point = path.getPointAtLength(sample.progress * length);
    const marker = panel.querySelector('#lap-marker');
    marker.setAttribute('cx', point.x); marker.setAttribute('cy', point.y);
    let boundary = 0;
    lap.sectors.forEach((value, index) => {
      boundary += value;
      const complete = elapsed >= boundary - 1e-8;
      const row = panel.querySelector(`[data-lap-sector="${index}"]`);
      row.querySelector('output').textContent = complete ? timeLabel(value) : '—';
      const delta = row.querySelector('.lap-delta');
      delta.className = 'lap-delta';
      if (!complete) { delta.textContent = 'Pending'; return; }
      if (session && value <= session[index] + 1e-8) {
        delta.classList.add('lap-fastest'); delta.textContent = 'Session fastest';
      } else if (previous && value < previous[index] - 1e-8) {
        delta.classList.add('lap-personal'); delta.textContent = `${(value - previous[index]).toFixed(3)}s · Track PB`;
      } else delta.textContent = previous ? `${(value - previous[index]).toFixed(3)}s vs track PB` : 'First run';
    });
  }
  function finish() {
    if (!lap || recorded) return;
    elapsed = lap.duration;
    running = false; paused = false; recorded = true;
    cancelAnimationFrame(frameId);
    // Only completed runs affect bests; cancelled laps never enter the records.
    const prior = bests.get(configKey);
    if (!prior || lap.duration < prior.duration) bests.set(configKey, { duration: lap.duration, sectors: [...lap.sectors] });
    const sectorBest = fastest.get(trackKey);
    fastest.set(trackKey, lap.sectors.map((time, index) => Math.min(time, sectorBest?.[index] ?? Infinity)));
    render(); controls();
    panel.querySelector('#lap-best').textContent = timeLabel(bests.get(configKey).duration);
    announce(`Lap complete: ${timeLabel(lap.duration)}. ${CIRCUITS[lap.trackId].name}, ${COMPOUNDS[lap.compoundId].name}, ${lap.condition}. Session-only records; illustrative model.`);
  }
  function frame(now) {
    if (!running || paused) return;
    if (lastStamp !== null) elapsed += (now - lastStamp) / 1000 * Number(pace.value);
    lastStamp = now;
    if (elapsed >= lap.duration) { finish(); return; }
    render(); frameId = requestAnimationFrame(frame);
  }
  function togglePause() {
    if (!running) return;
    paused = !paused; lastStamp = null;
    if (paused) cancelAnimationFrame(frameId);
    else frameId = requestAnimationFrame(frame);
    controls(); announce(paused ? 'Lap paused. Resume when ready.' : 'Lap resumed.');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (running || !form.reportValidity()) return;
    try {
      lap = simulateLap(track.value, compound.value, condition.value, Number(age.value));
      configKey = `${track.value}:${condition.value}`;
      trackKey = `${track.value}:${condition.value}`;
      previous = bests.get(configKey)?.sectors ?? null;
      session = fastest.get(trackKey) ?? null;
      panel.querySelector('#lap-best').textContent = bests.has(configKey) ? timeLabel(bests.get(configKey).duration) : 'No completed lap';
      elapsed = 0; lastStamp = null; recorded = false; paused = false; running = true;
      controls(); render();
      announce(`Simulating ${CIRCUITS[track.value].name} with ${COMPOUNDS[compound.value].name}.`);
      if (motion.matches) finish();
      else frameId = requestAnimationFrame(frame);
    } catch (error) { announce(error.message); }
  });
  pause.addEventListener('click', togglePause);
  skip.addEventListener('click', finish);
  stop.addEventListener('click', () => {
    cancelAnimationFrame(frameId); running = false; paused = false; controls();
    announce('Lap cancelled. No personal best was recorded.');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });
  motion.addEventListener('change', () => { if (motion.matches && running) finish(); });
  fields.forEach(field => field.addEventListener('change', () => {
    if (running) return;
    const key = `${track.value}:${condition.value}`;
    panel.querySelector('#lap-best').textContent = bests.has(key) ? timeLabel(bests.get(key).duration) : 'No completed lap';
    announce('Configuration changed. Run a new lap to update telemetry.');
  }));
  controls();
}
