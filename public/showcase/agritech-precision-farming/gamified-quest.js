/**
 * AgritechPrecisionFarmingQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking precision farming operations, IoT sensor calibration, and yield optimization quests.
 */
export class AgritechPrecisionFarmingQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'soil-telemetry-sync',
        title: 'Calibrate Subterranean Soil Probes',
        description: 'Complete 100 IoT sensor calibrations across nitrogen and soil moisture depth zones.',
        target: 100,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-field-scout',
        completed: false
      },
      {
        id: 'autonomous-irrigation-cycles',
        title: 'Run Precision Irrigation Cycles',
        description: 'Automate 25 drip irrigation distribution cycles modulated by real-time solar irradiance.',
        target: 25,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-hydration-architect',
        completed: false
      },
      {
        id: 'drone-ndvi-surveys',
        title: 'NDVI Drone Aerial Mapping',
        description: 'Execute 10 hyperspectral drone surveys to detect localized canopy stress anomalies.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-aerial-agronomist',
        completed: false
      },
      {
        id: 'harvest-yield-mastery',
        title: 'Predictive Harvest Optimization',
        description: 'Achieve 95%+ harvest yield forecasting precision across seasonal farm sectors.',
        target: 5,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-precision-master',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-field-scout',
        name: 'IoT Field Scout',
        tier: 'Bronze',
        icon: '🌱',
        description: 'Awarded for deploying and calibrating subterranean IoT probe networks.',
        unlocked: false
      },
      {
        id: 'silver-hydration-architect',
        name: 'Hydration Architect',
        tier: 'Silver',
        icon: '💧',
        description: 'Awarded for operating autonomous micro-irrigation valve arrays.',
        unlocked: false
      },
      {
        id: 'gold-aerial-agronomist',
        name: 'Aerial Agronomist',
        tier: 'Gold',
        icon: '🛰️',
        description: 'Awarded for conducting high-resolution hyperspectral NDVI surveys.',
        unlocked: false
      },
      {
        id: 'platinum-precision-master',
        name: 'Precision Master',
        tier: 'Platinum',
        icon: '👑',
        description: 'Awarded for reaching peak seasonal predictive crop yield efficiency.',
        unlocked: false
      }
    ];
  }

  calculateUserLevel(xp = this.xp) {
    if (xp < 0) xp = 0;
    // Level formula: Level = Math.floor(Math.sqrt(xp / 100)) + 1
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
      throw new Error(`Quest ${questId} not found`);
    }

    if (quest.completed) return { quest, newlyCompleted: false };

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

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify(lastQuest = null, newlyUnlocked = []) {
    const userLevel = this.calculateUserLevel();
    this.listeners.forEach((fn) => fn(userLevel, lastQuest, newlyUnlocked));
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const questWrapper = document.createElement('div');
    questWrapper.className = 'agri-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'agri-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'agri-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Agritech Quest & Contributor Badge Engine';

    const subtitle = document.createElement('p');
    subtitle.className = 'agri-quest-subtitle';
    subtitle.textContent = 'Earn XP, unlock agronomy achievement tiers, and level up through precision farming field milestones.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'agri-level-badge';
    levelBadge.textContent = `Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'agri-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'agri-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'agri-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Achievement Tiers & Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'agri-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `agri-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'agri-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'agri-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'agri-badge-tier';
      badgeTier.textContent = `${badge.tier} Tier`;

      badgeCard.append(icon, badgeName, badgeTier);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questsSection = document.createElement('div');
    questsSection.className = 'agri-quests-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Field Quests';
    questsSection.append(questHeading);

    const questsList = document.createElement('div');
    questsList.className = 'agri-quests-list';

    this.quests.forEach((quest) => {
      const card = document.createElement('div');
      card.className = `agri-quest-card ${quest.completed ? 'completed' : ''}`;

      const top = document.createElement('div');
      top.className = 'agri-quest-top';

      const questTitle = document.createElement('div');
      questTitle.className = 'agri-quest-title';
      questTitle.textContent = quest.title;

      const xpTag = document.createElement('span');
      xpTag.className = 'agri-quest-xp';
      xpTag.textContent = `+${quest.xpReward} XP`;

      top.append(questTitle, xpTag);

      const desc = document.createElement('p');
      desc.className = 'agri-quest-desc';
      desc.textContent = quest.description;

      const progressRow = document.createElement('div');
      progressRow.className = 'agri-quest-progress-row';

      const progressText = document.createElement('span');
      progressText.className = 'agri-progress-text';
      progressText.textContent = `${quest.progress} / ${quest.target} (${Math.floor((quest.progress / quest.target) * 100)}%)`;

      const actionBtn = document.createElement('button');
      actionBtn.className = 'agri-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Simulate Progress (+5)';
      actionBtn.disabled = quest.completed;
      actionBtn.addEventListener('click', () => {
        this.recordProgress(quest.id, 5);
        this.renderToDOM(container);
      });

      progressRow.append(progressText, actionBtn);
      card.append(top, desc, progressRow);
      questsList.append(card);
    });

    questsSection.append(questsList);
    questWrapper.append(questsSection);

    container.append(questWrapper);
  }
}
