import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/developer-portfolio/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    window: {},
    console,
    Math,
    Date,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return context;
}

test('virtual file system tree exposes hierarchical files and directories', () => {
  const ctx = loadContext();
  assert.ok(ctx.FS, 'FS must be defined');
  assert.ok(ctx.FS['about.md'], 'about.md must exist in root');
  assert.ok(typeof ctx.FS.projects === 'object', 'projects directory exists');
  assert.ok(ctx.FS.projects['projects.txt'], 'projects.txt exists inside projects');
  assert.ok(typeof ctx.FS.blog === 'object', 'blog directory exists');
  assert.ok(typeof ctx.FS.bin === 'object', 'bin directory exists');
});

test('ShellSandbox executes basic commands (pwd, cd, ls)', () => {
  const ctx = loadContext();
  const ShellSandbox = ctx.ShellSandbox;
  assert.equal(typeof ShellSandbox, 'function', 'ShellSandbox constructor exists');

  const shell = new ShellSandbox();
  assert.equal(shell.execute('pwd').output, '/');

  const cdRes = shell.execute('cd projects');
  assert.equal(cdRes.output, '');
  assert.equal(shell.execute('pwd').output, '/projects');

  const lsRes = shell.execute('ls');
  assert.ok(lsRes.output.includes('projects.txt'));
  assert.ok(lsRes.output.includes('README.md'));

  shell.execute('cd ..');
  assert.equal(shell.execute('pwd').output, '/');
});

test('ShellSandbox ls supports -a, -l, and -la flags', () => {
  const ctx = loadContext();
  const shell = new ctx.ShellSandbox();

  // Without -a, hidden files starting with '.' should not appear
  const lsNormal = shell.execute('ls').output;
  assert.ok(!lsNormal.includes('.bashrc'));

  // With -a, hidden files appear
  const lsA = shell.execute('ls -a').output;
  assert.ok(lsA.includes('.bashrc'));

  // With -l or -la, long listing format appears
  const lsLA = shell.execute('ls -la').output;
  assert.ok(lsLA.includes('.bashrc'));
  assert.ok(lsLA.includes('dev'));
  assert.ok(lsLA.includes('rw-'));
});

test('ShellSandbox supports file creation and deletion (mkdir, touch, rm)', () => {
  const ctx = loadContext();
  const shell = new ctx.ShellSandbox();

  shell.execute('mkdir sandbox');
  assert.ok(shell.execute('ls').output.includes('sandbox'));

  shell.execute('cd sandbox');
  assert.equal(shell.execute('pwd').output, '/sandbox');

  shell.execute('touch test.txt');
  assert.ok(shell.execute('ls').output.includes('test.txt'));

  shell.execute('rm test.txt');
  assert.ok(!shell.execute('ls').output.includes('test.txt'));

  shell.execute('cd ..');
  shell.execute('rm -r sandbox');
  assert.ok(!shell.execute('ls').output.includes('sandbox'));
});

test('ShellSandbox command piping passes standard output to subsequent commands', () => {
  const ctx = loadContext();
  const shell = new ctx.ShellSandbox();

  // Pipe cat into grep
  const res = shell.execute('cat projects/projects.txt | grep react');
  assert.ok(res.output.includes('react-admin-dashboard'));
  assert.ok(!res.output.includes('hyper-mesh-router'));

  // Pipe ls into grep
  const res2 = shell.execute('ls projects | grep wasm');
  assert.ok(res2.output.includes('wasm-container-daemon.md'));
  assert.ok(!res2.output.includes('hyper-mesh-router'));
});

test('ShellSandbox grep supports case-insensitivity (-i)', () => {
  const ctx = loadContext();
  const shell = new ctx.ShellSandbox();

  const caseSensitive = shell.execute('cat skills.txt | grep rust');
  assert.equal(caseSensitive.output, '');

  const caseInsensitive = shell.execute('cat skills.txt | grep -i rust');
  assert.ok(caseInsensitive.output.includes('Rust'));
});

test('ShellSandbox tab completion auto-completes file and directory names', () => {
  const ctx = loadContext();
  const shell = new ctx.ShellSandbox();

  // Complete directory
  const compDir = shell.tabComplete('cd pro');
  assert.equal(compDir.completion, 'projects/');

  // Complete file
  const compFile = shell.tabComplete('cat ab');
  assert.equal(compFile.completion, 'about.md');
});

test('ShellSandbox tracks command history', () => {
  const ctx = loadContext();
  const shell = new ctx.ShellSandbox();

  shell.execute('pwd');
  shell.execute('ls -la');
  shell.execute('cat about.md');

  const historyRes = shell.execute('history');
  assert.ok(historyRes.output.includes('pwd'));
  assert.ok(historyRes.output.includes('ls -la'));
  assert.ok(historyRes.output.includes('cat about.md'));
});
