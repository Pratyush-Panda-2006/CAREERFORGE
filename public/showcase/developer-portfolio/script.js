document.addEventListener('DOMContentLoaded', () => {
  console.log('Developer Portfolio initialized');
  initTerminal();
  initShortcuts();
  initProjectFilters();
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
    'ebpf-notes.md': '# Notes on eBPF verifier limits\nBounded loops, stack size and why your program gets rejected at load time.'
  },
  bin: {
    'hello.sh': 'Hello from the virtual file system. Nothing here touches your real machine.'
  }
};
const EXECUTABLES = ['hello.sh'];

const HELP_LINES = [
  ['help', 'show this list'],
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value;
    run(raw);
    input.value = '';
    historyIndex = history.length;
    draft = '';
    updatePrompt();
    screen.scrollTop = screen.scrollHeight;
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
