/**
 * DeFi Yield Matrix - Custom Color Palette & Dynamic Theme Switcher
 */

export class DefiYieldMatrixThemeSwitcher {
  constructor() {
    this.themes = {
      dark: { name: 'Dark Void', bg: '#070d18', surface: '#0c1524', primary: '#38bdf8', text: '#f8fafc' },
      light: { name: 'Clean Light', bg: '#f8fafc', surface: '#ffffff', primary: '#0284c7', text: '#0f172a' },
      cyberpunk: { name: 'Neon Cyber', bg: '#090014', surface: '#1b002c', primary: '#f43f5e', text: '#fdf4ff' },
      emerald: { name: 'Bio Matrix', bg: '#022c22', surface: '#064e3b', primary: '#10b981', text: '#ecfdf5' }
    };
    this.currentTheme = 'dark';
  }

  getThemes() {
    return Object.keys(this.themes).map(key => ({
      id: key,
      ...this.themes[key]
    }));
  }

  setTheme(themeId) {
    if (this.themes[themeId]) {
      this.currentTheme = themeId;
      return this.themes[themeId];
    }
    return this.themes.dark;
  }

  getCurrentTheme() {
    return { id: this.currentTheme, ...this.themes[this.currentTheme] };
  }

  exportCssVariables(themeId = null) {
    const t = this.themes[themeId] || this.themes[this.currentTheme];
    return `:root { --bg: ${t.bg}; --surface: ${t.surface}; --primary: ${t.primary}; --text: ${t.text}; }`;
  }
}
