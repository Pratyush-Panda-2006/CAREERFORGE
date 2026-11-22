/**
 * SupplyChainLogisticsQuestEngine
 * Milestone gamification & contributor achievement badge engine for Supply Chain Logistics.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class SupplyChainLogisticsQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-dispatch',
        title: 'Dispatch First Intermodal Freight Cargo',
        description: 'Route multimodal container freight with automated customs clearing manifest.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-freight-dispatcher',
        completed: false
      },
      {
        id: 'fleet-telemetry',
        title: 'Optimize 5 Fleet Transport Corridors',
        description: 'Calibrate GPS tracking, cold-chain telemetry, and fuel burn efficiency.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-fleet-optimizer',
        completed: false
      },
      {
        id: 'warehouse-automation',
        title: 'Automate 10 Fulfillment Hub Nodes',
        description: 'Deploy autonomous robotic pickers and dynamic inventory reorder buffers.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-warehouse-pioneer',
        completed: false
      },
      {
        id: 'global-logistics-master',
        title: 'Execute 3 Continental Supply Chains',
        description: 'Maintain 99.9% on-time delivery across intercontinental maritime cargo corridors.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-logistics-master',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-freight-dispatcher',
        name: 'Freight Dispatcher',
        tier: 'Bronze',
        icon: '🚛',
        description: 'Awarded for routing your first intermodal freight cargo manifest.',
        unlocked: false
      },
      {
        id: 'silver-fleet-optimizer',
        name: 'Fleet Optimizer',
        tier: 'Silver',
        icon: '🛰️',
        description: 'Awarded for optimizing 5 regional transport freight corridors.',
        unlocked: false
      },
      {
        id: 'gold-warehouse-pioneer',
        name: 'Warehouse Pioneer',
        tier: 'Gold',
        icon: '🏭',
        description: 'Awarded for automating 10 fulfillment inventory hub nodes.',
        unlocked: false
      },
      {
        id: 'platinum-logistics-master',
        name: 'Logistics Master',
        tier: 'Platinum',
        icon: '🌐',
        description: 'Awarded for maintaining 99.9% on-time delivery across 3 continental supply chains.',
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
    wrapper.className = 'supply-chain-logistics-quest-container';

    // Header & XP Summary
    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'supply-chain-logistics-quest-header';
    header.innerHTML = `
      <div class="supply-chain-logistics-quest-title-group">
        <h3>🏆 Supply Chain Logistics - Milestones & Achievements</h3>
        <p>Complete milestones, earn XP, and unlock contributor credentials.</p>
      </div>
      <div class="supply-chain-logistics-xp-summary-card">
        <div class="supply-chain-logistics-level-badge">Lv.${levelInfo.level}</div>
        <div class="supply-chain-logistics-xp-info">
          <span class="supply-chain-logistics-xp-label">Contributor XP</span>
          <span class="supply-chain-logistics-xp-numbers">${this.xp} / ${levelInfo.nextLevelBaseXp} XP</span>
        </div>
      </div>
    `;

    // Progress bar
    const progressTrack = document.createElement('div');
    progressTrack.className = 'supply-chain-logistics-progress-bar-container';
    progressTrack.innerHTML = `<div class="supply-chain-logistics-progress-bar-fill" style="width: ${levelInfo.progressPercent}%;"></div>`;

    // Badges Grid
    const badgeHeading = document.createElement('div');
    badgeHeading.className = 'supply-chain-logistics-section-heading';
    badgeHeading.textContent = 'Achievement Badges';

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'supply-chain-logistics-badges-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `supply-chain-logistics-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="supply-chain-logistics-badge-icon">${b.icon}</div>
        <div class="supply-chain-logistics-badge-name">${b.name}</div>
        <div class="supply-chain-logistics-badge-tier ${b.tier.toLowerCase()}">${b.tier} Tier</div>
        <p class="supply-chain-logistics-badge-desc">${b.description}</p>
      `;
      badgesGrid.appendChild(bCard);
    });

    // Quests List
    const questHeading = document.createElement('div');
    questHeading.className = 'supply-chain-logistics-section-heading';
    questHeading.textContent = 'Active Milestones & Quests';

    const questsList = document.createElement('div');
    questsList.className = 'supply-chain-logistics-quests-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `supply-chain-logistics-quest-card ${q.completed ? 'completed' : ''}`;
      qCard.innerHTML = `
        <div class="supply-chain-logistics-quest-info">
          <div class="supply-chain-logistics-quest-title">
            <span>${q.completed ? '✅' : '🎯'}</span>
            <span>${q.title}</span>
          </div>
          <p class="supply-chain-logistics-quest-desc">${q.description}</p>
          <div class="supply-chain-logistics-quest-progress-track">
            <span>Progress: ${q.progress} / ${q.target}</span>
            <span>•</span>
            <span>+${q.xpReward} XP</span>
          </div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'supply-chain-logistics-quest-action-btn';
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
