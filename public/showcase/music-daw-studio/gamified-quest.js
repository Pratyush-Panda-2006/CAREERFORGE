/**
 * MusicDawStudioQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking audio synthesis, beat arrangement, and studio mixing milestones.
 */
export class MusicDawStudioQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'beat-foundry',
        title: 'Compose 4-Bar Beat Grid',
        description: 'Sequence kick, snare, hi-hat and percussion patterns into a dynamic rhythm loop.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-beat-maker',
        completed: false
      },
      {
        id: 'synth-patch',
        title: 'Design Custom Wavetable Synth Patches',
        description: 'Modulate ADSR envelopes, LFO frequencies, and filter cutoffs on 5 distinct synthesizer instruments.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-synth-sculptor',
        completed: false
      },
      {
        id: 'multitrack-mix',
        title: 'Master Multitrack Mixdown Project',
        description: 'Balance gain staging, parametric EQ, and dynamic compression across 10 stem arrangements.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-audio-engineer',
        completed: false
      },
      {
        id: 'platinum-hit',
        title: 'Release Studio Master Album',
        description: 'Complete high-fidelity LUFS loudness limiting and stereo spatialization for 3 album masters.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-daw-maestro',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-beat-maker',
        name: 'Beat Maker',
        tier: 'Bronze',
        icon: '🥁',
        description: 'Awarded for programming your first 4-bar rhythm groove in the studio sequencer.',
        unlocked: false
      },
      {
        id: 'silver-synth-sculptor',
        name: 'Synth Sculptor',
        tier: 'Silver',
        icon: '🎹',
        description: 'Awarded for sculpting 5 custom polyphonic analog & wavetable synth presets.',
        unlocked: false
      },
      {
        id: 'gold-audio-engineer',
        name: 'Audio Engineer',
        tier: 'Gold',
        icon: '🎚️',
        description: 'Awarded for engineering 10 balanced multitrack studio stems with compression and EQ.',
        unlocked: false
      },
      {
        id: 'platinum-daw-maestro',
        name: 'DAW Maestro',
        tier: 'Platinum',
        icon: '🎧',
        description: 'Awarded for mastering 3 commercial-ready acoustic and electronic studio tracks.',
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
    questWrapper.className = 'daw-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'daw-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'daw-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'DAW Studio Milestones & Audio Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'daw-quest-subtitle';
    subtitle.textContent = 'Earn sound designer XP, unlock studio mastery achievement tiers, and level up your audio engineering craft.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'daw-level-badge';
    levelBadge.textContent = `Producer Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'daw-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'daw-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'daw-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Studio Engineering Achievement Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'daw-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `daw-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'daw-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'daw-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'daw-badge-tier';
      badgeTier.textContent = badge.tier;

      const badgeDesc = document.createElement('div');
      badgeDesc.className = 'daw-badge-desc';
      badgeDesc.textContent = badge.description;

      const statusTag = document.createElement('span');
      statusTag.className = `daw-badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}`;
      statusTag.textContent = badge.unlocked ? '✓ Unlocked' : '🔒 Locked';

      badgeCard.append(icon, badgeName, badgeTier, badgeDesc, statusTag);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questSection = document.createElement('div');
    questSection.className = 'daw-quest-list-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Production Objectives';
    questSection.append(questHeading);

    const questList = document.createElement('div');
    questList.className = 'daw-quest-list';

    this.quests.forEach((quest) => {
      const questItem = document.createElement('div');
      questItem.className = `daw-quest-item ${quest.completed ? 'quest-done' : ''}`;

      const itemInfo = document.createElement('div');
      itemInfo.className = 'daw-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'daw-quest-item-title';
      qTitle.textContent = quest.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'daw-quest-item-desc';
      qDesc.textContent = quest.description;

      const qProgressText = document.createElement('div');
      qProgressText.className = 'daw-quest-progress-text';
      qProgressText.textContent = `Progress: ${quest.progress} / ${quest.target} • +${quest.xpReward} XP`;

      itemInfo.append(qTitle, qDesc, qProgressText);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'daw-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Produce Track';
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
