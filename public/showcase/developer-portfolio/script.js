document.addEventListener('DOMContentLoaded', () => {
  console.log('Developer Portfolio initialized');
  initTerminal();
  initShortcuts();
  initProjectFilters();
  initResumeDownload();
  initArticleReader();
});

// Virtual file system: objects are directories, strings are files.
// Files whose name is listed in EXECUTABLES are shown in green and can be run as ./name.
const FS = {
  'bio.txt': 'Alex Vance - Senior Distributed Systems & Rust Kernel Developer.\nI build high-throughput microservice mesh routers, eBPF network monitors\nand WebAssembly runtimes. Based on the internet, mostly.',
  'skills.txt': 'Languages : Rust, Go, C, TypeScript\nPlatforms : Kubernetes, eBPF, WebAssembly, Linux\nInterests : packet processing, schedulers, observability',
  'contact.txt': 'email  : alex@example.dev\ngithub : github.com/alexvance\nnote   : placeholder details for this demo portfolio',
  projects: {
    'README.md': '# Projects\nTwo open source projects live here. Try: cat hyper-mesh-router.md',
    'hyper-mesh-router.md': '# hyper-mesh-router  (Rust, 4.8k stars)\nZero-allocation HTTP/3 load balancer compiled to eBPF byte-code.',
    'wasm-container-daemon.md': '# wasm-container-daemon  (Go, 2.3k stars)\nUltra-lightweight OCI compliant container runtime running WASM binaries in under 5ms.'
  },
  blog: {
    'ebpf-notes.md': '# Notes on eBPF verifier limits\nBounded loops, stack size and why your program gets rejected at load time.',
    'zero-copy.md': '# Zero-Copy Deserialization with Rust & FlatBuffers\nHow we eliminated 85% of memory allocations and GC pauses in high-throughput network gateways.',
    'raft-consensus.md': '# Distributed Consensus: Surviving Split-Brain in Raft\nAnalyzing network partition edge cases, leader lease expiration, and log compaction strategies.'
  },
  bin: {
    'hello.sh': 'Hello from the virtual file system. Nothing here touches your real machine.'
  }
};
const EXECUTABLES = ['hello.sh'];

const HELP_LINES = [
  ['help', 'show this list'],
  ['skills', 'show technical skills'],
  ['projects', 'list portfolio project files'],
  ['contact', 'show demo contact details'],
  ['ls [path]', 'list directory contents'],
  ['cd [path]', 'change directory (supports .., ~ and absolute paths)'],
  ['pwd', 'print the working directory'],
  ['cat <file>', 'print a file'],
  ['echo <text>', 'print text'],
  ['theme dark|light', 'switch the terminal theme'],
  ['history', 'show previous commands'],
  ['clear', 'clear the screen']
];

// Turn a path (relative to cwd parts) into a normalised array of segments.
function resolvePath(cwdParts, input) {
  let parts = input.startsWith('/') || input === '~' || input.startsWith('~/') ? [] : cwdParts.slice();
  input.replace(/^~/, '').split('/').forEach((seg) => {
    if (seg === '' || seg === '.') return;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  });
  return parts;
}

// Walk the tree. Returns the directory/file node, or null if any segment is missing.
function lookup(parts) {
  let node = FS;
  for (const seg of parts) {
    if (typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, seg)) return null;
    node = node[seg];
  }
  return node;
}

const isDir = (node) => typeof node === 'object' && node !== null;
const toPathString = (parts) => '/' + parts.join('/');

