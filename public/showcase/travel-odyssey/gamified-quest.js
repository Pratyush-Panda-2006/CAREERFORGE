/**
 * TravelOdysseyQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking itinerary milestones, cultural explorations, and alpine treks.
 */
export class TravelOdysseyQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-itinerary',
        title: 'Design First Multi-City Itinerary',
        description: 'Configure and save a comprehensive multi-stop voyage route with automated transit segments.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-trail-pioneer',
        completed: false
      },
      {
        id: 'culture-explorer',
        title: 'Explore 5 Cultural Heritage Landmarks',
        description: 'Verify visits or interactive bookings across 5 UNESCO world heritage monuments.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-culture-curator',
        completed: false
      },
      {
        id: 'summit-voyager',
        title: 'Complete 10 Alpine Trek Expeditions',
        description: 'Log 10 high-altitude trekking routes with altitude elevation gain telemetry.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-summit-voyager',
        completed: false
      },
      {
        id: 'odyssey-master',
        title: 'Map 3 Trans-Continental Odysseys',
        description: 'Publish 3 long-haul expedition journals with budget forecasting and travel vouchers.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-globe-trotter',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-trail-pioneer',
        name: 'Trail Pioneer',
        tier: 'Bronze',
        icon: '🧭',
        description: 'Awarded for publishing your first custom multi-destination itinerary.',
        unlocked: false
      },
      {
        id: 'silver-culture-curator',
        name: 'Culture Curator',
        tier: 'Silver',
        icon: '🏛️',
        description: 'Awarded for verifying visits across 5 world heritage monuments.',
        unlocked: false
      },
      {
        id: 'gold-summit-voyager',
        name: 'Summit Voyager',
        tier: 'Gold',
        icon: '🏔️',
        description: 'Awarded for conquering 10 alpine expedition trails.',
        unlocked: false
      },
      {
        id: 'platinum-globe-trotter',
        name: 'Globe Trotter',
        tier: 'Platinum',
        icon: '🌐',
        description: 'Awarded for mastering 3 trans-continental expedition odysseys.',
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
    questWrapper.className = 'travel-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'travel-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'travel-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Travel Odyssey Milestones & Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'travel-quest-subtitle';
    subtitle.textContent = 'Earn explorer XP, unlock world traveler badges, and track your global voyages.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'travel-level-badge';
    levelBadge.textContent = `Explorer Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'travel-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'travel-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    const xpDetails = document.createElement('div');
    xpDetails.className = 'travel-xp-details';
    xpDetails.innerHTML = `<span>Level ${levelInfo.level} (${levelInfo.currentLevelBaseXp} XP)</span><span>${levelInfo.xpNeededForNextLevel} XP to Level ${levelInfo.level + 1}</span>`;
    questWrapper.append(xpDetails);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'travel-badges-section';

    const badgesTitle = document.createElement('h4');
    badgesTitle.textContent = 'Achievement Badges';
    badgesSection.append(badgesTitle);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'travel-badges-grid';

    this.badges.forEach((b) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `travel-badge-card ${b.unlocked ? 'unlocked' : ''}`;

      const icon = document.createElement('div');
      icon.className = 'travel-badge-icon';
      icon.textContent = b.icon;

      const name = document.createElement('div');
      name.className = 'travel-badge-name';
      name.textContent = b.name;

      const tier = document.createElement('div');
      tier.className = `travel-badge-tier tier-${b.tier.toLowerCase()}`;
      tier.textContent = b.tier;

      const desc = document.createElement('div');
      desc.className = 'travel-badge-desc';
      desc.textContent = b.description;

      badgeCard.append(icon, name, tier, desc);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Section
    const questsSection = document.createElement('div');
    questsSection.className = 'travel-quests-section';

    const questsTitle = document.createElement('h4');
    questsTitle.textContent = 'Active Expeditions & Quests';
    questsSection.append(questsTitle);

    const questsList = document.createElement('div');
    questsList.className = 'travel-quests-list';

    this.quests.forEach((q) => {
      const questCard = document.createElement('div');
      questCard.className = `travel-quest-card ${q.completed ? 'completed' : ''}`;

      const info = document.createElement('div');
      info.className = 'travel-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'travel-quest-title';
      qTitle.textContent = q.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'travel-quest-desc';
      qDesc.textContent = q.description;

      info.append(qTitle, qDesc);

      const meta = document.createElement('div');
      meta.className = 'travel-quest-meta';

      const progress = document.createElement('div');
      progress.className = 'travel-quest-progress-txt';
      progress.textContent = `${q.progress} / ${q.target}`;

      const xp = document.createElement('div');
      xp.className = 'travel-quest-xp';
      xp.textContent = `+${q.xpReward} XP`;

      const btn = document.createElement('button');
      btn.className = 'travel-quest-btn';
      btn.textContent = q.completed ? 'Completed' : 'Advance';
      btn.disabled = q.completed;

      btn.addEventListener('click', () => {
        this.recordProgress(q.id, 1);
        this.renderToDOM(container);
      });

      meta.append(progress, xp, btn);
      questCard.append(info, meta);
      questsList.append(questCard);
    });

    questsSection.append(questsList);
    questWrapper.append(questsSection);

    container.append(questWrapper);
  }
}
