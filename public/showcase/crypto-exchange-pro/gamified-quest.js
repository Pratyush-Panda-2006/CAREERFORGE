/**
 * CryptoExchangeProQuestEngine
 * Milestone gamification & contributor achievement badge engine for Crypto Exchange Pro.
 * Tracks user interaction milestones, awards dynamic badges with progress percentages,
 * and calculates progressive XP level curves.
 */
export class CryptoExchangeProQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
  {
    "id": "first-trade",
    "title": "Execute First Spot Order Match",
    "description": "Match order on central limit order book with sub-millisecond execution.",
    "target": 1,
    "xpReward": 250,
    "badgeId": "bronze-crypto-trader"
  },
  {
    "id": "liquidity-provider",
    "title": "Provide Liquidity on 5 Pairs",
    "description": "Maintain active limit bid/ask spread across 5 tier-1 currency pairs.",
    "target": 5,
    "xpReward": 500,
    "badgeId": "silver-liquidity-maker"
  },
  {
    "id": "arbitrage-master",
    "title": "Execute 10 Triangular Arbitrage Quorums",
    "description": "Execute zero-slippage cross-pair arbitrage loops across order book channels.",
    "target": 10,
    "xpReward": 1000,
    "badgeId": "gold-arbitrage-ace"
  },
  {
    "id": "exchange-titan",
    "title": "Settle 3 Institutional Block Trades",
    "description": "Clear institutional over-the-counter block trades with cryptographic custody proof.",
    "target": 3,
    "xpReward": 2500,
    "badgeId": "platinum-exchange-titan"
  }
].map(q => ({ ...q, progress: 0, completed: false }));
  }

  getDefaultBadges() {
    return [
  {
    "id": "bronze-crypto-trader",
    "name": "Crypto Trader",
    "tier": "Bronze",
    "icon": "🪙",
    "description": "Matched order on central limit order book with sub-ms execution."
  },
  {
    "id": "silver-liquidity-maker",
    "name": "Liquidity Maker",
    "tier": "Silver",
    "icon": "📈",
    "description": "Maintained active spread across 5 tier-1 currency pairs."
  },
  {
    "id": "gold-arbitrage-ace",
    "name": "Arbitrage Ace",
    "tier": "Gold",
    "icon": "⚡",
    "description": "Executed zero-slippage cross-pair arbitrage loops."
  },
  {
    "id": "platinum-exchange-titan",
    "name": "Exchange Titan",
    "tier": "Platinum",
    "icon": "🏛️",
    "description": "Cleared institutional block trades with cryptographic custody proof."
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
    wrapper.className = 'crypto-exchange-pro-quest-container';

    const levelInfo = this.calculateUserLevel();
    const header = document.createElement('div');
    header.className = 'crypto-exchange-pro-quest-header';
    header.innerHTML = `
      <div class="crypto-exchange-pro-quest-title-group">
        <h3>🎮 Crypto Exchange Pro - Milestone Quests</h3>
        <p>Complete operational milestones, earn XP, and unlock contributor achievements.</p>
      </div>
      <div class="crypto-exchange-pro-xp-summary-card">
        <div class="crypto-exchange-pro-level-badge">⭐</div>
        <div class="crypto-exchange-pro-xp-details">
          <div class="crypto-exchange-pro-level-label">Level <span class="lvl-num">${levelInfo.level}</span></div>
          <div class="crypto-exchange-pro-xp-counter"><span class="xp-val">${this.xp}</span> XP</div>
        </div>
      </div>
    `;

    const questsSection = document.createElement('div');
    questsSection.className = 'crypto-exchange-pro-quest-section';
    questsSection.innerHTML = '<h4 class="crypto-exchange-pro-section-heading">Active Quests & Milestones</h4>';

    const questList = document.createElement('div');
    questList.className = 'crypto-exchange-pro-quest-list';

    this.quests.forEach((q) => {
      const qCard = document.createElement('div');
      qCard.className = `crypto-exchange-pro-quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
      qCard.innerHTML = `
        <div class="crypto-exchange-pro-quest-info">
          <h5>${q.title}</h5>
          <p>${q.description}</p>
          <div class="crypto-exchange-pro-quest-reward">Reward: +${q.xpReward} XP</div>
        </div>
        <div class="crypto-exchange-pro-quest-status">
          <div class="crypto-exchange-pro-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
          <div class="crypto-exchange-pro-progress-label">${q.progress} / ${q.target}</div>
        </div>
      `;
      questList.appendChild(qCard);
    });
    questsSection.appendChild(questList);

    const badgesSection = document.createElement('div');
    badgesSection.className = 'crypto-exchange-pro-badge-section';
    badgesSection.innerHTML = '<h4 class="crypto-exchange-pro-section-heading">Achievement Badges</h4>';

    const badgeGrid = document.createElement('div');
    badgeGrid.className = 'crypto-exchange-pro-badge-grid';

    this.badges.forEach((b) => {
      const bCard = document.createElement('div');
      bCard.className = `crypto-exchange-pro-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
      bCard.innerHTML = `
        <div class="crypto-exchange-pro-badge-icon">${b.icon}</div>
        <div class="crypto-exchange-pro-badge-name">${b.name}</div>
        <div class="crypto-exchange-pro-badge-tier">${b.tier}</div>
        <div class="crypto-exchange-pro-badge-desc">${b.description}</div>
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