function initTerminal() {
  const screen = document.getElementById('vterm-screen');
  const form = document.getElementById('vterm-form');
  const input = document.getElementById('vterm-input');
  const promptEl = document.getElementById('vterm-prompt');
  const term = document.getElementById('vterm');
  if (!screen || !form || !input) return;

  let cwd = [];
  const history = [];
  let historyIndex = 0;
  let draft = '';

  function line(text, cls) {
    const div = document.createElement('div');
    div.className = 'vterm-line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    screen.appendChild(div);
    return div;
  }

  function lines(text, cls) {
    text.split('\n').forEach((t) => line(t, cls));
  }

  function updatePrompt() {
    promptEl.textContent = 'dev@kernel-box:' + toPathString(cwd) + '$';
  }

  function printLs(node) {
    const row = document.createElement('div');
    row.className = 'vterm-line vterm-ls';
    Object.keys(node).sort().forEach((name) => {
      const span = document.createElement('span');
      if (isDir(node[name])) { span.className = 'vterm-dir'; span.textContent = name + '/'; }
      else if (EXECUTABLES.includes(name)) { span.className = 'vterm-exe'; span.textContent = name + '*'; }
      else { span.className = 'vterm-file'; span.textContent = name; }
      row.appendChild(span);
    });
    if (!row.childNodes.length) row.textContent = '(empty)';
    screen.appendChild(row);
  }

  const commands = {
    help() {
      HELP_LINES.forEach(([cmd, desc]) => {
        const row = document.createElement('div');
        row.className = 'vterm-line';
        const c = document.createElement('span');
        c.className = 'vterm-cmd';
        c.textContent = cmd.padEnd(18, ' ');
        const d = document.createElement('span');
        d.textContent = desc;
        row.append(c, d);
        screen.appendChild(row);
      });
    },
    skills() { lines(FS['skills.txt']); },
    projects() { lines(FS.projects['README.md']); printLs(FS.projects); },
    contact() { lines(FS['contact.txt']); },
    pwd() { line(toPathString(cwd)); },
    ls(args) {
      const target = args[0] ? resolvePath(cwd, args[0]) : cwd;
      const node = lookup(target);
      if (node === null) return line('ls: cannot access \'' + args[0] + '\': No such file or directory', 'vterm-err');
      if (!isDir(node)) return line(args[0]);
      printLs(node);
    },
    cd(args) {
      if (!args[0]) { cwd = []; return; }
      const target = resolvePath(cwd, args[0]);
      const node = lookup(target);
      if (node === null) return line('cd: no such file or directory: ' + args[0], 'vterm-err');
      if (!isDir(node)) return line('cd: not a directory: ' + args[0], 'vterm-err');
      cwd = target;
    },
    cat(args) {
      if (!args.length) return line('cat: missing file operand', 'vterm-err');
      args.forEach((arg) => {
        const node = lookup(resolvePath(cwd, arg));
        if (node === null) line('cat: ' + arg + ': No such file or directory', 'vterm-err');
        else if (isDir(node)) line('cat: ' + arg + ': Is a directory', 'vterm-err');
        else lines(node);
      });
    },
    echo(args) { line(args.join(' ')); },
    theme(args) {
      const mode = args[0];
      if (mode !== 'dark' && mode !== 'light') return line('usage: theme dark|light', 'vterm-err');
      term.setAttribute('data-theme', mode);
      line('theme set to ' + mode);
    },
    history() {
      if (!history.length) return line('(no history yet)');
      history.forEach((h, i) => line(String(i + 1).padStart(3, ' ') + '  ' + h));
    },
    clear() { screen.textContent = ''; }
  };

  function run(raw) {
    const text = raw.trim();
    const echoed = line('', 'vterm-echo');
    const p = document.createElement('span');
    p.className = 'vterm-cmd';
    p.textContent = promptEl.textContent + ' ';
    echoed.append(p, document.createTextNode(raw));
    if (!text) return;

    history.push(text);
    const [name, ...args] = text.split(/\s+/);

    if (Object.prototype.hasOwnProperty.call(commands, name)) {
      commands[name](args);
    } else if (name.startsWith('./') && EXECUTABLES.includes(name.slice(2)) && lookup(resolvePath(cwd, name)) !== null) {
      lines(lookup(resolvePath(cwd, name)));
    } else {
      line(name + ': command not found. Type \'help\' for the list of commands.', 'vterm-err');
    }
  }

  function submitCommand(raw) {
    run(raw);
    input.value = '';
    historyIndex = history.length;
    draft = '';
    updatePrompt();
    screen.scrollTop = screen.scrollHeight;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitCommand(input.value);
  });

  const shortcuts = document.getElementById('vterm-shortcuts');
  if (shortcuts) shortcuts.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-terminal-command]');
    if (!button || !shortcuts.contains(button)) return;
    submitCommand(button.dataset.terminalCommand);
    input.focus({ preventScroll: true });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      if (historyIndex > 0) historyIndex--;
      if (history.length) input.value = history[historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length) historyIndex++;
      input.value = historyIndex === history.length ? draft : history[historyIndex];
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    }
  });

  // Clicking the screen focuses the prompt, unless the visitor is selecting text.
  term.addEventListener('click', () => {
    if (!window.getSelection().toString()) input.focus();
  });

  line('Welcome to the DevCraft virtual shell. Type \'help\' to get started.');
  updatePrompt();

  window.terminalApi = {
    clear() {
      commands.clear();
    },
    toggleTheme() {
      const cur = term.getAttribute('data-theme') || 'dark';
      const nxt = cur === 'dark' ? 'light' : 'dark';
      term.setAttribute('data-theme', nxt);
      line('theme toggled to ' + nxt + ' via shortcut');
      return nxt;
    },
    focus() {
      input.focus();
    }
  };
}

