// Speeds & Audio Player State
const speeds = [1, 1.25, 1.5, 2];
let currentSpeedIndex = 0;

let isPlaying = false;
let selectedEpisode = '142';
let currentTime = 0;
let DURATION = 2880; // Current episode duration in seconds
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

function loadBookmarks() {
  try { return PlayerLogic.parseBookmarks(localStorage.getItem(PlayerLogic.BOOKMARKS_KEY)); }
  catch (e) { return []; }
}

function renderBookmarks() {
  const tray = document.getElementById('bookmarks-tray');
  if (!tray) return;
  tray.replaceChildren();
  loadBookmarks().forEach(bookmark => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bookmark-chip';
    button.textContent = `${formatTime(bookmark.time)} — ${bookmark.note}`;
    button.title = `Jump to ${formatTime(bookmark.time)}`;
    button.addEventListener('click', () => { jumpToTimestamp(bookmark.time); saveState(); });
    tray.appendChild(button);
  });
}

function saveBookmark() {
  const note = window.prompt('Add a note for this moment:');
  if (!note || !note.trim()) return;
  const bookmarks = loadBookmarks();
  bookmarks.push({ time: Math.floor(currentTime), note: note.trim() });
  try { localStorage.setItem(PlayerLogic.BOOKMARKS_KEY, JSON.stringify(bookmarks)); } catch (e) { return; }
  renderBookmarks();
}

