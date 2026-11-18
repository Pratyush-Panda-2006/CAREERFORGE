/**
 * PetAdoptionHavenQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking animal rescue volunteering, foster milestones, and pet adoption quests.
 */
export class PetAdoptionHavenQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'foster-onboarding',
        title: 'Complete Foster Parent Onboarding',
        description: 'Complete background screening, household inspection, and safe animal handling orientation.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-foster-friend',
        completed: false
      },
      {
        id: 'shelter-walks',
        title: 'Volunteer Dog Walking Sessions',
        description: 'Log 20 outdoor enrichment and socialization walk sessions with shelter rescue dogs.',
        target: 20,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-canine-companion',
        completed: false
      },
      {
        id: 'rescue-adoptions',
        title: 'Facilitate Successful Pet Adoptions',
        description: 'Guide 10 prospective adopters through match meetings and final adoption contract completions.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-haven-guardian',
        completed: false
      },
      {
        id: 'forever-home-hero',
        title: 'Sponsor Special Needs Animals',
        description: 'Provide critical medical rehabilitation and shelter sponsorship for 5 high-needs animals.',
        target: 5,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-forever-home-hero',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-foster-friend',
        name: 'Foster Friend',
        tier: 'Bronze',
        icon: '🐾',
        description: 'Awarded for completing certified foster care orientation.',
        unlocked: false
      },
      {
        id: 'silver-canine-companion',
        name: 'Canine Companion',
        tier: 'Silver',
        icon: '🐕',
        description: 'Awarded for 20 volunteer dog walking and enrichment hours.',
        unlocked: false
      },
      {
        id: 'gold-haven-guardian',
        name: 'Haven Guardian',
        tier: 'Gold',
        icon: '🏠',
        description: 'Awarded for facilitating 10 permanent rescue pet adoptions.',
        unlocked: false
      },
      {
        id: 'platinum-forever-home-hero',
        name: 'Forever Home Hero',
        tier: 'Platinum',
        icon: '💖',
        description: 'Awarded for exceptional dedication to senior and special-needs animals.',
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
    questWrapper.className = 'pet-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'pet-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'pet-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Rescue Quests & Guardian Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'pet-quest-subtitle';
    subtitle.textContent = 'Earn volunteer XP, unlock adoption achievement tiers, and level up through animal rescue milestones.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'pet-level-badge';
    levelBadge.textContent = `Guardian Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'pet-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'pet-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'pet-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Animal Rescue Achievement Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'pet-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `pet-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'pet-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'pet-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'pet-badge-tier';
      badgeTier.textContent = `${badge.tier} Tier`;

      badgeCard.append(icon, badgeName, badgeTier);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questsSection = document.createElement('div');
    questsSection.className = 'pet-quests-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Volunteer Quests';
    questsSection.append(questHeading);

    const questsList = document.createElement('div');
    questsList.className = 'pet-quests-list';

    this.quests.forEach((quest) => {
      const card = document.createElement('div');
      card.className = `pet-quest-card ${quest.completed ? 'completed' : ''}`;

      const top = document.createElement('div');
      top.className = 'pet-quest-top';

      const questTitle = document.createElement('div');
      questTitle.className = 'pet-quest-title';
      questTitle.textContent = quest.title;

      const xpTag = document.createElement('span');
      xpTag.className = 'pet-quest-xp';
      xpTag.textContent = `+${quest.xpReward} XP`;

      top.append(questTitle, xpTag);

      const desc = document.createElement('p');
      desc.className = 'pet-quest-desc';
      desc.textContent = quest.description;

      const progressRow = document.createElement('div');
      progressRow.className = 'pet-quest-progress-row';

      const progressText = document.createElement('span');
      progressText.className = 'pet-progress-text';
      progressText.textContent = `${quest.progress} / ${quest.target} (${Math.floor((quest.progress / quest.target) * 100)}%)`;

      const actionBtn = document.createElement('button');
      actionBtn.className = 'pet-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Log Session (+1)';
      actionBtn.disabled = quest.completed;
      actionBtn.addEventListener('click', () => {
        this.recordProgress(quest.id, 1);
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