/* ===============================================================
   Keyboard Shortcuts Cheat-Sheet Modal & Global Listeners (Issue #59)
   =============================================================== */
function initShortcuts() {
  const modal = document.getElementById('shortcutsModal');
  const overlay = document.getElementById('shortcutsOverlay');
  const triggerBtn = document.getElementById('shortcutsBtn');
  const closeBtn = document.getElementById('shortcutsClose');
  const dismissBtn = document.getElementById('shortcutsDismiss');
  const liveDisplay = document.getElementById('liveKeyDisplay');
  const toastEl = document.getElementById('shortcutToast');

  if (!modal || !overlay) return;

  let toastTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2400);
  }

  function openShortcutsModal() {
    modal.hidden = false;
    overlay.hidden = false;
    if (dismissBtn) dismissBtn.focus();
  }

  function closeShortcutsModal() {
    modal.hidden = true;
    overlay.hidden = true;
    if (triggerBtn) triggerBtn.focus();
  }

  function toggleShortcutsModal() {
    if (modal.hidden) openShortcutsModal();
    else closeShortcutsModal();
  }

  // Trigger button click
  if (triggerBtn) triggerBtn.addEventListener('click', openShortcutsModal);
  if (closeBtn) closeBtn.addEventListener('click', closeShortcutsModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closeShortcutsModal);
  if (overlay) overlay.addEventListener('click', closeShortcutsModal);

  // Shortcut Action Dispatcher
  function executeAction(actionKey) {
    switch (actionKey.toLowerCase()) {
      case 't': {
        if (window.terminalApi) {
          const nextTheme = window.terminalApi.toggleTheme();
          showToast(`[T] Switched to ${nextTheme.toUpperCase()} theme`);
        }
        break;
      }
      case 'c': {
        if (window.terminalApi) {
          window.terminalApi.clear();
          showToast('[C] Terminal screen buffer cleared');
        }
        break;
      }
      case 'ctrl-l': {
        if (window.terminalApi) {
          window.terminalApi.clear();
          showToast('[Ctrl+L] Terminal screen cleared');
        }
        break;
      }
      case 'h': {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('[H] Navigated to Home / Header');
        break;
      }
      case 's': {
        const skills = document.getElementById('skills');
        if (skills) skills.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('[S] Navigated to Technical Skills');
        break;
      }
      case 'p': {
        const projects = document.querySelector('.projects');
        if (projects) projects.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('[P] Navigated to Open Source Projects');
        break;
      }
      case 'i': {
        const term = document.getElementById('vterm');
        const vInput = document.getElementById('vterm-input');
        if (term) term.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (vInput) vInput.focus();
        showToast('[I] Focused Interactive Terminal');
        break;
      }
      case '?':
      case '/': {
        toggleShortcutsModal();
        break;
      }
      default:
        break;
    }
  }

  // Bind "Test" buttons inside modal
  const tryBtns = modal.querySelectorAll('.try-shortcut-btn');
  tryBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      if (key) executeAction(key);
    });
  });

  // Global keydown listener
  window.addEventListener('keydown', (e) => {
    // Update live key detector badge
    if (liveDisplay) {
      const combo = (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + e.key.toUpperCase();
      liveDisplay.textContent = `Detected Key: ${combo} (${e.code})`;
    }

    // Flash matching kbd elements in modal
    const kbds = modal.querySelectorAll('kbd');
    kbds.forEach((k) => {
      if (k.textContent.trim().toLowerCase() === e.key.toLowerCase()) {
        k.classList.add('key-pressed');
        setTimeout(() => k.classList.remove('key-pressed'), 300);
      }
    });

    const isTyping = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);

    // Escape always closes modal or blurs input
    if (e.key === 'Escape') {
      if (!modal.hidden) {
        e.preventDefault();
        closeShortcutsModal();
        return;
      }
      if (isTyping) {
        e.target.blur();
        return;
      }
    }

    // Ctrl+L inside input clears terminal
    if (e.key.toLowerCase() === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeAction('ctrl-l');
      return;
    }

    // Ctrl+K toggles cheat sheet
    if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      toggleShortcutsModal();
      return;
    }

    // If currently typing in an input, do not trigger single letter shortcuts
    if (isTyping) return;

    // Single key global navigation & commands
    const key = e.key.toLowerCase();
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      toggleShortcutsModal();
    } else if (key === 't') {
      e.preventDefault();
      executeAction('t');
    } else if (key === 'c') {
      e.preventDefault();
      executeAction('c');
    } else if (key === 'h') {
      e.preventDefault();
      executeAction('h');
    } else if (key === 's') {
      e.preventDefault();
      executeAction('s');
    } else if (key === 'p') {
      e.preventDefault();
      executeAction('p');
    } else if (key === 'i') {
      e.preventDefault();
      executeAction('i');
    }
  });
}

