/**
 * EdTech Academy - Interactive Regex Pattern Tester Sandbox & Match Highlighter
 * NSoC '26 Level 3 Feature
 */

export class EdtechAcademyRegexTester {
  constructor() {
    this.pattern = '';
    this.flags = 'g';
  }

  compileRegex(pattern, flags = 'g') {
    try {
      this.pattern = pattern;
      this.flags = flags;
      return { regex: new RegExp(pattern, flags), valid: true, error: null };
    } catch (err) {
      return { regex: null, valid: false, error: err.message };
    }
  }

  findMatches(pattern, flags, testString) {
    if (!pattern || typeof testString !== 'string') {
      return { matches: [], count: 0, valid: true };
    }
    const compiled = this.compileRegex(pattern, flags);
    if (!compiled.valid) {
      return { matches: [], count: 0, valid: false, error: compiled.error };
    }

    const matches = [];
    let match;
    const regex = compiled.regex;

    if (!flags.includes('g')) {
      const single = regex.exec(testString);
      if (single) {
        matches.push({
          index: single.index,
          match: single[0],
          groups: single.slice(1)
        });
      }
      return { matches, count: matches.length, valid: true };
    }

    while ((match = regex.exec(testString)) !== null) {
      matches.push({
        index: match.index,
        match: match[0],
        groups: match.slice(1)
      });
      if (regex.lastIndex === match.index) {
        regex.lastIndex++;
      }
    }
    return { matches, count: matches.length, valid: true };
  }

  highlightMatches(pattern, flags, testString) {
    const res = this.findMatches(pattern, flags, testString);
    if (!res.valid || res.matches.length === 0) {
      return testString;
    }

    let result = '';
    let lastIndex = 0;
    for (const m of res.matches) {
      result += testString.slice(lastIndex, m.index);
      result += `<mark class="regex-match">${m.match}</mark>`;
      lastIndex = m.index + m.match.length;
    }
    result += testString.slice(lastIndex);
    return result;
  }
}
