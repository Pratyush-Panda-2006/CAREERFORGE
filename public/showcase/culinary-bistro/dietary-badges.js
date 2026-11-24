/**
 * Culinary Bistro - Dietary Badge Icons & Filter Engine
 */

export class DietaryBadgeManager {
  constructor() {
    this.badges = {
      vegan: { label: 'Vegan', icon: '🌱', class: 'badge-vegan' },
      gluten_free: { label: 'Gluten-Free', icon: '🌾', class: 'badge-gf' },
      chef_special: { label: 'Chef Special', icon: '⭐', class: 'badge-special' }
    };
  }

  getBadge(key) {
    return this.badges[key] || null;
  }

  renderPill(key) {
    const b = this.getBadge(key);
    if (!b) return '';
    return `<span class="dietary-badge ${b.class}">${b.icon} ${b.label}</span>`;
  }

  filterDishes(dishes, badgeKey) {
    if (!badgeKey) return dishes;
    return dishes.filter(d => Array.isArray(d.dietary) && d.dietary.includes(badgeKey));
  }
}
