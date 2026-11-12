document.addEventListener('DOMContentLoaded', () => {
  console.log('Developer Portfolio initialized');
  initTerminal();
  initShortcuts();
  initProjectFilters();
  initResumeDownload();
  initArticleReader();
  initAvailabilityBadge();
  initGitGraph();
  initContributionHeatmap();
});

// Availability badge: tooltip opens on hover, focus or click, and closes on
// Escape, outside click, mouse leave or blur (unless it was pinned by a click).
function initAvailabilityBadge() {
  const wrapper = document.getElementById('availability');
  const badge = document.getElementById('availabilityBadge');
  const tooltip = document.getElementById('availabilityTooltip');
  if (!wrapper || !badge || !tooltip) return;

  let pinned = false;

  function show() {
    tooltip.hidden = false;
    badge.setAttribute('aria-expanded', 'true');
  }

  function hide() {
    tooltip.hidden = true;
    badge.setAttribute('aria-expanded', 'false');
    pinned = false;
  }

  wrapper.addEventListener('mouseenter', show);
  wrapper.addEventListener('mouseleave', () => { if (!pinned) hide(); });
  badge.addEventListener('focus', show);
  badge.addEventListener('blur', () => { if (!pinned) hide(); });

  badge.addEventListener('click', () => {
    if (pinned) {
      hide();
    } else {
      pinned = true;
      show();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tooltip.hidden) {
      hide();
      badge.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) hide();
  });
}

