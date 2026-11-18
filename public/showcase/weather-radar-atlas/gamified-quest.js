/**
 * WeatherRadarAtlasQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking Doppler volume scans, severe storm spotting, and satellite analysis.
 */
export class WeatherRadarAtlasQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-sweep',
        title: 'Analyze First Full Doppler Volume Scan',
        description: 'Complete multi-elevation tilt radar analysis across base reflectivity, velocity, and spectrum width.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-radar-observer',
        completed: false
      },
      {
        id: 'severe-spotter',
        title: 'Detect 5 Severe Mesocyclone Signatures',
        description: 'Spot and catalog 5 high-shear storm rotation couples using storm-relative velocity cuts.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-storm-spotter',
        completed: false
      },
      {
        id: 'satellite-analyst',
        title: 'Track 10 GOES Infrared Cloud Loops',
        description: 'Analyze 10 multi-spectral infrared and water vapor satellite imagery sequences over convective zones.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-satellite-meteorologist',
        completed: false
      },
      {
        id: 'chief-forecaster',
        title: 'Issue 3 Regional Warning Forecasts',
        description: 'Author 3 localized convective severe weather outlooks with verified precipitation verification.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-chief-forecaster',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-radar-observer',
        name: 'Radar Observer',
        tier: 'Bronze',
        icon: '📡',
        description: 'Awarded for completing your first dual-pol volume scan interpretation.',
        unlocked: false
      },
      {
        id: 'silver-storm-spotter',
        name: 'Storm Spotter',
        tier: 'Silver',
        icon: '🌪️',
        description: 'Awarded for identifying 5 severe rotational mesocyclone signatures.',
        unlocked: false
      },
      {
        id: 'gold-satellite-meteorologist',
        name: 'Satellite Meteorologist',
        tier: 'Gold',
        icon: '🛰️',
        description: 'Awarded for analyzing 10 GOES atmospheric moisture loops.',
        unlocked: false
      },
      {
        id: 'platinum-chief-forecaster',
        name: 'Chief Forecaster',
        tier: 'Platinum',
        icon: '⚡',
        description: 'Awarded for authoring 3 accurate severe weather forecast advisories.',
        unlocked: false
      }
    ];
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
      throw new Error(`Quest ${questId} not found`);
    }

    if (quest.completed) return { quest, newlyCompleted: false, unlockedBadges: [] };

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
    questWrapper.className = 'radar-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'radar-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'radar-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Meteorology Milestones & Radar Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'radar-quest-subtitle';
    subtitle.textContent = 'Earn meteorologist XP, unlock atmospheric observation achievement tiers, and level up severe storm analysis skills.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'radar-level-badge';
    levelBadge.textContent = `Meteorologist Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'radar-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'radar-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'radar-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Atmospheric Science Achievement Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'radar-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `radar-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'radar-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'radar-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'radar-badge-tier';
      badgeTier.textContent = badge.tier;

      const badgeDesc = document.createElement('div');
      badgeDesc.className = 'radar-badge-desc';
      badgeDesc.textContent = badge.description;

      const statusTag = document.createElement('span');
      statusTag.className = `radar-badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}`;
      statusTag.textContent = badge.unlocked ? '✓ Unlocked' : '🔒 Locked';

      badgeCard.append(icon, badgeName, badgeTier, badgeDesc, statusTag);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questSection = document.createElement('div');
    questSection.className = 'radar-quest-list-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Observation Objectives';
    questSection.append(questHeading);

    const questList = document.createElement('div');
    questList.className = 'radar-quest-list';

    this.quests.forEach((quest) => {
      const questItem = document.createElement('div');
      questItem.className = `radar-quest-item ${quest.completed ? 'quest-done' : ''}`;

      const itemInfo = document.createElement('div');
      itemInfo.className = 'radar-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'radar-quest-item-title';
      qTitle.textContent = quest.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'radar-quest-item-desc';
      qDesc.textContent = quest.description;

      const qProgressText = document.createElement('div');
      qProgressText.className = 'radar-quest-progress-text';
      qProgressText.textContent = `Progress: ${quest.progress} / ${quest.target} • +${quest.xpReward} XP`;

      itemInfo.append(qTitle, qDesc, qProgressText);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'radar-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Scan Atmosphere';
      actionBtn.disabled = quest.completed;

      actionBtn.addEventListener('click', () => {
        this.recordProgress(quest.id, 1);
        this.renderToDOM(container);
      });

      questItem.append(itemInfo, actionBtn);
      questList.append(questItem);
    });

    questSection.append(questList);
    questWrapper.append(questSection);

    container.append(questWrapper);
  }
}
