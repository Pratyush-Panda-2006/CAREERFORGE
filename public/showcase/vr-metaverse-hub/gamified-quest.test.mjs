import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubQuestEngine } from './gamified-quest.js';

describe('VrMetaverseHubQuestEngine', () => {
  it('initializes with default milestones and badge catalog', () => {
    const engine = new VrMetaverseHubQuestEngine();
    assert.equal(engine.getXp(), 0);
    assert.equal(engine.getQuests().length, 4);
    assert.equal(engine.getBadges().length, 4);
    assert.equal(engine.getBadges()[0].unlocked, false);
  });

  it('calculates contributor level and progression curve accurately', () => {
    const engine = new VrMetaverseHubQuestEngine({ initialXp: 0 });
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
    const engine = new VrMetaverseHubQuestEngine();
    const result = engine.recordProgress('world-builder', 1);

    assert.equal(result.newlyCompleted, true);
    assert.equal(result.quest.completed, true);
    assert.equal(engine.getXp(), 250);
    assert.equal(result.unlockedBadges.length, 1);
    assert.equal(result.unlockedBadges[0].id, 'bronze-world-builder');
    assert.equal(result.unlockedBadges[0].unlocked, true);
  });

  it('handles multi-step incremental progress correctly', () => {
    const engine = new VrMetaverseHubQuestEngine();
    const step1 = engine.recordProgress('avatar-rigging', 2);
    assert.equal(step1.newlyCompleted, false);
    assert.equal(step1.quest.progress, 2);
    assert.equal(engine.getXp(), 0);

    const step2 = engine.recordProgress('avatar-rigging', 3);
    assert.equal(step2.newlyCompleted, true);
    assert.equal(step2.quest.progress, 5);
    assert.equal(engine.getXp(), 500);
    assert.equal(step2.unlockedBadges.length, 1);
    assert.equal(step2.unlockedBadges[0].id, 'silver-avatar-sculptor');
  });

  it('dispatches notifications to registered subscribers on milestone progress', () => {
    const engine = new VrMetaverseHubQuestEngine();
    let notifiedState = null;

    const unsubscribe = engine.subscribe((state) => {
      notifiedState = state;
    });

    engine.recordProgress('world-builder', 1);
    assert.ok(notifiedState);
    assert.equal(notifiedState.xp, 250);
    assert.equal(notifiedState.quest.id, 'world-builder');
    assert.equal(notifiedState.unlockedBadges.length, 1);

    unsubscribe();
    engine.recordProgress('avatar-rigging', 1);
    assert.equal(notifiedState.quest.id, 'world-builder');
  });

  it('throws error when recording progress on nonexistent goal', () => {
    const engine = new VrMetaverseHubQuestEngine();
    assert.throws(
      () => engine.recordProgress('nonexistent-quest-id', 1),
      /not found in catalog/
    );
  });
});
