import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadSnippetVault } from './snippet-vault.js';

test('SaasLaunchpadSnippetVault prevents duplicate snippet titles/keys', () => {
  const vault = new SaasLaunchpadSnippetVault();
  vault.addSnippet('JWT Auth Middleware', 'function authenticate(req, res, next) {}', ['auth', 'middleware']);

  assert.throws(() => {
    vault.addSnippet('JWT Auth Middleware', 'function verify(req) {}', ['auth']);
  }, /already exists/);

  assert.throws(() => {
    vault.addSnippet('  jwt auth middleware  ', 'code', ['security']);
  }, /already exists/);
});

test('filters snippets accurately by category tag', () => {
  const vault = new SaasLaunchpadSnippetVault();
  vault.addSnippet('Redis Rate Limiter', 'await redis.incr(key)', ['redis', 'performance']);
  vault.addSnippet('Stripe Checkout Session', 'stripe.checkout.sessions.create()', ['payments', 'billing']);
  vault.addSnippet('BullMQ Job Worker', 'new Worker("emails", async job => {})', ['queues', 'performance']);

  const perfSnippets = vault.filterByTag('performance');
  assert.equal(perfSnippets.length, 2);
  assert.ok(perfSnippets.some(s => s.title === 'Redis Rate Limiter'));
  assert.ok(perfSnippets.some(s => s.title === 'BullMQ Job Worker'));

  const paymentSnippets = vault.filterByTag('payments');
  assert.equal(paymentSnippets.length, 1);
  assert.equal(paymentSnippets[0].title, 'Stripe Checkout Session');

  const allSnippets = vault.filterByTag('all');
  assert.equal(allSnippets.length, 3);
});

test('performs multi-token query search across titles, code, and tags', () => {
  const vault = new SaasLaunchpadSnippetVault();
  vault.addSnippet('Prisma Tenant Middleware', 'prisma.$extends({ query: {} })', ['orm', 'database', 'tenant']);
  vault.addSnippet('S3 Presigned URL Generator', 'getSignedUrl(s3Client, command)', ['storage', 'aws']);
  vault.addSnippet('Docker Compose Postgres Replica', 'version: "3.8"\nservices:\n  db:', ['docker', 'database']);

  // Multi-token: title + tag
  const res1 = vault.searchSnippets('tenant database');
  assert.equal(res1.length, 1);
  assert.equal(res1[0].title, 'Prisma Tenant Middleware');

  // Multi-token: code content match
  const res2 = vault.searchSnippets('s3Client getSignedUrl');
  assert.equal(res2.length, 1);
  assert.equal(res2[0].title, 'S3 Presigned URL Generator');

  // Non-matching query
  const res3 = vault.searchSnippets('nonexistent query token');
  assert.equal(res3.length, 0);
});

test('retrieves snippet code for instant clipboard copy', () => {
  const vault = new SaasLaunchpadSnippetVault();
  const snip = vault.addSnippet('Env Template', 'DATABASE_URL="postgresql://user:pass@localhost:5432/app"', ['env']);

  const copied = vault.copySnippetCode(snip.id);
  assert.equal(copied, 'DATABASE_URL="postgresql://user:pass@localhost:5432/app"');
});
