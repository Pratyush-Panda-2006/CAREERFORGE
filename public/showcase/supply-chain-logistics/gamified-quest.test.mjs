import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsQuestEngine } from './gamified-quest.js';

describe('SupplyChainLogisticsQuestEngine', () => {
  it('initializes with default milestones and badge catalog', () => {
    const engine = new SupplyChainLogisticsQuestEngine();
    assert.equal(engine.getXp(), 0);
    assert.equal(engine.getQuests().length, 4);
    assert.equal(engine.getBadges().length, 4);
    assert.equal(engine.getBadges()[0].unlocked, false);
  });

  it('calculates contributor level and progression curve accurately', () => {
    const engine = new SupplyChainLogisticsQuestEngine({ initialXp: 0 });
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
    const engine = new SupplyChainLogisticsQuestEngine();
    const result = engine.recordProgress('first-dispatch', 1);

    assert.equal(result.newlyCompleted, true);
    assert.equal(result.quest.completed, true);
    assert.equal(engine.getXp(), 250);
    assert.equal(result.unlockedBadges.length, 1);
    assert.equal(result.unlockedBadges[0].id, 'bronze-freight-dispatcher');
    assert.equal(result.unlockedBadges[0].unlocked, true);
  });

  it('handles multi-step incremental progress correctly', () => {
    const engine = new SupplyChainLogisticsQuestEngine();
    const step1 = engine.recordProgress('fleet-telemetry', 2);
    assert.equal(step1.newlyCompleted, false);
    assert.equal(step1.quest.progress, 2);
    assert.equal(engine.getXp(), 0);

    const step2 = engine.recordProgress('fleet-telemetry', 3);
    assert.equal(step2.newlyCompleted, true);
    assert.equal(step2.quest.progress, 5);
    assert.equal(engine.getXp(), 500);
    assert.equal(step2.unlockedBadges.length, 1);
    assert.equal(step2.unlockedBadges[0].id, 'silver-fleet-optimizer');
  });

  it('dispatches notifications to registered subscribers on milestone progress', () => {
    const engine = new SupplyChainLogisticsQuestEngine();
    let notifiedState = null;

    const unsubscribe = engine.subscribe((state) => {
      notifiedState = state;
    });

    engine.recordProgress('first-dispatch', 1);
    assert.ok(notifiedState);
    assert.equal(notifiedState.xp, 250);
    assert.equal(notifiedState.quest.id, 'first-dispatch');
    assert.equal(notifiedState.unlockedBadges.length, 1);

    unsubscribe();
    engine.recordProgress('fleet-telemetry', 1);
    assert.equal(notifiedState.quest.id, 'first-dispatch');
  });

  it('throws error when recording progress on nonexistent goal', () => {
    const engine = new SupplyChainLogisticsQuestEngine();
    assert.throws(
      () => engine.recordProgress('nonexistent-quest-id', 1),
      /not found in catalog/
    );
  });
});
