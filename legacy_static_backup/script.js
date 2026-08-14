// PRISMA LABS Open Source & Career Portal Interactivity
document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNavLink();
  initProjectFilters();
  initLeaderboardFilter();
  initCertificateVerifier();
});

// Highlight current active navigation item based on path
function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// Open Source Projects Filtering & Search
function initProjectFilters() {
  const searchInput = document.getElementById('projectSearchInput');
  const filterPills = document.querySelectorAll('.filter-pill[data-category]');
  const projectCards = document.querySelectorAll('.project-card-wrapper');

  if (!projectCards.length) return;

  let activeCategory = 'all';
  let searchQuery = '';

  function filterProjects() {
    projectCards.forEach(card => {
      const category = card.getAttribute('data-category');
      const text = card.textContent.toLowerCase();
      
      const matchesCategory = (activeCategory === 'all' || category === activeCategory);
      const matchesSearch = text.includes(searchQuery.toLowerCase());

      if (matchesCategory && matchesSearch) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      filterProjects();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      filterProjects();
    });
  }
}

// Leaderboard Filtering & Search
function initLeaderboardFilter() {
  const searchInput = document.getElementById('leaderboardSearchInput');
  const rows = document.querySelectorAll('.leaderboard-row');
  const periodPills = document.querySelectorAll('.period-pill');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
          row.style.display = 'table-row';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  periodPills.forEach(pill => {
    pill.addEventListener('click', () => {
      periodPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

// Certificate Interactive Verifier & Generator
function initCertificateVerifier() {
  const certInput = document.getElementById('certLookupInput');
  const certBtn = document.getElementById('certLookupBtn');
  const certResultMsg = document.getElementById('certResultMsg');
  const certNameInput = document.getElementById('certNameInput');
  const certRecipientDisplay = document.getElementById('certRecipientDisplay');
  const certIdDisplay = document.getElementById('certIdDisplay');

  // Sample database of certificates for instant lookup
  const certificateDB = {
    'PRISMA-CERT-2026-8942': {
      name: 'Alex Rivera',
      project: 'PRISMA Autonomous AI Voice Router',
      role: 'Lead Open Source Contributor',
      date: 'August 10, 2026',
      prs: 14,
      status: 'VERIFIED & ACTIVE'
    },
    'PRISMA-CERT-2026-1042': {
      name: 'Elena Rostova',
      project: 'PRISMA Vector Memory Store',
      role: 'Core Backend Contributor',
      date: 'July 28, 2026',
      prs: 22,
      status: 'VERIFIED & ACTIVE'
    },
    'PRISMA-CERT-2026-5519': {
      name: 'Marcus Chen',
      project: 'Bespoke UI Design System',
      role: 'Frontend UI/UX Contributor',
      date: 'August 02, 2026',
      prs: 9,
      status: 'VERIFIED & ACTIVE'
    }
  };

  if (certBtn && certInput && certResultMsg) {
    certBtn.addEventListener('click', () => {
      const certId = certInput.value.trim().toUpperCase();
      if (!certId) {
        certResultMsg.innerHTML = '<span style="color: #ff6b6b;">Please enter a valid Certificate ID.</span>';
        return;
      }

      if (certificateDB[certId]) {
        const cert = certificateDB[certId];
        certResultMsg.innerHTML = `
          <div style="background: rgba(76, 217, 157, 0.12); border: 1px solid rgba(76, 217, 157, 0.3); padding: 1rem; border-radius: 10px; text-align: left; margin-top: 1rem;">
            <div style="color: #4cd99d; font-weight: 600; font-family: var(--font-mono); margin-bottom: 0.25rem;">✓ CERTIFICATE VERIFIED AUTHORITATIVE</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${cert.name}</div>
            <div style="font-size: 0.9rem; color: var(--text-soft);">Project: ${cert.project} (${cert.prs} Merged PRs)</div>
            <div style="font-size: 0.8rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 0.4rem;">Issued: ${cert.date} • ID: ${certId}</div>
          </div>
        `;
        if (certRecipientDisplay) certRecipientDisplay.textContent = cert.name;
        if (certIdDisplay) certIdDisplay.textContent = certId;
      } else {
        certResultMsg.innerHTML = `
          <div style="background: rgba(230, 184, 92, 0.1); border: 1px solid var(--hairline-gold); padding: 1rem; border-radius: 10px; text-align: left; margin-top: 1rem;">
            <div style="color: var(--accent-gold); font-weight: 600; font-family: var(--font-mono);">⚡ CERTIFICATE GENERATOR DEMO MODE</div>
            <div style="font-size: 0.9rem; color: var(--text-soft);">ID "${certId}" initialized. Live verification seal active.</div>
          </div>
        `;
        if (certRecipientDisplay) certRecipientDisplay.textContent = 'Verified Contributor';
        if (certIdDisplay) certIdDisplay.textContent = certId;
      }
    });
  }

  // Interactive Live Name Preview for Certificate Generator
  if (certNameInput && certRecipientDisplay) {
    certNameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      certRecipientDisplay.textContent = val.length > 0 ? val : '[ Contributor Name ]';
    });
  }
}
