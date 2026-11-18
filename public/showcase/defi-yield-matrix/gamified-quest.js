/**
 * DeFi Yield Matrix - Milestone Gamification & Contributor Achievement Badge Engine
 * Autonomous module that tracks yield farming interactions, awards dynamic
 * liquidity achievement badges, and calculates progressive DeFi XP curves.
 */

export class DefiYieldMatrixQuestEngine {
  constructor(options = {}) {
    this.xp = Math.max(0, Number(options.initialXp) || 0);
    this.quests = (options.quests && Array.isArray(options.quests)) ? options.quests : [
      {
        id: 'stake-liquidity',
        title: 'Provision Pool Liquidity',
        description: 'Deposit collateral pairs into automated market maker liquidity vaults',
        target: 5,
        current: 0,
        xpReward: 180,
        completed: false
      },
      {
        id: 'harvest-yield',
        title: 'Compound Yield Harvesting',
        description: 'Auto-compound multi-protocol token staking rewards into principal',
        target: 3,
        current: 0,
        xpReward: 240,
        completed: false
      },
      {
        id: 'rebalance-vault',
        title: 'Delta-Neutral Rebalancing',
        description: 'Trigger algorithmic vault hedging across volatility spikes',
        target: 8,
        current: 0,
        xpReward: 360,
        completed: false
      },
      {
        id: 'audit-apr',
        title: 'Maintain 99.9% Vault Solvency',
        description: 'Sustain maximum annualized percentage yield across volatile epochs',
        target: 24,
        current: 0,
        xpReward: 520,
        completed: false
      }
    ];

    this.badges = [
      {
        id: 'badge-bronze',
        tier: 'Bronze',
        name: 'DeFi Liquidity Seeder',
        description: 'Initial capital deposited into high-yield decentralized vaults',
        minXp: 180,
        icon: '🥉',
        unlocked: false,
        unlockedAt: null
      },
      {
        id: 'badge-silver',
        tier: 'Silver',
        name: 'Yield Matrix Strategist',
        description: 'Successful multi-pool harvest and automated compounding cycle',
        minXp: 420,
        icon: '🥈',
        unlocked: false,
        unlockedAt: null
      },
      {
        id: 'badge-gold',
        tier: 'Gold',
        name: 'Algorithmic Vault Master',
        description: 'Automated delta-neutral hedge execution without liquidation',
        minXp: 780,
        icon: '🥇',
        unlocked: false,
        unlockedAt: null
      },
      {
        id: 'badge-platinum',
        tier: 'Platinum',
        name: 'Decentralized Matrix Whale',
        description: 'All milestone achievements unlocked with 99.9% solvency rating',
        minXp: 1300,
        icon: '💎',
        unlocked: false,
        unlockedAt: null
      }
    ];

    this.listeners = new Set();
    this.checkUnlocks();
  }

  /**
   * Calculates progressive user level and XP progress percent using mathematical curve.
   * Formula: level = floor(sqrt(xp / 65)) + 1
   * @param {number} xp
   * @returns {{ level: number, currentXp: number, baseCurrentLevelXp: number, nextLevelXp: number, progressPercent: number }}
   */
  calculateUserLevel(xp) {
    const sanitizedXp = Math.max(0, Number(xp) || 0);
    const level = Math.floor(Math.sqrt(sanitizedXp / 65)) + 1;
    const baseCurrentLevelXp = 65 * Math.pow(level - 1, 2);
    const nextLevelXp = 65 * Math.pow(level, 2);
    const span = Math.max(1, nextLevelXp - baseCurrentLevelXp);
    const progressPercent = Math.min(100, Math.max(0, Math.round(((sanitizedXp - baseCurrentLevelXp) / span) * 100)));

    return {
      level,
      currentXp: sanitizedXp,
      baseCurrentLevelXp,
      nextLevelXp,
      progressPercent
    };
  }

  /**
   * Records incremental quest progress, resolves XP gains, and evaluates badge unlocks.
   * @param {string} questId
   * @param {number} amount
   * @returns {object} event state payload
   */
  recordProgress(questId, amount = 1) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) {
      throw new Error(`Quest with id "${questId}" was not found in registered catalog.`);
    }

    const previousCurrent = quest.current;
    quest.current = Math.min(quest.target, quest.current + Math.max(0, amount));
    const delta = quest.current - previousCurrent;

    let completedNow = false;
    let xpGained = 0;

    if (quest.current >= quest.target && !quest.completed) {
      quest.completed = true;
      completedNow = true;
      xpGained = quest.xpReward;
      this.xp += xpGained;
    }

    const newlyUnlockedBadges = this.checkUnlocks();
    const levelState = this.calculateUserLevel(this.xp);

    const event = {
      questId,
      questTitle: quest.title,
      questProgress: quest.current,
      questTarget: quest.target,
      completedNow,
      xpGained,
      totalXp: this.xp,
      newlyUnlockedBadges,
      levelState
    };

    this.notify(event);
    return event;
  }

  /**
   * Inspects all badges against current XP and marks freshly unlocked badges.
   * @returns {Array<object>} Newly unlocked badges
   */
  checkUnlocks() {
    const newlyUnlocked = [];
    for (const badge of this.badges) {
      if (!badge.unlocked && this.xp >= badge.minXp) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        newlyUnlocked.push(badge);
      }
    }
    return newlyUnlocked;
  }

  /**
   * Subscribes a listener to milestone engine events.
   * @param {Function} callback
   * @returns {Function} Unsubscribe handle
   */
  on(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Subscriber must be a valid callable function.');
    }
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifies all registered subscribers of state updates.
   * @param {object} payload
   */
  notify(payload) {
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('DefiYieldMatrixQuestEngine listener error:', err);
      }
    }
  }

  /**
   * Returns a complete snapshot of user level, quests, and badge completion statuses.
   * @returns {object}
   */
  getOverview() {
    const levelInfo = this.calculateUserLevel(this.xp);
    return {
      xp: this.xp,
      levelInfo,
      quests: this.quests.map(q => ({
        ...q,
        progressPercent: Math.min(100, Math.round((q.current / q.target) * 100))
      })),
      badges: this.badges.map(b => ({
        ...b,
        progressPercent: Math.min(100, Math.round((this.xp / b.minXp) * 100))
      }))
    };
  }

  /**
   * Resets quest engine to baseline state.
   */
  reset() {
    this.xp = 0;
    for (const quest of this.quests) {
      quest.current = 0;
      quest.completed = false;
    }
    for (const badge of this.badges) {
      badge.unlocked = false;
      badge.unlockedAt = null;
    }
    const event = {
      type: 'reset',
      totalXp: 0,
      levelState: this.calculateUserLevel(0),
      newlyUnlockedBadges: []
    };
    this.notify(event);
    return event;
  }
}
