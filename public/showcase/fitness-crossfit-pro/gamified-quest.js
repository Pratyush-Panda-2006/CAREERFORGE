/**
 * FitnessCrossfitProQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking CrossFit WODs, barbell PRs, and metabolic conditioning milestones.
 */
export class FitnessCrossfitProQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-wod',
        title: 'Complete First Official Box WOD',
        description: 'Complete an instructor-supervised benchmark functional fitness workout under official movement standards.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-box-initiate',
        completed: false
      },
      {
        id: 'barbell-mastery',
        title: 'Log 5 Barbell Strength PRs',
        description: 'Establish new one-rep maximum records across Olympic snatch, clean and jerk, front squat, overhead press, and deadlift.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-barbell-beast',
        completed: false
      },
      {
        id: 'century-metcon',
        title: 'Complete 10 Hero or Benchmark WODs',
        description: 'Survive 10 grueling benchmark workouts including Murph, Fran, Helen, and Grace under RX standards.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-metcon-warrior',
        completed: false
      },
      {
        id: 'podium-games',
        title: 'Qualify for Box Championship Open',
        description: 'Place in the top 10 percent of 3 consecutive seasonal Open qualifier events with verified video submissions.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-crossfit-titan',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-box-initiate',
        name: 'Box Initiate',
        tier: 'Bronze',
        icon: '🏋️',
        description: 'Awarded for completing your first structured functional fitness workout.',
        unlocked: false
      },
      {
        id: 'silver-barbell-beast',
        name: 'Barbell Beast',
        tier: 'Silver',
        icon: '💥',
        description: 'Awarded for hitting 5 personal records across snatch, clean, and deadlift.',
        unlocked: false
      },
      {
        id: 'gold-metcon-warrior',
        name: 'Metcon Warrior',
        tier: 'Gold',
        icon: '⏱️',
        description: 'Awarded for conquering 10 high-intensity Hero and Benchmark WODs.',
        unlocked: false
      },
      {
        id: 'platinum-crossfit-titan',
        name: 'CrossFit Titan',
        tier: 'Platinum',
        icon: '🏆',
        description: 'Awarded for completing 3 elite box championship qualifiers.',
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
    questWrapper.className = 'fitness-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'fitness-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'fitness-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Athlete Milestones & CrossFit Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'fitness-quest-subtitle';
    subtitle.textContent = 'Earn athlete XP, unlock functional fitness achievement tiers, and level up your overall work capacity.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'fitness-level-badge';
    levelBadge.textContent = `Athlete Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'fitness-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'fitness-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'fitness-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Performance Achievement Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'fitness-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `fitness-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'fitness-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'fitness-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'fitness-badge-tier';
      badgeTier.textContent = badge.tier;

      const badgeDesc = document.createElement('div');
      badgeDesc.className = 'fitness-badge-desc';
      badgeDesc.textContent = badge.description;

      const statusTag = document.createElement('span');
      statusTag.className = `fitness-badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}`;
      statusTag.textContent = badge.unlocked ? '✓ Unlocked' : '🔒 Locked';

      badgeCard.append(icon, badgeName, badgeTier, badgeDesc, statusTag);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questSection = document.createElement('div');
    questSection.className = 'fitness-quest-list-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Training Objectives';
    questSection.append(questHeading);

    const questList = document.createElement('div');
    questList.className = 'fitness-quest-list';

    this.quests.forEach((quest) => {
      const questItem = document.createElement('div');
      questItem.className = `fitness-quest-item ${quest.completed ? 'quest-done' : ''}`;

      const itemInfo = document.createElement('div');
      itemInfo.className = 'fitness-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'fitness-quest-item-title';
      qTitle.textContent = quest.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'fitness-quest-item-desc';
      qDesc.textContent = quest.description;

      const qProgressText = document.createElement('div');
      qProgressText.className = 'fitness-quest-progress-text';
      qProgressText.textContent = `Progress: ${quest.progress} / ${quest.target} • +${quest.xpReward} XP`;

      itemInfo.append(qTitle, qDesc, qProgressText);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'fitness-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Log Workout';
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
