import { VoiceRecorder } from './recorder-engine.js';
const root = document.getElementById('voice-recorder');
if (root) {
  const record = root.querySelector('#mic-record'); const stop = root.querySelector('#mic-stop');
  const clear = root.querySelector('#mic-clear'); const audio = root.querySelector('audio');
  const status = root.querySelector('[role="status"]'); const canvas = root.querySelector('canvas');
  const mode = root.querySelector('select'); const meter = root.querySelector('output');
  const context = canvas.getContext('2d'); let frame = 0; let lastDraw = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const supported = window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext);
  const engine = new VoiceRecorder({
    getStream: () => navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
    createContext: () => new (window.AudioContext || window.webkitAudioContext)(),
    createRecorder: stream => new MediaRecorder(stream),
    createURL: blob => URL.createObjectURL(blob), revokeURL: url => URL.revokeObjectURL(url),
    setTimeout: (callback, delay) => setTimeout(callback, delay), clearTimeout: id => clearTimeout(id)
  }, ({ state, message, url }) => {
    status.textContent = message; root.dataset.state = state;
    record.disabled = !supported || ['requesting', 'recording', 'stopping'].includes(state);
    stop.disabled = state !== 'recording'; clear.disabled = state === 'idle';
    if (url) { audio.src = url; audio.hidden = false; }
    else { audio.pause(); audio.removeAttribute('src'); audio.load(); audio.hidden = true; }
    cancelAnimationFrame(frame); frame = 0;
    if (state === 'recording') frame = requestAnimationFrame(draw);
    else { meter.value = '0%'; paintBaseline(); }
  });
  function size() {
    const width = Math.max(1, Math.round(canvas.clientWidth)); const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== width * dpr || canvas.height !== 160 * dpr) { canvas.width = width * dpr; canvas.height = 160 * dpr; }
    context?.setTransform(dpr, 0, 0, dpr, 0, 0); return width;
  }
  function paintBaseline() {
    if (!context) return;
    const width = size(); context.clearRect(0, 0, width, 160); context.strokeStyle = '#22d3ee';
    context.beginPath(); context.moveTo(0, 80); context.lineTo(width, 80); context.stroke();
  }
  const samples = new Uint8Array(1024); const bins = new Uint8Array(512);
  function draw(time) {
    if (engine.state !== 'recording' || document.hidden) return;
    frame = requestAnimationFrame(draw);
    if (time - lastDraw < (reduced.matches ? 250 : 33)) return;
    lastDraw = time; const analyser = engine.analyser;
    if (!analyser) return;
    analyser.getByteTimeDomainData(samples);
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
    meter.value = `${Math.min(100, Math.round(rms * 100))}%`;
    if (!context) return;
    const width = size(); context.clearRect(0, 0, width, 160); context.strokeStyle = '#22d3ee'; context.fillStyle = '#22d3ee';
    if (mode.value === 'spectrum') {
      analyser.getByteFrequencyData(bins);
      for (let bar = 0; bar < 64; bar++) { const height = bins[bar * 4] / 255 * 140; context.fillRect(bar * width / 64, 160 - height, Math.max(1, width / 64 - 2), height); }
    } else {
      context.beginPath(); samples.forEach((value, index) => { const x = index / (samples.length - 1) * width; const y = value / 255 * 160; if (index) context.lineTo(x, y); else context.moveTo(x, y); }); context.stroke();
    }
  }
  record.addEventListener('click', () => engine.start());
  stop.addEventListener('click', () => engine.stop());
  clear.addEventListener('click', () => engine.cancel());
  document.addEventListener('visibilitychange', () => { if (document.hidden && ['requesting', 'recording'].includes(engine.state)) engine.cancel(); });
  window.addEventListener('pagehide', () => engine.cancel());
  engine.cancel();
  if (!supported) status.textContent = 'Recording requires HTTPS or localhost, microphone access, MediaRecorder and Web Audio support.';
}
