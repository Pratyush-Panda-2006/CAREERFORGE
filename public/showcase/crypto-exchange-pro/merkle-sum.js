// Educational SHA-256 Merkle-sum commitment. Odd nodes are promoted unchanged.
const SCALE = 100000000n;
const MAX = (1n << 128n) - 1n;
const encoder = new TextEncoder();
export function parseAmount(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.\d{1,8})?$/.test(value) || value.length > 48) throw new Error('Use a nonnegative decimal string with up to 8 fractional digits.');
  const [whole, fraction = ''] = value.split('.');
  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, '0'));
  if (units > MAX) throw new Error('Amount exceeds the unsigned 128-bit limit.');
  return units;
}
export function formatAmount(units) {
  return `${units / SCALE}.${String(units % SCALE).padStart(8, '0')}`;
}
async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(value)))), b => b.toString(16).padStart(2, '0')).join('');
}
function validNode(node) {
  if (!node || !/^[0-9a-f]{64}$/.test(node.hash) || typeof node.sum !== 'string' || !/^(0|[1-9]\d{0,38})$/.test(node.sum) || BigInt(node.sum) > MAX) throw new Error('Invalid proof node.');
  return node;
}
async function leaf(record) {
  if (!record || typeof record.account !== 'string' || !record.account.trim() || record.account.length > 128) throw new Error('Account must contain 1–128 characters.');
  const account = record.account.trim();
  const sum = parseAmount(record.balance).toString();
  return { hash: await hash(['merkle-sum-v1', 'leaf', account, sum]), sum };
}
async function parent(left, right) {
  validNode(left); validNode(right);
  const sum = BigInt(left.sum) + BigInt(right.sum);
  if (sum > MAX) throw new Error('Aggregate exceeds the unsigned 128-bit limit.');
  return { hash: await hash(['merkle-sum-v1', 'branch', left.hash, left.sum, right.hash, right.sum]), sum: sum.toString() };
}
export async function buildTree(records) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 1024) throw new Error('Supply 1–1024 account records.');
  const accounts = records.map(r => r?.account?.trim());
  if (new Set(accounts).size !== accounts.length) throw new Error('Account identifiers must be unique.');
  const levels = [await Promise.all(records.map(leaf))];
  while (levels.at(-1).length > 1) {
    const current = levels.at(-1), next = [];
    for (let i = 0; i < current.length; i += 2) next.push(current[i + 1] ? await parent(current[i], current[i + 1]) : current[i]);
    levels.push(next);
  }
  return { levels, root: levels.at(-1)[0], count: records.length };
}
export function createProof(tree, index) {
  if (!Number.isInteger(index) || index < 0 || index >= tree.count) throw new Error('Invalid account index.');
  const steps = []; let cursor = index;
  for (let level = 0; level < tree.levels.length - 1; level++) {
    const sibling = cursor ^ 1;
    if (sibling < tree.levels[level].length) steps.push({ level, side: cursor % 2 ? 'left' : 'right', ...tree.levels[level][sibling] });
    cursor = Math.floor(cursor / 2);
  }
  return { version: 1, index, count: tree.count, steps };
}
export async function verifyProof(record, proof, trustedRoot) {
  try {
    validNode(trustedRoot);
    if (proof?.version !== 1 || !Number.isInteger(proof.count) || proof.count < 1 || proof.count > 1024 || !Number.isInteger(proof.index) || proof.index < 0 || proof.index >= proof.count || !Array.isArray(proof.steps) || proof.steps.length > 10) return false;
    let node = await leaf(record), width = proof.count, cursor = proof.index, level = 0, stepIndex = 0;
    while (width > 1) {
      if ((cursor ^ 1) < width) {
        const step = proof.steps[stepIndex++], side = cursor % 2 ? 'left' : 'right';
        if (!step || step.side !== side || step.level !== level) return false;
        node = side === 'left' ? await parent(step, node) : await parent(node, step);
      }
      width = Math.ceil(width / 2); cursor = Math.floor(cursor / 2); level++;
    }
    return stepIndex === proof.steps.length && node.hash === trustedRoot.hash && node.sum === trustedRoot.sum;
  } catch { return false; }
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  let tree, records;
  $('build').addEventListener('click', async () => {
    $('build').disabled = true; $('proof').value = ''; $('result').textContent = ''; tree = null;
    try {
      const input = JSON.parse($('records').value), built = await buildTree(input), reserves = parseAmount($('reserves').value);
      records = input; tree = built;
      $('root').textContent = built.root.hash;
      $('total').textContent = formatAmount(BigInt(built.root.sum));
      $('coverage').textContent = reserves >= BigInt(built.root.sum) ? 'Simulated reserves cover the committed total.' : 'Simulated reserves are below the committed total.';
      $('accounts').replaceChildren(...records.map((r, i) => { const option = document.createElement('option'); option.value = i; option.textContent = r.account; return option; }));
      $('inspect').disabled = false; $('verify').disabled = false;
      $('result').textContent = `Built ${records.length} leaves. Select an account to inspect its proof.`;
    } catch (e) { $('result').textContent = e.message; $('root').textContent = '—'; $('total').textContent = '—'; $('coverage').textContent = ''; $('inspect').disabled = true; $('verify').disabled = true; }
    finally { $('build').disabled = false; }
  });
  $('inspect').addEventListener('click', () => {
    const index = Number($('accounts').value);
    $('proof').value = JSON.stringify({ record: records[index], proof: createProof(tree, index) }, null, 2);
  });
  $('verify').addEventListener('click', async () => {
    try {
      const { record, proof } = JSON.parse($('proof').value);
      $('result').textContent = await verifyProof(record, proof, tree.root) ? 'Verified: both inclusion and aggregate sum match the built root.' : 'Verification failed. The proof does not match the built root.';
    } catch (e) { $('result').textContent = `Invalid proof: ${e.message}`; }
  });
}
