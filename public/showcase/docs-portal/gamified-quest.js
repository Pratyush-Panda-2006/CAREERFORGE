/**
 * DocsPortalQuestEngine
 * Milestone gamification & contributor achievement badge engine for Docs Portal.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class DocsPortalQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "first-doc",
    "title": "Publish First Interactive API Endpoint",
    "description": "Document REST endpoint with OpenAPI 3.1 schema and curl examples.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-docs-author"
  },
  {
    "id": "snippet-verification",
    "title": "Verify 5 Code Snippet Sandbox Runtimes",
    "description": "Validate automated code execution across TypeScript, Python, and Go.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-syntax-sentinel"
  },
  {
    "id": "sdk-reference",
    "title": "Publish 10 Production SDK Reference Guides",
    "description": "Generate comprehensive SDK guides with full method signatures.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-api-evangelist"
  },
  {
    "id": "portal-architect",
    "title": "Architect 3 Enterprise Developer Portals",
    "description": "Design zero-friction documentation hubs serving 100k+ active developers.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-knowledge-architect"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-docs-author",
    "name": "Docs Author",
    "tier": "Bronze",
    "icon": "📖",
    "description": "Published first interactive API endpoint spec."
  },
  {
    "id": "silver-syntax-sentinel",
    "name": "Syntax Sentinel",
    "tier": "Silver",
    "icon": "💻",
    "description": "Verified 5 multi-language code sandbox snippets."
  },
  {
    "id": "gold-api-evangelist",
    "name": "API Evangelist",
    "tier": "Gold",
    "icon": "🚀",
    "description": "Published 10 production SDK reference manuals."
  },
  {
    "id": "platinum-knowledge-architect",
    "name": "Knowledge Architect",
    "tier": "Platinum",
    "icon": "📚",
    "description": "Architected 3 enterprise developer documentation hubs."
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
    wrapper.className = 'docs-portal-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'docs-portal-quest-header';
    header.innerHTML = `
      <div class="docs-portal-quest-title-group">
        <h3>🎮 Docs Portal - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="docs-portal-xp-summary-card">
        <div class="docs-portal-level-badge">⭐</div>
        <div class="docs-portal-xp-details">
          <div class="docs-portal-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="docs-portal-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'docs-portal-quest-section';
    questsSection.innerHTML = '<h4 class="docs-portal-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'docs-portal-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `docs-portal-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="docs-portal-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="docs-portal-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="docs-portal-quest-status">
          <div class="docs-portal-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="docs-portal-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'docs-portal-badge-section';
    badgesSection.innerHTML = '<h4 class="docs-portal-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'docs-portal-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `docs-portal-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="docs-portal-badge-icon">${b.icon}</div>
        <div class="docs-portal-badge-name">${b.name}</div>
        <div class="docs-portal-badge-tier">${b.tier}</div>
        <div class="docs-portal-badge-desc">${b.description}</div>
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
