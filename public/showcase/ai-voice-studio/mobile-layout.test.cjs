const assert = require('node:assert/strict');
const fs = require('node:fs');
const postcss = require('postcss');

const css = postcss.parse(fs.readFileSync(require('node:path').join(__dirname, 'styles.css'), 'utf8'));
let mobileRules;

css.walkAtRules('media', (rule) => {
  if (rule.params === '(max-width: 520px)') mobileRules = rule;
});

assert.ok(mobileRules, 'Expected mobile layout rules for narrow viewports');

function declarationsFor(selector) {
  const declarations = {};
  mobileRules.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });
  return declarations;
}

assert.equal(declarationsFor('.studio-tuner-card').padding, '20px 16px');
assert.equal(declarationsFor('.voice-models-grid')['grid-template-columns'], '1fr');
assert.equal(declarationsFor('.voice-models-header')['flex-wrap'], 'wrap');
assert.equal(declarationsFor('.voice-model-card')['min-width'], '0');
assert.equal(declarationsFor('.model-meta')['flex-wrap'], 'wrap');
assert.equal(declarationsFor('.model-tagline')['overflow-wrap'], 'anywhere');
assert.equal(declarationsFor('.emotion-presets')['grid-template-columns'], '1fr');
assert.equal(declarationsFor('.tuner-sliders-grid')['grid-template-columns'], '1fr');
