import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansQuestEngine } from './gamified-quest.js';

describe('CharityMicroloansQuestEngine', () => {
  it('initializes with default microfinance quests and badges', () => {
    const engine = new CharityMicroloansQuestEngine();
    assert.equal(engine.getXp(), 0);
    assert.equal(engine.getQuests().length, 4);
    assert.equal(engine.getBadges().length, 4);
    assert.equal(engine.getBadges()[0].unlocked, false);
  });

  it('calculates philanthropist level and progression curve accurately', () => {
    const engine = new CharityMicroloansQuestEngine({ initialXp: 0 });
    const lvl1 = engine.calculateUserLevel(0);
    assert.equal(lvl1.level, 1);
    assert.equal(lvl1.progressPercent, 0);

    const lvl2 = engine.calculateUserLevel(100);
    assert.equal(lvl2.level, 2);

    const lvl3 = engine.calculateUserLevel(400);
    assert.equal(lvl3.level, 3);

    const lvl4 = engine.calculateUserLevel(900);
    assert.equal(lvl4.level, 4);
  });

  it('records funding progress, completes objectives, and grants XP', () => {
    const engine = new CharityMicroloansQuestEngine();
    const result = engine.recordProgress('first-seed', 1);

    assert.equal(result.newlyCompleted, true);
    assert.equal(result.quest.completed, true);
    assert.equal(engine.getXp(), 250);
    assert.equal(result.unlockedBadges.length, 1);
    assert.equal(result.unlockedBadges[0].id, 'bronze-seed-funder');
    assert.equal(result.unlockedBadges[0].unlocked, true);
  });

  it('handles multi-step syndicate incremental progress correctly', () => {
    const engine = new CharityMicroloansQuestEngine();
    const step1 = engine.recordProgress('syndicate-backer', 2);
    assert.equal(step1.newlyCompleted, false);
    assert.equal(step1.quest.progress, 2);
    assert.equal(engine.getXp(), 0);

    const step2 = engine.recordProgress('syndicate-backer', 3);
    assert.equal(step2.newlyCompleted, true);
    assert.equal(step2.quest.progress, 5);
    assert.equal(engine.getXp(), 500);
    assert.equal(step2.unlockedBadges.length, 1);
    assert.equal(step2.unlockedBadges[0].id, 'silver-syndicate-backer');
  });

  it('dispatches notifications to registered subscribers on loan progress', () => {
    const engine = new CharityMicroloansQuestEngine();
    let notifiedLevel = null;
    let notifiedQuest = null;

    engine.subscribe((levelInfo, quest) => {
      notifiedLevel = levelInfo;
      notifiedQuest = quest;
    });

    engine.recordProgress('first-seed', 1);
    assert.notEqual(notifiedLevel, null);
    assert.equal(notifiedLevel.level, 2);
    assert.equal(notifiedQuest.id, 'first-seed');
  });

  it('throws error when recording progress on nonexistent goal', () => {
    const engine = new CharityMicroloansQuestEngine();
    assert.throws(() => {
      engine.recordProgress('nonexistent-loan', 1);
    }, /not found/);
  });
});
