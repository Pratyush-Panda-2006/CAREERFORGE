import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixQuestEngine } from './gamified-quest.js';

test('DefiYieldMatrixQuestEngine - calculates user level and mathematical XP curves accurately', () => {
  const engine = new DefiYieldMatrixQuestEngine({ initialXp: 0 });

  const initialLevel = engine.calculateUserLevel(0);
  assert.strictEqual(initialLevel.level, 1);
  assert.strictEqual(initialLevel.currentXp, 0);
  assert.strictEqual(initialLevel.baseCurrentLevelXp, 0);
  assert.strictEqual(initialLevel.nextLevelXp, 65);
  assert.strictEqual(initialLevel.progressPercent, 0);

  // Level 2 boundary (65 XP)
  const levelTwo = engine.calculateUserLevel(65);
  assert.strictEqual(levelTwo.level, 2);
  assert.strictEqual(levelTwo.baseCurrentLevelXp, 65);
  assert.strictEqual(levelTwo.nextLevelXp, 260);
  assert.strictEqual(levelTwo.progressPercent, 0);

  // Mid level check
  const midLevel = engine.calculateUserLevel(1000);
  assert.strictEqual(midLevel.level >= 4, true);
  assert.strictEqual(midLevel.progressPercent >= 0 && midLevel.progressPercent <= 100, true);
});

test('DefiYieldMatrixQuestEngine - tracks quest progress, awards XP, and prevents duplicate rewards', () => {
  const engine = new DefiYieldMatrixQuestEngine();

  // Partial progress
  const step1 = engine.recordProgress('stake-liquidity', 2);
  assert.strictEqual(step1.completedNow, false);
  assert.strictEqual(step1.questProgress, 2);
  assert.strictEqual(step1.xpGained, 0);
  assert.strictEqual(engine.xp, 0);

  // Complete quest (target is 5)
  const step2 = engine.recordProgress('stake-liquidity', 3);
  assert.strictEqual(step2.completedNow, true);
  assert.strictEqual(step2.questProgress, 5);
  assert.strictEqual(step2.xpGained, 180);
  assert.strictEqual(engine.xp, 180);

  // Subsequent progress attempts on already completed quest should yield 0 XP
  const step3 = engine.recordProgress('stake-liquidity', 2);
  assert.strictEqual(step3.completedNow, false);
  assert.strictEqual(step3.xpGained, 0);
  assert.strictEqual(engine.xp, 180);
});

test('DefiYieldMatrixQuestEngine - triggers progressive badge unlocks across Bronze, Silver, Gold, Platinum tiers', () => {
  const engine = new DefiYieldMatrixQuestEngine();

  const overviewInitial = engine.getOverview();
  assert.strictEqual(overviewInitial.badges.every(b => !b.unlocked), true);

  // Award Bronze (180 XP)
  const event1 = engine.recordProgress('stake-liquidity', 5);
  assert.strictEqual(event1.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event1.newlyUnlockedBadges[0].tier, 'Bronze');

  // Award Silver (420 XP requirement: 180 + 240 = 420 XP)
  const event2 = engine.recordProgress('harvest-yield', 3);
  assert.strictEqual(engine.xp, 420);
  assert.strictEqual(event2.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event2.newlyUnlockedBadges[0].tier, 'Silver');

  // Award Gold (780 XP requirement: 420 + 360 = 780 XP)
  const event3 = engine.recordProgress('rebalance-vault', 8);
  assert.strictEqual(engine.xp, 780);
  assert.strictEqual(event3.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event3.newlyUnlockedBadges[0].tier, 'Gold');

  // Award Platinum (1300 XP requirement: 780 + 520 = 1300 XP)
  const event4 = engine.recordProgress('audit-apr', 24);
  assert.strictEqual(engine.xp, 1300);
  assert.strictEqual(event4.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event4.newlyUnlockedBadges[0].tier, 'Platinum');

  const finalOverview = engine.getOverview();
  assert.strictEqual(finalOverview.badges.every(b => b.unlocked), true);
});

test('DefiYieldMatrixQuestEngine - dispatches notifications to subscribers and allows unsubscribing', () => {
  const engine = new DefiYieldMatrixQuestEngine();
  const receivedEvents = [];

  const unsubscribe = engine.on(evt => receivedEvents.push(evt));

  engine.recordProgress('stake-liquidity', 1);
  assert.strictEqual(receivedEvents.length, 1);
  assert.strictEqual(receivedEvents[0].questId, 'stake-liquidity');

  unsubscribe();
  engine.recordProgress('stake-liquidity', 1);
  assert.strictEqual(receivedEvents.length, 1); // No new events after unsubscription
});

test('DefiYieldMatrixQuestEngine - throws error on invalid quest ID', () => {
  const engine = new DefiYieldMatrixQuestEngine();
  assert.throws(
    () => engine.recordProgress('invalid-quest-id', 1),
    /was not found in registered catalog/
  );
});
