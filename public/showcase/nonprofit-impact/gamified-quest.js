/**
 * NonprofitImpactQuestEngine
 * Milestone gamification & contributor achievement badge engine for Nonprofit Impact.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class NonprofitImpactQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-grant',
        title: 'Disburse First Community Grant',
        description: 'Fund an initial grassroots micro-grant for neighborhood urban agriculture.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-community-seed',
        completed: false
      },
      {
        id: 'volunteer-hours',
        title: 'Coordinate 5 Volunteer Mobilizations',
        description: 'Mobilize regional volunteer squads for ecological conservation and food security.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-mobilization-leader',
        completed: false
      },
      {
        id: 'trees-planted',
        title: 'Reforest 10 Hectare Canopy Reserves',
        description: 'Plant native saplings and monitor verified canopy carbon sequestration data.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-canopy-guardian',
        completed: false
      },
      {
        id: 'endowment-circle',
        title: 'Establish 3 Perpetual Impact Endowments',
        description: 'Partner with philanthropic trusts to endow recurring humanitarian dividends.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-endowment-luminary',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-community-seed',
        name: 'Community Seed',
        tier: 'Bronze',
        icon: '🌱',
        description: 'Awarded for disbursing your first grassroots micro-grant.',
        unlocked: false
      },
      {
        id: 'silver-mobilization-leader',
        name: 'Mobilization Leader',
        tier: 'Silver',
        icon: '🤝',
        description: 'Awarded for coordinating 5 volunteer community initiatives.',
        unlocked: false
      },
      {
        id: 'gold-canopy-guardian',
        name: 'Canopy Guardian',
        tier: 'Gold',
        icon: '🌳',
        description: 'Awarded for reforesting 10 canopy restoration reserves.',
        unlocked: false
      },
      {
        id: 'platinum-endowment-luminary',
        name: 'Endowment Luminary',
        tier: 'Platinum',
        icon: '✨',
        description: 'Awarded for establishing 3 perpetual charitable trusts.',
        unlocked: false
      }
    ];
  }

  /**
   * Calculates progressive user level and mathematical XP curves.
   * XP curve formula: level = floor(sqrt(xp / 100)) + 1
   * @param {number} xp
   * @returns {{ level: number, currentXp: number, currentLevelBaseXp: number, nextLevelBaseXp: number, xpNeededForNextLevel: number, progressPercent: number }}
   */
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

  /**
   * Records progress against a specific quest objective and triggers badge unlocks.
   * @param {string} questId
   * @param {number} amount
   * @returns {{ quest: object, newlyCompleted: boolean, unlockedBadges: Array<object> }}
   */
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

  /**
   * Evaluates badge unlock criteria based on completed milestones.
   * @returns {Array<object>} Newly unlocked badges
   */
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
    wrapper.className = 'nonprofit-impact-quest-container';

    // Header & XP Summary
    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'nonprofit-impact-quest-header';
    header.innerHTML = `
      <div class="nonprofit-impact-quest-title-group">
        <h3>🏆 Nonprofit Impact - Milestones & Achievements</h3>
        <p>Complete milestones, earn XP, and unlock contributor credentials.</p>
      </div>
      <div class="nonprofit-impact-xp-summary-card">
        <div class="nonprofit-impact-level-badge">Lv.${levelInfo.level}</div>
        <div class="nonprofit-impact-xp-info">
          <span class="nonprofit-impact-xp-label">Contributor XP</span>
          <span class="nonprofit-impact-xp-numbers">${this.xp} / ${levelInfo.nextLevelBaseXp} XP</span>
        </div>
      </div>
    `;

    // Progress bar
    const progressTrack = document.createElement('div');
    progressTrack.className = 'nonprofit-impact-progress-bar-container';
    progressTrack.innerHTML = `<div class="nonprofit-impact-progress-bar-fill" style="width: ${levelInfo.progressPercent}%;"></div>`;

    // Badges Grid
    const badgeHeading = document.createElement('div');
    badgeHeading.className = 'nonprofit-impact-section-heading';
    badgeHeading.textContent = 'Achievement Badges';

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'nonprofit-impact-badges-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `nonprofit-impact-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="nonprofit-impact-badge-icon">${b.icon}</div>
        <div class="nonprofit-impact-badge-name">${b.name}</div>
        <div class="nonprofit-impact-badge-tier ${b.tier.toLowerCase()}">${b.tier} Tier</div>
        <p class="nonprofit-impact-badge-desc">${b.description}</p>
      `;
      badgesGrid.appendChild(bCard);
    });

    // Quests List
    const questHeading = document.createElement('div');
    questHeading.className = 'nonprofit-impact-section-heading';
    questHeading.textContent = 'Active Milestones & Quests';

    const questsList = document.createElement('div');
    questsList.className = 'nonprofit-impact-quests-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `nonprofit-impact-quest-card ${q.completed ? 'completed' : ''}`;
      qCard.innerHTML = `
        <div class="nonprofit-impact-quest-info">
          <div class="nonprofit-impact-quest-title">
            <span>${q.completed ? '✅' : '🎯'}</span>
            <span>${q.title}</span>
          </div>
          <p class="nonprofit-impact-quest-desc">${q.description}</p>
          <div class="nonprofit-impact-quest-progress-track">
            <span>Progress: ${q.progress} / ${q.target}</span>
            <span>•</span>
            <span>+${q.xpReward} XP</span>
          </div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'nonprofit-impact-quest-action-btn';
      btn.textContent = q.completed ? 'Completed' : 'Contribute (+1)';
      btn.disabled = q.completed;
      btn.addEventListener('click', () => {
        this.recordProgress(q.id, 1);
        this.renderToDOM(container);
      });

      qCard.appendChild(btn);
      questsList.appendChild(qCard);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(progressTrack);
    wrapper.appendChild(badgeHeading);
    wrapper.appendChild(badgesGrid);
    wrapper.appendChild(questHeading);
    wrapper.appendChild(questsList);

    container.appendChild(wrapper);
  }
}
