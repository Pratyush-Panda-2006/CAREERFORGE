/**
 * VrMetaverseHubQuestEngine
 * Milestone gamification & contributor achievement badge engine for VR Metaverse Hub.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class VrMetaverseHubQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'world-builder',
        title: 'Construct Virtual Scene Realm',
        description: 'Deploy interactive 3D spatial node mesh and physics collider boundary.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-world-builder',
        completed: false
      },
      {
        id: 'avatar-rigging',
        title: 'Rig 5 Haptic Avatars',
        description: 'Calibrate inverse kinematics, gesture tracking, and spatial audio anchors.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-avatar-sculptor',
        completed: false
      },
      {
        id: 'spatial-portal',
        title: 'Establish 10 Metaverse Teleport Links',
        description: 'Connect decentralized immersive shard realms with low-latency RPC gateways.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-portal-architect',
        completed: false
      },
      {
        id: 'metaverse-symposium',
        title: 'Host 3 Immersive Spatial Expos',
        description: 'Orchestrate multi-user synchronized spatial audio conferences with 100+ concurrent peers.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-metaverse-luminary',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-world-builder',
        name: 'World Builder',
        tier: 'Bronze',
        icon: '🌐',
        description: 'Awarded for deploying your first 3D spatial virtual scene realm.',
        unlocked: false
      },
      {
        id: 'silver-avatar-sculptor',
        name: 'Avatar Sculptor',
        tier: 'Silver',
        icon: '🥽',
        description: 'Awarded for rigging and calibrating 5 haptic metaverse avatars.',
        unlocked: false
      },
      {
        id: 'gold-portal-architect',
        name: 'Portal Architect',
        tier: 'Gold',
        icon: '🚪',
        description: 'Awarded for linking 10 decentralized immersive shard gateways.',
        unlocked: false
      },
      {
        id: 'platinum-metaverse-luminary',
        name: 'Metaverse Luminary',
        tier: 'Platinum',
        icon: '👑',
        description: 'Awarded for hosting 3 multi-user spatial symposium expos.',
        unlocked: false
      }
    ];
  }

  /**
   * Calculates progressive user level and mathematical XP curves.
   * XP curve formula: level = floor(sqrt(xp / 100)) + 1
   * @param {number} xp
   * @returns {{ level: number, currentXp: number, currentLevelBaseXp: number, nextLevelBaseXp: number, xpNeededForNextLevel: number, progressPercent: number }}
   */
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

  /**
   * Records progress against a specific quest objective and triggers badge unlocks.
   * @param {string} questId
   * @param {number} amount
   * @returns {{ quest: object, newlyCompleted: boolean, unlockedBadges: Array<object> }}
   */
  recordProgress(questId, amount = 1) {
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest) {
      throw new Error(`Quest ${questId} not found in catalog`);
    }

    if (quest.completed) {
      return { quest, newlyCompleted: false, unlockedBadges: [] };
    }

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

  /**
   * Evaluates badge unlock criteria based on completed milestones.
   * @returns {Array<object>} Newly unlocked badges
   */
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

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  notify(quest, unlockedBadges) {
    const state = {
      xp: this.xp,
      levelInfo: this.calculateUserLevel(),
      quest,
      unlockedBadges
    };
    this.listeners.forEach((fn) => fn(state));
  }

  renderToDOM(container) {
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'vr-metaverse-hub-quest-container';

    // Header & XP Summary
    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'vr-metaverse-hub-quest-header';
    header.innerHTML = `
      <div class="vr-metaverse-hub-quest-title-group">
        <h3>🏆 VR Metaverse Hub - Milestones & Achievements</h3>
        <p>Complete milestones, earn XP, and unlock contributor credentials.</p>
      </div>
      <div class="vr-metaverse-hub-xp-summary-card">
        <div class="vr-metaverse-hub-level-badge">Lv.${levelInfo.level}</div>
        <div class="vr-metaverse-hub-xp-info">
          <span class="vr-metaverse-hub-xp-label">Contributor XP</span>
          <span class="vr-metaverse-hub-xp-numbers">${this.xp} / ${levelInfo.nextLevelBaseXp} XP</span>
        </div>
      </div>
    `;

    // Progress bar
    const progressTrack = document.createElement('div');
    progressTrack.className = 'vr-metaverse-hub-progress-bar-container';
    progressTrack.innerHTML = `<div class="vr-metaverse-hub-progress-bar-fill" style="width: ${levelInfo.progressPercent}%;"></div>`;

    // Badges Grid
    const badgeHeading = document.createElement('div');
    badgeHeading.className = 'vr-metaverse-hub-section-heading';
    badgeHeading.textContent = 'Achievement Badges';

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'vr-metaverse-hub-badges-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `vr-metaverse-hub-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="vr-metaverse-hub-badge-icon">${b.icon}</div>
        <div class="vr-metaverse-hub-badge-name">${b.name}</div>
        <div class="vr-metaverse-hub-badge-tier ${b.tier.toLowerCase()}">${b.tier} Tier</div>
        <p class="vr-metaverse-hub-badge-desc">${b.description}</p>
      `;
      badgesGrid.appendChild(bCard);
    });

    // Quests List
    const questHeading = document.createElement('div');
    questHeading.className = 'vr-metaverse-hub-section-heading';
    questHeading.textContent = 'Active Milestones & Quests';

    const questsList = document.createElement('div');
    questsList.className = 'vr-metaverse-hub-quests-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `vr-metaverse-hub-quest-card ${q.completed ? 'completed' : ''}`;
      qCard.innerHTML = `
        <div class="vr-metaverse-hub-quest-info">
          <div class="vr-metaverse-hub-quest-title">
            <span>${q.completed ? '✅' : '🎯'}</span>
            <span>${q.title}</span>
          </div>
          <p class="vr-metaverse-hub-quest-desc">${q.description}</p>
          <div class="vr-metaverse-hub-quest-progress-track">
            <span>Progress: ${q.progress} / ${q.target}</span>
            <span>•</span>
            <span>+${q.xpReward} XP</span>
          </div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'vr-metaverse-hub-quest-action-btn';
      btn.textContent = q.completed ? 'Completed' : 'Contribute (+1)';
      btn.disabled = q.completed;
      btn.addEventListener('click', () => {
        this.recordProgress(q.id, 1);
        this.renderToDOM(container);
      });

      qCard.appendChild(btn);
      questsList.appendChild(qCard);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(progressTrack);
    wrapper.appendChild(badgeHeading);
    wrapper.appendChild(badgesGrid);
    wrapper.appendChild(questHeading);
    wrapper.appendChild(questsList);

    container.appendChild(wrapper);
  }
}
