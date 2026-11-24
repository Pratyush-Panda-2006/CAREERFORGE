/**
 * DeveloperPortfolioQuestEngine
 * Milestone gamification & contributor achievement badge engine for Developer Portfolio.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class DeveloperPortfolioQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "first-commit",
    "title": "Push First Open-Source Showcase Project",
    "description": "Deploy full-stack project with automated CI/CD and unit test coverage.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-code-pioneer"
  },
  {
    "id": "oss-contributions",
    "title": "Merge 5 Major Upstream Open-Source PRs",
    "description": "Contribute core features and fixes to high-impact open source repositories.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-oss-champion"
  },
  {
    "id": "system-design",
    "title": "Ship 10 Microservices with 99.99% Uptime",
    "description": "Deploy distributed cloud architecture with automated horizontal scaling.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-systems-architect"
  },
  {
    "id": "tech-fellow",
    "title": "Author 3 High-Impact Industry Whitepapers",
    "description": "Publish research on distributed systems, AI agents, and compiler optimizations.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-tech-fellow"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-code-pioneer",
    "name": "Code Pioneer",
    "tier": "Bronze",
    "icon": "⚡",
    "description": "Deployed first full-stack open source showcase project."
  },
  {
    "id": "silver-oss-champion",
    "name": "OSS Champion",
    "tier": "Silver",
    "icon": "🛠️",
    "description": "Merged 5 major contributions to upstream repositories."
  },
  {
    "id": "gold-systems-architect",
    "name": "Systems Architect",
    "tier": "Gold",
    "icon": "🌐",
    "description": "Shipped 10 high-availability microservice systems."
  },
  {
    "id": "platinum-tech-fellow",
    "name": "Tech Fellow",
    "tier": "Platinum",
    "icon": "💡",
    "description": "Authored 3 peer-reviewed distributed systems papers."
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
    wrapper.className = 'developer-portfolio-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'developer-portfolio-quest-header';
    header.innerHTML = `
      <div class="developer-portfolio-quest-title-group">
        <h3>🎮 Developer Portfolio - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="developer-portfolio-xp-summary-card">
        <div class="developer-portfolio-level-badge">⭐</div>
        <div class="developer-portfolio-xp-details">
          <div class="developer-portfolio-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="developer-portfolio-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'developer-portfolio-quest-section';
    questsSection.innerHTML = '<h4 class="developer-portfolio-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'developer-portfolio-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `developer-portfolio-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="developer-portfolio-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="developer-portfolio-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="developer-portfolio-quest-status">
          <div class="developer-portfolio-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="developer-portfolio-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'developer-portfolio-badge-section';
    badgesSection.innerHTML = '<h4 class="developer-portfolio-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'developer-portfolio-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `developer-portfolio-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="developer-portfolio-badge-icon">${b.icon}</div>
        <div class="developer-portfolio-badge-name">${b.name}</div>
        <div class="developer-portfolio-badge-tier">${b.tier}</div>
        <div class="developer-portfolio-badge-desc">${b.description}</div>
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
