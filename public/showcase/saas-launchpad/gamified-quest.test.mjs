import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadQuestEngine } from './gamified-quest.js';

describe('SaasLaunchpadQuestEngine', () => {
  it('initializes with default milestones and badge catalog', () => {
    const engine = new SaasLaunchpadQuestEngine();
    assert.equal(engine.getXp(), 0);
    assert.equal(engine.getQuests().length, 4);
    assert.equal(engine.getBadges().length, 4);
    assert.equal(engine.getBadges()[0].unlocked, false);
  });

  it('calculates contributor level and progression curve accurately', () => {
    const engine = new SaasLaunchpadQuestEngine({ initialXp: 0 });
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

  it('records progress, completes objectives, and grants XP', () => {
    const engine = new SaasLaunchpadQuestEngine();
    const firstQuest = engine.getQuests()[0];
    const result = engine.recordProgress(firstQuest.id, firstQuest.target);

    assert.equal(result.newlyCompleted, true);
    assert.equal(result.quest.completed, true);
    assert.equal(engine.getXp(), firstQuest.xpReward);
    assert.equal(result.unlockedBadges.length, 1);
    assert.equal(result.unlockedBadges[0].id, firstQuest.badgeId);
    assert.equal(result.unlockedBadges[0].unlocked, true);
  });

  it('handles multi-step incremental progress correctly', () => {
    const engine = new SaasLaunchpadQuestEngine();
    const secondQuest = engine.getQuests()[1];
    const step1 = engine.recordProgress(secondQuest.id, 1);
    assert.equal(step1.newlyCompleted, false);
    assert.equal(step1.quest.progress, 1);
    assert.equal(engine.getXp(), 0);

    const step2 = engine.recordProgress(secondQuest.id, secondQuest.target - 1);
    assert.equal(step2.newlyCompleted, true);
    assert.equal(step2.quest.progress, secondQuest.target);
    assert.equal(engine.getXp(), secondQuest.xpReward);
    assert.equal(step2.unlockedBadges.length, 1);
  });

  it('dispatches notifications to registered subscribers on milestone progress', () => {
    const engine = new SaasLaunchpadQuestEngine();
    let notifiedState = null;

    const unsubscribe = engine.subscribe((state) => {
      notifiedState = state;
    });

    const firstQuest = engine.getQuests()[0];
    engine.recordProgress(firstQuest.id, 1);
    assert.ok(notifiedState);
    assert.equal(notifiedState.quest.id, firstQuest.id);

    unsubscribe();
    engine.recordProgress(engine.getQuests()[1].id, 1);
    assert.equal(notifiedState.quest.id, firstQuest.id);
  });

  it('throws error when recording progress on nonexistent goal', () => {
    const engine = new SaasLaunchpadQuestEngine();
    assert.throws(
      () => engine.recordProgress('nonexistent-quest-id', 1),
      /not found in catalog/
    );
  });
});
