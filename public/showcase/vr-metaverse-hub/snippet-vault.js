/**
 * VR Metaverse Hub - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Preset configurations for WebXR shaders, spatial audio, haptics, and avatar IK rigs.
 */

export class VRMetaverseHubSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'snip-vr-01',
        title: 'WebXR Stereo Render Loop with Dynamic Foveated Rendering',
        category: 'rendering',
        tags: ['webxr', 'foveation', 'gpu', 'gl'],
        description: 'High-refresh rate WebGL/WebXR stereo render loop targeting 90 FPS with variable rate shading.',
        code: `function onXRFrame(time, frame) {
  const session = frame.session;
  session.requestAnimationFrame(onXRFrame);
  const pose = frame.getViewerPose(xrRefSpace);
  if (!pose) return;

  const glLayer = session.renderState.baseLayer;
  gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

  for (const view of pose.views) {
    const viewport = glLayer.getViewport(view);
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    renderSceneEye(view.projectionMatrix, view.transform.inverse.matrix);
  }
}`
      },
      {
        id: 'snip-vr-02',
        title: 'Binaural Spatial Audio HRTF Convolver Graph',
        category: 'audio',
        tags: ['audio', 'spatial', 'hrtf', 'resonance'],
        description: 'Web Audio API PannerNode configuration with inverse-distance attenuation and directional sound cone.',
        code: `const panner = new PannerNode(audioCtx, {
  panningModel: 'HRTF',
  distanceModel: 'inverse',
  refDistance: 1.0,
  maxDistance: 100.0,
  rolloffFactor: 1.5,
  coneInnerAngle: 60,
  coneOuterAngle: 120,
  coneOuterGain: 0.2
});
panner.positionX.setValueAtTime(avatarPos.x, audioCtx.currentTime);
panner.positionY.setValueAtTime(avatarPos.y, audioCtx.currentTime);
panner.positionZ.setValueAtTime(avatarPos.z, audioCtx.currentTime);`
      },
      {
        id: 'snip-vr-03',
        title: '6-DOF Haptic Actuator Dual-Frequency Vibration Burst',
        category: 'haptics',
        tags: ['haptics', 'controllers', 'gamepad', 'pulse'],
        description: 'Triggers dual-motor resonant haptic feedback on WebXR gamepads for collision and grab impacts.',
        code: `async function pulseHaptics(source, intensity = 0.8, durationMs = 120) {
  if (source.gamepad && source.gamepad.hapticActuators?.length > 0) {
    const actuator = source.gamepad.hapticActuators[0];
    if (actuator.pulse) {
      await actuator.pulse(intensity, durationMs);
    } else if (actuator.playEffect) {
      await actuator.playEffect('dual-rumble', {
        duration: durationMs,
        strongMagnitude: intensity,
        weakMagnitude: intensity * 0.6
      });
    }
  }
}`
      },
      {
        id: 'snip-vr-04',
        title: 'Two-Bone Analytical Inverse Kinematics Leg Rig',
        category: 'avatar',
        tags: ['avatar', 'ik', 'kinematics', 'animation'],
        description: 'Calculates hip, knee, and ankle rotations given foot target point and pole vector.',
        code: `function solveTwoBoneIK(root, mid, end, target, poleVector) {
  const l1 = mid.distanceTo(root);
  const l2 = end.distanceTo(mid);
  const targetDist = Math.min(root.distanceTo(target), (l1 + l2) * 0.999);

  const cosKnee = (l1 * l1 + l2 * l2 - targetDist * targetDist) / (2 * l1 * l2);
  const kneeAngle = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosKnee)));
  return { kneeAngle, targetDist };
}`
      }
    ];
  }

  getAll() {
    return this.snippets;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') return this.snippets;
    const lower = tag.toLowerCase();
    return this.snippets.filter(s =>
      s.category.toLowerCase() === lower ||
      s.tags.some(t => t.toLowerCase() === lower)
    );
  }

  searchSnippets(query) {
    if (!query || !query.trim()) return this.snippets;
    const terms = query.toLowerCase().trim().split(/\s+/);
    return this.snippets.filter(s => {
      const matchCorpus = `${s.title} ${s.description} ${s.category} ${s.tags.join(' ')} ${s.code}`.toLowerCase();
      return terms.every(term => matchCorpus.includes(term));
    });
  }

  addSnippet(snippet) {
    if (!snippet.title || !snippet.code) {
      throw new Error('Title and code are required fields');
    }
    const newSnippet = {
      id: snippet.id || `snip-vr-${Date.now()}`,
      title: snippet.title.trim(),
      category: snippet.category || 'general',
      tags: Array.isArray(snippet.tags) ? snippet.tags.map(t => t.toLowerCase()) : ['custom'],
      description: snippet.description || 'Custom WebXR preset snippet',
      code: snippet.code.trim()
    };
    this.snippets.unshift(newSnippet);
    return newSnippet;
  }
}

// UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('snippetList');
    if (!listContainer) return;

    const vault = new VRMetaverseHubSnippetVault();
    let currentTag = 'all';

    const searchInput = document.getElementById('searchSnippetInput');
    const tagBar = document.getElementById('tagFilterBar');
    const modal = document.getElementById('addSnippetModal');
    const openModalBtn = document.getElementById('openAddModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const snippetForm = document.getElementById('newSnippetForm');

    function renderSnippets(items) {
      listContainer.replaceChildren();

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-vault';
        empty.textContent = 'No WebXR preset snippets found matching your query.';
        listContainer.appendChild(empty);
        return;
      }

      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'snippet-card';

        const head = document.createElement('div');
        head.className = 'card-header';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = item.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(item.code);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 1500);
          } catch {
            copyBtn.textContent = 'Error';
          }
        });

        head.append(title, copyBtn);

        const desc = document.createElement('p');
        desc.className = 'card-desc';
        desc.textContent = item.description;

        const tagList = document.createElement('div');
        tagList.className = 'tag-pills';

        for (const t of item.tags) {
          const pill = document.createElement('span');
          pill.className = 'tag-pill';
          pill.textContent = `#${t}`;
          tagList.appendChild(pill);
        }

        const pre = document.createElement('pre');
        pre.className = 'code-block';
        const code = document.createElement('code');
        code.textContent = item.code;
        pre.appendChild(code);

        card.append(head, desc, tagList, pre);
        listContainer.appendChild(card);
      }
    }

    function applyFilters() {
      const q = searchInput?.value || '';
      let results = vault.filterByTag(currentTag);
      if (q.trim()) {
        const terms = q.toLowerCase().trim().split(/\s+/);
        results = results.filter(s => {
          const text = `${s.title} ${s.description} ${s.tags.join(' ')} ${s.code}`.toLowerCase();
          return terms.every(t => text.includes(t));
        });
      }
      renderSnippets(results);
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    if (tagBar) {
      tagBar.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('filter-pill')) {
          document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          target.classList.add('active');
          currentTag = target.dataset.tag || 'all';
          applyFilters();
        }
      });
    }

    if (openModalBtn && modal) {
      openModalBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (snippetForm) {
      snippetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleVal = document.getElementById('inputSnippetTitle')?.value || '';
        const catVal = document.getElementById('inputSnippetCategory')?.value || 'general';
        const tagsVal = document.getElementById('inputSnippetTags')?.value || '';
        const descVal = document.getElementById('inputSnippetDesc')?.value || '';
        const codeVal = document.getElementById('inputSnippetCode')?.value || '';

        try {
          vault.addSnippet({
            title: titleVal,
            category: catVal,
            tags: tagsVal.split(',').map(s => s.trim()).filter(Boolean),
            description: descVal,
            code: codeVal
          });
          snippetForm.reset();
          modal?.classList.remove('active');
          applyFilters();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    renderSnippets(vault.getAll());
  });
}
