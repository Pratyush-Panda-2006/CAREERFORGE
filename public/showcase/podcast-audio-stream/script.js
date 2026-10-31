// Speeds & Audio Player State
const speeds = [1, 1.25, 1.5, 2];
let currentSpeedIndex = 0;

let isPlaying = false;
let selectedEpisode = '142';
let currentTime = 0;
const DURATION = 2880; // 48:00 in seconds
let playInterval = null;
let activeSegmentId = null;
let volume = 1;
let volumeBeforeMute = 1;

const EPISODES = {
  '141': { tag: 'NOW STREAMING • EP 141', title: 'Scaling Vector Databases to 10 Billion Chunks', guest: 'Guest: Marcus Vance (ChromaDB Creator)' },
  '142': { tag: 'NOW STREAMING • EP 142', title: 'The Future of Agentic AI & Spatial Compute', guest: 'Guest: Dr. Aris Thorne (OpenAI Lead)' }
};

const TRANSCRIPT_EP142 = [
  {
    id: 'seg-0',
    start: 0,
    end: 75,
    timeStr: '00:00',
    speaker: 'Sarah Lin',
    role: 'Host',
    text: "Welcome back to Waveform. Today we're diving deep into the frontier of agentic AI systems and spatial computing architectures with Dr. Aris Thorne from OpenAI."
  },
  {
    id: 'seg-1',
    start: 75,
    end: 220,
    timeStr: '01:15',
    speaker: 'Dr. Aris Thorne',
    role: 'OpenAI Lead',
    text: "Thanks for having me, Sarah. When we think about autonomous agents today, the bottleneck isn't raw parameter scale anymore; it's recursive context management and grounding in real-time execution environments."
  },
  {
    id: 'seg-2',
    start: 220,
    end: 382,
    timeStr: '03:40',
    speaker: 'Sarah Lin',
    role: 'Host',
    text: "That's a fundamental shift from simple prompt chaining. How does spatial compute change the way multi-modal models parse real-time telemetry?"
  },
  {
    id: 'seg-3',
    start: 382,
    end: 615,
    timeStr: '06:22',
    speaker: 'Dr. Aris Thorne',
    role: 'OpenAI Lead',
    text: "Spatial computing gives agents sensory depth. Instead of flat pixel arrays, the agent receives 3D Gaussian splats and localized point clouds, reducing hallucination by an order of magnitude."
  },
  {
    id: 'seg-4',
    start: 615,
    end: 870,
    timeStr: '10:15',
    speaker: 'Sarah Lin',
    role: 'Host',
    text: "Let's talk latency budgets. When an agent navigates a dynamic physical environment, sub-50ms inference loops are mandatory. How are you handling speculative decoding on edge devices?"
  },
  {
    id: 'seg-5',
    start: 870,
    end: 1185,
    timeStr: '14:30',
    speaker: 'Dr. Aris Thorne',
    role: 'OpenAI Lead',
    text: "We decouple perception from deep reasoning. A lightweight distilled SLAM model handles reactive reflexes at 120 FPS, while an asynchronous reasoning cluster plans long-horizon sub-tasks in parallel."
  },
  {
    id: 'seg-6',
    start: 1185,
    end: 1510,
    timeStr: '19:45',
    speaker: 'Sarah Lin',
    role: 'Host',
    text: "Memory architecture is another core challenge. Vector stores have scaled, but retrieval precision over weeks of multi-agent state is notoriously noisy."
  },
  {
    id: 'seg-7',
    start: 1510,
    end: 1960,
    timeStr: '25:10',
    speaker: 'Dr. Aris Thorne',
    role: 'OpenAI Lead',
    text: "Exactly. We've replaced naive cosine similarity with hierarchical episodic memory graphs. Key milestones get compiled into structured semantic trees rather than raw embedding dumps."
  },
  {
    id: 'seg-8',
    start: 1960,
    end: 2475,
    timeStr: '32:40',
    speaker: 'Sarah Lin',
    role: 'Host',
    text: "Looking out five years, do you see human-agent interfaces being purely voice and neural input, or will physical controllers endure?"
  },
  {
    id: 'seg-9',
    start: 2475,
    end: 2880,
    timeStr: '41:15',
    speaker: 'Dr. Aris Thorne',
    role: 'OpenAI Lead',
    text: "Multimodal voice paired with gaze tracking is the clear endgame. When your model knows what you're looking at and anticipates intent, the friction of software completely evaporates."
  }
];

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toggleSpeed() {
  currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
  const currentSpeed = applySpeed();
  saveState();
  return currentSpeed;
}

