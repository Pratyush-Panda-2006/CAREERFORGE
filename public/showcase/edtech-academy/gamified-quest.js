/**
 * EdtechAcademyQuestEngine
 * Milestone gamification & contributor achievement badge engine for tracking curriculum milestones, quiz streaks, and peer reviews.
 */
export class EdtechAcademyQuestEngine {
  constructor(options = {}) {
    this.xp = options.initialXp || 0;
    this.quests = options.quests || this.getDefaultQuests();
    this.badges = options.badges || this.getDefaultBadges();
    this.listeners = [];
  }

  getDefaultQuests() {
    return [
      {
        id: 'first-lesson',
        title: 'Complete Python Fundamentals Module',
        description: 'Complete hands-on programming labs covering control flow, functions, and data structures.',
        target: 1,
        progress: 0,
        xpReward: 250,
        badgeId: 'bronze-code-cadet',
        completed: false
      },
      {
        id: 'quiz-streak',
        title: 'Pass 5 Algorithm Mastery Quizzes',
        description: 'Achieve 100% test scores across 5 algorithmic problem-solving assessments.',
        target: 5,
        progress: 0,
        xpReward: 500,
        badgeId: 'silver-logic-scholar',
        completed: false
      },
      {
        id: 'peer-review',
        title: 'Review 10 Student Capstone Projects',
        description: 'Provide constructive code review annotations and rubric feedback for peer submissions.',
        target: 10,
        progress: 0,
        xpReward: 1000,
        badgeId: 'gold-peer-mentor',
        completed: false
      },
      {
        id: 'academy-honor',
        title: 'Complete 3 Full-Stack Certification Tracks',
        description: 'Graduate with honors across Web Systems, Cloud Infrastructure, and Data Engineering pathways.',
        target: 3,
        progress: 0,
        xpReward: 2500,
        badgeId: 'platinum-master-educator',
        completed: false
      }
    ];
  }

  getDefaultBadges() {
    return [
      {
        id: 'bronze-code-cadet',
        name: 'Code Cadet',
        tier: 'Bronze',
        icon: '🎓',
        description: 'Awarded for completing the introductory programming fundamentals module.',
        unlocked: false
      },
      {
        id: 'silver-logic-scholar',
        name: 'Logic Scholar',
        tier: 'Silver',
        icon: '📜',
        description: 'Awarded for mastering 5 algorithmic problem-solving quizzes.',
        unlocked: false
      },
      {
        id: 'gold-peer-mentor',
        name: 'Peer Mentor',
        tier: 'Gold',
        icon: '💡',
        description: 'Awarded for reviewing and mentoring 10 student capstone projects.',
        unlocked: false
      },
      {
        id: 'platinum-master-educator',
        name: 'Master Educator',
        tier: 'Platinum',
        icon: '🏆',
        description: 'Awarded for completing 3 comprehensive full-stack certification pathways.',
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
    questWrapper.className = 'edtech-quest-container';

    // Header & User Level Bar
    const header = document.createElement('div');
    header.className = 'edtech-quest-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'edtech-quest-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Edtech Academy Milestones & Badges';

    const subtitle = document.createElement('p');
    subtitle.className = 'edtech-quest-subtitle';
    subtitle.textContent = 'Earn student XP, unlock academic achievement badges, and track your coursework progress.';

    titleGroup.append(title, subtitle);

    const levelInfo = this.calculateUserLevel();
    const levelBadge = document.createElement('div');
    levelBadge.className = 'edtech-level-badge';
    levelBadge.textContent = `Scholar Level ${levelInfo.level} • ${levelInfo.currentXp} XP`;

    header.append(titleGroup, levelBadge);
    questWrapper.append(header);

    // Progress Bar
    const xpBarWrapper = document.createElement('div');
    xpBarWrapper.className = 'edtech-xp-bar-wrapper';

    const xpFill = document.createElement('div');
    xpFill.className = 'edtech-xp-fill';
    xpFill.style.width = `${levelInfo.progressPercent}%`;

    xpBarWrapper.append(xpFill);
    questWrapper.append(xpBarWrapper);

    const xpDetails = document.createElement('div');
    xpDetails.className = 'edtech-xp-details';
    xpDetails.innerHTML = `<span>Level ${levelInfo.level} (${levelInfo.currentLevelBaseXp} XP)</span><span>${levelInfo.xpNeededForNextLevel} XP to Level ${levelInfo.level + 1}</span>`;
    questWrapper.append(xpDetails);

    // Badges Section
    const badgesSection = document.createElement('div');
    badgesSection.className = 'edtech-badges-section';

    const badgesTitle = document.createElement('h4');
    badgesTitle.textContent = 'Academic Badges';
    badgesSection.append(badgesTitle);

    const badgesGrid = document.createElement('div');
    badgesGrid.className = 'edtech-badges-grid';

    this.badges.forEach((b) => {
      const badgeCard = document.createElement('div');
      badgeCard.className = `edtech-badge-card ${b.unlocked ? 'unlocked' : ''}`;

      const icon = document.createElement('div');
      icon.className = 'edtech-badge-icon';
      icon.textContent = b.icon;

      const name = document.createElement('div');
      name.className = 'edtech-badge-name';
      name.textContent = b.name;

      const tier = document.createElement('div');
      tier.className = `edtech-badge-tier tier-${b.tier.toLowerCase()}`;
      tier.textContent = b.tier;

      const desc = document.createElement('div');
      desc.className = 'edtech-badge-desc';
      desc.textContent = b.description;

      badgeCard.append(icon, name, tier, desc);
      badgesGrid.append(badgeCard);
    });

    badgesSection.append(badgesGrid);
    questWrapper.append(badgesSection);

    // Quests Section
    const questsSection = document.createElement('div');
    questsSection.className = 'edtech-quests-section';

    const questsTitle = document.createElement('h4');
    questsTitle.textContent = 'Active Coursework Objectives';
    questsSection.append(questsTitle);

    const questsList = document.createElement('div');
    questsList.className = 'edtech-quests-list';

    this.quests.forEach((q) => {
      const questCard = document.createElement('div');
      questCard.className = `edtech-quest-card ${q.completed ? 'completed' : ''}`;

      const info = document.createElement('div');
      info.className = 'edtech-quest-info';

      const qTitle = document.createElement('div');
      qTitle.className = 'edtech-quest-title';
      qTitle.textContent = q.title;

      const qDesc = document.createElement('div');
      qDesc.className = 'edtech-quest-desc';
      qDesc.textContent = q.description;

      info.append(qTitle, qDesc);

      const meta = document.createElement('div');
      meta.className = 'edtech-quest-meta';

      const progress = document.createElement('div');
      progress.className = 'edtech-quest-progress-txt';
      progress.textContent = `${q.progress} / ${q.target}`;

      const xp = document.createElement('div');
      xp.className = 'edtech-quest-xp';
      xp.textContent = `+${q.xpReward} XP`;

      const btn = document.createElement('button');
      btn.className = 'edtech-quest-btn';
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
