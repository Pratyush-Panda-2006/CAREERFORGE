import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DietaryBadgeManager } from './dietary-badges.js';

describe('DietaryBadgeManager', () => {
  it('registers vegan, gluten-free, and chef special badges', () => {
    const mgr = new DietaryBadgeManager();
    assert.ok(mgr.getBadge('vegan'));
    assert.equal(mgr.getBadge('vegan').icon, '🌱');
  });

  it('renders standard compact HTML pill markup', () => {
    const mgr = new DietaryBadgeManager();
    const html = mgr.renderPill('gluten_free');
    assert.ok(html.includes('🌾 Gluten-Free'));
    assert.ok(html.includes('badge-gf'));
  });

  it('filters dishes by dietary preferences accurately', () => {
    const mgr = new DietaryBadgeManager();
    const dishes = [
      { name: 'Truffle Risotto', dietary: ['gluten_free', 'chef_special'] },
      { name: 'Garden Salad', dietary: ['vegan', 'gluten_free'] },
      { name: 'Prime Steak', dietary: ['chef_special'] }
    ];
    const vegan = mgr.filterDishes(dishes, 'vegan');
    assert.equal(vegan.length, 1);
    assert.equal(vegan[0].name, 'Garden Salad');
  });
});
