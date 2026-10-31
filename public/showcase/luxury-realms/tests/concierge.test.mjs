import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');

assert.match(html, /id="conciergeModal"[^>]*role="dialog"/i, 'VIP inquiry dialog should exist');
assert.match(html, /value="Signal"/, 'Signal should be a contact option');
assert.match(html, /value="WhatsApp VIP"/i, 'WhatsApp VIP should be a contact option');
assert.match(html, /value="Private Phone"/i, 'Private Phone should be a contact option');
assert.match(html, /id="conciergeContact"[^>]*required/i, 'Contact details should be required');
assert.match(html, /id="conciergeConfirmation"[^>]*hidden/i, 'A confirmation card should be available');
assert.match(script, /form.addEventListener.*submit/i, 'Concierge form submission should be handled');





