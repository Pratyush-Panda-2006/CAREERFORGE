/**
 * Aerospace Orbiter - Keyboard Shortcut Cheat-Sheet & Command Reference Overlay
 */

export class AerospaceOrbiterKeyboardShortcuts {
  constructor() {
    this.shortcuts = [
      { key: 'Ctrl+K', action: 'Quick Search', description: 'Open search drawer' },
      { key: 'Ctrl+S', action: 'Save State', description: 'Persist current viewport' },
      { key: 'Ctrl+Z', action: 'Undo', description: 'Revert last action' },
      { key: 'Esc', action: 'Close Modal', description: 'Dismiss overlay drawers' }
    ];
  }

  filter(query) {
    if (!query) return [...this.shortcuts];
    const q = query.toLowerCase();
    return this.shortcuts.filter(s => s.key.toLowerCase().includes(q) || s.action.toLowerCase().includes(q));
  }

  register(key, action, description) {
    this.shortcuts.push({ key, action, description });
    return this.shortcuts;
  }
}