// Each project can belong to more than one category; keep its existing DOM node.
function initProjectFilters() {
  const section = document.querySelector('.projects');
  if (!section) return;
  const toolbar = section.querySelector('.project-toolbar');
  const buttons = section.querySelectorAll('[data-project-filter]');
  const cards = section.querySelectorAll('[data-project-categories]');
  const count = section.querySelector('.project-count');
  const empty = section.querySelector('.project-empty');
  if (!toolbar || !count || !empty || !buttons.length) return;

  function selectCategory(category) {
    let visible = 0;
    cards.forEach((card) => {
      const categories = card.dataset.projectCategories.split(/\s+/);
      card.hidden = category !== 'all' && !categories.includes(category);
      if (!card.hidden) visible++;
    });
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.projectFilter === category));
    });
    count.textContent = visible + (visible === 1 ? ' project' : ' projects');
    empty.hidden = visible > 0;
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => selectCategory(button.dataset.projectFilter));
  });
  selectCategory('all');
  toolbar.hidden = false;
}

// Resume Download Dropdown - Issue #184
function initResumeDownload() {
  const trigger = document.getElementById('resumeTrigger');
  const dropdown = document.getElementById('resumeDropdown');
  const jsonModal = document.getElementById('resumeJsonModal');
  const overlay = document.getElementById('resumeJsonOverlay');
  const closeBtn = document.getElementById('resumeJsonClose');
  const jsonContent = document.getElementById('resumeJsonContent');
  const copyBtn = document.getElementById('resumeJsonCopy');

  if (!trigger || !dropdown || !jsonModal || !overlay) return;

  // Resume information from the existing portfolio.
  const resume = {
    name: 'Alex Vance',
    title: 'Senior Distributed Systems & Rust Kernel Developer',
    summary:
      'Building high-throughput microservice mesh routers, eBPF network monitors, and WebAssembly runtimes.',
    contact: {
      email: 'alex@example.dev',
      github: 'github.com/alexvance',
      note: 'Placeholder contact details for this demo portfolio.'
    },
    skills: [
      { name: 'HTML & CSS', category: 'Frontend', proficiency: 90 },
      { name: 'JavaScript', category: 'Frontend', proficiency: 80 },
      { name: 'Go', category: 'Backend', proficiency: 75 },
      { name: 'REST APIs', category: 'Backend', proficiency: 70 },
      { name: 'Docker', category: 'DevOps', proficiency: 65 },
      { name: 'Kubernetes', category: 'DevOps', proficiency: 60 },
      { name: 'Linux', category: 'Systems', proficiency: 85 },
      { name: 'Rust', category: 'Systems', proficiency: 55 }
    ],
    technicalExpertise: {
      languages: ['Rust', 'Go', 'C', 'TypeScript'],
      platforms: ['Kubernetes', 'eBPF', 'WebAssembly', 'Linux'],
      interests: [
        'Packet processing',
        'Schedulers',
        'Observability'
      ]
    },
    projects: [
      {
        name: 'hyper-mesh-router',
        language: 'Rust',
        stars: '4.8k',
        description:
          'Zero-allocation HTTP/3 load balancer compiled to eBPF byte-code.'
      },
      {
        name: 'wasm-container-daemon',
        language: 'Go',
        stars: '2.3k',
        description:
          'Ultra-lightweight OCI compliant container runtime running WASM binaries in under 5ms.'
      }
    ]
  };

  const jsonString = JSON.stringify(resume, null, 2);

  function toggleDropdown(forceClose = false) {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';

    dropdown.hidden = forceClose || isOpen;
    trigger.setAttribute(
      'aria-expanded',
      String(!dropdown.hidden)
    );
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function generateTextResume() {
    const text = [
      resume.name,
      resume.title,
      '',
      'PROFESSIONAL SUMMARY',
      resume.summary,
      '',
      'CONTACT',
      `Email: ${resume.contact.email}`,
      `GitHub: ${resume.contact.github}`,
      resume.contact.note,
      '',
      'TECHNICAL SKILLS',
      ...resume.skills.map(
        skill =>
          `${skill.name} - ${skill.category} (${skill.proficiency}%)`
      ),
      '',
      'TECHNICAL EXPERTISE',
      `Languages: ${resume.technicalExpertise.languages.join(', ')}`,
      `Platforms: ${resume.technicalExpertise.platforms.join(', ')}`,
      `Interests: ${resume.technicalExpertise.interests.join(', ')}`,
      '',
      'PROJECTS',
      ...resume.projects.map(
        project =>
          `${project.name} (${project.language}, ${project.stars} stars)\n${project.description}`
      )
    ].join('\n');

    downloadFile(text, 'alex-vance-resume.txt', 'text/plain');
  }

  function generatePDF() {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow pop-ups to generate the PDF.');
      return;
    }

    const skillItems = resume.skills.map(skill =>
      `<li>${skill.name} — ${skill.category} (${skill.proficiency}%)</li>`
    ).join('');

    const projectItems = resume.projects.map(project =>
      `<article>
        <h3>${project.name}</h3>
        <p>${project.description}</p>
        <small>${project.language} | ${project.stars} stars</small>
      </article>`
    ).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Alex Vance - Resume</title>
        <style>
          body {
            max-width: 750px;
            margin: 40px auto;
            padding: 0 25px;
            color: #222;
            font-family: Arial, sans-serif;
            line-height: 1.6;
          }
          h1 { margin-bottom: 4px; }
          h2 {
            margin-top: 25px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ccc;
          }
          h3 { margin-bottom: 4px; }
          .subtitle { color: #555; }
          li { margin-bottom: 5px; }
          article { margin-bottom: 15px; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${resume.name}</h1>
        <p class="subtitle">${resume.title}</p>

        <h2>Professional Summary</h2>
        <p>${resume.summary}</p>

        <h2>Contact</h2>
        <p>Email: ${resume.contact.email}</p>
        <p>GitHub: ${resume.contact.github}</p>
        <small>${resume.contact.note}</small>

        <h2>Technical Skills</h2>
        <ul>${skillItems}</ul>

        <h2>Technical Expertise</h2>
        <p><strong>Languages:</strong>
          ${resume.technicalExpertise.languages.join(', ')}
        </p>
        <p><strong>Platforms:</strong>
          ${resume.technicalExpertise.platforms.join(', ')}
        </p>
        <p><strong>Interests:</strong>
          ${resume.technicalExpertise.interests.join(', ')}
        </p>

        <h2>Projects</h2>
        ${projectItems}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  }

  function openJsonModal() {
    jsonContent.textContent = jsonString;
    jsonModal.hidden = false;
    overlay.hidden = false;
    closeBtn.focus();
  }

  function closeJsonModal() {
    jsonModal.hidden = true;
    overlay.hidden = true;
    trigger.focus();
  }

  trigger.addEventListener('click', () => {
    toggleDropdown();
  });

  dropdown.addEventListener('click', event => {
    const button = event.target.closest('[data-resume-format]');
    if (!button) return;

    const format = button.dataset.resumeFormat;
    toggleDropdown(true);

    if (format === 'pdf') {
      generatePDF();
    } else if (format === 'txt') {
      generateTextResume();
    } else if (format === 'json') {
      openJsonModal();
    }
  });

  document.addEventListener('click', event => {
    if (
      !event.target.closest('.resume-download')
    ) {
      toggleDropdown(true);
    }
  });

  closeBtn.addEventListener('click', closeJsonModal);
  overlay.addEventListener('click', closeJsonModal);

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      copyBtn.textContent = 'Copied!';
    } catch (error) {
      copyBtn.textContent = 'Copy unavailable';
    }

    setTimeout(() => {
      copyBtn.textContent = 'Copy JSON';
    }, 1800);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!jsonModal.hidden) {
        closeJsonModal();
      } else {
        toggleDropdown(true);
      }
    }
  });
}

