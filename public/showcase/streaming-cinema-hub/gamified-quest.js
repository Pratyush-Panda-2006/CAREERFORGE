/**
 * StreamingCinemaHubQuestEngine
 * Milestone gamification & contributor achievement badge engine for 4K screenings, watchlist curation, and synchronized watch parties.
 */
export class StreamingCinemaHubQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-screening',
        title: 'Stream First 4K Master Feature',
        description: 'Complete the screening of a full-length film in ultra high definition 4K HDR with Dolby Atmos audio.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-cinephile-initiate',
        completed: false
      },
      {
        id: 'film-critic',
        title: 'Curate 5 Thematic Watchlists',
        description: 'Publish 5 thematic film collections with custom synopses, genre tags, and recommendations.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-curator-critic',
        completed: false
      },
      {
        id: 'marathon-watch',
        title: 'Host 10 Synchronized Watch Parties',
        description: 'Host and stream 10 real-time group screening rooms with interactive cinephile live chat.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-theater-host',
        completed: false
      },
      {
        id: 'auteur-master',
        title: 'Complete 3 Full Director Retrospectives',
        description: 'Screen complete filmographies of 3 celebrated world cinema visionary directors.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-auteur-scholar',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-cinephile-initiate',
        name: 'Cinephile Initiate',
        tier: 'Bronze',
        icon: '🎬',
        description: 'Awarded for screening your first master 4K film.',
        unlocked: false
      },
      {
        id: 'silver-curator-critic',
        name: 'Curator Critic',
        tier: 'Silver',
        icon: '🎞️',
        description: 'Awarded for assembling 5 thematic cinema watchlists.',
        unlocked: false
      },
      {
        id: 'gold-theater-host',
        name: 'Theater Host',
        tier: 'Gold',
        icon: '🍿',
        description: 'Awarded for hosting 10 synchronized group watch parties.',
        unlocked: false
      },
      {
        id: 'platinum-auteur-scholar',
        name: 'Auteur Scholar',
        tier: 'Platinum',
        icon: '📽️',
        description: 'Awarded for streaming 3 comprehensive director retrospectives.',
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
    questWrapper.className = 'cinema-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'cinema-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'cinema-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Cinephile Milestones & Screen Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'cinema-quest-subtitle';
    subtitle.textContent = 'Earn cinephile XP, unlock theater mastery achievement tiers, and level up your film culture expertise.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'cinema-level-badge';
    levelBadge.textContent = `Cinephile Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'cinema-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'cinema-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'cinema-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Theatrical Achievement Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'cinema-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `cinema-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'cinema-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'cinema-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'cinema-badge-tier';
      badgeTier.textContent = badge.tier;

      const badgeDesc = document.createElement('div');
      badgeDesc.className = 'cinema-badge-desc';
      badgeDesc.textContent = badge.description;

      const statusTag = document.createElement('span');
      statusTag.className = `cinema-badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}`;
      statusTag.textContent = badge.unlocked ? '✓ Unlocked' : '🔒 Locked';

      badgeCard.append(icon, badgeName, badgeTier, badgeDesc, statusTag);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questSection = document.createElement('div');
    questSection.className = 'cinema-quest-list-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Cinephile Objectives';
    questSection.append(questHeading);

    const questList = document.createElement('div');
    questList.className = 'cinema-quest-list';

    this.quests.forEach((quest) => {
      const questItem = document.createElement('div');
      questItem.className = `cinema-quest-item ${quest.completed ? 'quest-done' : ''}`;

      const itemInfo = document.createElement('div');
      itemInfo.className = 'cinema-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'cinema-quest-item-title';
      qTitle.textContent = quest.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'cinema-quest-item-desc';
      qDesc.textContent = quest.description;

      const qProgressText = document.createElement('div');
      qProgressText.className = 'cinema-quest-progress-text';
      qProgressText.textContent = `Progress: ${quest.progress} / ${quest.target} • +${quest.xpReward} XP`;

      itemInfo.append(qTitle, qDesc, qProgressText);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'cinema-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Watch Movie';
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
