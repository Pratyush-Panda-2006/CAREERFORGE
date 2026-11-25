import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyRegexTester } from './regex-tester.js';

describe('EdtechAcademyRegexTester', () => {
  it('safely compiles valid and handles invalid regex patterns', () => {
    const tester = new EdtechAcademyRegexTester();
    const valid = tester.compileRegex('\\d+', 'g');
    assert.equal(valid.valid, true);
    assert.ok(valid.regex instanceof RegExp);

    const invalid = tester.compileRegex('([a-z', 'g');
    assert.equal(invalid.valid, false);
    assert.ok(invalid.error);
  });

  it('accurately identifies matches and capture groups', () => {
    const tester = new EdtechAcademyRegexTester();
    const res = tester.findMatches('(\\w+)-(\\d+)', 'g', 'user-123 and test-456');
    assert.equal(res.valid, true);
    assert.equal(res.count, 2);
    assert.equal(res.matches[0].match, 'user-123');
    assert.deepEqual(res.matches[0].groups, ['user', '123']);
  });

  it('renders highlighted markup string with matched spans', () => {
    const tester = new EdtechAcademyRegexTester();
    const html = tester.highlightMatches('code', 'g', 'learn code daily');
    assert.equal(html, 'learn <mark class="regex-match">code</mark> daily');
  });
});
