/**
 * AiVoiceStudioQuestEngine
 * Milestone gamification & contributor achievement badge engine for AI Voice Studio.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class AiVoiceStudioQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "first-voice",
    "title": "Synthesize First Neural Voice Avatar",
    "description": "Generate speech using multi-lingual neural timbre vocoder.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-voice-creator"
  },
  {
    "id": "timbre-tuning",
    "title": "Calibrate 5 Pitch Inflections",
    "description": "Fine-tune emotion and prosody curves across 5 custom studio recordings.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-audio-sculptor"
  },
  {
    "id": "voice-cloning",
    "title": "Train 10 High-Fidelity Voice Models",
    "description": "Train zero-shot speech synthesis models with 99.8% similarity score.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-voice-alchemist"
  },
  {
    "id": "studio-maestro",
    "title": "Broadcast 3 Multilingual Podcasts",
    "description": "Publish 3 live studio broadcasts in synchronized multi-language voice feeds.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-studio-maestro"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-voice-creator",
    "name": "Voice Creator",
    "tier": "Bronze",
    "icon": "🎙️",
    "description": "Generated speech using multi-lingual neural timbre vocoder."
  },
  {
    "id": "silver-audio-sculptor",
    "name": "Audio Sculptor",
    "tier": "Silver",
    "icon": "🎚️",
    "description": "Fine-tuned emotion and prosody curves across 5 voice assets."
  },
  {
    "id": "gold-voice-alchemist",
    "name": "Voice Alchemist",
    "tier": "Gold",
    "icon": "✨",
    "description": "Trained zero-shot speech synthesis models with 99.8% similarity."
  },
  {
    "id": "platinum-studio-maestro",
    "name": "Studio Maestro",
    "tier": "Platinum",
    "icon": "🎧",
    "description": "Published 3 live studio broadcasts in synchronized multilingual feeds."
  }
].map(b => ({ ...b, unlocked: false }));
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
    wrapper.className = 'ai-voice-studio-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'ai-voice-studio-quest-header';
    header.innerHTML = `
      <div class="ai-voice-studio-quest-title-group">
        <h3>🎮 AI Voice Studio - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="ai-voice-studio-xp-summary-card">
        <div class="ai-voice-studio-level-badge">⭐</div>
        <div class="ai-voice-studio-xp-details">
          <div class="ai-voice-studio-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="ai-voice-studio-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'ai-voice-studio-quest-section';
    questsSection.innerHTML = '<h4 class="ai-voice-studio-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'ai-voice-studio-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `ai-voice-studio-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="ai-voice-studio-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="ai-voice-studio-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="ai-voice-studio-quest-status">
          <div class="ai-voice-studio-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="ai-voice-studio-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'ai-voice-studio-badge-section';
    badgesSection.innerHTML = '<h4 class="ai-voice-studio-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'ai-voice-studio-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `ai-voice-studio-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="ai-voice-studio-badge-icon">${b.icon}</div>
        <div class="ai-voice-studio-badge-name">${b.name}</div>
        <div class="ai-voice-studio-badge-tier">${b.tier}</div>
        <div class="ai-voice-studio-badge-desc">${b.description}</div>
      `;
      badgeGrid.appendChild(bCard);
    });
    badgesSection.appendChild(badgeGrid);

    wrapper.appendChild(header);
    wrapper.appendChild(questsSection);
    wrapper.appendChild(badgesSection);
    container.appendChild(wrapper);
  }
}