function applySpeed() {
  const currentSpeed = speeds[currentSpeedIndex];

  // Update Hero speed button
  const heroSpeedBtn = document.getElementById('speed-btn');
  if (heroSpeedBtn) {
    heroSpeedBtn.textContent = `${currentSpeed}x`;
    heroSpeedBtn.setAttribute('aria-label', `Playback speed: ${currentSpeed}x`);
  }

  // Update Dock speed pill
  const dockSpeedPill = document.getElementById('dock-speed-pill');
  if (dockSpeedPill) {
    dockSpeedPill.textContent = `${currentSpeed}x`;
    dockSpeedPill.setAttribute('aria-label', `Playback speed: ${currentSpeed}x`);
  }

  const audio = document.querySelector('audio');
  if (audio) {
    audio.playbackRate = currentSpeed;
  }
  return currentSpeed;
}

function setEpisodeHeader(ep) {
  const info = EPISODES[ep];
  const dockTag = document.getElementById('dock-ep-tag');
  const dockTitle = document.getElementById('dock-title');
  const dockGuest = document.getElementById('dock-guest');
  if (dockTag) dockTag.textContent = info.tag;
  if (dockTitle) dockTitle.textContent = info.title;
  if (dockGuest) dockGuest.textContent = info.guest;
}

function showDock() {
  const dock = document.getElementById('player-dock');
  if (dock) dock.hidden = false;
  document.body.classList.add('has-mini-player');
}

function playEpisode(epName) {
  const next = epName.includes('141') ? '141' : '142';
  if (next !== selectedEpisode) {
    currentTime = 0;
    updateTimeUI(true);
  }
  selectedEpisode = next;
  setEpisodeHeader(selectedEpisode);
  showDock();

  startPlayback();
  updatePlayButtonIcon();
  saveState();
}

function applyVolume() {
  const slider = document.getElementById('dock-volume');
  if (slider) {
    slider.value = Math.round(volume * 100);
    slider.setAttribute('aria-valuetext', PlayerLogic.volumeLabel(volume));
  }
  const muteBtn = document.getElementById('dock-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
    muteBtn.setAttribute('aria-label', volume === 0 ? 'Unmute' : 'Mute');
    muteBtn.setAttribute('title', volume === 0 ? 'Unmute' : 'Mute');
  }
  // The demo plays no real media, but keep any <audio> element in sync.
  const audio = document.querySelector('audio');
  if (audio) audio.volume = volume;
}

function setVolume(value) {
  volume = PlayerLogic.clampVolume(value);
  if (volume > 0) volumeBeforeMute = volume;
  applyVolume();
  saveState();
}

function toggleMute() {
  setVolume(volume === 0 ? (volumeBeforeMute || 1) : 0);
}

function saveState() {
  try {
    localStorage.setItem(PlayerLogic.STORAGE_KEY, PlayerLogic.serializeState({
      episode: selectedEpisode, time: currentTime, volume, speedIndex: currentSpeedIndex
    }));
  } catch (e) { /* storage unavailable: player still works, just not remembered */ }
}

