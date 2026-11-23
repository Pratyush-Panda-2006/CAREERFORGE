import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixThemeSwitcher } from './theme-switcher.js';

describe('DefiYieldMatrixThemeSwitcher', () => {
  it('initializes with default dark theme', () => {
    const switcher = new DefiYieldMatrixThemeSwitcher();
    assert.equal(switcher.currentTheme, 'dark');
    assert.equal(switcher.getCurrentTheme().primary, '#38bdf8');
  });

  it('switches themes accurately', () => {
    const switcher = new DefiYieldMatrixThemeSwitcher();
    switcher.setTheme('cyberpunk');
    assert.equal(switcher.currentTheme, 'cyberpunk');
    assert.equal(switcher.getCurrentTheme().primary, '#f43f5e');
  });

  it('generates valid CSS variable declaration string', () => {
    const switcher = new DefiYieldMatrixThemeSwitcher();
    const css = switcher.exportCssVariables('emerald');
    assert.ok(css.includes('--bg: #022c22'));
    assert.ok(css.includes('--primary: #10b981'));
  });
});
