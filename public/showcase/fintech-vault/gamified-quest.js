/**
 * FintechVaultQuestEngine
 * Milestone gamification & contributor achievement badge engine for Fintech Vault.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class FintechVaultQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "vault-auth",
    "title": "Verify Multi-Signature Vault Quorum",
    "description": "Authorize custodial withdrawal with cryptographic hardware security module.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-vault-guardian"
  },
  {
    "id": "compliance-audit",
    "title": "Pass 5 Tier-1 Capital Reserves Audits",
    "description": "Reconcile institutional balance sheet reserves against regulatory thresholds.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-capital-auditor"
  },
  {
    "id": "settlement-pipeline",
    "title": "Process 10 Real-Time Gross Settlements",
    "description": "Clear high-value cross-border treasury settlements in sub-second time.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-treasury-architect"
  },
  {
    "id": "fintech-monarch",
    "title": "Certify 3 Sovereign Liquidity Pools",
    "description": "Guarantee zero-counterparty risk across three sovereign debt pools.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-fintech-monarch"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-vault-guardian",
    "name": "Vault Guardian",
    "tier": "Bronze",
    "icon": "🔐",
    "description": "Authorized multi-signature custodial vault quorum."
  },
  {
    "id": "silver-capital-auditor",
    "name": "Capital Auditor",
    "tier": "Silver",
    "icon": "📑",
    "description": "Audited 5 institutional capital reserve allocations."
  },
  {
    "id": "gold-treasury-architect",
    "name": "Treasury Architect",
    "tier": "Gold",
    "icon": "🏛️",
    "description": "Processed 10 real-time gross settlement pipelines."
  },
  {
    "id": "platinum-fintech-monarch",
    "name": "Fintech Monarch",
    "tier": "Platinum",
    "icon": "👑",
    "description": "Guaranteed 3 sovereign liquidity debt pools."
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
    wrapper.className = 'fintech-vault-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'fintech-vault-quest-header';
    header.innerHTML = `
      <div class="fintech-vault-quest-title-group">
        <h3>🎮 Fintech Vault - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="fintech-vault-xp-summary-card">
        <div class="fintech-vault-level-badge">⭐</div>
        <div class="fintech-vault-xp-details">
          <div class="fintech-vault-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="fintech-vault-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'fintech-vault-quest-section';
    questsSection.innerHTML = '<h4 class="fintech-vault-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'fintech-vault-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `fintech-vault-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="fintech-vault-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="fintech-vault-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="fintech-vault-quest-status">
          <div class="fintech-vault-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="fintech-vault-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'fintech-vault-badge-section';
    badgesSection.innerHTML = '<h4 class="fintech-vault-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'fintech-vault-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `fintech-vault-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="fintech-vault-badge-icon">${b.icon}</div>
        <div class="fintech-vault-badge-name">${b.name}</div>
        <div class="fintech-vault-badge-tier">${b.tier}</div>
        <div class="fintech-vault-badge-desc">${b.description}</div>
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
