/**
 * CulinaryBistroQuestEngine
 * Milestone gamification & contributor achievement badge engine for Culinary Bistro.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class CulinaryBistroQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "first-plating",
    "title": "Plate First Michelin-Grade Degustation",
    "description": "Assemble multi-course artisan plate with seasonal micro-botanicals.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-bistro-apprentice"
  },
  {
    "id": "sauce-reduction",
    "title": "Master 5 Classical French Mother Sauces",
    "description": "Simmer velouté and demi-glace with molecular culinary precision.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-sauce-virtuoso"
  },
  {
    "id": "farm-table",
    "title": "Curate 10 Organic Farm-to-Table Menus",
    "description": "Partner with local organic cooperatives for zero-kilometer dining.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-gastronomy-chef"
  },
  {
    "id": "three-stars",
    "title": "Earn 3 Global Michelin Star Ratings",
    "description": "Attain flawless culinary scores across international tasting audits.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-culinary-legend"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-bistro-apprentice",
    "name": "Bistro Apprentice",
    "tier": "Bronze",
    "icon": "🍳",
    "description": "Plated first artisan tasting menu course."
  },
  {
    "id": "silver-sauce-virtuoso",
    "name": "Sauce Virtuoso",
    "tier": "Silver",
    "icon": "🍲",
    "description": "Mastered 5 classical mother reduction sauces."
  },
  {
    "id": "gold-gastronomy-chef",
    "name": "Gastronomy Chef",
    "tier": "Gold",
    "icon": "👨‍🍳",
    "description": "Curated 10 organic seasonal farm-to-table menus."
  },
  {
    "id": "platinum-culinary-legend",
    "name": "Culinary Legend",
    "tier": "Platinum",
    "icon": "⭐",
    "description": "Awarded 3 global culinary star designations."
  }
].map(b => ({ ...b, unlocked: false }));
  }

  calculateUserLevel(xp = this.xp) {
    if (xp < 0) xp = 0;
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
    const nextLevelBaseXp = Math.pow(level, 2) * 100;
    const xpIntoLevel = xp - currentLevelBaseXp;
    const xpNeededForLevel = nextLevelBaseXp - currentLevelBaseXp;
    const progressPercent = Math.min(100, Math.floor((xpIntoLevel / xpNeededForLevel) * 100));

    return {
      level,
      currentXp: xp,
      currentLevelBaseXp,
      nextLevelBaseXp,
      xpNeededForNextLevel: nextLevelBaseXp - xp,
      progressPercent
    };
  }

  recordProgress(questId, amount = 1) {
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest) {
      throw new Error(`Quest ${questId} not found in catalog`);
    }

    if (quest.completed) {
      return { quest, newlyCompleted: false, unlockedBadges: [] };
    }

    quest.progress = Math.min(quest.target, quest.progress + amount);
    let newlyCompleted = false;

    if (quest.progress >= quest.target && !quest.completed) {
      quest.completed = true;
      this.xp += quest.xpReward;
      newlyCompleted = true;
    }

    const unlockedBadges = this.checkUnlocks();
    this.notify(quest, unlockedBadges);

    return {
      quest,
      newlyCompleted,
      unlockedBadges
    };
  }

  checkUnlocks() {
    const newlyUnlocked = [];

    this.quests.forEach((quest) => {
      if (quest.completed && quest.badgeId) {
        const badge = this.badges.find((b) => b.id === quest.badgeId);
        if (badge && !badge.unlocked) {
          badge.unlocked = true;
          badge.unlockedAt = new Date().toISOString();
          newlyUnlocked.push(badge);
        }
      }
    });

    return newlyUnlocked;
  }

  getXp() {
    return this.xp;
  }

  getQuests() {
    return this.quests;
  }

  getBadges() {
    return this.badges;
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  notify(quest, unlockedBadges) {
    const state = {
      xp: this.xp,
      levelInfo: this.calculateUserLevel(),
      quest,
      unlockedBadges
    };
    this.listeners.forEach((fn) => fn(state));
  }

  renderToDOM(container) {
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'culinary-bistro-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'culinary-bistro-quest-header';
    header.innerHTML = `
      <div class="culinary-bistro-quest-title-group">
        <h3>🎮 Culinary Bistro - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="culinary-bistro-xp-summary-card">
        <div class="culinary-bistro-level-badge">⭐</div>
        <div class="culinary-bistro-xp-details">
          <div class="culinary-bistro-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="culinary-bistro-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'culinary-bistro-quest-section';
    questsSection.innerHTML = '<h4 class="culinary-bistro-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'culinary-bistro-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `culinary-bistro-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="culinary-bistro-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="culinary-bistro-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="culinary-bistro-quest-status">
          <div class="culinary-bistro-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="culinary-bistro-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'culinary-bistro-badge-section';
    badgesSection.innerHTML = '<h4 class="culinary-bistro-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'culinary-bistro-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `culinary-bistro-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="culinary-bistro-badge-icon">${b.icon}</div>
        <div class="culinary-bistro-badge-name">${b.name}</div>
        <div class="culinary-bistro-badge-tier">${b.tier}</div>
        <div class="culinary-bistro-badge-desc">${b.description}</div>
      `;
      badgeGrid.appendChild(bCard);
    });
    badgesSection.appendChild(badgeGrid);

    wrapper.appendChild(header);
    wrapper.appendChild(questsSection);
    wrapper.appendChild(badgesSection);
    container.appendChild(wrapper);
  }
}