// Virtual file system: objects are directories, strings are files.
// Files whose name is listed in EXECUTABLES are shown in green and can be run as ./name.
const FS = {
  '.bashrc': 'export PS1="dev@kernel-box:\\w\\$ "\\nalias ll="ls -la"',
  'about.md': '# About Me\nDistributed systems engineer passionate about Rust, WebAssembly, and high-performance computing.',
  'bio.txt': 'Alex Vance - Senior Distributed Systems & Rust Kernel Developer.\nI build high-throughput microservice mesh routers, eBPF network monitors\nand WebAssembly runtimes. Based on the internet, mostly.',
  'skills.txt': 'Languages : Rust, Go, C, TypeScript\nPlatforms : Kubernetes, eBPF, WebAssembly, Linux\nInterests : packet processing, schedulers, observability',
  'contact.txt': 'email  : alex@example.dev\ngithub : github.com/alexvance\nnote   : placeholder details for this demo portfolio',
  projects: {
    '.git': { 'config': '[core]\nrepositoryformatversion = 0' },
    'README.md': '# Projects\nTwo open source projects live here. Try: cat hyper-mesh-router.md',
    'projects.txt': 'hyper-mesh-router: Rust eBPF proxy\nwasm-container-daemon: Go WASM container\nreact-admin-dashboard: React developer tools UI',
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
  ['neofetch', 'display hardware stats & live ASCII telemetry gauges'],
  ['skills', 'show technical skills'],
  ['projects', 'list portfolio project files'],
  ['contact', 'show demo contact details'],
  ['ls [-la] [path]', 'list directory contents with optional -l and -a flags'],
  ['cd [path]', 'change directory (supports .., ~ and absolute paths)'],
  ['pwd', 'print the working directory'],
  ['cat <file>', 'print a file (supports stdin pipes)'],
  ['mkdir <dir>', 'create a directory'],
  ['touch <file>', 'create an empty file'],
  ['rm [-r] <path>', 'remove a file or directory'],
  ['grep [-i] <pattern>', 'search pattern in file or piped stdin'],
  ['echo <text>', 'print text'],
  ['cmd1 | cmd2', 'pipe standard output between commands'],
  ['theme dark|light', 'switch the terminal theme'],
  ['history', 'show previous commands'],
  ['play | game', 'start a 30-second typing challenge with local high scores'],
  ['clear', 'clear the screen']
];

window.HELP_LINES = HELP_LINES;
window.FS = FS;

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
function lookup(parts, root = FS) {
  let node = root;
  for (const seg of parts) {
    if (typeof node !== 'object' || node === null || !Object.prototype.hasOwnProperty.call(node, seg)) return null;
    node = node[seg];
  }
  return node;
}

const isDir = (node) => typeof node === 'object' && node !== null;
const toPathString = (parts) => '/' + parts.join('/');

function cloneFs(node) {
  if (typeof node !== 'object' || node === null) return node;
  const copy = {};
  for (const [k, v] of Object.entries(node)) {
    copy[k] = cloneFs(v);
  }
  return copy;
}

class ShellSandbox {
  constructor(fs = null) {
    this.fs = fs || cloneFs(FS);
    this.cwd = [];
    this.history = [];
  }

  resolvePath(input, baseCwd = this.cwd) {
    return resolvePath(baseCwd, input);
  }

  lookup(parts) {
    return lookup(parts, this.fs);
  }

  toPathString(parts = this.cwd) {
    return toPathString(parts);
  }

  tokenize(cmdStr) {
    const stages = [];
    let cur = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < cmdStr.length; i++) {
      const ch = cmdStr[i];
      if ((ch === '"' || ch === "'") && (i === 0 || cmdStr[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = ch;
        } else if (quoteChar === ch) {
          inQuote = false;
        }
        cur += ch;
      } else if (ch === '|' && !inQuote) {
        stages.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) stages.push(cur.trim());
    return stages;
  }

  parseArgs(stage) {
    const tokens = [];
    let cur = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < stage.length; i++) {
      const ch = stage[i];
      if ((ch === '"' || ch === "'") && (i === 0 || stage[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = ch;
        } else if (quoteChar === ch) {
          inQuote = false;
        }
      } else if (/\s/.test(ch) && !inQuote) {
        if (cur.length > 0) {
          tokens.push(cur);
          cur = '';
        }
      } else {
        cur += ch;
      }
    }
    if (cur.length > 0) tokens.push(cur);
    return tokens;
  }

  tabComplete(currentLine) {
    const tokens = this.parseArgs(currentLine);
    const lastToken = currentLine.endsWith(' ') ? '' : (tokens[tokens.length - 1] || '');

    let searchParts = this.cwd.slice();
    let prefix = lastToken;

    if (lastToken.includes('/')) {
      const lastSlashIdx = lastToken.lastIndexOf('/');
      const pathPart = lastToken.slice(0, lastSlashIdx) || '/';
      prefix = lastToken.slice(lastSlashIdx + 1);
      searchParts = this.resolvePath(pathPart);
    }

    const dirNode = this.lookup(searchParts);
    if (!dirNode || typeof dirNode !== 'object') {
      return { matches: [], completion: null };
    }

    const entries = Object.keys(dirNode).filter(name => name.startsWith(prefix));
    if (entries.length === 0) {
      return { matches: [], completion: null };
    }

    if (entries.length === 1) {
      const match = entries[0];
      const isDirectory = typeof dirNode[match] === 'object' && dirNode[match] !== null;
      const completionSuffix = match + (isDirectory ? '/' : '');
      const completion = lastToken.includes('/')
        ? lastToken.slice(0, lastToken.lastIndexOf('/') + 1) + completionSuffix
        : completionSuffix;
      return { matches: entries, completion };
    }

    return { matches: entries, completion: null };
  }

  execute(cmdLine) {
    const raw = cmdLine.trim();
    if (!raw) return { output: '', error: null, exitCode: 0 };

    this.history.push(raw);
    const stages = this.tokenize(raw);
    let pipeData = '';

    for (let s = 0; s < stages.length; s++) {
      const stageStr = stages[s];
      const tokens = this.parseArgs(stageStr);
      if (!tokens.length) continue;

      const name = tokens[0];
      const args = tokens.slice(1);
      const res = this.runSingle(name, args, pipeData);

      if (res.error && s === stages.length - 1) {
        return res;
      }
      pipeData = res.output;
    }

    return { output: pipeData, error: null, exitCode: 0 };
  }

  runSingle(name, args, stdin) {
    switch (name) {
      case 'pwd':
        return { output: this.toPathString(), exitCode: 0 };

      case 'cd': {
        const target = args[0] ? this.resolvePath(args[0]) : [];
        const node = this.lookup(target);
        if (node === null) return { output: '', error: `cd: no such file or directory: ${args[0]}`, exitCode: 1 };
        if (typeof node !== 'object') return { output: '', error: `cd: not a directory: ${args[0]}`, exitCode: 1 };
        this.cwd = target;
        return { output: '', exitCode: 0 };
      }

      case 'ls': {
        const flags = args.filter(a => a.startsWith('-')).join('').replace(/-/g, '');
        const showAll = flags.includes('a');
        const longListing = flags.includes('l');
        const pathArg = args.find(a => !a.startsWith('-'));

        const target = pathArg ? this.resolvePath(pathArg) : this.cwd;
        const node = this.lookup(target);
        if (node === null) return { output: '', error: `ls: cannot access '${pathArg}': No such file or directory`, exitCode: 1 };

        if (typeof node !== 'object') {
          return { output: pathArg || '', exitCode: 0 };
        }

        let names = Object.keys(node);
        if (!showAll) {
          names = names.filter(n => !n.startsWith('.'));
        }
        names.sort();

        if (longListing) {
          const lines = names.map(n => {
            const isDirNode = typeof node[n] === 'object' && node[n] !== null;
            const perms = isDirNode ? 'drwxr-xr-x' : (EXECUTABLES.includes(n) ? '-rwxr-xr-x' : '-rw-r--r--');
            const size = isDirNode ? 4096 : (typeof node[n] === 'string' ? node[n].length : 0);
            const dateStr = 'Nov 12 12:00';
            const suffix = isDirNode ? '/' : (EXECUTABLES.includes(n) ? '*' : '');
            return `${perms} 1 dev dev ${String(size).padStart(5, ' ')} ${dateStr} ${n}${suffix}`;
          });
          return { output: lines.join('\n'), exitCode: 0 };
        }

        const formatted = names.map(n => {
          const isDirNode = typeof node[n] === 'object' && node[n] !== null;
          return n + (isDirNode ? '/' : (EXECUTABLES.includes(n) ? '*' : ''));
        });
        return { output: formatted.join('\n'), exitCode: 0 };
      }

      case 'cat': {
        const fileArgs = args.filter(a => !a.startsWith('-'));
        if (fileArgs.length === 0) {
          return { output: stdin || '', exitCode: 0 };
        }
        const outputs = [];
        for (const file of fileArgs) {
          const node = this.lookup(this.resolvePath(file));
          if (node === null) return { output: '', error: `cat: ${file}: No such file or directory`, exitCode: 1 };
          if (typeof node === 'object' && node !== null) return { output: '', error: `cat: ${file}: Is a directory`, exitCode: 1 };
          outputs.push(node);
        }
        return { output: outputs.join('\n'), exitCode: 0 };
      }

      case 'grep': {
        const flags = args.filter(a => a.startsWith('-')).join('').replace(/-/g, '');
        const ignoreCase = flags.includes('i');
        const lineNumbers = flags.includes('n');
        const invert = flags.includes('v');
        const nonFlagArgs = args.filter(a => !a.startsWith('-'));

        const pattern = nonFlagArgs[0] || '';
        const fileArg = nonFlagArgs[1];

        let content = stdin;
        if (fileArg) {
          const node = this.lookup(this.resolvePath(fileArg));
          if (node === null) return { output: '', error: `grep: ${fileArg}: No such file or directory`, exitCode: 1 };
          if (typeof node === 'object') return { output: '', error: `grep: ${fileArg}: Is a directory`, exitCode: 1 };
          content = node;
        }

        if (!content) return { output: '', exitCode: 0 };

        const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ignoreCase ? 'i' : '');
        const matchingLines = [];
        const lines = content.split('\n');

        lines.forEach((l, idx) => {
          const matches = re.test(l);
          const keep = invert ? !matches : matches;
          if (keep) {
            matchingLines.push(lineNumbers ? `${idx + 1}:${l}` : l);
          }
        });

        return { output: matchingLines.join('\n'), exitCode: 0 };
      }

      case 'mkdir': {
        const dirName = args[0];
        if (!dirName) return { output: '', error: 'mkdir: missing operand', exitCode: 1 };
        const parts = this.resolvePath(dirName);
        const parentParts = parts.slice(0, -1);
        const namePart = parts[parts.length - 1];

        const parentNode = this.lookup(parentParts);
        if (!parentNode || typeof parentNode !== 'object') {
          return { output: '', error: `mkdir: cannot create directory '${dirName}': No such file or directory`, exitCode: 1 };
        }
        if (parentNode[namePart]) {
          return { output: '', error: `mkdir: cannot create directory '${dirName}': File exists`, exitCode: 1 };
        }
        parentNode[namePart] = {};
        return { output: '', exitCode: 0 };
      }

      case 'touch': {
        const fileName = args[0];
        if (!fileName) return { output: '', error: 'touch: missing operand', exitCode: 1 };
        const parts = this.resolvePath(fileName);
        const parentParts = parts.slice(0, -1);
        const namePart = parts[parts.length - 1];

        const parentNode = this.lookup(parentParts);
        if (!parentNode || typeof parentNode !== 'object') {
          return { output: '', error: `touch: cannot touch '${fileName}': No such file or directory`, exitCode: 1 };
        }
        if (!parentNode[namePart]) {
          parentNode[namePart] = '';
        }
        return { output: '', exitCode: 0 };
      }

      case 'rm': {
        const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
        const targetArg = args.find(a => !a.startsWith('-'));
        if (!targetArg) return { output: '', error: 'rm: missing operand', exitCode: 1 };

        const parts = this.resolvePath(targetArg);
        if (parts.length === 0) return { output: '', error: 'rm: cannot remove root directory', exitCode: 1 };

        const parentParts = parts.slice(0, -1);
        const namePart = parts[parts.length - 1];
        const parentNode = this.lookup(parentParts);

        if (!parentNode || !Object.prototype.hasOwnProperty.call(parentNode, namePart)) {
          return { output: '', error: `rm: cannot remove '${targetArg}': No such file or directory`, exitCode: 1 };
        }

        const targetIsDir = typeof parentNode[namePart] === 'object' && parentNode[namePart] !== null;
        if (targetIsDir && !recursive) {
          return { output: '', error: `rm: cannot remove '${targetArg}': Is a directory`, exitCode: 1 };
        }

        delete parentNode[namePart];
        return { output: '', exitCode: 0 };
      }

      case 'echo':
        return { output: args.join(' '), exitCode: 0 };

      case 'history':
        return {
          output: this.history.map((h, i) => `${String(i + 1).padStart(3, ' ')}  ${h}`).join('\n'),
          exitCode: 0
        };

      case 'clear':
        return { output: '__CLEAR__', exitCode: 0 };

      default:
        return { output: '', error: `${name}: command not found`, exitCode: 127 };
    }
  }
}

window.ShellSandbox = ShellSandbox;

function initTerminal() {
  const screen = document.getElementById('vterm-screen');
  const form = document.getElementById('vterm-form');
  const input = document.getElementById('vterm-input');
  const promptEl = document.getElementById('vterm-prompt');
  const term = document.getElementById('vterm');
  if (!screen || !form || !input) return;

  const sandbox = new ShellSandbox(FS);
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
    promptEl.textContent = 'dev@kernel-box:' + sandbox.toPathString() + '$';
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

  const specialCommands = {
    help() {
      HELP_LINES.forEach(([cmd, desc]) => {
        const row = document.createElement('div');
        row.className = 'vterm-line';
        const c = document.createElement('span');
        c.className = 'vterm-cmd';
        c.textContent = cmd.padEnd(20, ' ');
        const d = document.createElement('span');
        d.textContent = desc;
        row.append(c, d);
        screen.appendChild(row);
      });
    },
    neofetch() {
      const art = [
        '       /\\          alex@kernel-box',
        '      /  \\         ---------------',
        '     /\\   \\        OS: Arch Linux x86_64',
        '    /      \\       Host: Precision 7780 Kernel Rig',
        '   /   ,,   \\      Kernel: 6.8.9-zen1-1-zen',
        '  /   |  |  -\\     Uptime: 3 days, 14 hours, 28 mins',
        ' /_-\'\'    \'\'-_\\    Shell: zsh 5.9 (x86_64-pc-linux-gnu)',
        '                   WM: Hyprland (Wayland)',
        '                   CPU: AMD Ryzen 9 7950X (32) @ 5.700GHz',
        '                   GPU: NVIDIA GeForce RTX 4090 24GB',
        '                   Memory: 18.4 GiB / 64.0 GiB (28%)',
        '                   CPU Load: [=======>------------] 34%'
      ];
      art.forEach(l => line(l, 'vterm-neofetch-line'));
    },
    fetch() { specialCommands.neofetch(); },
    sysinfo() { specialCommands.neofetch(); },
    skills() { lines(FS['skills.txt']); },
    projects() { lines(FS.projects['README.md']); printLs(FS.projects); },
    contact() { lines(FS['contact.txt']); },
    theme(args) {
      const mode = args[0];
      if (mode !== 'dark' && mode !== 'light') return line('usage: theme dark|light', 'vterm-err');
      term.setAttribute('data-theme', mode);
      line('theme set to ' + mode);
    },
    clear() { screen.textContent = ''; },
    play() { document.dispatchEvent(new CustomEvent('portfolio:play')); },
    game() { document.dispatchEvent(new CustomEvent('portfolio:play')); }
  };

  function run(raw) {
    const text = raw.trim();
    const echoed = line('', 'vterm-echo');
    const p = document.createElement('span');
    p.className = 'vterm-cmd';
    p.textContent = promptEl.textContent + ' ';
    echoed.append(p, document.createTextNode(raw));
    if (!text) return;

    const [firstWord, ...rest] = text.split(/\s+/);

    // If it's a pipe command or sandbox-handled command
    if (text.includes('|') || ['pwd', 'cd', 'ls', 'cat', 'grep', 'mkdir', 'touch', 'rm', 'echo', 'history'].includes(firstWord)) {
      const res = sandbox.execute(text);
      if (res.output === '__CLEAR__') {
        screen.textContent = '';
      } else {
        if (res.output) lines(res.output);
        if (res.error) line(res.error, 'vterm-err');
      }
    } else if (Object.prototype.hasOwnProperty.call(specialCommands, firstWord)) {
      sandbox.history.push(text);
      specialCommands[firstWord](rest);
    } else if (firstWord.startsWith('./') && EXECUTABLES.includes(firstWord.slice(2)) && lookup(resolvePath(sandbox.cwd, firstWord)) !== null) {
      sandbox.history.push(text);
      lines(lookup(resolvePath(sandbox.cwd, firstWord)));
    } else {
      sandbox.history.push(text);
      line(firstWord + ': command not found. Type \'help\' for the list of commands.', 'vterm-err');
    }
  }

  function submitCommand(raw) {
    run(raw);
    input.value = '';
    historyIndex = sandbox.history.length;
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
      if (historyIndex === sandbox.history.length) draft = input.value;
      if (historyIndex > 0) historyIndex--;
      if (sandbox.history.length) input.value = sandbox.history[historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < sandbox.history.length) historyIndex++;
      input.value = historyIndex === sandbox.history.length ? draft : sandbox.history[historyIndex];
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const comp = sandbox.tabComplete(input.value);
      if (comp.completion) {
        const tokens = sandbox.parseArgs(input.value);
        if (input.value.endsWith(' ')) {
          input.value += comp.completion;
        } else if (tokens.length > 0) {
          tokens[tokens.length - 1] = comp.completion;
          input.value = tokens.join(' ');
        } else {
          input.value = comp.completion;
        }
      } else if (comp.matches && comp.matches.length > 1) {
        line(promptEl.textContent + ' ' + input.value, 'vterm-echo');
        line(comp.matches.join('  '));
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      screen.textContent = '';
    }
  });

  // Clicking the screen focuses the prompt, unless the visitor is selecting text.
  term.addEventListener('click', (event) => {
    if (event.target.closest('[data-terminal-game]')) return;
    if (!window.getSelection().toString()) input.focus();
  });

  line('Welcome to the DevCraft virtual shell. Type \'help\' to get started.');
  updatePrompt();

  window.terminalApi = {
    clear() {
      screen.textContent = '';
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
    } catch {
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


// ==========================================================================
// Interactive Git Commit Tree & DAG Branch Visualizer Engine (Issue #398)
// Renders SVG branch bezier curves, simulates checkout, cherry-pick & commits
// ==========================================================================
function initGitGraph() {
  const section = document.getElementById('git-graph');
  if (!section) return;

  const svg = document.getElementById('gitDagSvg');
  const nodesLayer = document.getElementById('gitNodesLayer');
  const headBadge = document.getElementById('gitHeadBadge');
  const cardHash = document.getElementById('cardHash');
  const cardBranch = document.getElementById('cardBranch');
  const cardMsg = document.getElementById('cardMsg');
  const cardAuthor = document.getElementById('cardAuthor');
  const cardDate = document.getElementById('cardDate');
  const cardDiff = document.getElementById('cardDiff');
  const termOutput = document.getElementById('gitTermOutput');

  const checkoutBtn = document.getElementById('gitCheckoutBtn');
  const cherryPickBtn = document.getElementById('gitCherryPickBtn');
  const newCommitBtn = document.getElementById('gitNewCommitBtn');
  const resetTreeBtn = document.getElementById('gitResetTreeBtn');
  const pills = document.querySelectorAll('.git-pill');

  const ROW_Y = {
    'main': 60,
    'feature/v2-zero-copy': 120,
    'hotfix/ebpf-ring-buffer': 180
  };

  const BRANCH_COLORS = {
    'main': '#38bdf8',
    'feature/v2-zero-copy': '#a855f7',
    'hotfix/ebpf-ring-buffer': '#f97316'
  };

  // Canonical Commits DAG
  function getDefaultCommits() {
    return [
      {
        id: 'c1',
        hash: 'e81a3d2',
        branch: 'main',
        x: 60,
        y: ROW_Y['main'],
        msg: 'Initial architecture setup and kernel harness',
        author: 'Alex Vance <alex@kernel-box.org>',
        date: '3 days ago',
        additions: 320,
        deletions: 0,
        files: 6,
        parents: []
      },
      {
        id: 'c2',
        hash: 'b19c44f',
        branch: 'main',
        x: 180,
        y: ROW_Y['main'],
        msg: 'Implement epoll-based network event pump',
        author: 'Alex Vance <alex@kernel-box.org>',
        date: '2 days ago',
        additions: 142,
        deletions: 18,
        files: 3,
        parents: ['c1']
      },
      {
        id: 'c3',
        hash: 'f42e88a',
        branch: 'feature/v2-zero-copy',
        x: 280,
        y: ROW_Y['feature/v2-zero-copy'],
        msg: 'Draft zero-copy slice deserialization logic',
        author: 'Alex Vance <alex@kernel-box.org>',
        date: '36 hours ago',
        additions: 215,
        deletions: 42,
        files: 4,
        parents: ['c2']
      },
      {
        id: 'c4',
        hash: 'c37a91d',
        branch: 'feature/v2-zero-copy',
        x: 400,
        y: ROW_Y['feature/v2-zero-copy'],
        msg: 'Integrate FlatBuffers memory layout benchmarks',
        author: 'Alex Vance <alex@kernel-box.org>',
        date: '28 hours ago',
        additions: 98,
        deletions: 12,
        files: 2,
        parents: ['c3']
      },
      {
        id: 'c5',
        hash: 'd09a25b',
        branch: 'hotfix/ebpf-ring-buffer',
        x: 320,
        y: ROW_Y['hotfix/ebpf-ring-buffer'],
        msg: 'Fix eBPF ring buffer consumer lockup on overflow',
        author: 'Alex Vance <alex@kernel-box.org>',
        date: '20 hours ago',
        additions: 34,
        deletions: 9,
        files: 1,
        parents: ['c1']
      },
      {
        id: 'c6',
        hash: '7ec128f',
        branch: 'main',
        x: 480,
        y: ROW_Y['main'],
        msg: 'Merge branch hotfix/ebpf-ring-buffer into main',
        author: 'Alex Vance <alex@kernel-box.org>',
        date: '16 hours ago',
        additions: 34,
        deletions: 9,
        files: 1,
        parents: ['c2', 'c5']
      },
      {
        id: 'c7',
        hash: 'a4f9e1c',
        branch: 'main',
        x: 640,
        y: ROW_Y['main'],
        msg: 'Merge pull request #42 from feature/v2-zero-copy',
        author: 'Alex Vance <alex@kernel-box.org>',
        date: '2 hours ago',
        additions: 184,
        deletions: 26,
        files: 4,
        parents: ['c6', 'c4']
      }
    ];
  }

  let commits = getDefaultCommits();
  let currentHeadCommitId = 'c7';
  let selectedCommitId = 'c7';
  let activeBranchFilter = 'all';

  function logTerminal(prompt, output) {
    if (!termOutput) return;
    const pLine = document.createElement('div');
    pLine.className = 'term-line prompt';
    pLine.textContent = `$ ${prompt}`;

    const oLine = document.createElement('div');
    oLine.className = 'term-line output';
    oLine.textContent = output;

    termOutput.appendChild(pLine);
    termOutput.appendChild(oLine);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function getCommitById(id) {
    return commits.find(c => c.id === id);
  }

  function renderDag() {
    if (!svg || !nodesLayer) return;

    svg.innerHTML = '';
    nodesLayer.innerHTML = '';

    // Filter commits based on activeBranchFilter
    const visibleCommits = commits.filter(c => {
      if (activeBranchFilter === 'all') return true;
      return c.branch === activeBranchFilter;
    });

    const visibleIds = new Set(visibleCommits.map(c => c.id));

    // Draw SVG curves between commits and their parents
    visibleCommits.forEach(commit => {
      commit.parents.forEach(pId => {
        if (!visibleIds.has(pId)) return;
        const parent = getCommitById(pId);
        if (!parent) return;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const strokeColor = BRANCH_COLORS[commit.branch] || '#38bdf8';

        // Calculate smooth cubic bezier curve
        let d = '';
        if (commit.y === parent.y) {
          // Horizontal line
          d = `M ${parent.x} ${parent.y} L ${commit.x} ${commit.y}`;
        } else {
          // Curved fork or merge
          const cp1x = parent.x + (commit.x - parent.x) * 0.55;
          const cp1y = parent.y;
          const cp2x = parent.x + (commit.x - parent.x) * 0.45;
          const cp2y = commit.y;
          d = `M ${parent.x} ${parent.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${commit.x} ${commit.y}`;
        }

        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('opacity', '0.75');
        svg.appendChild(path);
      });
    });

    // Render Commit Nodes
    visibleCommits.forEach(commit => {
      const node = document.createElement('div');
      const isHead = (commit.id === currentHeadCommitId);
      const isSelected = (commit.id === selectedCommitId);
      const branchClass = commit.branch.startsWith('feature') ? 'feature' : commit.branch.startsWith('hotfix') ? 'hotfix' : 'main';

      node.className = `git-node ${branchClass} ${isHead ? 'is-head' : ''} ${isSelected ? 'is-selected' : ''}`;
      node.style.left = `${commit.x}px`;
      node.style.top = `${commit.y}px`;
      node.setAttribute('data-id', commit.id);
      node.title = `[${commit.branch}] ${commit.hash} - ${commit.msg}`;

      node.innerHTML = `
        <div class="git-circle"></div>
        <span class="git-node-label">${commit.hash}</span>
      `;

      node.addEventListener('click', () => {
        selectCommit(commit.id);
      });

      nodesLayer.appendChild(node);

      // If HEAD, attach animated head pointer marker
      if (isHead) {
        const headMarker = document.createElement('div');
        headMarker.className = 'git-head-pointer-marker';
        headMarker.style.left = `${commit.x}px`;
        headMarker.style.top = `${commit.y - 12}px`;
        headMarker.innerHTML = `
          <div class="head-marker-pill">HEAD</div>
          <div class="head-marker-arrow"></div>
        `;
        nodesLayer.appendChild(headMarker);
      }
    });

    updateSelectedCard();
  }

  function selectCommit(id) {
    selectedCommitId = id;
    const commit = getCommitById(id);
    if (commit) {
      logTerminal(`git log -1 ${commit.hash}`, `commit ${commit.hash} (${commit.branch})
Author: ${commit.author}
"${commit.msg}"`);
    }
    renderDag();
  }

  function updateSelectedCard() {
    const commit = getCommitById(selectedCommitId) || getCommitById(currentHeadCommitId);
    if (!commit) return;

    if (cardHash) cardHash.textContent = `commit ${commit.hash}`;
    if (cardBranch) cardBranch.textContent = commit.branch;
    if (cardMsg) cardMsg.textContent = commit.msg;
    if (cardAuthor) cardAuthor.textContent = `👤 ${commit.author}`;
    if (cardDate) cardDate.textContent = `📅 ${commit.date}`;
    if (cardDiff) {
      cardDiff.innerHTML = `
        <span class="diff-add">+${commit.additions} additions</span>
        <span class="diff-del">-${commit.deletions} deletions</span>
        <span class="diff-files">${commit.files} files changed</span>
      `;
    }

    const headCommit = getCommitById(currentHeadCommitId);
    if (headBadge && headCommit) {
      headBadge.textContent = `HEAD → ${headCommit.branch} @ ${headCommit.hash}`;
    }
  }

  // Action: git checkout
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const targetCommit = getCommitById(selectedCommitId);
      if (!targetCommit) return;
      currentHeadCommitId = targetCommit.id;
      logTerminal(`git checkout ${targetCommit.branch}`, `Switched to branch '${targetCommit.branch}'.
HEAD is now at ${targetCommit.hash} "${targetCommit.msg}"`);
      renderDag();
    });
  }

  // Action: git cherry-pick
  if (cherryPickBtn) {
    cherryPickBtn.addEventListener('click', () => {
      const source = getCommitById(selectedCommitId);
      const head = getCommitById(currentHeadCommitId);
      if (!source || !head) return;

      if (source.branch === head.branch) {
        logTerminal(`git cherry-pick ${source.hash}`, `Commit ${source.hash} already exists in branch '${head.branch}'.`);
        return;
      }

      const newId = `c${commits.length + 1}`;
      const newHash = Math.random().toString(16).substring(2, 9);
      const newCommit = {
        id: newId,
        hash: newHash,
        branch: head.branch,
        x: head.x + 90,
        y: ROW_Y[head.branch] || ROW_Y['main'],
        msg: `[cherry-pick] ${source.msg}`,
        author: 'Alex Vance <alex@kernel-box.org>',
        date: 'just now',
        additions: source.additions,
        deletions: source.deletions,
        files: source.files,
        parents: [head.id]
      };

      commits.push(newCommit);
      currentHeadCommitId = newId;
      selectedCommitId = newId;
      logTerminal(`git cherry-pick ${source.hash}`, `[${head.branch} ${newHash}] ${source.msg}
Cherry-picked onto ${head.branch}!`);
      renderDag();
    });
  }

  // Action: git commit (simulate new commit)
  if (newCommitBtn) {
    newCommitBtn.addEventListener('click', () => {
      const head = getCommitById(currentHeadCommitId);
      if (!head) return;

      const newId = `c${commits.length + 1}`;
      const newHash = Math.random().toString(16).substring(2, 9);
      const sampleMessages = [
        'Optimize lock-free concurrent ring buffer read pointer',
        'Add zero-allocation parser benchmarks',
        'Refactor memory layout for SIMD vectorization',
        'Harden boundary assertions and add unit tests'
      ];
      const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

      const newCommit = {
        id: newId,
        hash: newHash,
        branch: head.branch,
        x: head.x + 90,
        y: ROW_Y[head.branch] || ROW_Y['main'],
        msg: randomMsg,
        author: 'Alex Vance <alex@kernel-box.org>',
        date: 'just now',
        additions: Math.floor(Math.random() * 80) + 20,
        deletions: Math.floor(Math.random() * 15) + 2,
        files: Math.floor(Math.random() * 3) + 1,
        parents: [head.id]
      };

      commits.push(newCommit);
      currentHeadCommitId = newId;
      selectedCommitId = newId;
      logTerminal(`git commit -m "${randomMsg}"`, `[${head.branch} ${newHash}] ${randomMsg}
 1 file changed, ${newCommit.additions} insertions(+), ${newCommit.deletions} deletions(-)`);
      renderDag();
    });
  }

  // Action: reset tree
  if (resetTreeBtn) {
    resetTreeBtn.addEventListener('click', () => {
      commits = getDefaultCommits();
      currentHeadCommitId = 'c7';
      selectedCommitId = 'c7';
      activeBranchFilter = 'all';
      pills.forEach(p => {
        const isAll = p.getAttribute('data-branch') === 'all';
        p.classList.toggle('active', isAll);
        p.setAttribute('aria-selected', String(isAll));
      });
      logTerminal('git reset --hard origin/main', 'HEAD is now at a4f9e1c Merge pull request #42 from feature/v2-zero-copy. Tree graph reset to canonical topology.');
      renderDag();
    });
  }

  // Branch filter pills
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => {
        const isCurrent = (p === pill);
        p.classList.toggle('active', isCurrent);
        p.setAttribute('aria-selected', String(isCurrent));
      });
      activeBranchFilter = pill.getAttribute('data-branch') || 'all';
      logTerminal(`git branch --list "${activeBranchFilter}"`, `Filtering DAG view to branch: ${activeBranchFilter}`);
      renderDag();
    });
  });

  // Initial DAG render
  renderDag();
}

