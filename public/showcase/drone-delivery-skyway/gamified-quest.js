/**
 * DroneDeliverySkywayQuestEngine
 * Milestone gamification & contributor achievement badge engine for autonomous drone delivery flights, battery swapping, and cargo drops.
 */
export class DroneDeliverySkywayQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-flight',
        title: 'Complete Autonomous Skyway Mission',
        description: 'Dispatch and successfully navigate an autonomous multi-rotor delivery UAV along an urban airway corridor.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-skyway-cadet',
        completed: false
      },
      {
        id: 'battery-cycle',
        title: 'Complete Automated Fast-Swap Cycles',
        description: 'Complete 5 rapid automated vertiport battery swaps without docking alignment re-attempts.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-battery-tech',
        completed: false
      },
      {
        id: 'package-drop',
        title: 'Execute Precision Tether Cargo Drops',
        description: 'Lower 10 delicate parcels to residential drop pads using sensor-guided ultrasonic winch tension.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-cargo-pilot',
        completed: false
      },
      {
        id: 'fleet-admiral',
        title: 'Manage Multi-UAV Airspace Corridor',
        description: 'Coordinate 3 peak-hour airspace corridor schedules maintaining zero separation violations.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-fleet-commander',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-skyway-cadet',
        name: 'Skyway Cadet',
        tier: 'Bronze',
        icon: '🚁',
        description: 'Awarded for completing your first autonomous delivery route.',
        unlocked: false
      },
      {
        id: 'silver-battery-tech',
        name: 'Battery Specialist',
        tier: 'Silver',
        icon: '🔋',
        description: 'Awarded for completing 5 rapid automated battery docking cycles.',
        unlocked: false
      },
      {
        id: 'gold-cargo-pilot',
        name: 'Precision Navigator',
        tier: 'Gold',
        icon: '📦',
        description: 'Awarded for logging 10 pinpoint tether winch cargo drops.',
        unlocked: false
      },
      {
        id: 'platinum-fleet-commander',
        name: 'Fleet Commander',
        tier: 'Platinum',
        icon: '🌐',
        description: 'Awarded for coordinating zero-incident corridor fleets across urban airspace.',
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
    questWrapper.className = 'drone-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'drone-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'drone-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Skyway Fleet Missions & Achievement Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'drone-quest-subtitle';
    subtitle.textContent = 'Earn pilot XP, unlock automated flight mastery tiers, and level up your airspace navigation rating.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'drone-level-badge';
    levelBadge.textContent = `Pilot Rank ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'drone-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'drone-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'drone-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Fleet Aviation Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'drone-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `drone-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'drone-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'drone-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'drone-badge-tier';
      badgeTier.textContent = badge.tier;

      const badgeDesc = document.createElement('div');
      badgeDesc.className = 'drone-badge-desc';
      badgeDesc.textContent = badge.description;

      const statusTag = document.createElement('span');
      statusTag.className = `drone-badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}`;
      statusTag.textContent = badge.unlocked ? '✓ Unlocked' : '🔒 Locked';

      badgeCard.append(icon, badgeName, badgeTier, badgeDesc, statusTag);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questSection = document.createElement('div');
    questSection.className = 'drone-quest-list-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Flight Missions';
    questSection.append(questHeading);

    const questList = document.createElement('div');
    questList.className = 'drone-quest-list';

    this.quests.forEach((quest) => {
      const questItem = document.createElement('div');
      questItem.className = `drone-quest-item ${quest.completed ? 'quest-done' : ''}`;

      const itemInfo = document.createElement('div');
      itemInfo.className = 'drone-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'drone-quest-item-title';
      qTitle.textContent = quest.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'drone-quest-item-desc';
      qDesc.textContent = quest.description;

      const qProgressText = document.createElement('div');
      qProgressText.className = 'drone-quest-progress-text';
      qProgressText.textContent = `Progress: ${quest.progress} / ${quest.target} • +${quest.xpReward} XP`;

      itemInfo.append(qTitle, qDesc, qProgressText);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'drone-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Dispatch Drone';
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
