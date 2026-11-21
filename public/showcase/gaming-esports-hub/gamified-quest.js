/**
 * GamingEsportsHubQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking EEG calibration, neural band modulation, and neuroprosthetic control.
 */
export class GamingEsportsHubQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-calibration',
        title: 'Complete 128-Ch Impedance Calibration',
        description: 'Verify all 128 scalp EEG electrode impedances below 5 kΩ with active common-mode rejection baseline.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-bci-novice',
        completed: false
      },
      {
        id: 'alpha-modulator',
        title: 'Maintain 5 Min Alpha Wave Focus',
        description: 'Sustain continuous 8-12 Hz alpha and 13-30 Hz beta spectral power modulation during cognitive focus tasks.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-neural-tuner',
        completed: false
      },
      {
        id: 'prosthetic-master',
        title: 'Execute 10 Robotic Neuroprosthetic Grasps',
        description: 'Perform 10 closed-loop multi-finger cybernetic hand grasping actions using real-time motor intent decoding.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-cybernetic-operator',
        completed: false
      },
      {
        id: 'cortex-synapse',
        title: 'Decode 3 Continuous Motor Trajectories',
        description: 'Calibrate high-accuracy kinematic spatial trajectory tracking models with correlation coefficient > 0.85.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-neural-architect',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-bci-novice',
        name: 'BCI Novice',
        tier: 'Bronze',
        icon: '🧠',
        description: 'Awarded for completing your first high-density EEG electrode montage calibration.',
        unlocked: false
      },
      {
        id: 'silver-neural-tuner',
        name: 'Neural Tuner',
        tier: 'Silver',
        icon: '🌊',
        description: 'Awarded for sustaining 5 minutes of focused alpha and beta band modulation.',
        unlocked: false
      },
      {
        id: 'gold-cybernetic-operator',
        name: 'Cybernetic Operator',
        tier: 'Gold',
        icon: '🦾',
        description: 'Awarded for executing 10 closed-loop robotic prosthetic grasp gestures.',
        unlocked: false
      },
      {
        id: 'platinum-neural-architect',
        name: 'Neural Architect',
        tier: 'Platinum',
        icon: '⚡',
        description: 'Awarded for calibrating 3 continuous multi-DoF motor cortex decoders.',
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
    questWrapper.className = 'neuro-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'neuro-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'neuro-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Neurotech Milestones & BCI Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'neuro-quest-subtitle';
    subtitle.textContent = 'Earn neural engineer XP, unlock brain-computer interface achievement tiers, and level up your synaptic decoder skill.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'neuro-level-badge';
    levelBadge.textContent = `Neural Engineer Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'neuro-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'neuro-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'neuro-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Cybernetic & Neural Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'neuro-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `neuro-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'neuro-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'neuro-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'neuro-badge-tier';
      badgeTier.textContent = badge.tier;

      const badgeDesc = document.createElement('div');
      badgeDesc.className = 'neuro-badge-desc';
      badgeDesc.textContent = badge.description;

      const statusTag = document.createElement('span');
      statusTag.className = `neuro-badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}`;
      statusTag.textContent = badge.unlocked ? '✓ Unlocked' : '🔒 Locked';

      badgeCard.append(icon, badgeName, badgeTier, badgeDesc, statusTag);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questSection = document.createElement('div');
    questSection.className = 'neuro-quest-list-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active BCI Research Objectives';
    questSection.append(questHeading);

    const questList = document.createElement('div');
    questList.className = 'neuro-quest-list';

    this.quests.forEach((quest) => {
      const questItem = document.createElement('div');
      questItem.className = `neuro-quest-item ${quest.completed ? 'quest-done' : ''}`;

      const itemInfo = document.createElement('div');
      itemInfo.className = 'neuro-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'neuro-quest-item-title';
      qTitle.textContent = quest.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'neuro-quest-item-desc';
      qDesc.textContent = quest.description;

      const qProgressText = document.createElement('div');
      qProgressText.className = 'neuro-quest-progress-text';
      qProgressText.textContent = `Progress: ${quest.progress} / ${quest.target} • +${quest.xpReward} XP`;

      itemInfo.append(qTitle, qDesc, qProgressText);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'neuro-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Decode Signal';
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
