/**
 * LegalSmartContractsQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking legal smart contract deployments, escrow settlements, and arbitration milestones.
 */
export class LegalSmartContractsQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'deploy-escrow',
        title: 'Deploy Verified Escrow Contracts',
        description: 'Compile and deploy 20 verified multi-signature smart escrow repositories.',
        target: 20,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-solidity-paralegal',
        completed: false
      },
      {
        id: 'multi-sig-quorum',
        title: 'Execute Multi-Signature Settlements',
        description: 'Coordinate and confirm 15 on-chain threshold signature releases without dispute.',
        target: 15,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-quorum-notary',
        completed: false
      },
      {
        id: 'arbitration-cases',
        title: 'Settle DAO Arbitration Cases',
        description: 'Successfully arbitrate 10 contractual dispute cases via Schelling-point consensus.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-dao-magistrate',
        completed: false
      },
      {
        id: 'zero-knowledge-deeds',
        title: 'Generate zk-SNARK Legal Deeds',
        description: 'Issue 5 zero-knowledge cryptographic title deeds with immutable blockchain proof.',
        target: 5,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-cryptographic-jurist',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-solidity-paralegal',
        name: 'Solidity Paralegal',
        tier: 'Bronze',
        icon: '📜',
        description: 'Awarded for deploying audited smart escrow contracts.',
        unlocked: false
      },
      {
        id: 'silver-quorum-notary',
        name: 'Quorum Notary',
        tier: 'Silver',
        icon: '⚖️',
        description: 'Awarded for managing multi-signature collateral releases.',
        unlocked: false
      },
      {
        id: 'gold-dao-magistrate',
        name: 'DAO Magistrate',
        tier: 'Gold',
        icon: '🏛️',
        description: 'Awarded for presiding over decentralized contract arbitrations.',
        unlocked: false
      },
      {
        id: 'platinum-cryptographic-jurist',
        name: 'Cryptographic Jurist',
        tier: 'Platinum',
        icon: '💎',
        description: 'Awarded for zero-knowledge verifiable legal deed engineering.',
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
    questWrapper.className = 'legal-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'legal-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'legal-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Legal Protocol Quests & Jurist Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'legal-quest-subtitle';
    subtitle.textContent = 'Earn XP, unlock cryptographic legal credentials, and level up through smart contract settlements.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'legal-level-badge';
    levelBadge.textContent = `Rank Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'legal-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'legal-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'legal-badges-section';

    const badgeHeading = document.createElement('h4');
    badgeHeading.textContent = 'Jurist Credential Badges';
    badgesSection.append(badgeHeading);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'legal-badges-grid';

    this.badges.forEach((badge) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `legal-badge-card ${badge.unlocked ? 'unlocked' : 'locked'} tier-${badge.tier.toLowerCase()}`;

      const icon = document.createElement('div');
      icon.className = 'legal-badge-icon';
      icon.textContent = badge.icon;

      const badgeName = document.createElement('div');
      badgeName.className = 'legal-badge-name';
      badgeName.textContent = badge.name;

      const badgeTier = document.createElement('div');
      badgeTier.className = 'legal-badge-tier';
      badgeTier.textContent = `${badge.tier} Tier`;

      badgeCard.append(icon, badgeName, badgeTier);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Checklist Section
    const questsSection = document.createElement('div');
    questsSection.className = 'legal-quests-section';

    const questHeading = document.createElement('h4');
    questHeading.textContent = 'Active Legal Milestones';
    questsSection.append(questHeading);

    const questsList = document.createElement('div');
    questsList.className = 'legal-quests-list';

    this.quests.forEach((quest) => {
      const card = document.createElement('div');
      card.className = `legal-quest-card ${quest.completed ? 'completed' : ''}`;

      const top = document.createElement('div');
      top.className = 'legal-quest-top';

      const questTitle = document.createElement('div');
      questTitle.className = 'legal-quest-title';
      questTitle.textContent = quest.title;

      const xpTag = document.createElement('span');
      xpTag.className = 'legal-quest-xp';
      xpTag.textContent = `+${quest.xpReward} XP`;

      top.append(questTitle, xpTag);

      const desc = document.createElement('p');
      desc.className = 'legal-quest-desc';
      desc.textContent = quest.description;

      const progressRow = document.createElement('div');
      progressRow.className = 'legal-quest-progress-row';

      const progressText = document.createElement('span');
      progressText.className = 'legal-progress-text';
      progressText.textContent = `${quest.progress} / ${quest.target} (${Math.floor((quest.progress / quest.target) * 100)}%)`;

      const actionBtn = document.createElement('button');
      actionBtn.className = 'legal-quest-btn';
      actionBtn.textContent = quest.completed ? 'Completed' : 'Execute Milestone (+5)';
      actionBtn.disabled = quest.completed;
      actionBtn.addEventListener('click', () => {
        this.recordProgress(quest.id, 5);
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