window.initGitGraph = initGitGraph;

// ==========================================================================
// Terminal Neofetch Hardware Stats & Live Gauges Widget Engine (Issue #441)
// ==========================================================================

function formatAsciiBar(percent, width = 20) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const fillLen = Math.round((clamped / 100) * width);
  if (fillLen <= 0) return `[${'-'.repeat(width)}]`;
  if (fillLen >= width) return `[${'='.repeat(width)}]`;
  return `[${'='.repeat(fillLen - 1)}>${'-'.repeat(width - fillLen)}]`;
}

function initNeofetchTelemetryWidget() {
  const section = document.getElementById('neofetch-section');
  if (!section) return null;

  const uptimeEl = document.getElementById('neofetchUptime');
  const stressBtn = document.getElementById('neofetchStressBtn');
  const stressLabel = document.getElementById('stressBtnLabel');

  const cpuVal = document.getElementById('cpuLoadVal');
  const cpuAscii = document.getElementById('cpuAsciiBar');
  const cpuFill = document.getElementById('cpuMeterFill');

  const memVal = document.getElementById('memUsageVal');
  const memAscii = document.getElementById('memAsciiBar');
  const memFill = document.getElementById('memMeterFill');

  const swapVal = document.getElementById('swapUsageVal');
  const swapAscii = document.getElementById('swapAsciiBar');
  const swapFill = document.getElementById('swapMeterFill');

  const netVal = document.getElementById('netIoVal');
  const netAscii = document.getElementById('netAsciiBar');
  const netFill = document.getElementById('netMeterFill');

  let stressActive = false;
  const startTimestamp = Date.now() - (3 * 86400 + 14 * 3600 + 28 * 60 + 12) * 1000;

  function update() {
    const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    const days = Math.floor(elapsedSeconds / 86400);
    const hours = Math.floor((elapsedSeconds % 86400) / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    if (uptimeEl) {
      uptimeEl.textContent = `${days} days, ${hours} hours, ${mins} mins, ${secs}s`;
    }

    // Telemetry simulation
    let cpuPercent;
    let memPercent;
    let swapPercent;
    let netRx;
    let netTx;
    let netPercent;

    if (stressActive) {
      cpuPercent = Math.min(99, Math.floor(84 + Math.random() * 15));
      memPercent = Math.min(95, Math.floor(78 + Math.random() * 10));
      swapPercent = Math.min(45, Math.floor(18 + Math.random() * 8));
      netRx = 38.5 + Math.random() * 14.0;
      netTx = 22.0 + Math.random() * 8.5;
      netPercent = Math.min(95, Math.floor((netRx / 60) * 100));
    } else {
      cpuPercent = Math.floor(24 + Math.random() * 18);
      memPercent = Math.floor(27 + Math.random() * 3);
      swapPercent = Math.floor(5 + Math.random() * 2);
      netRx = 6.2 + Math.random() * 4.1;
      netTx = 1.8 + Math.random() * 1.5;
      netPercent = Math.min(60, Math.floor((netRx / 30) * 100));
    }

    if (cpuVal) cpuVal.textContent = `${cpuPercent}%`;
    if (cpuAscii) cpuAscii.textContent = formatAsciiBar(cpuPercent, 20);
    if (cpuFill) cpuFill.style.width = `${cpuPercent}%`;

    const memGib = ((memPercent / 100) * 64).toFixed(1);
    if (memVal) memVal.textContent = `${memGib} GiB / 64.0 GiB (${memPercent}%)`;
    if (memAscii) memAscii.textContent = formatAsciiBar(memPercent, 20);
    if (memFill) memFill.style.width = `${memPercent}%`;

    const swapGib = ((swapPercent / 100) * 32).toFixed(1);
    if (swapVal) swapVal.textContent = `${swapGib} GiB / 32.0 GiB (${swapPercent}%)`;
    if (swapAscii) swapAscii.textContent = formatAsciiBar(swapPercent, 20);
    if (swapFill) swapFill.style.width = `${swapPercent}%`;

    if (netVal) netVal.textContent = `↓ ${netRx.toFixed(1)} MB/s  ↑ ${netTx.toFixed(1)} MB/s`;
    if (netAscii) netAscii.textContent = formatAsciiBar(netPercent, 20);
    if (netFill) netFill.style.width = `${netPercent}%`;
  }

  if (stressBtn) {
    stressBtn.addEventListener('click', () => {
      stressActive = !stressActive;
      section.classList.toggle('stress-mode', stressActive);
      if (stressLabel) stressLabel.textContent = stressActive ? 'Stop Stress' : 'Stress Test';
      stressBtn.classList.toggle('active', stressActive);
      update();
    });
  }

  const ticker = setInterval(update, 1000);
  update();

  return { update, toggleStress: () => stressBtn && stressBtn.click(), ticker };
}

window.formatAsciiBar = formatAsciiBar;
window.initNeofetchTelemetryWidget = initNeofetchTelemetryWidget;

/* ==========================================================================
   GitHub Contribution Activity Heatmap Logic (Issue #334)
   ========================================================================== */

function getIntensityLevel(count) {
  if (!count || count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

function generateYearActivity(year) {
  const startDay = new Date(year, 0, 1);
  const dayOfWeekJan1 = startDay.getDay(); // 0 = Sunday
  startDay.setDate(startDay.getDate() - dayOfWeekJan1);

  const endDay = new Date(year, 11, 31);
  const dayOfWeekDec31 = endDay.getDay();
  endDay.setDate(endDay.getDate() + (6 - dayOfWeekDec31));

  let totalContributions = 0;
  let busiestCount = 0;
  let busiestDateObj = null;
  let longestStreak = 0;
  let activeStreakTracker = 0;

  const current = new Date(startDay.getTime());
  const weeks = [];
  let currentWeek = [];

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  while (current <= endDay) {
    const isCurrentYear = current.getFullYear() === year;
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayOfWeek = current.getDay();

    let count = 0;
    let level = 0;
    let details = '';

    if (isCurrentYear) {
      let hash = 0;
      for (let i = 0; i < dateStr.length; i++) {
        hash = (hash * 31 + dateStr.charCodeAt(i)) & 0xffffffff;
      }
      hash = Math.abs(hash);

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const roll = hash % 100;
      const activeThreshold = isWeekend ? 35 : 82;

      if (roll <= activeThreshold) {
        const countRoll = (hash >> 3) % 100;
        if (countRoll < 55) {
          count = 1 + (hash % 3);
        } else if (countRoll < 80) {
          count = 4 + (hash % 3);
        } else if (countRoll < 94) {
          count = 7 + (hash % 3);
        } else {
          count = 10 + (hash % 9);
        }
      }

      level = getIntensityLevel(count);
      totalContributions += count;

      if (count > busiestCount) {
        busiestCount = count;
        busiestDateObj = new Date(current.getTime());
      }

      if (count > 0) {
        activeStreakTracker++;
        if (activeStreakTracker > longestStreak) {
          longestStreak = activeStreakTracker;
        }
      } else {
        activeStreakTracker = 0;
      }

      const repos = ['kernel-box/zero-copy', 'ebpf-guard/network-telemetry', 'wasm-mesh/router-core', 'linux-rust-driver'];
      const repo = repos[hash % repos.length];
      if (count === 0) {
        details = 'No activity recorded';
      } else if (count === 1) {
        details = `1 commit to ${repo}`;
      } else {
        const prs = (hash % 3 === 0) ? Math.min(2, Math.floor(count / 3)) : 0;
        const commits = count - prs;
        if (prs > 0) {
          details = `${commits} commit${commits !== 1 ? 's' : ''} to ${repo} • ${prs} pull request${prs !== 1 ? 's' : ''}`;
        } else {
          details = `${commits} commits to ${repo}`;
        }
      }
    }

    const cellData = {
      date: dateStr,
      dateObj: new Date(current.getTime()),
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      monthName: MONTH_NAMES[current.getMonth()],
      dayOfMonth: current.getDate(),
      year: current.getFullYear(),
      isCurrentYear,
      count,
      level,
      details
    };

    currentWeek.push(cellData);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    year,
    weeks,
    totalContributions,
    longestStreak,
    currentStreak: activeStreakTracker,
    busiestCount,
    busiestDateFormatted: busiestDateObj
      ? `${MONTH_NAMES[busiestDateObj.getMonth()]} ${busiestDateObj.getDate()}, ${year}`
      : 'N/A'
  };
}

function initContributionHeatmap() {
  const section = document.getElementById('contribution-heatmap');
  if (!section) return;

  const matrix = document.getElementById('heatmapMatrix');
  const monthsRow = document.getElementById('heatmapMonthsRow');
  const tooltip = document.getElementById('heatmapTooltip');
  const tooltipTitle = document.getElementById('heatmapTooltipTitle');
  const tooltipMeta = document.getElementById('heatmapTooltipMeta');
  const selectedInfo = document.getElementById('heatmapSelectedInfo');
  const liveText = document.getElementById('heatmapLiveText');

  const metricTotal = document.getElementById('metricTotalCommits');
  const metricYearSub = document.getElementById('metricYearSub');
  const metricCurrentStreak = document.getElementById('metricCurrentStreak');
  const metricLongestStreak = document.getElementById('metricLongestStreak');
  const metricBusiestDay = document.getElementById('metricBusiestDay');
  const metricBusiestDate = document.getElementById('metricBusiestDate');

  const yearButtons = section.querySelectorAll('.heatmap-year-btn');
  let selectedCell = null;
  let currentYear = 2026;

  function showTooltip(cell) {
    if (!tooltip || !tooltipTitle || !tooltipMeta) return;

    const count = parseInt(cell.getAttribute('data-count'), 10) || 0;
    const dayName = cell.getAttribute('data-day') || '';
    const monthName = cell.getAttribute('data-month') || '';
    const dayNum = cell.getAttribute('data-day-num') || '';
    const year = cell.getAttribute('data-year') || '';
    const details = cell.getAttribute('data-details') || '';

    const countStr = count === 0 ? 'No contributions' : `${count} contribution${count !== 1 ? 's' : ''}`;
    tooltipTitle.innerHTML = `<strong>${countStr}</strong> on ${dayName}, ${monthName} ${dayNum}, ${year}`;
    tooltipMeta.textContent = details;

    tooltip.removeAttribute('hidden');
    tooltip.setAttribute('aria-hidden', 'false');

    const rect = cell.getBoundingClientRect();
    const tipWidth = tooltip.offsetWidth;
    const tipHeight = tooltip.offsetHeight;

    let left = rect.left + rect.width / 2 - tipWidth / 2;
    let top = rect.top - tipHeight - 8;

    if (left < 10) left = 10;
    if (left + tipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tipWidth - 10;
    }

    if (top < 10) {
      top = rect.bottom + 8;
      tooltip.classList.add('tooltip-bottom');
    } else {
      tooltip.classList.remove('tooltip-bottom');
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.classList.add('visible');
  }

  function hideTooltip() {
    if (!tooltip) return;
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function selectCell(cell) {
    if (selectedCell) {
      selectedCell.classList.remove('selected');
    }
    selectedCell = cell;
    cell.classList.add('selected');

    if (!selectedInfo) return;
    const count = parseInt(cell.getAttribute('data-count'), 10) || 0;
    const dayName = cell.getAttribute('data-day') || '';
    const monthName = cell.getAttribute('data-month') || '';
    const dayNum = cell.getAttribute('data-day-num') || '';
    const year = cell.getAttribute('data-year') || '';
    const details = cell.getAttribute('data-details') || '';

    const countStr = count === 0 ? 'No contributions' : `${count} contribution${count !== 1 ? 's' : ''}`;
    selectedInfo.innerHTML = `<span class="selected-pin">📌</span> <strong>${dayName}, ${monthName} ${dayNum}, ${year}:</strong> ${countStr}${details ? ` &bull; ${details}` : ''}`;
  }

  function renderHeatmap(year) {
    currentYear = year;
    const data = generateYearActivity(year);

    if (metricTotal) metricTotal.textContent = data.totalContributions.toLocaleString();
    if (metricYearSub) metricYearSub.textContent = `in ${year}`;
    if (metricCurrentStreak) metricCurrentStreak.textContent = `${data.currentStreak} day${data.currentStreak !== 1 ? 's' : ''}`;
    if (metricLongestStreak) metricLongestStreak.textContent = `${data.longestStreak} day${data.longestStreak !== 1 ? 's' : ''}`;
    if (metricBusiestDay) metricBusiestDay.textContent = `${data.busiestCount} commits`;
    if (metricBusiestDate) metricBusiestDate.textContent = data.busiestDateFormatted;
    if (liveText) liveText.textContent = `${data.totalContributions.toLocaleString()} contributions in ${year}`;

    if (selectedInfo) {
      selectedInfo.textContent = 'Hover or focus on any date square to inspect contribution details.';
    }
    selectedCell = null;
    hideTooltip();

    // Render Month labels
    if (monthsRow) {
      monthsRow.innerHTML = '';
      const renderedMonths = new Set();
      data.weeks.forEach((week, weekIdx) => {
        for (let d = 0; d < week.length; d++) {
          const day = week[d];
          if (day.isCurrentYear && day.dayOfMonth <= 7 && !renderedMonths.has(day.monthName)) {
            renderedMonths.add(day.monthName);
            const label = document.createElement('span');
            label.className = 'heatmap-month-label';
            label.style.left = `${weekIdx * 15}px`;
            label.textContent = day.monthName;
            monthsRow.appendChild(label);
            break;
          }
        }
      });
    }

    // Render 52-53 Week Columns of 7 Day Cells
    if (matrix) {
      matrix.innerHTML = '';
      data.weeks.forEach(week => {
        const weekCol = document.createElement('div');
        weekCol.className = 'heatmap-week-col';

        week.forEach(day => {
          if (!day.isCurrentYear) {
            const emptyCell = document.createElement('span');
            emptyCell.className = 'heatmap-cell heatmap-cell-empty';
            emptyCell.setAttribute('aria-hidden', 'true');
            weekCol.appendChild(emptyCell);
          } else {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = `heatmap-cell level-${day.level}`;
            cell.setAttribute('data-date', day.date);
            cell.setAttribute('data-count', String(day.count));
            cell.setAttribute('data-level', String(day.level));
            cell.setAttribute('data-day', day.dayName);
            cell.setAttribute('data-month', day.monthName);
            cell.setAttribute('data-day-num', String(day.dayOfMonth));
            cell.setAttribute('data-year', String(day.year));
            cell.setAttribute('data-details', day.details);
            cell.setAttribute('role', 'gridcell');

            const countText = day.count === 0 ? 'No' : String(day.count);
            cell.setAttribute('aria-label', `${countText} contribution${day.count !== 1 ? 's' : ''} on ${day.dayName}, ${day.monthName} ${day.dayOfMonth}, ${day.year}`);

            cell.addEventListener('mouseenter', () => showTooltip(cell));
            cell.addEventListener('mouseleave', hideTooltip);
            cell.addEventListener('focus', () => showTooltip(cell));
            cell.addEventListener('blur', hideTooltip);
            cell.addEventListener('click', () => selectCell(cell));

            weekCol.appendChild(cell);
          }
        });

        matrix.appendChild(weekCol);
      });
    }
  }

  // Set up year selector click handlers
  yearButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetYear = parseInt(btn.getAttribute('data-year'), 10);
      if (isNaN(targetYear) || targetYear === currentYear) return;

      yearButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      renderHeatmap(targetYear);
    });
  });

  // Global listeners to hide tooltip on scroll or Escape key
  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTooltip();
  });

  // Initial render with 2026
  renderHeatmap(2026);
}

window.getIntensityLevel = getIntensityLevel;
window.generateYearActivity = generateYearActivity;
window.initContributionHeatmap = initContributionHeatmap;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContributionHeatmap);
} else {
  initContributionHeatmap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNeofetchTelemetryWidget);
} else {
  initNeofetchTelemetryWidget();
}
