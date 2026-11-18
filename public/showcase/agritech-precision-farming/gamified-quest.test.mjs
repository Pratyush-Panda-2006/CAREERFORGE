import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingQuestEngine } from './gamified-quest.js';

describe('AgritechPrecisionFarmingQuestEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new AgritechPrecisionFarmingQuestEngine();
  });

  it('initializes with default precision agriculture quests and badge tiers', () => {
    const quests = engine.getQuests();
    assert.equal(quests.length, 4);
    assert.equal(quests[0].id, 'soil-telemetry-sync');

    const badges = engine.getBadges();
    assert.equal(badges.length, 4);
    assert.equal(badges[0].tier, 'Bronze');
    assert.equal(badges[3].tier, 'Platinum');
  });

  it('calculates level-up mathematical curve accurately', () => {
    // 0 XP -> Level 1
    const lvl1 = engine.calculateUserLevel(0);
    assert.equal(lvl1.level, 1);
    assert.equal(lvl1.progressPercent, 0);

    // 100 XP -> Level 2
    const lvl2 = engine.calculateUserLevel(100);
    assert.equal(lvl2.level, 2);

    // 400 XP -> Level 3
    const lvl3 = engine.calculateUserLevel(400);
    assert.equal(lvl3.level, 3);

    // 900 XP -> Level 4
    const lvl4 = engine.calculateUserLevel(900);
    assert.equal(lvl4.level, 4);
  });

  it('records quest progress, awards XP, and completes milestones', () => {
    const result = engine.recordProgress('soil-telemetry-sync', 50);
    assert.equal(result.quest.progress, 50);
    assert.equal(result.newlyCompleted, false);

    // Complete the quest
    const finish = engine.recordProgress('soil-telemetry-sync', 50);
    assert.equal(finish.quest.progress, 100);
    assert.equal(finish.newlyCompleted, true);
    assert.equal(engine.getXp(), 250);
  });

  it('unlocks badges and notifies subscribers on quest completion', () => {
    let notifiedUnlocked = [];
    engine.subscribe((levelInfo, lastQuest, newlyUnlocked) => {
      if (newlyUnlocked.length > 0) {
        notifiedUnlocked = newlyUnlocked;
      }
    });

    const finish = engine.recordProgress('soil-telemetry-sync', 100);
    assert.equal(finish.unlockedBadges.length, 1);
    assert.equal(finish.unlockedBadges[0].id, 'bronze-field-scout');
    assert.equal(notifiedUnlocked.length, 1);
    assert.equal(notifiedUnlocked[0].unlocked, true);
  });

  it('throws an error for non-existent quest id', () => {
    assert.throws(() => {
      engine.recordProgress('invalid-quest-id', 10);
    }, /Quest invalid-quest-id not found/);
  });
});