// Restore the last session as a paused mini player (no autoplay).
function restoreState() {
  let raw = null;
  try { raw = localStorage.getItem(PlayerLogic.STORAGE_KEY); } catch (e) { return; }
  const saved = PlayerLogic.parseState(raw, DURATION);
  if (!saved || saved.time <= 0) return;
  selectedEpisode = saved.episode;
  currentTime = saved.time;
  currentSpeedIndex = saved.speedIndex;
  volume = saved.volume;
  if (volume > 0) volumeBeforeMute = volume;
  applySpeed();
  setEpisodeHeader(selectedEpisode);
  showDock();
  updatePlayButtonIcon();
  updateTimeUI(true);
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;
  updatePlayButtonIcon();

  if (playInterval) clearInterval(playInterval);
  playInterval = setInterval(() => {
    const currentSpeed = speeds[currentSpeedIndex] || 1;
    currentTime += 0.25 * currentSpeed;
    if (currentTime >= DURATION) {
      currentTime = DURATION;
      pausePlayback();
    }
    updateTimeUI();
    if (Math.floor(currentTime) % 5 === 0) saveState();
  }, 250);
}

function pausePlayback() {
  isPlaying = false;
  updatePlayButtonIcon();
  saveState();
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}

function togglePlayPause() {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function updatePlayButtonIcon() {
  document.querySelectorAll('.episodes .card').forEach(card => {
    const selected = card.id === `card-${selectedEpisode}`;
    card.classList.toggle('is-playing', selected && isPlaying);
    card.classList.toggle('active-card', selected);
    const label = card.querySelector('.ep-num');
    if (label) label.textContent = `EP ${card.id.slice(5)}${selected ? ' • ACTIVE IN PLAYER' : ''}`;
  });
  const dockPlayBtn = document.getElementById('dock-play-pause-btn');
  if (dockPlayBtn) {
    dockPlayBtn.textContent = isPlaying ? '⏸' : '▶';
    dockPlayBtn.setAttribute('title', isPlaying ? 'Pause Episode' : 'Play Episode');
    dockPlayBtn.setAttribute('aria-pressed', String(isPlaying));
  }

  const heroPlayBtn = document.getElementById('hero-play-btn');
  if (heroPlayBtn) {
    heroPlayBtn.textContent = isPlaying ? '⏸ Pause Episode (#142)' : '▶ Play Latest Episode (#142)';
  }
}

function jumpToTimestamp(seconds) {
  currentTime = Math.min(Math.max(seconds, 0), DURATION);
  startPlayback();
  updateTimeUI(true);
}

function seekTo(seconds) {
  currentTime = Math.min(Math.max(seconds, 0), DURATION);
  updateTimeUI(true);
}

function updateTimeUI(forceScroll = false) {
  const curLabel = document.getElementById('current-time-label');
  if (curLabel) curLabel.textContent = formatTime(currentTime);

  const scrubber = document.getElementById('dock-scrubber');
  if (scrubber) {
    scrubber.value = Math.floor(currentTime);
    scrubber.setAttribute('aria-valuetext', `${formatTime(currentTime)} of ${formatTime(DURATION)}`);
  }

  const fill = document.getElementById('scrubber-fill');
  if (fill) {
    const pct = (currentTime / DURATION) * 100;
    fill.style.width = `${pct}%`;
  }

  // Identify active segment
  const activeSeg = TRANSCRIPT_EP142.find(
    seg => currentTime >= seg.start && currentTime < seg.end
  ) || TRANSCRIPT_EP142[TRANSCRIPT_EP142.length - 1];

  if (activeSeg && activeSeg.id !== activeSegmentId) {
    highlightSegment(activeSeg.id, forceScroll);
  }
}

function highlightSegment(segId, forceScroll = false) {
  activeSegmentId = segId;

  document.querySelectorAll('.transcript-block').forEach(block => {
    block.classList.remove('active');
  });

  const activeEl = document.getElementById(segId);
  if (activeEl) {
    activeEl.classList.add('active');

    const autoScrollCheckbox = document.getElementById('autoscroll-checkbox');
    const autoScrollEnabled = autoScrollCheckbox ? autoScrollCheckbox.checked : true;

    if (autoScrollEnabled || forceScroll) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function renderTranscript() {
  const container = document.getElementById('transcript-body');
  if (!container) return;

  container.innerHTML = '';

  TRANSCRIPT_EP142.forEach(seg => {
    const block = document.createElement('div');
    block.className = 'transcript-block';
    block.id = seg.id;
    block.dataset.start = seg.start;

    block.innerHTML = `
      <div class="block-speaker-row">
        <button type="button" class="timestamp-badge" data-time="${seg.start}" title="Click to jump audio to ${seg.timeStr}">
          <span class="ts-icon">▶</span>
          <span class="ts-time">${seg.timeStr}</span>
        </button>
        <span class="speaker-name">${seg.speaker}</span>
        <span class="speaker-role">${seg.role}</span>
        <span class="pulse-indicator"></span>
      </div>
      <p class="transcript-paragraph">${escapeHtml(seg.text)}</p>
    `;

    container.appendChild(block);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function filterTranscript(keyword) {
  const term = keyword.trim().toLowerCase();
  const blocks = document.querySelectorAll('.transcript-block');

  blocks.forEach(block => {
    const text = block.textContent.toLowerCase();
    if (!term || text.includes(term)) {
      block.style.display = 'block';
    } else {
      block.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderTranscript();
  updateTimeUI();
  restoreState();
  applyVolume();

  const volumeSlider = document.getElementById('dock-volume');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => setVolume(parseFloat(e.target.value) / 100));
  }
  const muteBtn = document.getElementById('dock-mute-btn');
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);

  // Scrubber events
  const scrubber = document.getElementById('dock-scrubber');
  if (scrubber) {
    scrubber.addEventListener('input', (e) => {
      seekTo(parseFloat(e.target.value));
      saveState();
    });
  }

  // Play / Pause button
  const dockPlayBtn = document.getElementById('dock-play-pause-btn');
  if (dockPlayBtn) {
    dockPlayBtn.addEventListener('click', togglePlayPause);
  }

  // Rewind & Forward buttons
  const rewindBtn = document.getElementById('dock-rewind-btn');
  if (rewindBtn) {
    rewindBtn.addEventListener('click', () => {
      jumpToTimestamp(currentTime - 15);
    });
  }

  const forwardBtn = document.getElementById('dock-forward-btn');
  if (forwardBtn) {
    forwardBtn.addEventListener('click', () => {
      jumpToTimestamp(currentTime + 15);
    });
  }

  // Clickable timestamps & paragraph click delegation
  const transcriptBody = document.getElementById('transcript-body');
  if (transcriptBody) {
    transcriptBody.addEventListener('click', (e) => {
      const tsBtn = e.target.closest('.timestamp-badge');
      if (tsBtn) {
        const time = parseFloat(tsBtn.dataset.time);
        jumpToTimestamp(time);
        return;
      }

      const block = e.target.closest('.transcript-block');
      if (block) {
        const time = parseFloat(block.dataset.start);
        jumpToTimestamp(time);
      }
    });
  }

  // Search filter
  const searchInput = document.getElementById('transcript-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterTranscript(e.target.value);
    });
  }

  console.log('Waveform Audio Stream Player with Interactive Transcript loaded');
});

/* ===============================================================
   Audio Equalizer Preset Selector (Issue #205)
   Simulated 5-band EQ: presets move the band sliders, dragging a
   band switches to a custom curve. No real audio is processed.
=============================================================== */
(function initEqualizer() {
  'use strict';
  var bandsEl = document.getElementById('eq-bands');
  var presetsEl = document.getElementById('eq-presets');
  if (!bandsEl || !presetsEl) return;

  var EQ_KEY = 'waveform-eq';
  var MIN_DB = -12;
  var MAX_DB = 12;

  var BANDS = [
    { freq: '60 Hz', name: 'Sub bass' },
    { freq: '230 Hz', name: 'Bass' },
    { freq: '910 Hz', name: 'Mids' },
    { freq: '3.6 kHz', name: 'Presence' },
    { freq: '14 kHz', name: 'Air' }
  ];

  var PRESETS = [
    { id: 'flat', label: 'Flat', icon: '➖', gains: [0, 0, 0, 0, 0], text: 'No tone shaping. The episode sounds as it was mixed.' },
    { id: 'speech', label: 'Speech', icon: '🗣️', gains: [-6, -2, 3, 5, 2], text: 'Trims low rumble and lifts the vocal range so voices stay clear on small speakers.' },
    { id: 'bass', label: 'Bass Boost', icon: '🔊', gains: [8, 5, 1, 0, -1], text: 'Adds weight to the low end for headphones and car stereos.' },
    { id: 'treble', label: 'Treble', icon: '✨', gains: [-2, -1, 0, 5, 8], text: 'Brightens consonants and detail, handy for noisy commutes.' },
    { id: 'studio', label: 'Studio Acoustic', icon: '🎙️', gains: [3, 1, -1, 2, 4], text: 'A gentle smile curve: warm lows and a little air, like a treated studio room.' }
  ];

  var state = { preset: 'flat', gains: PRESETS[0].gains.slice() };
  var bandNodes = [];
  var presetNodes = [];

  function clampDb(v) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return 0;
    return Math.min(Math.max(n, MIN_DB), MAX_DB);
  }

  function dbText(v) { return (v > 0 ? '+' : '') + v + ' dB'; }

  function findPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
    return null;
  }

  // Name of the preset whose gains equal the current curve, or 'custom'.
  function matchPreset(gains) {
    for (var i = 0; i < PRESETS.length; i++) {
      var same = true;
      for (var j = 0; j < gains.length; j++) if (PRESETS[i].gains[j] !== gains[j]) same = false;
      if (same) return PRESETS[i].id;
    }
    return 'custom';
  }

  function save() {
    try { localStorage.setItem(EQ_KEY, JSON.stringify({ preset: state.preset, gains: state.gains })); } catch (e) { /* storage blocked: EQ still works */ }
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(EQ_KEY); } catch (e) { return; }
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.gains) || data.gains.length !== BANDS.length) return;
      state.gains = data.gains.map(clampDb);
      state.preset = matchPreset(state.gains);
    } catch (e) { /* ignore bad stored value */ }
  }

  // Smooth path through the five band points (Catmull-Rom converted to Beziers).
  function curvePath(gains) {
    var pts = gains.map(function (g, i) {
      return [50 + i * 100, 100 - (g / MAX_DB) * 100];
    });
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0] + ' ' + p2[1];
    }
    return d;
  }

  function buildPresets() {
    PRESETS.forEach(function (p, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'eq-preset-btn';
      btn.setAttribute('role', 'radio');
      btn.dataset.preset = p.id;
      var icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = p.icon;
      btn.appendChild(icon);
      btn.appendChild(document.createTextNode(' ' + p.label));
      btn.addEventListener('click', function () { applyPreset(p.id); });
      btn.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = presetNodes[(i + dir + PRESETS.length) % PRESETS.length];
        next.focus();
        applyPreset(next.dataset.preset);
      });
      presetsEl.appendChild(btn);
      presetNodes.push(btn);
    });
  }

  function buildBands() {
    BANDS.forEach(function (b, i) {
      var col = document.createElement('div');
      col.className = 'eq-band';

      var val = document.createElement('span');
      val.className = 'eq-band-value';
      col.appendChild(val);

      var track = document.createElement('div');
      track.className = 'eq-track';
      track.tabIndex = 0;
      track.setAttribute('role', 'slider');
      track.setAttribute('aria-orientation', 'vertical');
      track.setAttribute('aria-label', b.freq + ' ' + b.name + ' band');
      track.setAttribute('aria-valuemin', String(MIN_DB));
      track.setAttribute('aria-valuemax', String(MAX_DB));
      var fill = document.createElement('div');
      fill.className = 'eq-fill';
      var knob = document.createElement('div');
      knob.className = 'eq-knob';
      track.appendChild(fill);
      track.appendChild(knob);
      col.appendChild(track);

      var freq = document.createElement('span');
      freq.className = 'eq-band-freq';
      freq.textContent = b.freq;
      col.appendChild(freq);

      bindTrack(track, i);
      bandsEl.appendChild(col);
      bandNodes.push({ col: col, val: val, track: track, fill: fill, knob: knob });
    });
  }

  function valueFromPointer(track, clientY) {
    var r = track.getBoundingClientRect();
    var ratio = (clientY - r.top) / r.height;
    return clampDb(MAX_DB - ratio * (MAX_DB - MIN_DB));
  }

  function bindTrack(track, index) {
    var dragging = false;
    track.addEventListener('pointerdown', function (e) {
      dragging = true;
      track.classList.add('dragging');
      track.focus();
      if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
      setBand(index, valueFromPointer(track, e.clientY));
      e.preventDefault();
    });
    track.addEventListener('pointermove', function (e) {
      if (dragging) setBand(index, valueFromPointer(track, e.clientY));
    });
    function stop() { dragging = false; track.classList.remove('dragging'); }
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
    track.addEventListener('keydown', function (e) {
      var cur = state.gains[index];
      var next = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = cur + 1;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = cur - 1;
      else if (e.key === 'PageUp') next = cur + 3;
      else if (e.key === 'PageDown') next = cur - 3;
      else if (e.key === 'Home') next = MIN_DB;
      else if (e.key === 'End') next = MAX_DB;
      if (next === null) return;
      e.preventDefault();
      setBand(index, clampDb(next));
    });
  }

  function setBand(index, db) {
    if (state.gains[index] === db) return;
    state.gains[index] = db;
    state.preset = matchPreset(state.gains);
    render(false);
    save();
  }

  function applyPreset(id) {
    var p = findPreset(id);
    if (!p) return;
    state.preset = id;
    state.gains = p.gains.slice();
    render(true);
    save();
  }

  function render(announce) {
    var preset = findPreset(state.preset);
    var name = preset ? preset.label : 'Custom';

    state.gains.forEach(function (g, i) {
      var n = bandNodes[i];
      var pct = (g - MIN_DB) / (MAX_DB - MIN_DB) * 100;
      n.track.style.setProperty('--pos', pct + '%');
      n.track.style.setProperty('--fill-h', Math.abs(g) / (MAX_DB - MIN_DB) * 100 + '%');
      n.track.classList.toggle('is-cut', g < 0);
      n.track.setAttribute('aria-valuenow', String(g));
      n.track.setAttribute('aria-valuetext', dbText(g));
      n.val.textContent = dbText(g);
      n.col.classList.toggle('is-boost', g > 0);
    });

    presetNodes.forEach(function (btn) {
      var on = btn.dataset.preset === state.preset;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', String(on));
      // Roving tabindex: the checked preset is the tab stop (first one when Custom).
      btn.tabIndex = on || (!preset && btn === presetNodes[0]) ? 0 : -1;
    });

    document.getElementById('eq-active-name').textContent = name;
    document.getElementById('eq-active-badge').classList.toggle('is-custom', !preset);
    document.getElementById('eq-description').textContent = preset ? preset.text : 'Custom curve. Choose a preset to reset the bands.';
    document.getElementById('eq-curve-path').setAttribute('d', curvePath(state.gains));

    var pill = document.getElementById('dock-eq-pill');
    if (pill) {
      pill.textContent = 'EQ ' + name;
      pill.setAttribute('aria-label', 'Equalizer preset: ' + name + '. Open equalizer');
    }
    if (announce) document.getElementById('eq-status').textContent = name + ' preset applied.';
  }

  var dockPill = document.getElementById('dock-eq-pill');
  if (dockPill) {
    dockPill.addEventListener('click', function () {
      var section = document.getElementById('eq-section');
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var target = presetsEl.querySelector('[tabindex="0"]');
      if (target) target.focus({ preventScroll: true });
    });
  }

  buildPresets();
  buildBands();
  load();
  render(false);
})();
