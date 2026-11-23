/**
 * AerospaceOrbiterQuestEngine
 * Milestone gamification & contributor achievement badge engine for Aerospace Orbiter.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class AerospaceOrbiterQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "orbital-burn",
    "title": "Complete Trans-Orbital Injection Burn",
    "description": "Fire RCS thruster vectors for orbital synchronization.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-orbital-pilot"
  },
  {
    "id": "telemetry-sync",
    "title": "Lock 5 Deep-Space Ground Stations",
    "description": "Synchronize high-frequency telemetry across 5 equatorial tracking antennas.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-telemetry-controller"
  },
  {
    "id": "reentry-corridor",
    "title": "Execute 10 Atmospheric Re-entries",
    "description": "Guide return vehicle through hypersonic shocklayer heating corridor.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-flight-commander"
  },
  {
    "id": "interplanetary-navigator",
    "title": "Plot 3 Interplanetary Trajectories",
    "description": "Calculate gravity-assist trajectories with sub-kilometer accuracy.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-astrodynamics-titan"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-orbital-pilot",
    "name": "Orbital Pilot",
    "tier": "Bronze",
    "icon": "🚀",
    "description": "Completed baseline trans-orbital injection burn."
  },
  {
    "id": "silver-telemetry-controller",
    "name": "Telemetry Controller",
    "tier": "Silver",
    "icon": "📡",
    "description": "Synchronized telemetry across 5 tracking antennas."
  },
  {
    "id": "gold-flight-commander",
    "name": "Flight Commander",
    "tier": "Gold",
    "icon": "🪐",
    "description": "Executed 10 nominal re-entry corridor passes."
  },
  {
    "id": "platinum-astrodynamics-titan",
    "name": "Astrodynamics Titan",
    "tier": "Platinum",
    "icon": "🌌",
    "description": "Plotted 3 deep-space gravity-assist planetary transfers."
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
    wrapper.className = 'aerospace-orbiter-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'aerospace-orbiter-quest-header';
    header.innerHTML = `
      <div class="aerospace-orbiter-quest-title-group">
        <h3>🎮 Aerospace Orbiter - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="aerospace-orbiter-xp-summary-card">
        <div class="aerospace-orbiter-level-badge">⭐</div>
        <div class="aerospace-orbiter-xp-details">
          <div class="aerospace-orbiter-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="aerospace-orbiter-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'aerospace-orbiter-quest-section';
    questsSection.innerHTML = '<h4 class="aerospace-orbiter-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'aerospace-orbiter-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `aerospace-orbiter-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="aerospace-orbiter-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="aerospace-orbiter-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="aerospace-orbiter-quest-status">
          <div class="aerospace-orbiter-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="aerospace-orbiter-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'aerospace-orbiter-badge-section';
    badgesSection.innerHTML = '<h4 class="aerospace-orbiter-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'aerospace-orbiter-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `aerospace-orbiter-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="aerospace-orbiter-badge-icon">${b.icon}</div>
        <div class="aerospace-orbiter-badge-name">${b.name}</div>
        <div class="aerospace-orbiter-badge-tier">${b.tier}</div>
        <div class="aerospace-orbiter-badge-desc">${b.description}</div>
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
