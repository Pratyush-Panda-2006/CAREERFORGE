/**
 * CharityMicroloansQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking grassroots microloans, collective syndicates, and recycled social impact.
 */
export class CharityMicroloansQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-seed',
        title: 'Fund First Community Entrepreneur',
        description: 'Provide an initial micro-lending grant to empower a local artisan, farmer, or small business creator.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-seed-funder',
        completed: false
      },
      {
        id: 'syndicate-backer',
        title: 'Participate in Lending Syndicates',
        description: 'Join 5 collective micro-lending pools supporting underserved regional entrepreneurs.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-syndicate-backer',
        completed: false
      },
      {
        id: 'repayment-recycle',
        title: 'Recycle 10 Repaid Microloans',
        description: 'Relend repaid capital from 10 completed loan cycles into freshly vetted community ventures.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-circular-philanthropist',
        completed: false
      },
      {
        id: 'empowerment-patron',
        title: 'Sponsor Regional Co-op Grants',
        description: 'Sponsor 3 long-term community agricultural or vocational training co-ops.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-empowerment-patron',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-seed-funder',
        name: 'Seed Funder',
        tier: 'Bronze',
        icon: '🌱',
        description: 'Awarded for financing your first grassroots microloan project.',
        unlocked: false
      },
      {
        id: 'silver-syndicate-backer',
        name: 'Syndicate Backer',
        tier: 'Silver',
        icon: '🤝',
        description: 'Awarded for participating in 5 cooperative community microloans.',
        unlocked: false
      },
      {
        id: 'gold-circular-philanthropist',
        name: 'Circular Philanthropist',
        tier: 'Gold',
        icon: '🔄',
        description: 'Awarded for recycling 10 returned loan principals into new entrepreneurs.',
        unlocked: false
      },
      {
        id: 'platinum-empowerment-patron',
        name: 'Empowerment Patron',
        tier: 'Platinum',
        icon: '🌟',
        description: 'Awarded for sponsoring 3 regional community development co-ops.',
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
    questWrapper.className = 'charity-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'charity-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'charity-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Microloan Milestones & Impact Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'charity-quest-subtitle';
    subtitle.textContent = 'Earn philanthropist XP, unlock grassroots funding achievement tiers, and level up your global social impact.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'charity-level-badge';
    levelBadge.textContent = `Philanthropist Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'charity-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'charity-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'charity-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Humanitarian Achievement Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'charity-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `charity-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'charity-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'charity-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'charity-badge-tier';
      badgeTier.textContent = badge.tier;

      const badgeDesc = document.createElement('div');
      badgeDesc.className = 'charity-badge-desc';
      badgeDesc.textContent = badge.description;

      const statusTag = document.createElement('span');
      statusTag.className = `charity-badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}`;
      statusTag.textContent = badge.unlocked ? '✓ Unlocked' : '🔒 Locked';

      badgeCard.append(icon, badgeName, badgeTier, badgeDesc, statusTag);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questSection = document.createElement('div');
    questSection.className = 'charity-quest-list-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Lending Goals';
    questSection.append(questHeading);

    const questList = document.createElement('div');
    questList.className = 'charity-quest-list';

    this.quests.forEach((quest) => {
      const questItem = document.createElement('div');
      questItem.className = `charity-quest-item ${quest.completed ? 'quest-done' : ''}`;

      const itemInfo = document.createElement('div');
      itemInfo.className = 'charity-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'charity-quest-item-title';
      qTitle.textContent = quest.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'charity-quest-item-desc';
      qDesc.textContent = quest.description;

      const qProgressText = document.createElement('div');
      qProgressText.className = 'charity-quest-progress-text';
      qProgressText.textContent = `Progress: ${quest.progress} / ${quest.target} • +${quest.xpReward} XP`;

      itemInfo.append(qTitle, qDesc, qProgressText);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'charity-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Fund Loan';
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
