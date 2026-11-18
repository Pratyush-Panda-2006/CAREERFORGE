/**
 * Smart IoT Nexus - Milestone Gamification & Contributor Achievement Badge Engine
 * Autonomous module that tracks user interaction milestones, awards dynamic
 * achievement badges with progress percentages, and calculates progressive XP curves.
 */

export class SmartIotNexusQuestEngine {
  constructor(options = {}) {
    this.xp = Math.max(0, Number(options.initialXp) || 0);
    this.quests = (options.quests && Array.isArray(options.quests)) ? options.quests : [
      {
        id: 'deploy-nodes',
        title: 'Deploy Edge Sensor Nodes',
        description: 'Provision micro-telemetry sensor endpoints to grid sectors',
        target: 5,
        current: 0,
        xpReward: 150,
        completed: false
      },
      {
        id: 'calibrate-mesh',
        title: 'Calibrate LoRaWAN Gateway',
        description: 'Optimize frequency hopping and signal-to-noise ratio',
        target: 3,
        current: 0,
        xpReward: 220,
        completed: false
      },
      {
        id: 'resolve-alerts',
        title: 'Resolve Telemetry Anomalies',
        description: 'Remediate voltage and temperature drift alerts in real-time',
        target: 8,
        current: 0,
        xpReward: 350,
        completed: false
      },
      {
        id: 'uptime-streak',
        title: 'Maintain 99.9% Grid Uptime',
        description: 'Sustain uninterrupted IoT telemetry flow across nodes',
        target: 24,
        current: 0,
        xpReward: 480,
        completed: false
      }
    ];

    this.badges = [
      {
        id: 'badge-bronze',
        tier: 'Bronze',
        name: 'IoT Novice Engineer',
        description: 'First telemetry packets transmitted across grid',
        minXp: 150,
        icon: '🥉',
        unlocked: false,
        unlockedAt: null
      },
      {
        id: 'badge-silver',
        tier: 'Silver',
        name: 'Mesh Network Operator',
        description: 'Robust sensor deployment with calibrated gateway channels',
        minXp: 370,
        icon: '🥈',
        unlocked: false,
        unlockedAt: null
      },
      {
        id: 'badge-gold',
        tier: 'Gold',
        name: 'Smart Grid Architect',
        description: 'Extensive anomaly remediation and resilient telemetry streams',
        minXp: 720,
        icon: '🥇',
        unlocked: false,
        unlockedAt: null
      },
      {
        id: 'badge-platinum',
        tier: 'Platinum',
        name: 'Autonomous Core Master',
        description: 'All milestone achievements unlocked with 99.9% uptime compliance',
        minXp: 1200,
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
   * Formula: level = floor(sqrt(xp / 60)) + 1
   * @param {number} xp
   * @returns {{ level: number, currentXp: number, baseCurrentLevelXp: number, nextLevelXp: number, progressPercent: number }}
   */
  calculateUserLevel(xp) {
    const sanitizedXp = Math.max(0, Number(xp) || 0);
    const level = Math.floor(Math.sqrt(sanitizedXp / 60)) + 1;
    const baseCurrentLevelXp = 60 * Math.pow(level - 1, 2);
    const nextLevelXp = 60 * Math.pow(level, 2);
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
        console.error('SmartIotNexusQuestEngine listener error:', err);
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
