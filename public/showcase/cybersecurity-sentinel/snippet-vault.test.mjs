import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelSnippetVault } from './snippet-vault.js';

test('CybersecuritySentinelSnippetVault initializes detection preset library', () => {
  const vault = new CybersecuritySentinelSnippetVault();
  const all = vault.getAll();
  assert.ok(all.length >= 4);

  const yara = vault.getById('cs-yara-cobalt');
  assert.ok(yara);
  assert.equal(yara.title, 'YARA Rule: Cobalt Strike Beacon Memory Pattern');
  assert.ok(yara.tags.includes('yara'));
});

test('CybersecuritySentinelSnippetVault filters signatures by tag properly', () => {
  const vault = new CybersecuritySentinelSnippetVault();
  const sigma = vault.filterByTag('sigma');
  assert.ok(sigma.length >= 1);
  assert.equal(sigma[0].id, 'cs-sigma-wmi-lateral');

  const all = vault.filterByTag('all');
  assert.equal(all.length, vault.getAll().length);
});

test('CybersecuritySentinelSnippetVault multi-token search functions correctly', () => {
  const vault = new CybersecuritySentinelSnippetVault();
  const results = vault.searchSnippets('suricata kerberoast active directory');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'cs-suricata-kerberoast');

  const noMatch = vault.searchSnippets('harmless_hello_world_text_snippet');
  assert.equal(noMatch.length, 0);
});

test('CybersecuritySentinelSnippetVault prevents duplicate ID collisions', () => {
  const vault = new CybersecuritySentinelSnippetVault();
  assert.throws(() => {
    vault.addSnippet({
      id: 'cs-yara-cobalt',
      title: 'Duplicate YARA',
      code: 'rule dup {}'
    });
  }, /already exists/);
});

test('CybersecuritySentinelSnippetVault adds and deletes custom threat rules', () => {
  const vault = new CybersecuritySentinelSnippetVault();
  const added = vault.addSnippet({
    id: 'cs-suricata-log4j',
    title: 'Suricata Rule: Log4j JNDI Exploit Attempt',
    code: 'alert tcp any any -> any any (msg:"Log4j JNDI";)',
    tags: ['suricata', 'log4j', 'rce']
  });

  assert.ok(added);
  assert.equal(vault.getById('cs-suricata-log4j').title, 'Suricata Rule: Log4j JNDI Exploit Attempt');
  const removed = vault.removeSnippet('cs-suricata-log4j');
  assert.equal(removed, true);
  assert.equal(vault.getById('cs-suricata-log4j'), null);
});