function toggleSpeed() {
  currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
  const currentSpeed = applySpeed();
  saveState();
  return currentSpeed;
}
window.toggleSpeed = toggleSpeed;

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
  DURATION = next === '141' ? 3240 : 2880;
  if (typeof renderChapters === 'function') {
    renderChapters(selectedEpisode);
  }
  updateTimeUI();
  setEpisodeHeader(selectedEpisode);
  showDock();

  startPlayback();
  updatePlayButtonIcon();
  saveState();
}
window.playEpisode = playEpisode;

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
  const saved = PlayerLogic.parseState(raw, 3240);
  if (!saved || saved.time <= 0) return;
  selectedEpisode = saved.episode;
  DURATION = selectedEpisode === '141' ? 3240 : 2880;
  currentTime = Math.min(saved.time, DURATION);
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
      window.PodcastQueue?.complete();
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
  if (typeof updateChapterPlayState === 'function') {
    updateChapterPlayState();
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
  const durationLabel = document.getElementById('duration-label');
  if (durationLabel) durationLabel.textContent = formatTime(DURATION);
  const curLabel = document.getElementById('current-time-label');
  if (curLabel) curLabel.textContent = formatTime(currentTime);

  const scrubber = document.getElementById('dock-scrubber');
  if (scrubber) {
    scrubber.max = DURATION;
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

  if (typeof updateActiveChapter === 'function') {
    updateActiveChapter();
  }
}

// ===== BEGIN Issue #355: Synchronized Karaoke Highlighting & Search =====
let currentSearchQuery = '';
let currentSpeakerFilter = 'all';

// Pre-calculate sentences for each segment with proportional time allocations
const SEGMENT_SENTENCES = {};
TRANSCRIPT_EP142.forEach(seg => {
  const rawSentences = seg.text.match(/[^.!?]+[.!?]+(?:s|$)|[^.!?]+$/g) || [seg.text];
  const totalChars = seg.text.length;
  const segDuration = seg.end - seg.start;
  let runningTime = seg.start;

  SEGMENT_SENTENCES[seg.id] = rawSentences.map((sent, idx) => {
    const trimmed = sent.trim();
    const proportion = Math.max(0.1, trimmed.length / totalChars);
    const sentDuration = proportion * segDuration;
    const start = runningTime;
    const end = idx === rawSentences.length - 1 ? seg.end : runningTime + sentDuration;
    runningTime = end;
    return {
      id: `${seg.id}-s${idx}`,
      text: trimmed,
      start: start,
      end: end
    };
  });
});

function highlightSegment(segId, forceScroll = false) {
  activeSegmentId = segId;

  document.querySelectorAll('.transcript-block').forEach(block => {
    if (block.id === segId) {
      block.classList.add('active');
    } else {
      block.classList.remove('active');
      // Reset sentence karaoke in inactive blocks
      block.querySelectorAll('.transcript-sentence').forEach(span => {
        span.classList.remove('karaoke-active', 'karaoke-done');
        span.style.removeProperty('--karaoke-pct');
      });
    }
  });

  const activeEl = document.getElementById(segId);
  if (activeEl) {
    const autoScrollCheckbox = document.getElementById('autoscroll-checkbox');
    const autoScrollEnabled = autoScrollCheckbox ? autoScrollCheckbox.checked : true;

    if (autoScrollEnabled || forceScroll) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// Update karaoke progression for sentences within active segment
function updateKaraokeProgress() {
  if (!activeSegmentId) return;
  const sentences = SEGMENT_SENTENCES[activeSegmentId];
  if (!sentences) return;

  const activeBlock = document.getElementById(activeSegmentId);
  if (!activeBlock) return;

  sentences.forEach(s => {
    const el = document.getElementById(s.id);
    if (!el) return;

    if (currentTime < s.start) {
      el.classList.remove('karaoke-active', 'karaoke-done');
      el.style.removeProperty('--karaoke-pct');
    } else if (currentTime >= s.end) {
      el.classList.remove('karaoke-active');
      el.classList.add('karaoke-done');
      el.style.setProperty('--karaoke-pct', '100%');
    } else {
      // Actively speaking sentence
      el.classList.remove('karaoke-done');
      el.classList.add('karaoke-active');
      const progress = Math.max(0, Math.min(1.0, (currentTime - s.start) / Math.max(0.1, s.end - s.start)));
      el.style.setProperty('--karaoke-pct', `${(progress * 100).toFixed(1)}%`);
    }
  });
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
    block.dataset.speaker = seg.speaker;

    const sentences = SEGMENT_SENTENCES[seg.id] || [];
    const sentenceSpansHtml = sentences.map(s => {
      let displayText = escapeHtml(s.text);
      if (currentSearchQuery) {
        const regex = new RegExp(`(${escapeRegex(currentSearchQuery)})`, 'gi');
        displayText = displayText.replace(regex, '<mark class="transcript-search-highlight">$1</mark>');
      }
      return `<span class="transcript-sentence" id="${s.id}" data-sentence-start="${s.start}" title="Click to seek here (${formatTime(s.start)})">${displayText} </span>`;
    }).join('');

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
      <p class="transcript-paragraph">${sentenceSpansHtml}</p>
    `;

    container.appendChild(block);
  });

  applyFilters();
}

// Transcript initialization must complete before the dock's seek/play handlers bind.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function escapeRegex(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// ===== BEGIN Issue #417: Episode Audio Chapter Markers Navigator =====
const EPISODE_CHAPTERS = {
  '142': [
    {
      id: 'ch-142-1',
      index: 1,
      title: 'Introduction & Spatial Computing Primer',
      start: 0,
      end: 220,
      summary: 'Sarah welcomes Dr. Aris Thorne (OpenAI Lead) to explore the frontier of spatial computing architectures and autonomous agency.',
      highlights: [
        'Welcome & episode context',
        'Parameter scale vs real-time execution context',
        'Hardware convergence of spatial lenses & edge inference'
      ]
    },
    {
      id: 'ch-142-2',
      index: 2,
      title: 'Recursive Context & Agent Memory Architecture',
      start: 220,
      end: 615,
      summary: 'Examining hierarchical context compression, memory degradation bounds, and scratchpad tool convergence in multi-step agents.',
      highlights: [
        'Preventing token context bloat and hallucination drift',
        'Episodic vs semantic vector memory tiers',
        'Deterministic tool execution contracts'
      ]
    },
    {
      id: 'ch-142-3',
      index: 3,
      title: 'Spatial Compute Integration & Multimodal Sensors',
      start: 615,
      end: 1185,
      summary: 'How millimeter depth sensors, 6-DoF tracking, and ambient acoustic feeds ground LLMs in physical environments without sensory lag.',
      highlights: [
        '6-DoF telemetry feeds into unified spatial embeddings',
        'Sub-15ms perceptual latency targets',
        'Multimodal transformer disambiguation of hand gestures'
      ]
    },
    {
      id: 'ch-142-4',
      index: 4,
      title: 'Autonomous Subagent Swarms & Orchestration Protocols',
      start: 1185,
      end: 1960,
      summary: 'Designing distributed subagent networks with peer consensus, rollback boundaries, and real-time execution sandboxes.',
      highlights: [
        'Coordinator vs specialist agent topologies',
        'Consensus protocols for parallel task execution',
        'Circuit breakers and rollback verification gates'
      ]
    },
    {
      id: 'ch-142-5',
      index: 5,
      title: 'Future Roadmap: The Next 3 Years in Spatial AI',
      start: 1960,
      end: 2880,
      summary: 'Closing perspectives on open foundation weights, consumer spatial hardware price curves, and upcoming open-source releases.',
      highlights: [
        'Consumer wearable glass ergonomics and thermal limits',
        'Societal and privacy governance of ambient observers',
        'Dr. Thorne closing recommendations & community Q&A'
      ]
    }
  ],
  '141': [
    {
      id: 'ch-141-1',
      index: 1,
      title: 'Opening & Billion-Scale Vector Indexing Landscape',
      start: 0,
      end: 510,
      summary: 'Marcus Vance from ChromaDB breaks down the memory ceiling of graph-based indexes when scaling beyond 10 billion chunks.',
      highlights: [
        'Marcus Vance introduction & ChromaDB origin',
        'HNSW memory overhead at scale',
        'In-RAM graphs vs disk-backed tiered storage'
      ]
    },
    {
      id: 'ch-141-2',
      index: 2,
      title: 'Vector Quantization: Product (PQ) & Scalar (SQ8)',
      start: 510,
      end: 1200,
      summary: 'Compressing dense embeddings by 75-90% using Product and Scalar Quantization while preserving recall at 95%+ precision.',
      highlights: [
        'Sub-vector centroid clustering mathematics',
        'Recall retention benchmark results',
        'NVMe direct I/O memory mapping'
      ]
    },
    {
      id: 'ch-141-3',
      index: 3,
      title: 'Distributed Partitioning & Consensus Protocols',
      start: 1200,
      end: 2175,
      summary: 'High-throughput write shards, Raft-based consensus logs, and seamless dynamic rebalancing without cluster downtime.',
      highlights: [
        'Consistent hashing ring across 64 storage nodes',
        'Write-ahead logging and snapshot sync',
        'Cross-region replica consistency under high load'
      ]
    },
    {
      id: 'ch-141-4',
      index: 4,
      title: 'Hybrid Search: Dense Semantic Vectors + Sparse BM25',
      start: 2175,
      end: 2820,
      summary: 'Blending vector similarity scoring with inverted lexical tokens using Reciprocal Rank Fusion (RRF) for zero-drop recall.',
      highlights: [
        'Reciprocal Rank Fusion equation and weighting',
        'Handling exact part numbers and acronym edge cases',
        'Production query latency profiling'
      ]
    },
    {
      id: 'ch-141-5',
      index: 5,
      title: 'Future of Embeddings & Late Interaction Models',
      start: 2820,
      end: 3240,
      summary: 'Multi-vector token interactions (ColBERT), memory compression trends, and the ChromaDB 2026 developer roadmap.',
      highlights: [
        'ColBERT token-level scoring vs single vector pooling',
        'Roadmap sneak peeks & open-source contributions',
        'Closing reflections for systems engineers'
      ]
    }
  ]
};

let activeChapterId = null;

function getCurrentChapters() {
  return EPISODE_CHAPTERS[selectedEpisode] || EPISODE_CHAPTERS['142'];
}

function renderChapters(epId) {
  const chapters = EPISODE_CHAPTERS[epId] || EPISODE_CHAPTERS['142'];
  const listEl = document.getElementById('chapters-list');
  const markersEl = document.getElementById('chapter-markers-container');

  if (listEl) {
    listEl.innerHTML = '';
    chapters.forEach((ch, idx) => {
      const card = document.createElement('div');
      card.className = `chapter-card ${idx === 0 ? 'expanded' : ''}`;
      card.id = `card-${ch.id}`;
      card.setAttribute('role', 'listitem');
      card.dataset.chapterId = ch.id;

      const highlightsHtml = ch.highlights.map((h, hIdx) => {
        const step = (ch.end - ch.start) / (ch.highlights.length + 1);
        const hTime = Math.round(ch.start + step * (hIdx + 1));
        return `<li data-seek="${hTime}" title="Seek to ${formatTime(hTime)}">${escapeHtml(h)} (${formatTime(hTime)})</li>`;
      }).join('');

      card.innerHTML = `
        <div class="chapter-card-header" tabindex="0" role="button" aria-expanded="${idx === 0 ? 'true' : 'false'}" aria-controls="body-${ch.id}">
          <div class="chapter-card-left">
            <span class="chapter-index-chip">${ch.index}</span>
            <span class="chapter-timestamp-pill">${formatTime(ch.start)} – ${formatTime(ch.end)}</span>
            <span class="chapter-card-title">${escapeHtml(ch.title)}</span>
          </div>
          <div class="chapter-card-right">
            <div class="chapter-playing-bars" aria-hidden="true"><span></span><span></span><span></span></div>
            <button type="button" class="chapter-jump-btn" data-time="${ch.start}" title="Jump to ${escapeHtml(ch.title)}">▶ Jump</button>
            <span class="chapter-toggle-icon" aria-hidden="true">▼</span>
          </div>
        </div>
        <div class="chapter-card-body" id="body-${ch.id}">
          <p class="chapter-summary-text">${escapeHtml(ch.summary)}</p>
          <div class="chapter-highlights-title">Discussion Highlights</div>
          <ul class="chapter-highlights-list">${highlightsHtml}</ul>
        </div>
      `;

      listEl.appendChild(card);
    });
  }

  // Render scrubber tick markers
  if (markersEl) {
    markersEl.innerHTML = '';
    chapters.forEach(ch => {
      if (ch.start > 0) {
        const tick = document.createElement('div');
        tick.className = 'chapter-marker-tick';
        const leftPct = (ch.start / DURATION) * 100;
        tick.style.left = `${leftPct}%`;
        tick.title = `${ch.title} (${formatTime(ch.start)})`;
        tick.addEventListener('click', (e) => {
          e.stopPropagation();
          jumpToTimestamp(ch.start);
        });
        markersEl.appendChild(tick);
      }
    });
  }

  updateActiveChapter(true);
}

function updateActiveChapter(force = false) {
  const chapters = getCurrentChapters();
  if (!chapters || chapters.length === 0) return;

  const currentCh = chapters.find(ch => currentTime >= ch.start && currentTime < ch.end) || chapters[chapters.length - 1];
  if (!currentCh) return;

  const chIdx = chapters.indexOf(currentCh);

  // Stepper UI
  const stepperCurrent = document.getElementById('chapter-stepper-current');
  const stepperTitle = document.getElementById('chapter-stepper-title');
  const prevBtn = document.getElementById('chapter-prev-btn');
  const nextBtn = document.getElementById('chapter-next-btn');
  const dockBadge = document.getElementById('dock-chapter-badge');

  if (stepperCurrent) stepperCurrent.textContent = `Chapter ${currentCh.index} of ${chapters.length}`;
  if (stepperTitle) stepperTitle.textContent = currentCh.title;
  if (prevBtn) prevBtn.disabled = (chIdx === 0 && (currentTime - currentCh.start) <= 2);
  if (nextBtn) nextBtn.disabled = (chIdx === chapters.length - 1);
  if (dockBadge) dockBadge.textContent = `Ch ${currentCh.index}/${chapters.length}`;

  // Banner UI
  const bannerTime = document.getElementById('banner-chapter-time');
  const bannerTitle = document.getElementById('banner-chapter-title');
  const bannerSummary = document.getElementById('banner-chapter-summary');
  const bannerFill = document.getElementById('banner-chapter-fill');
  const bannerPct = document.getElementById('banner-chapter-pct');
  const bannerBar = document.querySelector('.banner-progress-bar');

  if (bannerTime) bannerTime.textContent = `${formatTime(currentCh.start)} – ${formatTime(currentCh.end)}`;
  if (bannerTitle) bannerTitle.textContent = currentCh.title;
  if (bannerSummary) bannerSummary.textContent = currentCh.summary;

  const chDur = Math.max(1, currentCh.end - currentCh.start);
  const chElapsed = Math.max(0, Math.min(currentTime - currentCh.start, chDur));
  const progressPercent = Math.min(100, Math.round((chElapsed / chDur) * 100));

  if (bannerFill) bannerFill.style.width = `${progressPercent}%`;
  if (bannerPct) bannerPct.textContent = `${progressPercent}% complete`;
  if (bannerBar) bannerBar.setAttribute('aria-valuenow', String(progressPercent));

  // Active Chapter Card Highlighting
  if (currentCh.id !== activeChapterId || force) {
    activeChapterId = currentCh.id;
    chapters.forEach(ch => {
      const card = document.getElementById(`card-${ch.id}`);
      if (!card) return;
      const isCur = ch.id === currentCh.id;
      card.classList.toggle('active-chapter', isCur);
      if (isCur) {
        card.classList.add('expanded');
        const header = card.querySelector('.chapter-card-header');
        if (header) header.setAttribute('aria-expanded', 'true');
      }
    });
  }

  updateChapterPlayState();
}

function updateChapterPlayState() {
  document.querySelectorAll('.chapter-card').forEach(card => {
    const isCur = card.dataset.chapterId === activeChapterId;
    card.classList.toggle('is-playing', isCur && isPlaying);
  });
}

function initChapterListeners() {
  const chaptersList = document.getElementById('chapters-list');
  if (chaptersList) {
    chaptersList.addEventListener('click', (e) => {
      // Click jump button
      const jumpBtn = e.target.closest('.chapter-jump-btn');
      if (jumpBtn) {
        e.stopPropagation();
        const time = parseFloat(jumpBtn.dataset.time);
        jumpToTimestamp(time);
        return;
      }

      // Click highlight item
      const highlightItem = e.target.closest('.chapter-highlights-list li');
      if (highlightItem && highlightItem.dataset.seek) {
        e.stopPropagation();
        const seekTime = parseFloat(highlightItem.dataset.seek);
        jumpToTimestamp(seekTime);
        return;
      }

      // Click card header to toggle accordion
      const header = e.target.closest('.chapter-card-header');
      if (header) {
        const card = header.closest('.chapter-card');
        if (card) {
          const isExpanded = card.classList.toggle('expanded');
          header.setAttribute('aria-expanded', String(isExpanded));
        }
      }
    });

    chaptersList.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const header = e.target.closest('.chapter-card-header');
        if (header) {
          e.preventDefault();
          const card = header.closest('.chapter-card');
          if (card) {
            const isExpanded = card.classList.toggle('expanded');
            header.setAttribute('aria-expanded', String(isExpanded));
          }
        }
      }
    });
  }

  // Prev / Next Steppers
  const prevBtn = document.getElementById('chapter-prev-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const chapters = getCurrentChapters();
      const currentCh = chapters.find(ch => currentTime >= ch.start && currentTime < ch.end) || chapters[0];
      const chIdx = chapters.indexOf(currentCh);
      if (currentTime - currentCh.start > 3 || chIdx === 0) {
        jumpToTimestamp(currentCh.start);
      } else {
        const target = chapters[Math.max(0, chIdx - 1)];
        jumpToTimestamp(target.start);
      }
    });
  }

  const nextBtn = document.getElementById('chapter-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const chapters = getCurrentChapters();
      const currentCh = chapters.find(ch => currentTime >= ch.start && currentTime < ch.end) || chapters[0];
      const chIdx = chapters.indexOf(currentCh);
      if (chIdx < chapters.length - 1) {
        const target = chapters[chIdx + 1];
        jumpToTimestamp(target.start);
      }
    });
  }

  // Replay chapter banner button
  const replayBtn = document.getElementById('banner-jump-btn');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      const chapters = getCurrentChapters();
      const currentCh = chapters.find(ch => currentTime >= ch.start && currentTime < ch.end) || chapters[0];
      jumpToTimestamp(currentCh.start);
    });
  }

  // Dock chapters button scroll
  const dockChaptersBtn = document.getElementById('dock-chapters-btn');
  if (dockChaptersBtn) {
    dockChaptersBtn.addEventListener('click', () => {
      const section = document.getElementById('episode-chapters-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
// ===== END Issue #417 =====

function applyFilters() {
  const blocks = document.querySelectorAll('.transcript-block');
  let matchCount = 0;
  const term = currentSearchQuery.trim().toLowerCase();

  blocks.forEach(block => {
    const speaker = block.dataset.speaker;
    const text = block.textContent.toLowerCase();

    const speakerMatches = (currentSpeakerFilter === 'all' || speaker === currentSpeakerFilter);
    const searchMatches = (!term || text.includes(term));

    if (speakerMatches && searchMatches) {
      block.style.display = 'block';
      if (term) {
        const count = (text.match(new RegExp(escapeRegex(term), 'gi')) || []).length;
        matchCount += count;
      }
    } else {
      block.style.display = 'none';
    }
  });

  const countBadge = document.getElementById('search-count-badge');
  const clearBtn = document.getElementById('search-clear-btn');
  if (countBadge) {
    if (term) {
      countBadge.hidden = false;
      countBadge.textContent = `${matchCount} match${matchCount === 1 ? '' : 'es'}`;
      countBadge.className = matchCount > 0 ? 'search-count-badge' : 'search-count-badge no-match';
    } else {
      countBadge.hidden = true;
    }
  }

  if (clearBtn) {
    clearBtn.hidden = !term;
  }
}



document.addEventListener('DOMContentLoaded', () => {
  renderTranscript();
  renderChapters(selectedEpisode);
  initChapterListeners();
  updateTimeUI();
  restoreState();
  applyVolume();
  renderBookmarks();
  const bookmarkButton = document.getElementById('bookmark-moment-btn');
  if (bookmarkButton) bookmarkButton.addEventListener('click', saveBookmark);

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