// ===============================================================
// Interactive Technical Article Reader Modal (Issue #279)
// ===============================================================
function initArticleReader() {
  const modal = document.getElementById('articleModal');
  const overlay = document.getElementById('articleModalOverlay');
  const closeBtn = document.getElementById('articleModalCloseBtn');
  const closeDot = document.getElementById('articleModalCloseDot');
  const modalBody = document.getElementById('articleModalBody');
  const progressBar = document.getElementById('articleProgressBar');
  const progressPill = document.getElementById('articleProgressPill');
  const terminalTitle = document.getElementById('articleModalTerminalTitle');
  const categoryBadge = document.getElementById('modalArticleCategory');
  const readTimeBadge = document.getElementById('modalArticleReadTime');
  const dateBadge = document.getElementById('modalArticleDate');
  const articleTitle = document.getElementById('modalArticleTitle');
  const articleLead = document.getElementById('modalArticleLead');
  const dynamicContent = document.getElementById('articleDynamicContent');
  const backToTopBtn = document.getElementById('articleBackToTopBtn');

  if (!modal || !overlay || !modalBody) return;

  let lastActiveTrigger = null;

  const ARTICLES_DB = {
    'rust-zero-copy': {
      title: 'Zero-Copy Deserialization with Rust & FlatBuffers',
      lead: 'How we eliminated 85% of memory allocations and GC pauses in high-throughput network gateways using mmap and buffer views.',
      category: 'SYSTEMS ARCHITECTURE',
      readTime: '5 min read',
      date: 'Oct 14, 2026',
      path: 'dev@kernel-box: /blog/zero-copy.md',
      content: `
        <h2>1. The Problem: Heap Churn in High-Velocity Ingestion</h2>
        <p>In high-throughput microservice architectures ingesting hundreds of thousands of messages per second, traditional JSON or Protobuf deserializers incur continuous heap allocations. Every nested string and struct requires allocation, parsing, and eventual deallocation.</p>

        <div class="article-callout">
          <strong>Key Insight:</strong> Standard Protobuf decoders instantiate objects on the heap. In contrast, FlatBuffers structures memory such that the serialized binary representation in the buffer matches its in-memory alignment, allowing zero-copy dereferencing directly from slice pointers.
        </div>

        <h2>2. Architecture: Direct Pointer Offsets</h2>
        <p>Rather than unpacking bytes into heap variables, FlatBuffers encodes field offsets in a vtable table at the buffer header. A Rust reader can validate the buffer once and read values via static references.</p>

        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>router.rs (Rust)</span>
            <button type="button" class="btn-copy-code" aria-label="Copy code snippet">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Code
            </button>
          </div>
          <pre class="code-content"><code>// Zero-allocation packet accessor over raw network slice
pub fn route_packet&lt;'a&gt;(raw_bytes: &amp;'a [u8]) -&gt; Result&lt;RoutingTarget&lt;'a&gt;, PacketError&gt; {
    // Validate buffer boundaries in O(1) without heap allocation
    let root = flatbuffers::root::&lt;PacketPayload&lt;'a&gt;&gt;(raw_bytes)
        .map_err(|_| PacketError::CorruptedFrame)?;

    let destination_host: &amp;'a str = root.destination_ip().unwrap_or("0.0.0.0");
    let priority_level: u8 = root.priority();

    Ok(RoutingTarget {
        target: destination_host,
        priority: priority_level,
        payload_view: root.payload_bytes().unwrap_or(&amp;[]),
    })
}</code></pre>
        </div>

        <h2>3. Production Benchmarks &amp; Memory Savings</h2>
        <p>We executed 10,000,000 synthetic JSON vs FlatBuffers queries across an 8-core AMD EPYC server. The outcome was stark:</p>
        <ul>
          <li><strong>Memory Allocations:</strong> Reduced from 420 MB/sec to &lt; 1.2 MB/sec (99.7% reduction).</li>
          <li><strong>P99 Latency:</strong> Dropped from 3.8ms to 0.42ms due to the complete absence of GC stop-the-world cycles.</li>
          <li><strong>Throughput:</strong> Increased from 145,000 req/s to 480,000 req/s on a single socket.</li>
        </ul>

        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>benchmark.sh (Bash)</span>
            <button type="button" class="btn-copy-code" aria-label="Copy code snippet">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Code
            </button>
          </div>
          <pre class="code-content"><code># Run cargo criterion benchmark suite with heap profiling enabled
cargo bench --bench zero_copy_throughput -- --verbose
valgrind --tool=massif target/release/examples/gateway_worker</code></pre>
        </div>

        <h2>4. Key Takeaways</h2>
        <p>When engineering for scale, your data interchange formats are just as critical as your concurrency primitives. Designing around zero-copy buffers lets Rust unleash its true zero-cost abstraction promise.</p>
      `
    },
    'ebpf-tracing': {
      title: 'Navigating Linux eBPF Verifier Constraints at Scale',
      lead: 'Demystifying bounded loop unrolling, register spill limits, and BPF-to-BPF function calls without crashing the verifier.',
      category: 'LINUX KERNEL',
      readTime: '7 min read',
      date: 'Nov 02, 2026',
      path: 'dev@kernel-box: /blog/ebpf-tracing.md',
      content: `
        <h2>1. The Gatekeeper: Understanding the In-Kernel Verifier</h2>
        <p>Linux eBPF provides unparalleled safe kernel observability and packet filtering. However, loading complex programs often yields the dreaded verifier rejection: <em>"program too large or cycle detected"</em>.</p>

        <div class="article-callout">
          <strong>Verifier Safety Rules:</strong> Every eBPF program must prove termination, avoid out-of-bounds pointer arithmetic, and maintain maximum stack depth under 512 bytes.
        </div>

        <h2>2. Bounded Loops with Compiler Pragmas</h2>
        <p>Prior to Linux 5.3, all loops had to be unrolled via <code>#pragma unroll</code>. In modern kernels, bounded loops are permitted, but register state paths grow exponentially. Here is the canonical pattern to satisfy the DAG explorer:</p>

        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>packet_filter.c (C / eBPF)</span>
            <button type="button" class="btn-copy-code" aria-label="Copy code snippet">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Code
            </button>
          </div>
          <pre class="code-content"><code>#include &lt;linux/bpf.h&gt;
#include &lt;bpf/bpf_helpers.h&gt;

#define MAX_HEADERS 8

SEC("xdp")
int xdp_inspect_headers(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx-&gt;data;
    void *data_end = (void *)(long)ctx-&gt;data_end;

    // Strict pointer safety check against data_end
    if (data + sizeof(struct ethhdr) &gt; data_end)
        return XDP_PASS;

    // Explicit upper bound to keep verifier complexity within 1M instructions
    #pragma unroll
    for (int i = 0; i &lt; MAX_HEADERS; i++) {
        if (data + (i * 4) + 4 &gt; data_end) break;
        // Process encapsulated tunnel headers safely
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";</code></pre>
        </div>

        <h2>3. Inspecting Verifier Instruction Traces</h2>
        <p>When the verifier rejects code, launch <code>bpftool</code> with debug level verifier logs to isolate the exact instruction where state tracking branch depth exploded.</p>

        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>cli.sh (Bash)</span>
            <button type="button" class="btn-copy-code" aria-label="Copy code snippet">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Code
            </button>
          </div>
          <pre class="code-content"><code># Inspect bytecode and verifier execution log
sudo bpftool prog load xdp_filter.o /sys/fs/bpf/xdp_filter type xdp --verbose
sudo bpftool prog dump xlated id 42</code></pre>
        </div>
      `
    },
    'raft-consensus': {
      title: 'Distributed Consensus: Surviving Split-Brain in Raft',
      lead: 'Analyzing network partition edge cases, leader lease expiration, and log compaction strategies in geo-distributed clusters.',
      category: 'DISTRIBUTED SYSTEMS',
      readTime: '6 min read',
      date: 'Nov 05, 2026',
      path: 'dev@kernel-box: /blog/raft-consensus.md',
      content: `
        <h2>1. The Anatomy of an Asymmetric Partition</h2>
        <p>In real-world networks, partitions rarely slice nodes into clean binary islands. A node might successfully transmit TCP packets to peer B while dropping acknowledgments from peer C, resulting in partial state confusion.</p>

        <h2>2. Pre-Vote Phase to Prevent Disruptive Term Bumps</h2>
        <p>When an isolated follower loses contact with the leader, it increments its term and broadcasts RequestVote. If the partition heals, the leader is deposed simply because of the artificially inflated term. The Pre-Vote protocol eliminates this vulnerability:</p>

        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>consensus.go (Go)</span>
            <button type="button" class="btn-copy-code" aria-label="Copy code snippet">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Code
            </button>
          </div>
          <pre class="code-content"><code>// PreVote verification step prior to incrementing currentTerm
func (r *RaftNode) RunPreVote(ctx context.Context) bool {
    r.mu.Lock()
    targetTerm := r.currentTerm + 1
    r.mu.Unlock()

    votesGranted := 1 // self vote
    for _, peer := range r.peers {
        resp, err := peer.RequestPreVote(ctx, &amp;PreVoteArgs{
            CandidateID:  r.id,
            NextTerm:     targetTerm,
            LastLogIndex: r.log.LastIndex(),
            LastLogTerm:  r.log.LastTerm(),
        })
        if err == nil &amp;&amp; resp.VoteGranted {
            votesGranted++
        }
    }

    // Only transition to candidate if a quorum confirms our log is up to date
    return votesGranted &gt; len(r.peers)/2
}</code></pre>
        </div>

        <h2>3. Summary Checklist for Production Raft</h2>
        <ul>
          <li>Always enable Pre-Vote to insulate healthy clusters from stale node re-entries.</li>
          <li>Enforce monotonic clock checks on leader lease durations to prevent stale reads during clock skew.</li>
          <li>Decouple log snapshot serialization from state machine lock domains.</li>
        </ul>
      `
    }
  };

  function bindCopyButtons() {
    const copyBtns = dynamicContent.querySelectorAll('.btn-copy-code');
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const wrapper = btn.closest('.code-block-wrapper');
        const codeEl = wrapper ? wrapper.querySelector('.code-content code') : null;
        if (!codeEl) return;

        const textToCopy = codeEl.innerText || codeEl.textContent;
        try {
          await navigator.clipboard.writeText(textToCopy);
          btn.classList.add('copied');
          btn.innerHTML = '<span>✓ Copied!</span>';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Code`;
          }, 2000);
        } catch {
          btn.innerText = 'Copy failed';
        }
      });
    });
  }

  function updateReadingProgress() {
    const scrollable = modalBody.scrollHeight - modalBody.clientHeight;
    if (scrollable <= 0) {
      progressBar.style.width = '100%';
      progressPill.textContent = '100% READ';
      return;
    }
    const scrolled = modalBody.scrollTop;
    const pct = Math.min(100, Math.max(0, Math.round((scrolled / scrollable) * 100)));
    progressBar.style.width = `${pct}%`;
    progressPill.textContent = `${pct}% READ`;
  }

  function openArticle(articleId, triggerEl) {
    const data = ARTICLES_DB[articleId];
    if (!data) return;

    lastActiveTrigger = triggerEl || null;

    terminalTitle.textContent = data.path;
    categoryBadge.textContent = data.category;
    readTimeBadge.textContent = data.readTime;
    dateBadge.textContent = data.date;
    articleTitle.textContent = data.title;
    articleLead.textContent = data.lead;
    dynamicContent.innerHTML = data.content;

    bindCopyButtons();

    modal.hidden = false;
    overlay.hidden = false;
    modalBody.scrollTop = 0;
    updateReadingProgress();

    modalBody.focus();
  }

  function closeArticle() {
    modal.hidden = true;
    overlay.hidden = true;
    if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
      lastActiveTrigger.focus();
    }
  }

  // Reading progress scroll event
  modalBody.addEventListener('scroll', updateReadingProgress, { passive: true });

  // Open triggers
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-article]');
    if (btn) {
      const id = btn.getAttribute('data-open-article');
      openArticle(id, btn);
    }
  });

  // Close triggers
  if (closeBtn) closeBtn.addEventListener('click', closeArticle);
  if (closeDot) closeDot.addEventListener('click', closeArticle);
  if (overlay) overlay.addEventListener('click', closeArticle);

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      e.preventDefault();
      closeArticle();
    }
  });
}

