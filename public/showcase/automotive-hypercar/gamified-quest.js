/**
 * AutomotiveHypercarQuestEngine
 * Milestone gamification & contributor achievement badge engine for Automotive Hypercar.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class AutomotiveHypercarQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "first-lap",
    "title": "Telemetry Telemetry Baseline Calibration",
    "description": "Complete high-speed track telemetry calibration and sensor check.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-hypercar-pilot"
  },
  {
    "id": "aero-tuning",
    "title": "Optimize Dynamic Active Aero",
    "description": "Calibrate active rear wing and diffuser downforce across 5 wind-tunnel passes.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-aero-engineer"
  },
  {
    "id": "lap-record",
    "title": "Break 10 Circuit Lap Records",
    "description": "Log sub-minute sector times on 10 international high-downforce racing circuits.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-circuit-master"
  },
  {
    "id": "hypercar-legend",
    "title": "Achieve Grand Tour Supremacy",
    "description": "Maintain maximum energy regeneration and speed endurance on 3 endurance races.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-hypercar-legend"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-hypercar-pilot",
    "name": "Hypercar Pilot",
    "tier": "Bronze",
    "icon": "🏎️",
    "description": "Completed baseline telemetry calibration and track check."
  },
  {
    "id": "silver-aero-engineer",
    "name": "Aero Engineer",
    "tier": "Silver",
    "icon": "🌪️",
    "description": "Calibrated dynamic downforce across 5 wind-tunnel passes."
  },
  {
    "id": "gold-circuit-master",
    "name": "Circuit Master",
    "tier": "Gold",
    "icon": "🏆",
    "description": "Logged sub-minute sector times across 10 racing circuits."
  },
  {
    "id": "platinum-hypercar-legend",
    "name": "Hypercar Legend",
    "tier": "Platinum",
    "icon": "👑",
    "description": "Maintained endurance speed on 3 championship circuits."
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
    wrapper.className = 'automotive-hypercar-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'automotive-hypercar-quest-header';
    header.innerHTML = `
      <div class="automotive-hypercar-quest-title-group">
        <h3>🎮 Automotive Hypercar - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="automotive-hypercar-xp-summary-card">
        <div class="automotive-hypercar-level-badge">⭐</div>
        <div class="automotive-hypercar-xp-details">
          <div class="automotive-hypercar-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="automotive-hypercar-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'automotive-hypercar-quest-section';
    questsSection.innerHTML = '<h4 class="automotive-hypercar-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'automotive-hypercar-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `automotive-hypercar-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="automotive-hypercar-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="automotive-hypercar-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="automotive-hypercar-quest-status">
          <div class="automotive-hypercar-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="automotive-hypercar-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'automotive-hypercar-badge-section';
    badgesSection.innerHTML = '<h4 class="automotive-hypercar-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'automotive-hypercar-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `automotive-hypercar-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="automotive-hypercar-badge-icon">${b.icon}</div>
        <div class="automotive-hypercar-badge-name">${b.name}</div>
        <div class="automotive-hypercar-badge-tier">${b.tier}</div>
        <div class="automotive-hypercar-badge-desc">${b.description}</div>
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
