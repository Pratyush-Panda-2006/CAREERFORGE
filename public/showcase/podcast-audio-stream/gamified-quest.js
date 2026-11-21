/**
 * PodcastAudioStreamQuestEngine
 * Milestone gamification & contributor achievement badge engine for Podcast Audio Stream.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class PodcastAudioStreamQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-episode',
        title: 'Record First Audio Episode',
        description: 'Publish debut episode with normalized loudness profile and stereo stem master.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-debut-broadcaster',
        completed: false
      },
      {
        id: 'soundscape-sculptor',
        title: 'Mix 5 Ambient Soundscapes',
        description: 'Craft dynamic binaural background environments and adaptive acoustic filters.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-soundscape-sculptor',
        completed: false
      },
      {
        id: 'syndication-streak',
        title: 'Maintain 10-Week RSS Broadcast Streak',
        description: 'Consistently syndicate weekly episodes across all distributed podcast feeds.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-syndication-pioneer',
        completed: false
      },
      {
        id: 'mastering-maestro',
        title: 'Master 3 Dolby Atmos Binaural Epics',
        description: 'Master multi-channel immersive binaural podcast specials with dynamic panning.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-mastering-maestro',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-debut-broadcaster',
        name: 'Debut Broadcaster',
        tier: 'Bronze',
        icon: '🎙️',
        description: 'Awarded for publishing your debut podcast master.',
        unlocked: false
      },
      {
        id: 'silver-soundscape-sculptor',
        name: 'Soundscape Sculptor',
        tier: 'Silver',
        icon: '🎧',
        description: 'Awarded for mixing 5 ambient background soundscapes.',
        unlocked: false
      },
      {
        id: 'gold-syndication-pioneer',
        name: 'Syndication Pioneer',
        tier: 'Gold',
        icon: '📡',
        description: 'Awarded for maintaining 10-week consecutive RSS broadcasts.',
        unlocked: false
      },
      {
        id: 'platinum-mastering-maestro',
        name: 'Mastering Maestro',
        tier: 'Platinum',
        icon: '🏆',
        description: 'Awarded for authoring 3 Dolby Atmos binaural specials.',
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
    wrapper.className = 'podcast-audio-stream-quest-container';

    // Header & XP Summary
    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'podcast-audio-stream-quest-header';
    header.innerHTML = `
      <div class="podcast-audio-stream-quest-title-group">
        <h3>🏆 Podcast Audio Stream - Milestones & Achievements</h3>
        <p>Complete milestones, earn XP, and unlock contributor credentials.</p>
      </div>
      <div class="podcast-audio-stream-xp-summary-card">
        <div class="podcast-audio-stream-level-badge">Lv.${levelInfo.level}</div>
        <div class="podcast-audio-stream-xp-info">
          <span class="podcast-audio-stream-xp-label">Contributor XP</span>
          <span class="podcast-audio-stream-xp-numbers">${this.xp} / ${levelInfo.nextLevelBaseXp} XP</span>
        </div>
      </div>
    `;

    // Progress bar
    const progressTrack = document.createElement('div');
    progressTrack.className = 'podcast-audio-stream-progress-bar-container';
    progressTrack.innerHTML = `<div class="podcast-audio-stream-progress-bar-fill" style="width: ${levelInfo.progressPercent}%;"></div>`;

    // Badges Grid
    const badgeHeading = document.createElement('div');
    badgeHeading.className = 'podcast-audio-stream-section-heading';
    badgeHeading.textContent = 'Achievement Badges';

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'podcast-audio-stream-badges-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `podcast-audio-stream-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="podcast-audio-stream-badge-icon">${b.icon}</div>
        <div class="podcast-audio-stream-badge-name">${b.name}</div>
        <div class="podcast-audio-stream-badge-tier ${b.tier.toLowerCase()}">${b.tier} Tier</div>
        <p class="podcast-audio-stream-badge-desc">${b.description}</p>
      `;
      badgesGrid.appendChild(bCard);
    });

    // Quests List
    const questHeading = document.createElement('div');
    questHeading.className = 'podcast-audio-stream-section-heading';
    questHeading.textContent = 'Active Milestones & Quests';

    const questsList = document.createElement('div');
    questsList.className = 'podcast-audio-stream-quests-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `podcast-audio-stream-quest-card ${q.completed ? 'completed' : ''}`;
      qCard.innerHTML = `
        <div class="podcast-audio-stream-quest-info">
          <div class="podcast-audio-stream-quest-title">
            <span>${q.completed ? '✅' : '🎯'}</span>
            <span>${q.title}</span>
          </div>
          <p class="podcast-audio-stream-quest-desc">${q.description}</p>
          <div class="podcast-audio-stream-quest-progress-track">
            <span>Progress: ${q.progress} / ${q.target}</span>
            <span>•</span>
            <span>+${q.xpReward} XP</span>
          </div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'podcast-audio-stream-quest-action-btn';
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
