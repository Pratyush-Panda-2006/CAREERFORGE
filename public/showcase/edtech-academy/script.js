/**
 * Synapse Academy — Interactive Learning Platform
 * Issue #65: Course Curriculum Syllabus Accordion with Lecture Preview Modals
 */

// Global enrollment action
window.enrollNow = function enrollNow() {
  alert('Synapse Academy Enrollment Modal Triggered! Welcome to the cohort.');
};

// ===============================================================
// Course Syllabus Accordion & Lesson Preview System
// ===============================================================
(function initSyllabusAccordion() {
  'use strict';

  // Course Syllabus Data (Deeply Frozen)
  const SYLLABUS_MODULES = Object.freeze([
    Object.freeze({
      id: 'module-1',
      tag: 'MODULE 01',
      title: 'Foundations of Distributed LLM Serving',
      desc: 'Master the core computational and memory bottlenecks of transformer models at scale.',
      duration: '3 hrs 45 mins',
      lessons: Object.freeze([
        Object.freeze({
          id: 'lesson-1-1',
          index: '1.1',
          title: 'KV Cache Mechanics & PagedAttention Internals',
          brief: 'Virtual memory paging for attention keys and values to eliminate GPU VRAM fragmentation.',
          duration: '48 mins',
          isPreview: true,
          previewData: Object.freeze({
            desc: 'In this lecture, we dissect why autoregressive generation causes severe GPU memory fragmentation. You will learn how vLLM implemented PagedAttention—translating operating system page table principles directly into CUDA kernel memory allocation.',
            takeaways: Object.freeze([
              'Calculate exact KV cache sizing per token based on hidden size, number of layers, and precision.',
              'Implement non-contiguous block allocation algorithms for dynamic sequence lengths.',
              'Analyze memory waste reductions from 60-80% down to under 4% in production workloads.'
            ]),
            codeLang: 'Python / CUDA Memory Model',
            code: `# PagedAttention Block Allocation Formula
block_size = 16  # tokens per block
num_layers = 32
num_kv_heads = 8
head_dim = 128
element_size = 2  # 16-bit FP16 bytes

# Total KV memory per token: 2 * num_layers * num_kv_heads * head_dim * element_size
kv_per_token_bytes = 2 * 32 * 8 * 128 * 2  # 131,072 bytes (128 KB/token)`
          })
        }),
        Object.freeze({
          id: 'lesson-1-2',
          index: '1.2',
          title: 'Continuous Batching & Dynamic Request Scheduling',
          brief: 'Orca-style iteration-level scheduling to maximize compute saturation.',
          duration: '54 mins',
          isPreview: true,
          previewData: Object.freeze({
            desc: 'Traditional batching wastes up to 70% of compute cycles waiting for the longest response in a batch to finish. Continuous batching processes requests at the token iteration level, injecting new prompt prefills dynamically without stalling decoding.',
            takeaways: Object.freeze([
              'Understand the difference between Request-level Batching and Iteration-level Batching.',
              'Architect priority queues for streaming tokens with sub-millisecond dispatch.',
              'Implement preemption mechanisms (swap out vs. recompute) during VRAM pressure.'
            ]),
            codeLang: 'Async Python / Token Loop',
            code: `async def iteration_step(active_requests, scheduler):
    # Dynamically inject arriving requests into the next forward pass
    scheduled_batch = scheduler.schedule(active_requests)
    model_output = await model_runner.execute(scheduled_batch)
    for req, token in zip(scheduled_batch, model_output.tokens):
        req.append_token(token)
        if req.is_finished():
            scheduler.retire(req)`
          })
        }),
        Object.freeze({
          id: 'lesson-1-3',
          index: '1.3',
          title: 'Tensor Parallelism vs. Pipeline Parallelism Breakdown',
          brief: 'Megatron-LM matrix sharding across NVLink vs cross-node pipeline bubbles.',
          duration: '62 mins',
          isPreview: false
        }),
        Object.freeze({
          id: 'lesson-1-4',
          index: '1.4',
          title: 'Benchmarking Token Throughput with vLLM & TGI',
          brief: 'Stress-testing concurrent client requests, TTFT, and TPOT metrics.',
          duration: '61 mins',
          isPreview: false
        })
      ])
    }),

    Object.freeze({
      id: 'module-2',
      tag: 'MODULE 02',
      title: 'Advanced Quantization & GPU Memory Optimization',
      desc: 'Shrink model weights and activations while retaining high numeric fidelity and perplexity.',
      duration: '3 hrs 30 mins',
      lessons: Object.freeze([
        Object.freeze({
          id: 'lesson-2-1',
          index: '2.1',
          title: 'FP8, INT4 (AWQ & GPTQ) Quantization Deep Dive',
          brief: 'Activation-aware weight quantization algorithms and outlier channel protection.',
          duration: '58 mins',
          isPreview: true,
          previewData: Object.freeze({
            desc: 'Discover why naive round-to-nearest quantization destroys perplexity in large models. We examine Activation-aware Weight Quantization (AWQ) and GPTQ second-order Taylor expansion methods that preserve salient weights.',
            takeaways: Object.freeze([
              'Identify activation outlier channels and apply per-channel scaling factors.',
              'Compare runtime GEMM throughput: FP16 Tensor Cores vs FP8 (Ada/Hopper) vs INT4.',
              'Profile perplexity trade-offs across Llama-3 and Mistral architectures.'
            ]),
            codeLang: 'Terminal / Quantization Pipeline',
            code: `# Run Activation-Aware Weight Quantization (AWQ 4-bit)
python -m awq.entry --model_path meta-llama/Meta-Llama-3-70B \\
    --w_bit 4 --q_group_size 128 \\
    --run_awq --dump_awq awq_cache/llama-3-70b-w4.pt

# Result: 140 GB FP16 -> 38 GB INT4 (Fits cleanly on single 48GB A100/H100)`
          })
        }),
        Object.freeze({
          id: 'lesson-2-2',
          index: '2.2',
          title: 'FlashAttention-2 & Chunked Prefill Architecture',
          brief: 'Tiling self-attention in fast SRAM memory to achieve O(N) memory complexity.',
          duration: '52 mins',
          isPreview: false
        }),
        Object.freeze({
          id: 'lesson-2-3',
          index: '2.3',
          title: 'GPU Memory Hierarchy & VRAM Allocation Profiling',
          brief: 'Profiling PyTorch CUDA memory allocators, PyTorch reserved pools, and fragmentation.',
          duration: '45 mins',
          isPreview: false
        }),
        Object.freeze({
          id: 'lesson-2-4',
          index: '2.4',
          title: 'Speculative Decoding & Draft Model Pipelining',
          brief: 'Accelerating token generation using lightweight draft models and tree verification.',
          duration: '55 mins',
          isPreview: false
        })
      ])
    }),

    Object.freeze({
      id: 'module-3',
      tag: 'MODULE 03',
      title: 'Rust Kernel Engineering & Zero-Copy Packet Flow',
      desc: 'Build ultra-low latency network services with safe Rust, eBPF probes, and XDP drivers.',
      duration: '3 hrs 40 mins',
      lessons: Object.freeze([
        Object.freeze({
          id: 'lesson-3-1',
          index: '3.1',
          title: 'Safe Concurrency in Rust: Channels, Mutexes & Atomics',
          brief: 'Lock-free ring buffers and crossbeam channels for low-jitter token stream dispatching.',
          duration: '45 mins',
          isPreview: true,
          previewData: Object.freeze({
            desc: 'Building high-throughput gateway proxies requires zero lock contention. We explore how Rust guarantees thread safety at compile time using ownership, Send/Sync traits, and atomic memory ordering.',
            takeaways: Object.freeze([
              'Master lock-free Single Producer Single Consumer (SPSC) ring buffers in safe Rust.',
              'Understand Acquire/Release atomic ordering compared to SeqCst performance penalties.',
              'Design an async token dispatch bridge connecting TCP WebSockets to inference workers.'
            ]),
            codeLang: 'Rust / Concurrent Dispatcher',
            code: `use std::sync::atomic::{AtomicUsize, Ordering};
use crossbeam_channel::{bounded, Receiver, Sender};

pub struct TokenRouter {
    active_connections: AtomicUsize,
    tx: Sender<InferenceRequest>,
}

impl TokenRouter {
    pub fn dispatch(&self, req: InferenceRequest) -> Result<(), &'static str> {
        self.active_connections.fetch_add(1, Ordering::Relaxed);
        self.tx.try_send(req).map_err(|_| "Channel capacity full")
    }
}`
          })
        }),
        Object.freeze({
          id: 'lesson-3-2',
          index: '3.2',
          title: 'Writing Kernel-Space eBPF Probes in Rust with Aya',
          brief: 'Tracing system calls and network socket events directly inside the Linux kernel.',
          duration: '60 mins',
          isPreview: false
        }),
        Object.freeze({
          id: 'lesson-3-3',
          index: '3.3',
          title: 'XDP High-Speed Packet Filtering & Drop Benchmarks',
          brief: 'Filtering DDoS attack vectors at the network driver layer before kernel socket buffering.',
          duration: '55 mins',
          isPreview: false
        }),
        Object.freeze({
          id: 'lesson-3-4',
          index: '3.4',
          title: 'Zero-Copy Ring Buffers & Userspace IPC',
          brief: 'Sharing memory maps between kernel eBPF maps and Rust userspace collectors.',
          duration: '60 mins',
          isPreview: false
        })
      ])
    }),

    Object.freeze({
      id: 'module-4',
      tag: 'MODULE 04',
      title: 'Production Deployment, Monitoring & Fault Tolerance',
      desc: 'Deploy high-availability inference clusters with multi-GPU failover and SLO observability.',
      duration: '3 hrs 35 mins',
      lessons: Object.freeze([
        Object.freeze({
          id: 'lesson-4-1',
          index: '4.1',
          title: 'Distributed Tracing & SLO Tracking with OpenTelemetry',
          brief: 'Tracing inference requests end-to-end: gateway, KV cache router, and worker replicas.',
          duration: '42 mins',
          isPreview: true,
          previewData: Object.freeze({
            desc: 'Observing production generative AI workloads demands specialized metrics. Learn how to instrument OpenTelemetry spans for Time To First Token (TTFT), Time Per Output Token (TPOT), and queue latency.',
            takeaways: Object.freeze([
              'Implement distributed context propagation across gRPC inference worker nodes.',
              'Create Grafana dashboards visualizing P95/P99 generation latencies.',
              'Set up dynamic alerting thresholds on KV cache memory saturation.'
            ]),
            codeLang: 'OpenTelemetry / Python Instrumentation',
            code: `from opentelemetry import trace

tracer = trace.get_tracer("vllm.engine")

with tracer.start_as_current_span("prefill_phase") as span:
    span.set_attribute("llm.prompt_tokens", len(prompt_ids))
    prefill_output = model.prefill(prompt_ids)
    span.set_attribute("llm.ttft_ms", compute_elapsed_ms())`
          })
        }),
        Object.freeze({
          id: 'lesson-4-2',
          index: '4.2',
          title: 'Multi-GPU Failure Recovery & Heartbeat Consensus',
          brief: 'Automatic worker eviction, failover routing, and healthy replica rebalancing.',
          duration: '56 mins',
          isPreview: false
        }),
        Object.freeze({
          id: 'lesson-4-3',
          index: '4.3',
          title: 'Kubernetes Operator for Dynamic Model Sharding',
          brief: 'Custom resource definitions (CRDs) for autoscaling tensor-parallel pods.',
          duration: '65 mins',
          isPreview: false
        }),
        Object.freeze({
          id: 'lesson-4-4',
          index: '4.4',
          title: 'Capstone Project: Deploying a 70B Model Cluster',
          brief: 'End-to-end deployment of an auto-scaling cluster serving real user traffic.',
          duration: '52 mins',
          isPreview: false
        })
      ])
    })
  ]);

  // State Management
  const state = {
    openModuleIds: new Set(['module-1']), // Module 1 open by default
    activeFilter: 'all',
    searchQuery: '',
    currentPreviewLesson: null,
    isPlayingVideo: false,
    videoTimer: null,
    videoCurrentSec: 255, // 04:15
    videoTotalSec: 2880,  // 48:00
    lastToastTime: 0
  };

  let lastActiveElement = null;

  // Helper: DOM Selector
  function elById(id) {
    return document.getElementById(id);
  }

  // Toast Notification System
  function showToast(message) {
    const now = Date.now();
    if (now - state.lastToastTime < 350) return;
    state.lastToastTime = now;

    const container = elById('edtechToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'edtech-toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }

  // Accordion Toggle Handlers
  function toggleModule(moduleId) {
    if (state.openModuleIds.has(moduleId)) {
      state.openModuleIds.delete(moduleId);
    } else {
      state.openModuleIds.add(moduleId);
    }
    renderAccordion();
  }

  function expandAll() {
    SYLLABUS_MODULES.forEach(m => state.openModuleIds.add(m.id));
    renderAccordion();
    showToast('All modules expanded.');
  }

  function collapseAll() {
    state.openModuleIds.clear();
    renderAccordion();
    showToast('All modules collapsed.');
  }

  // Video Player Simulation Controls
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateVideoTimeUI() {
    const timeDisplay = elById('vidTimeDisplay');
    const fill = elById('vidProgressFill');
    const track = elById('vidProgressTrack');

    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(state.videoCurrentSec)} / ${formatTime(state.videoTotalSec)}`;
    }
    const pct = Math.min((state.videoCurrentSec / state.videoTotalSec) * 100, 100);
    if (fill) {
      fill.style.width = `${pct}%`;
    }
    if (track) {
      track.setAttribute('aria-valuenow', Math.round(pct));
    }
  }

  function toggleVideoPlayback() {
    const overlay = elById('videoOverlay');
    const playBtn = elById('vidPlayBtn');
    const iconSpan = elById('playIconSvg');

    state.isPlayingVideo = !state.isPlayingVideo;

    if (state.isPlayingVideo) {
      if (overlay) overlay.classList.add('is-playing');
      if (playBtn) playBtn.textContent = '⏸';
      if (iconSpan) iconSpan.textContent = '⏸';

      state.videoTimer = setInterval(() => {
        state.videoCurrentSec += 1;
        if (state.videoCurrentSec >= state.videoTotalSec) {
          state.videoCurrentSec = state.videoTotalSec;
          toggleVideoPlayback();
        }
        updateVideoTimeUI();
      }, 1000);
    } else {
      if (overlay) overlay.classList.remove('is-playing');
      if (playBtn) playBtn.textContent = '▶';
      if (iconSpan) iconSpan.textContent = '▶';
      if (state.videoTimer) {
        clearInterval(state.videoTimer);
        state.videoTimer = null;
      }
    }
  }

  // Modal Open & Close System
  function openLessonPreview(lesson, triggerElement) {
    if (!lesson.isPreview || !lesson.previewData) {
      showToast(`🔒 ${lesson.title} is reserved for enrolled cohort students.`);
      return;
    }

    lastActiveElement = triggerElement || document.activeElement;
    state.currentPreviewLesson = lesson;

    // Reset video state
    state.isPlayingVideo = false;
    if (state.videoTimer) {
      clearInterval(state.videoTimer);
      state.videoTimer = null;
    }
    state.videoCurrentSec = 150; // starts at 02:30 sample point
    state.videoTotalSec = parseInt(lesson.duration, 10) * 60 || 2880;

    // Populate Modal Content using Safe DOM manipulation
    elById('previewModalTitle').textContent = `${lesson.index}: ${lesson.title}`;
    elById('modalDurationTag').textContent = `⏱ ${lesson.duration}`;
    elById('modalLessonDesc').textContent = lesson.previewData.desc;

    // Module tag
    const parentModule = SYLLABUS_MODULES.find(m => m.lessons.some(l => l.id === lesson.id));
    if (parentModule) {
      elById('modalModuleTag').textContent = parentModule.tag;
    }

    // Takeaways list
    const takeawaysList = elById('modalTakeawaysList');
    takeawaysList.replaceChildren();
    lesson.previewData.takeaways.forEach(item => {
      const li = document.createElement('li');
      li.className = 'modal-takeaway-item';
      li.textContent = item;
      takeawaysList.appendChild(li);
    });

    // Code snippet preview
    elById('modalCodeLang').textContent = lesson.previewData.codeLang;
    elById('modalCodeSnippet').textContent = lesson.previewData.code;

    // Video player UI
    const overlay = elById('videoOverlay');
    const playBtn = elById('vidPlayBtn');
    const iconSpan = elById('playIconSvg');
    if (overlay) overlay.classList.remove('is-playing');
    if (playBtn) playBtn.textContent = '▶';
    if (iconSpan) iconSpan.textContent = '▶';
    updateVideoTimeUI();

    // Show modal & set focus
    const backdrop = elById('previewModalBackdrop');
    const modal = elById('previewModal');
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    if (modal) modal.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    const closeBtn = elById('modalCloseBtn');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closePreviewModal() {
    if (state.isPlayingVideo) {
      toggleVideoPlayback();
    }
    const backdrop = elById('previewModalBackdrop');
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';

    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

  // Render Accordion with XSS-Safe DOM Manipulation
  function renderAccordion() {
    const container = elById('syllabusAccordion');
    if (!container) return;

    container.replaceChildren();

    const query = state.searchQuery.toLowerCase().trim();

    SYLLABUS_MODULES.forEach(module => {
      // Filter lessons inside module
      const filteredLessons = module.lessons.filter(lesson => {
        if (state.activeFilter === 'preview' && !lesson.isPreview) {
          return false;
        }
        if (query) {
          const matchTitle = lesson.title.toLowerCase().includes(query);
          const matchBrief = lesson.brief.toLowerCase().includes(query);
          const matchModule = module.title.toLowerCase().includes(query);
          return matchTitle || matchBrief || matchModule;
        }
        return true;
      });

      // If search query is active and matches this module, auto-expand it
      const hasSearchMatch = query && filteredLessons.length > 0;
      const isOpen = hasSearchMatch || state.openModuleIds.has(module.id);

      // Hide module entirely if search yields no matching lessons
      if (query && filteredLessons.length === 0) {
        return;
      }

      const itemCard = document.createElement('div');
      itemCard.className = `accordion-item ${isOpen ? 'is-open' : ''}`;
      itemCard.id = `item-${module.id}`;

      // Accordion Header Button
      const headerBtn = document.createElement('button');
      headerBtn.type = 'button';
      headerBtn.className = 'accordion-header-btn';
      headerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      headerBtn.setAttribute('aria-controls', `content-${module.id}`);
      headerBtn.id = `btn-${module.id}`;

      // Header Left Side
      const leftCol = document.createElement('div');
      leftCol.className = 'module-header-left';

      const metaTop = document.createElement('div');
      metaTop.className = 'module-meta-top';

      const tagSpan = document.createElement('span');
      tagSpan.className = 'module-tag';
      tagSpan.textContent = module.tag;
      metaTop.appendChild(tagSpan);

      const durationSpan = document.createElement('span');
      durationSpan.className = 'module-duration-chip';
      durationSpan.textContent = `⏱ ${module.duration}`;
      metaTop.appendChild(durationSpan);

      const previewCount = module.lessons.filter(l => l.isPreview).length;
      if (previewCount > 0) {
        const prevChip = document.createElement('span');
        prevChip.className = 'module-preview-chip';
        prevChip.textContent = `${previewCount} Previews Available`;
        metaTop.appendChild(prevChip);
      }
      leftCol.appendChild(metaTop);

      const titleEl = document.createElement('h3');
      titleEl.className = 'module-title';
      titleEl.textContent = module.title;
      leftCol.appendChild(titleEl);

      const descEl = document.createElement('p');
      descEl.className = 'module-desc';
      descEl.textContent = module.desc;
      leftCol.appendChild(descEl);

      headerBtn.appendChild(leftCol);

      // Header Right Side (Lessons Count & Animated Arrow)
      const rightCol = document.createElement('div');
      rightCol.className = 'module-header-right';

      const countBadge = document.createElement('span');
      countBadge.className = 'module-lessons-badge';
      countBadge.textContent = `${filteredLessons.length} Lectures`;
      rightCol.appendChild(countBadge);

      // SVG Arrow Icon
      const ns = 'http://www.w3.org/2000/svg';
      const arrowSvg = document.createElementNS(ns, 'svg');
      arrowSvg.setAttribute('viewBox', '0 0 24 24');
      arrowSvg.setAttribute('class', 'accordion-arrow');
      arrowSvg.setAttribute('aria-hidden', 'true');
      const arrowPath = document.createElementNS(ns, 'polyline');
      arrowPath.setAttribute('points', '6 9 12 15 18 9');
      arrowSvg.appendChild(arrowPath);
      rightCol.appendChild(arrowSvg);

      headerBtn.appendChild(rightCol);

      // Toggle action
      headerBtn.addEventListener('click', () => toggleModule(module.id));

      itemCard.appendChild(headerBtn);

      // Collapsible Content Panel (CSS Grid Transition)
      const collapsePanel = document.createElement('div');
      collapsePanel.className = 'accordion-collapse';
      collapsePanel.id = `content-${module.id}`;
      collapsePanel.setAttribute('role', 'region');
      collapsePanel.setAttribute('aria-labelledby', `btn-${module.id}`);

      const contentInner = document.createElement('div');
      contentInner.className = 'accordion-content-inner';

      const lessonsList = document.createElement('ul');
      lessonsList.className = 'lessons-list';

      filteredLessons.forEach(lesson => {
        const li = document.createElement('li');
        li.className = 'lesson-item';

        // Lesson Left
        const lessonLeft = document.createElement('div');
        lessonLeft.className = 'lesson-left';

        const statusIcon = document.createElement('div');
        statusIcon.className = `lesson-status-icon ${lesson.isPreview ? 'is-preview' : 'is-locked'}`;
        statusIcon.textContent = lesson.isPreview ? '▶' : '🔒';
        statusIcon.setAttribute('aria-hidden', 'true');
        lessonLeft.appendChild(statusIcon);

        const infoCol = document.createElement('div');
        infoCol.className = 'lesson-info';

        const lTitle = document.createElement('div');
        lTitle.className = 'lesson-title';
        lTitle.textContent = `${lesson.index} ${lesson.title}`;
        infoCol.appendChild(lTitle);

        const lBrief = document.createElement('div');
        lBrief.className = 'lesson-brief';
        lBrief.textContent = lesson.brief;
        infoCol.appendChild(lBrief);

        lessonLeft.appendChild(infoCol);
        li.appendChild(lessonLeft);

        // Lesson Right
        const lessonRight = document.createElement('div');
        lessonRight.className = 'lesson-right';

        const durationTag = document.createElement('span');
        durationTag.className = 'lesson-duration';
        durationTag.textContent = `⏱ ${lesson.duration}`;
        lessonRight.appendChild(durationTag);

        if (lesson.isPreview) {
          const previewBtn = document.createElement('button');
          previewBtn.type = 'button';
          previewBtn.className = 'btn-preview-badge';
          previewBtn.innerHTML = '<span aria-hidden="true">▶</span> Preview';
          previewBtn.setAttribute('aria-label', `Watch sample video preview for ${lesson.title}`);
          previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openLessonPreview(lesson, previewBtn);
          });
          lessonRight.appendChild(previewBtn);
        } else {
          const lockedBadge = document.createElement('span');
          lockedBadge.className = 'badge-locked';
          lockedBadge.innerHTML = '<span aria-hidden="true">🔒</span> Enrolled Only';
          lockedBadge.setAttribute('title', 'Enroll in cohort to unlock this full lesson');
          lessonRight.appendChild(lockedBadge);
        }

        li.appendChild(lessonRight);
        lessonsList.appendChild(li);
      });

      contentInner.appendChild(lessonsList);
      collapsePanel.appendChild(contentInner);
      itemCard.appendChild(collapsePanel);

      container.appendChild(itemCard);
    });

    // Update global summary counts
    const totalLessons = SYLLABUS_MODULES.reduce((sum, m) => sum + m.lessons.length, 0);
    const modCountEl = elById('totalModulesCount');
    const lesCountEl = elById('totalLessonsCount');
    if (modCountEl) modCountEl.textContent = String(SYLLABUS_MODULES.length);
    if (lesCountEl) lesCountEl.textContent = String(totalLessons);
  }

  // Event Listeners Setup
  function initEvents() {
    // Expand All / Collapse All buttons
    const expandBtn = elById('expandAllBtn');
    if (expandBtn) expandBtn.addEventListener('click', expandAll);

    const collapseBtn = elById('collapseAllBtn');
    if (collapseBtn) collapseBtn.addEventListener('click', collapseAll);

    // Search input
    const searchInput = elById('syllabusSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderAccordion();
      });
    }

    // Filter Chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter || 'all';
        renderAccordion();
      });
    });

    // Modal close events
    const closeBtn = elById('modalCloseBtn');
    const dismissBtn = elById('modalDismissBtn');
    const backdrop = elById('previewModalBackdrop');

    if (closeBtn) closeBtn.addEventListener('click', closePreviewModal);
    if (dismissBtn) dismissBtn.addEventListener('click', closePreviewModal);

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closePreviewModal();
      });
    }

    // Video Play/Pause toggles
    const videoOverlay = elById('videoOverlay');
    const vidPlayBtn = elById('vidPlayBtn');
    const videoPlayToggle = elById('videoPlayToggle');

    if (videoOverlay) videoOverlay.addEventListener('click', toggleVideoPlayback);
    if (videoPlayToggle) {
      videoPlayToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleVideoPlayback();
      });
    }
    if (vidPlayBtn) vidPlayBtn.addEventListener('click', toggleVideoPlayback);

    // Keyboard handlers (Escape closes modal)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elById('previewModalBackdrop').hidden) {
        closePreviewModal();
      }
    });

    // Initial render
    renderAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }
})();

// ===============================================================
// Interactive Quiz (Issue #66 Preservation)
// ===============================================================
const QUIZ_SECONDS = 60;
const PASS_PERCENT = 80;

const QUESTIONS = [
  {
    q: 'During autoregressive LLM decoding, what does the KV cache store?',
    options: [
      'The model weights for each layer',
      'Attention keys and values of tokens already processed',
      'The tokenizer vocabulary',
      'Gradients from the last training step'
    ],
    answer: 1,
    why: 'The KV cache keeps the attention keys and values of earlier tokens, so each new token only computes its own instead of redoing the whole prompt.'
  },
  {
    q: 'A database keeps accepting writes on both sides of a network partition and merges them later. Which CAP trade-off is that?',
    options: [
      'CP: consistency over availability',
      'CA: no partition tolerance',
      'AP: availability over consistency',
      'None, partitions cannot be handled'
    ],
    answer: 2,
    why: 'Staying available during a partition and reconciling afterwards gives up strict consistency, which is the AP side of CAP.'
  },
  {
    q: 'What does the Rust borrow checker mainly prevent?',
    options: [
      'Use-after-free and data races, at compile time',
      'Slow network calls',
      'Integer overflow at runtime',
      'Unused imports'
    ],
    answer: 0,
    why: 'Ownership and borrowing rules are checked at compile time, which rules out dangling references and data races in safe Rust.'
  },
  {
    q: 'What is eBPF mainly used for?',
    options: [
      'Compiling Rust to WebAssembly',
      'Encrypting disk volumes',
      'Replacing the Linux scheduler with user threads',
      'Running verified sandboxed programs inside the kernel'
    ],
    answer: 3,
    why: 'eBPF programs are checked by the kernel verifier and then run in-kernel for tracing, networking and security, with no kernel module needed.'
  },
  {
    q: 'What is the main effect of quantizing a model from FP16 to INT8?',
    options: [
      'Higher numeric precision',
      'Smaller memory footprint and faster inference, with a small accuracy cost',
      'Longer context windows for free',
      'It removes the need for a GPU'
    ],
    answer: 1,
    why: 'INT8 weights take half the memory of FP16 and move through memory faster, usually costing a little accuracy.'
  }
];

const quizState = {
  index: 0,
  score: 0,
  answered: false,
  remainingMs: QUIZ_SECONDS * 1000,
  lastTick: 0,
  timerId: null,
  active: false
};

function qs(id) { return document.getElementById(id); }

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function showPanel(name) {
  ['quizIntro', 'quizPlay', 'quizResult'].forEach((id) => {
    qs(id).hidden = id !== name;
  });
}

function renderTimer() {
  qs('quizTimer').textContent = formatClock(quizState.remainingMs);
  const fill = qs('timerFill');
  fill.style.width = `${(quizState.remainingMs / (QUIZ_SECONDS * 1000)) * 100}%`;
  const low = quizState.remainingMs <= 10000;
  fill.classList.toggle('low', low);
  qs('quizTimer').classList.toggle('low', low);
}

function stopTimer() {
  if (quizState.timerId) clearInterval(quizState.timerId);
  quizState.timerId = null;
}

function startTimer() {
  stopTimer();
  quizState.lastTick = Date.now();
  quizState.timerId = setInterval(() => {
    const now = Date.now();
    // the clock only runs while a question is waiting for an answer
    if (!quizState.answered) quizState.remainingMs -= now - quizState.lastTick;
    quizState.lastTick = now;
    if (quizState.remainingMs <= 0) {
      quizState.remainingMs = 0;
      renderTimer();
      finishQuiz(true);
      return;
    }
    renderTimer();
  }, 200);
}

function startQuiz() {
  quizState.index = 0;
  quizState.score = 0;
  quizState.answered = false;
  quizState.remainingMs = QUIZ_SECONDS * 1000;
  quizState.active = true;
  showPanel('quizPlay');
  renderQuestion();
  renderTimer();
  startTimer();
}

function renderQuestion() {
  const item = QUESTIONS[quizState.index];
  quizState.answered = false;
  qs('quizCounter').textContent = `Question ${quizState.index + 1} of ${QUESTIONS.length}`;
  qs('quizQuestion').textContent = item.q;
  qs('quizFeedback').textContent = '';
  qs('quizFeedback').className = 'quiz-feedback';
  qs('quizNext').hidden = true;

  const list = qs('quizOptions');
  list.replaceChildren();
  item.options.forEach((text, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-option';
    btn.dataset.index = String(i);
    const key = document.createElement('span');
    key.className = 'opt-key';
    key.setAttribute('aria-hidden', 'true');
    key.textContent = String(i + 1);
    const label = document.createElement('span');
    label.textContent = text;
    btn.append(key, label);
    btn.addEventListener('click', () => chooseOption(i));
    li.appendChild(btn);
    list.appendChild(li);
  });
  qs('quizQuestion').focus();
}

function chooseOption(i) {
  if (!quizState.active || quizState.answered) return;
  const item = QUESTIONS[quizState.index];
  quizState.answered = true;
  const correct = i === item.answer;
  if (correct) quizState.score += 1;

  qs('quizOptions').querySelectorAll('.quiz-option').forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === item.answer) btn.classList.add('correct');
    else if (idx === i) btn.classList.add('wrong');
  });

  const fb = qs('quizFeedback');
  fb.className = `quiz-feedback ${correct ? 'good' : 'bad'}`;
  fb.textContent = `${correct ? 'Correct.' : 'Not quite.'} ${item.why}`;

  const last = quizState.index === QUESTIONS.length - 1;
  const next = qs('quizNext');
  next.textContent = last ? 'See results' : 'Next question';
  next.hidden = false;
  next.focus();
}

function nextQuestion() {
  if (!quizState.active) return;
  if (quizState.index >= QUESTIONS.length - 1) {
    finishQuiz(false);
    return;
  }
  quizState.index += 1;
  renderQuestion();
}

function finishQuiz(timedOut) {
  stopTimer();
  quizState.active = false;
  const total = QUESTIONS.length;
  const percent = Math.round((quizState.score / total) * 100);
  const passed = percent >= PASS_PERCENT;
  const unanswered = timedOut ? total - quizState.index - (quizState.answered ? 1 : 0) : 0;

  showPanel('quizResult');
  qs('resultHeading').textContent = timedOut ? "Time's up" : passed ? 'Quiz passed' : 'Quiz complete';
  qs('resultScore').textContent = `${quizState.score} / ${total} (${percent}%)`;
  let detail = passed
    ? 'Nice work, you cleared the 80% mark. Add your name to get your certificate.'
    : 'You need 80% or more for the certificate. Have another go.';
  if (timedOut) detail = `The 60 seconds ran out with ${unanswered} question${unanswered === 1 ? '' : 's'} unanswered. ${detail}`;
  qs('resultDetail').textContent = detail;

  qs('certForm').hidden = !passed;
  qs('certificate').hidden = true;
  qs('resultHeading').focus();
}

function showCertificate(name) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) return false;
  qs('certNameOut').textContent = clean;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const percent = Math.round((quizState.score / QUESTIONS.length) * 100);
  qs('certMeta').textContent = `Score ${quizState.score}/${QUESTIONS.length} (${percent}%) on ${date}`;
  qs('certificate').hidden = false;
  return true;
}

(function initQuiz() {
  if (!qs('quiz')) return;
  qs('quizStart').addEventListener('click', startQuiz);
  qs('quizNext').addEventListener('click', nextQuestion);
  qs('quizRetry').addEventListener('click', () => {
    qs('certName').value = '';
    showPanel('quizIntro');
    qs('quizStart').focus();
  });
  qs('certForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!showCertificate(qs('certName').value)) {
      qs('certName').focus();
      return;
    }
    qs('certificate').scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('keydown', (event) => {
    if (!quizState.active || quizState.answered) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const n = Number(event.key);
    if (n >= 1 && n <= QUESTIONS[quizState.index].options.length) chooseOption(n - 1);
  });
})();

// ===============================================================
// Course Completion Milestones & Animated Progress Bar (Issue #26)
// ===============================================================
(function initCourseProgressTracker() {
  'use strict';

  const progressSection = document.getElementById('courseMilestones');
  const progressFill = document.getElementById('milestoneProgressFill');
  const percentText = document.getElementById('milestonePercent');
  const tickNodes = document.querySelectorAll('.milestone-ticks .tick-node');
  const simulationBtns = document.querySelectorAll('.milestone-controls .milestone-btn[data-target]');
  const replayBtn = document.getElementById('btnReplayProgress');
  const statLectures = document.getElementById('statLectures');
  const statLabs = document.getElementById('statLabs');
  const statGraduation = document.getElementById('statGraduation');
  const cardFills = document.querySelectorAll('.card-progress-fill');

  if (!progressSection || !progressFill || !percentText) return;

  let currentTarget = 68;
  let hasAnimatedOnce = false;
  let counterAnimationId = null;

  function countUp(from, to, duration = 1200) {
    if (counterAnimationId) cancelAnimationFrame(counterAnimationId);

    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(from + (to - from) * ease);
      percentText.textContent = `${val}%`;

      if (progress < 1) {
        counterAnimationId = requestAnimationFrame(step);
      } else {
        percentText.textContent = `${to}%`;
      }
    }
    counterAnimationId = requestAnimationFrame(step);
  }

  function updateMilestoneTicks(percent) {
    tickNodes.forEach((node) => {
      const nodePercent = parseInt(node.getAttribute('data-percent'), 10);
      const dot = node.querySelector('.tick-dot');

      node.classList.remove('completed', 'in-progress', 'locked');

      if (nodePercent < percent) {
        node.classList.add('completed');
        if (dot) dot.textContent = '✓';
      } else if (nodePercent === percent) {
        node.classList.add('completed');
        if (dot) dot.textContent = '✓';
      } else if (nodePercent > percent && nodePercent <= percent + 25) {
        node.classList.add('in-progress');
        if (dot) dot.textContent = '⚡';
      } else {
        node.classList.add('locked');
        if (dot) dot.textContent = '🔒';
      }
    });
  }

  function updateDynamicStats(percent) {
    if (!statLectures || !statLabs || !statGraduation) return;

    if (percent <= 25) {
      statLectures.textContent = '4 of 16 Lectures';
      statLabs.textContent = '2 of 8 Labs';
      statGraduation.textContent = '8 Weeks Left';
    } else if (percent <= 50) {
      statLectures.textContent = '8 of 16 Lectures';
      statLabs.textContent = '4 of 8 Labs';
      statGraduation.textContent = '5 Weeks Left';
    } else if (percent < 100) {
      statLectures.textContent = '11 of 16 Lectures';
      statLabs.textContent = '6 of 8 Labs';
      statGraduation.textContent = '2 Weeks Left';
    } else {
      statLectures.textContent = '16 of 16 Lectures 🎉';
      statLabs.textContent = '8 of 8 Labs Passed';
      statGraduation.textContent = 'Graduated with Honors!';
    }
  }

  function setProgress(targetVal, animate = true) {
    currentTarget = targetVal;
    const fromVal = parseInt(percentText.textContent, 10) || 0;

    progressFill.style.width = `${targetVal}%`;

    if (animate) {
      countUp(fromVal, targetVal);
    } else {
      percentText.textContent = `${targetVal}%`;
    }

    updateMilestoneTicks(targetVal);
    updateDynamicStats(targetVal);

    // Update active simulation button
    simulationBtns.forEach((btn) => {
      const btnTarget = parseInt(btn.getAttribute('data-target'), 10);
      btn.classList.toggle('active', btnTarget === targetVal);
    });
  }

  function animateMiniCardProgress() {
    cardFills.forEach((fill) => {
      const targetWidth = fill.getAttribute('data-target-width') || '50%';
      fill.style.width = targetWidth;
    });
  }

  // Simulation controls
  simulationBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-target'), 10);
      if (!isNaN(val)) {
        setProgress(val, true);
      }
    });
  });

  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      progressFill.style.transition = 'none';
      progressFill.style.width = '0%';
      percentText.textContent = '0%';

      // Reset card fills
      cardFills.forEach((fill) => {
        fill.style.transition = 'none';
        fill.style.width = '0%';
      });

      setTimeout(() => {
        progressFill.style.transition = 'width 1.4s cubic-bezier(0.16, 1, 0.3, 1)';
        cardFills.forEach((fill) => {
          fill.style.transition = 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
        });
        setProgress(currentTarget, true);
        animateMiniCardProgress();
      }, 50);
    });
  }

  // Scroll into view animation via IntersectionObserver
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasAnimatedOnce) {
          hasAnimatedOnce = true;
          setTimeout(() => {
            setProgress(68, true);
            animateMiniCardProgress();
          }, 150);
        }
      });
    }, { threshold: 0.25 });

    observer.observe(progressSection);
  } else {
    setProgress(68, true);
    animateMiniCardProgress();
  }
})();


/* ===== BEGIN Issue #191: Interactive Code Challenge Sandbox Editor & Live Syntax Test Runner ===== */
(function initCodeSandbox() {
  'use strict';

  const CHALLENGES = {
    'two-sum': {
      id: 'two-sum',
      category: 'SYSTEMS MEMORY MANAGEMENT',
      title: 'Two-Sum Memory Cache Lookup',
      difficulty: 'EASY • 5 PTS',
      difficultyClass: 'easy',
      desc: 'Given an array of allocated memory chunk sizes <code>nums</code> and a target buffer chunk <code>target</code>, return the indices of the two memory blocks such that they add up to exactly <code>target</code>.',
      exampleInput: 'nums = [2, 7, 11, 15], target = 9',
      exampleOutput: '[0, 1]',
      exampleExplanation: 'nums[0] + nums[1] == 2 + 7 == 9, so we return [0, 1].',
      constraints: [
        'Each input has exactly one valid solution.',
        'You may not use the same element twice.',
        'Target linear time complexity: O(n) using a Hash Map.'
      ],
      hint: 'Store each visited element in a Map (value => index). For each new element, check if (target - current) already exists in the map.',
      functionName: 'twoSum',
      starterCode: `/**\n * @param {number[]} nums - Memory block allocations\n * @param {number} target - Target chunk size\n * @return {number[]} Indices of the two memory blocks\n */\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
      testCases: [
        { name: 'Standard contiguous array lookup', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { name: 'Non-zero start index pair', args: [[3, 2, 4], 6], expected: [1, 2] },
        { name: 'Duplicate values in memory', args: [[3, 3], 6], expected: [0, 1] },
        { name: 'Larger memory addresses', args: [[1, 5, 8, 12, 14], 22], expected: [2, 4] }
      ]
    },
    'valid-brackets': {
      id: 'valid-brackets',
      category: 'COMPILER TOKEN PARSER',
      title: 'Syntax Bracket Validator',
      difficulty: 'MEDIUM • 10 PTS',
      difficultyClass: 'medium',
      desc: 'Given a source code snippet <code>code</code>, determine if all parentheses <code>()</code>, square brackets <code>[]</code>, and curly braces <code>{}</code> are properly nested, matched, and closed.',
      exampleInput: 'code = "function add(a, b) { return (a + b); }"',
      exampleOutput: 'true',
      exampleExplanation: 'All opening delimiters are closed in the exact inverse order of opening.',
      constraints: [
        'Input contains alphanumeric code characters plus (), [], {}.',
        'Open brackets must be closed by the same type of brackets.',
        'Open brackets must be closed in the correct order.'
      ],
      hint: 'Use a stack data structure (array with push/pop). When encountering an open bracket, push it; when encountering a close bracket, verify it matches the popped element.',
      functionName: 'isValidBrackets',
      starterCode: `/**\n * Validate that all brackets '()', '[]', '{}' in code are properly closed and nested.\n * @param {string} code - Source code snippet\n * @return {boolean} True if all brackets are properly balanced\n */\nfunction isValidBrackets(code) {\n  const stack = [];\n  const map = { ')': '(', ']': '[', '}': '{' };\n  for (const char of code) {\n    if (char === '(' || char === '[' || char === '{') {\n      stack.push(char);\n    } else if (char === ')' || char === ']' || char === '}') {\n      if (stack.pop() !== map[char]) {\n        return false;\n      }\n    }\n  }\n  return stack.length === 0;\n}`,
      testCases: [
        { name: 'Properly closed function block', args: ['function add(a, b) { return (a + b); }'], expected: true },
        { name: 'Nested array & object literal', args: ['const arr = [1, (2 + 3), { x: 4 }];'], expected: true },
        { name: 'Unclosed parenthesis syntax error', args: ['if (x > 0) { arr[0] = (val; }'], expected: false },
        { name: 'Interleaved mismatched brackets', args: ['([)]'], expected: false }
      ]
    },
    'flatten-tensor': {
      id: 'flatten-tensor',
      category: 'TENSOR MEMORY CONTIGUITY',
      title: 'Flatten Tensor Matrix',
      difficulty: 'HARD • 15 PTS',
      difficultyClass: 'hard',
      desc: 'Flatten an arbitrarily nested array representing a multi-dimensional tensor matrix into a single contiguous 1D vector. Note: Do NOT use the built-in <code>Array.prototype.flat()</code>.',
      exampleInput: 'arr = [1, [2, 3], [4, [5, 6]]]',
      exampleOutput: '[1, 2, 3, 4, 5, 6]',
      exampleExplanation: 'All nested levels are unwrapped into a flat 1D sequence.',
      constraints: [
        'Depth of nested dimensions can range from 1 to 10+ levels.',
        'Do not use Array.prototype.flat() or flatMap().',
        'Must preserve original scalar element ordering.'
      ],
      hint: 'Implement a recursive traversal helper or use an iterative stack queue that inspects Array.isArray(item).',
      functionName: 'flattenTensor',
      starterCode: `/**\n * Flattens an arbitrarily nested array of tensor dimensions into a 1D vector.\n * Note: Do NOT use Array.prototype.flat()\n * @param {any[]} arr - Multi-dimensional tensor array\n * @return {any[]} 1D flattened vector\n */\nfunction flattenTensor(arr) {\n  const result = [];\n  function recurse(items) {\n    for (const item of items) {\n      if (Array.isArray(item)) {\n        recurse(item);\n      } else {\n        result.push(item);\n      }\n    }\n  }\n  recurse(arr);\n  return result;\n}`,
      testCases: [
        { name: 'Mixed 2-level and 3-level nesting', args: [[1, [2, 3], [4, [5, 6]]]], expected: [1, 2, 3, 4, 5, 6] },
        { name: 'Deeply wrapped single scalars', args: [[[[1]], [[2]], [[[3]]]]], expected: [1, 2, 3] },
        { name: 'Single element 1D array', args: [[42]], expected: [42] },
        { name: 'Asymmetric nested chain', args: [[1, [2, [3, [4, [5]]]]]], expected: [1, 2, 3, 4, 5] }
      ]
    }
  };

  let activeChallengeId = 'two-sum';
  const userCodeStore = {};

  function updateLineNumbers() {
    const textarea = document.getElementById('codeEditorTextarea');
    const gutter = document.getElementById('editorGutter');
    if (!textarea || !gutter) return;

    const lines = textarea.value.split('\n').length;
    let lineNumsStr = '';
    for (let i = 1; i <= Math.max(1, lines); i++) {
      lineNumsStr += i + '\n';
    }
    gutter.textContent = lineNumsStr.trimEnd();
  }

  function renderChallenge(challengeId) {
    const ch = CHALLENGES[challengeId];
    if (!ch) return;

    activeChallengeId = challengeId;

    // Update Tab UI
    document.querySelectorAll('.challenge-tab').forEach((tab) => {
      const isAct = tab.getAttribute('data-challenge-id') === challengeId;
      tab.classList.toggle('active', isAct);
      tab.setAttribute('aria-selected', String(isAct));
    });

    // Update Brief Panel
    const catEl = document.getElementById('challengeCategory');
    if (catEl) catEl.textContent = ch.category;

    const diffEl = document.getElementById('challengeDifficulty');
    if (diffEl) {
      diffEl.textContent = ch.difficulty;
      diffEl.className = `brief-level-badge ${ch.difficultyClass}`;
    }

    const titleEl = document.getElementById('challengeTitle');
    if (titleEl) titleEl.textContent = ch.title;

    const descEl = document.getElementById('challengeDesc');
    if (descEl) descEl.innerHTML = ch.desc;

    const inEl = document.getElementById('challengeExampleInput');
    if (inEl) inEl.textContent = ch.exampleInput;

    const outEl = document.getElementById('challengeExampleOutput');
    if (outEl) outEl.textContent = ch.exampleOutput;

    const expEl = document.getElementById('challengeExampleExplanation');
    if (expEl) expEl.textContent = ch.exampleExplanation;

    const constrList = document.getElementById('challengeConstraints');
    if (constrList) {
      constrList.innerHTML = ch.constraints.map((c) => `<li>${c}</li>`).join('');
    }

    const hintText = document.getElementById('challengeHintText');
    if (hintText) hintText.textContent = ch.hint;

    // Reset hint toggle
    const hintContent = document.getElementById('sandboxHintContent');
    const hintChevron = document.getElementById('hintChevron');
    if (hintContent) hintContent.hidden = true;
    if (hintChevron) hintChevron.classList.remove('open');

    // Update Code Editor
    const textarea = document.getElementById('codeEditorTextarea');
    if (textarea) {
      textarea.value = userCodeStore[challengeId] || ch.starterCode;
      updateLineNumbers();
    }

    // Reset Test Results Panel to Idle
    const resultsContainer = document.getElementById('testResultsList');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="test-idle-placeholder">
          <span class="placeholder-icon">🚀</span>
          <p>Click <strong>Run Tests</strong> above to validate your solution against automated unit tests and benchmark execution time.</p>
        </div>
      `;
    }

    const statusBadge = document.getElementById('telemetryStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = 'IDLE';
      statusBadge.className = 'telemetry-status-badge ready';
    }

    const runtimeEl = document.getElementById('telemetryRuntime');
    if (runtimeEl) runtimeEl.textContent = '⏱ Ready';

    const countPill = document.getElementById('consoleTestCount');
    if (countPill) countPill.textContent = `${ch.testCases.length}/${ch.testCases.length}`;

    const stdoutConsole = document.getElementById('stdoutConsole');
    if (stdoutConsole) {
      stdoutConsole.innerHTML = '<span class="stdout-empty">// Standard console.log output will appear here when tests execute...</span>';
    }
  }

  function selectSandboxChallenge(id) {
    // Save current code
    const textarea = document.getElementById('codeEditorTextarea');
    if (textarea) {
      userCodeStore[activeChallengeId] = textarea.value;
    }
    renderChallenge(id);
  }

  function resetSandboxCode() {
    const ch = CHALLENGES[activeChallengeId];
    if (!ch) return;
    const textarea = document.getElementById('codeEditorTextarea');
    if (textarea) {
      textarea.value = ch.starterCode;
      userCodeStore[activeChallengeId] = ch.starterCode;
      updateLineNumbers();
      showToastNotification(`Reset to starter template for ${ch.title}`);
    }
  }

  function copySandboxCode() {
    const textarea = document.getElementById('codeEditorTextarea');
    if (!textarea) return;
    navigator.clipboard.writeText(textarea.value).then(() => {
      showToastNotification('Code copied to clipboard! 📋');
    }).catch(() => {
      showToastNotification('Code ready in editor.');
    });
  }

  function toggleSandboxHint() {
    const hintContent = document.getElementById('sandboxHintContent');
    const hintChevron = document.getElementById('hintChevron');
    if (hintContent && hintChevron) {
      const isHidden = hintContent.hidden;
      hintContent.hidden = !isHidden;
      hintChevron.classList.toggle('open', isHidden);
    }
  }

  function switchConsoleTab(tab) {
    const tabTests = document.getElementById('tabTestCases');
    const tabStdout = document.getElementById('tabStdout');
    const viewTests = document.getElementById('consoleTestsView');
    const viewStdout = document.getElementById('consoleStdoutView');

    if (tab === 'tests') {
      if (tabTests) tabTests.classList.add('active');
      if (tabStdout) tabStdout.classList.remove('active');
      if (viewTests) viewTests.hidden = false;
      if (viewStdout) viewStdout.hidden = true;
    } else {
      if (tabTests) tabTests.classList.remove('active');
      if (tabStdout) tabStdout.classList.add('active');
      if (viewTests) viewTests.hidden = true;
      if (viewStdout) viewStdout.hidden = false;
    }
  }

  function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function runSandboxTests() {
    const ch = CHALLENGES[activeChallengeId];
    if (!ch) return;

    const textarea = document.getElementById('codeEditorTextarea');
    if (!textarea) return;
    const code = textarea.value;

    const statusBadge = document.getElementById('telemetryStatusBadge');
    const runtimeEl = document.getElementById('telemetryRuntime');
    const resultsContainer = document.getElementById('testResultsList');
    const stdoutConsole = document.getElementById('stdoutConsole');

    if (statusBadge) {
      statusBadge.textContent = 'RUNNING...';
      statusBadge.className = 'telemetry-status-badge ready';
    }

    const capturedLogs = [];
    const mockConsole = {
      log: (...args) => {
        capturedLogs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      error: (...args) => {
        capturedLogs.push('[ERROR] ' + args.join(' '));
      },
      warn: (...args) => {
        capturedLogs.push('[WARN] ' + args.join(' '));
      }
    };

    let userFunc = null;
    const compileStart = performance.now();

    try {
      // Evaluate user code in isolated function scope
      const wrappedCode = `
        ${code}
        if (typeof ${ch.functionName} !== 'function') {
          throw new Error("Function '${ch.functionName}' was not defined in your code.");
        }
        return ${ch.functionName};
      `;
      const factory = new Function('console', wrappedCode);
      userFunc = factory(mockConsole);
    } catch (err) {
      if (statusBadge) {
        statusBadge.textContent = 'SYNTAX ERROR';
        statusBadge.className = 'telemetry-status-badge error';
      }
      if (runtimeEl) runtimeEl.textContent = '⏱ 0.00 ms';
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="test-result-item fail">
            <div class="test-item-left">
              <span class="test-status-pill fail">ERROR</span>
              <span class="test-title-text">Compilation / Syntax Failure</span>
              <span class="test-io-details">${err.message}</span>
            </div>
          </div>
        `;
      }
      if (stdoutConsole) {
        stdoutConsole.textContent = `Error: ${err.message}`;
      }
      return;
    }

    // Run each unit test case
    let passedCount = 0;
    const testResults = [];
    const totalStart = performance.now();

    for (let i = 0; i < ch.testCases.length; i++) {
      const tc = ch.testCases[i];
      let actual = undefined;
      let pass = false;
      let errorMsg = null;
      const tcStart = performance.now();

      try {
        // Deep copy arguments to avoid mutation by reference
        const argsClone = JSON.parse(JSON.stringify(tc.args));
        actual = userFunc(...argsClone);
        pass = deepEqual(actual, tc.expected);
      } catch (e) {
        pass = false;
        errorMsg = e.message;
      }

      const tcEnd = performance.now();
      const tcDuration = (tcEnd - tcStart).toFixed(3);

      if (pass) passedCount += 1;
      testResults.push({
        index: i + 1,
        name: tc.name,
        pass,
        duration: tcDuration,
        expected: tc.expected,
        actual: errorMsg ? `Exception: ${errorMsg}` : actual
      });
    }

    const totalEnd = performance.now();
    const totalRuntime = ((totalEnd - totalStart) + (totalStart - compileStart)).toFixed(2);

    // Update Telemetry Header
    if (runtimeEl) {
      runtimeEl.textContent = `⏱ ${totalRuntime} ms`;
    }

    const countPill = document.getElementById('consoleTestCount');
    if (countPill) {
      countPill.textContent = `${passedCount}/${ch.testCases.length}`;
    }

    if (passedCount === ch.testCases.length) {
      if (statusBadge) {
        statusBadge.textContent = `PASSED (${passedCount}/${ch.testCases.length})`;
        statusBadge.className = 'telemetry-status-badge passed';
      }
      showToastNotification(`🎉 All ${passedCount} tests passed in ${totalRuntime}ms!`);
    } else {
      if (statusBadge) {
        statusBadge.textContent = `FAILED (${passedCount}/${ch.testCases.length})`;
        statusBadge.className = 'telemetry-status-badge failed';
      }
    }

    // Render Test Case Cards
    if (resultsContainer) {
      resultsContainer.innerHTML = testResults.map((r) => `
        <div class="test-result-item ${r.pass ? 'pass' : 'fail'}">
          <div class="test-item-left">
            <span class="test-status-pill ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}</span>
            <span class="test-title-text">Test ${r.index}: ${r.name}</span>
            <span class="test-io-details">Expected: ${JSON.stringify(r.expected)} | Got: ${JSON.stringify(r.actual)}</span>
          </div>
          <div class="test-item-right">
            <span class="test-item-time">${r.duration} ms</span>
          </div>
        </div>
      `).join('');
    }

    // Render Captured Stdout
    if (stdoutConsole) {
      if (capturedLogs.length > 0) {
        stdoutConsole.textContent = capturedLogs.join('\n');
      } else {
        stdoutConsole.innerHTML = '<span class="stdout-empty">// Program executed without console.log output.</span>';
      }
    }
  }

  function showToastNotification(msg) {
    const container = document.getElementById('edtechToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'edtech-toast';
    toast.textContent = msg;
    toast.style.cssText = `
      background: #1e1b4b;
      border: 1px solid #818cf8;
      color: #e0e7ff;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      margin-top: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      animation: fadeIn 0.3s ease;
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  // Setup Textarea listeners
  function setupEditorListeners() {
    const textarea = document.getElementById('codeEditorTextarea');
    const gutter = document.getElementById('editorGutter');
    if (!textarea || !gutter) return;

    textarea.addEventListener('input', () => {
      updateLineNumbers();
      userCodeStore[activeChallengeId] = textarea.value;
    });

    textarea.addEventListener('scroll', () => {
      gutter.scrollTop = textarea.scrollTop;
    });

    // Handle Tab key indentation
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateLineNumbers();
      }
    });
  }

  // Bind to global window for HTML event handlers
  window.selectSandboxChallenge = selectSandboxChallenge;
  window.resetSandboxCode = resetSandboxCode;
  window.copySandboxCode = copySandboxCode;
  window.toggleSandboxHint = toggleSandboxHint;
  window.switchConsoleTab = switchConsoleTab;
  window.runSandboxTests = runSandboxTests;

  // Initialize on DOM load
  setupEditorListeners();
  renderChallenge('two-sum');
})();
/* ===== END Issue #191 ===== */
