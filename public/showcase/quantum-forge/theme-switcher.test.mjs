import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeThemeSwitcher } from './theme-switcher.js';

describe('QuantumForgeThemeSwitcher', () => {
  it('initializes with default dark theme', () => {
    const switcher = new QuantumForgeThemeSwitcher();
    assert.equal(switcher.currentTheme, 'dark');
    assert.equal(switcher.getCurrentTheme().primary, '#38bdf8');
  });

  it('switches themes accurately', () => {
    const switcher = new QuantumForgeThemeSwitcher();
    switcher.setTheme('cyberpunk');
    assert.equal(switcher.currentTheme, 'cyberpunk');
    assert.equal(switcher.getCurrentTheme().primary, '#f43f5e');
  });

  it('generates valid CSS variable declaration string', () => {
    const switcher = new QuantumForgeThemeSwitcher();
    const css = switcher.exportCssVariables('emerald');
    assert.ok(css.includes('--bg: #022c22'));
    assert.ok(css.includes('--primary: #10b981'));
  });
});
