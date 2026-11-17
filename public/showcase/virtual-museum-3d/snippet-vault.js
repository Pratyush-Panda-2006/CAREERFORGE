/**
 * Virtual Museum 3D - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Presets for Three.js shaders, lighting, photogrammetry LODs, and gallery cameras.
 */

export class VirtualMuseum3DSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'snip-mus-01',
        title: 'Exhibition Gallery OrbitControls Smooth Inertial Damping Rig',
        category: 'camera',
        tags: ['camera', 'orbit', 'threejs', 'navigation'],
        description: 'Smooth camera panning and rotation controls with spherical angle boundaries for gallery exhibits.',
        code: `function setupMuseumCamera(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.8;
  controls.maxDistance = 6.0;
  controls.maxPolarAngle = Math.PI / 2 + 0.1; // Prevent viewing under floor
  return controls;
}`
      },
      {
        id: 'snip-mus-02',
        title: 'PBR Classical Marble Subsurface Scattering Material Shader',
        category: 'material',
        tags: ['material', 'pbr', 'shader', 'subsurface'],
        description: 'MeshPhysicalMaterial configuration tuned for translucent Carrara marble sculpture rendering.',
        code: `const marbleMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf5f3ee,
  roughness: 0.22,
  metalness: 0.0,
  transmission: 0.15,
  thickness: 0.8,
  attenuationColor: new THREE.Color(0xffe8d6),
  attenuationDistance: 0.6,
  clearcoat: 0.1,
  clearcoatRoughness: 0.1
});`
      },
      {
        id: 'snip-mus-03',
        title: 'Photogrammetry 3D Artifact LOD Decimation Switcher',
        category: 'geometry',
        tags: ['geometry', 'lod', 'photogrammetry', 'optimization'],
        description: 'Configures Level-of-Detail thresholds based on camera distance to maintain 60 FPS across mobile devices.',
        code: `function createArtifactLOD(highMesh, medMesh, lowMesh) {
  const lod = new THREE.LOD();
  lod.addLevel(highMesh, 0);    // Full 150k polygons within 2m
  lod.addLevel(medMesh, 2.5);   // Decimated 30k polygons
  lod.addLevel(lowMesh, 6.0);   // Billboard / low-poly 5k
  return lod;
}`
      },
      {
        id: 'snip-mus-04',
        title: 'Museum Spotlight Gallery Illumination & Soft Shadow Map',
        category: 'lighting',
        tags: ['lighting', 'shadows', 'spotlight', 'gallery'],
        description: 'Warm spotlight array with penumbra decay simulating theatrical museum exhibit illumination.',
        code: `function addExhibitionSpotlight(scene, targetPos, x, y, z) {
  const spot = new THREE.SpotLight(0xfff4e6, 3.5);
  spot.position.set(x, y, z);
  spot.angle = Math.PI / 6;
  spot.penumbra = 0.4;
  spot.decay = 2;
  spot.distance = 15;
  spot.castShadow = true;
  spot.shadow.mapSize.width = 2048;
  spot.shadow.mapSize.height = 2048;
  spot.target.position.copy(targetPos);
  scene.add(spot, spot.target);
  return spot;
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
      id: snippet.id || `snip-mus-${Date.now()}`,
      title: snippet.title.trim(),
      category: snippet.category || 'general',
      tags: Array.isArray(snippet.tags) ? snippet.tags.map(t => t.toLowerCase()) : ['custom'],
      description: snippet.description || 'Custom 3D exhibit snippet',
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

    const vault = new VirtualMuseum3DSnippetVault();
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
        empty.textContent = 'No 3D museum presets found matching your query.';
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
