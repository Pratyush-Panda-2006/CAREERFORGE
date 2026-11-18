import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusQuestEngine } from './gamified-quest.js';

test('SmartIotNexusQuestEngine - calculates user level and mathematical XP curves accurately', () => {
  const engine = new SmartIotNexusQuestEngine({ initialXp: 0 });

  const initialLevel = engine.calculateUserLevel(0);
  assert.strictEqual(initialLevel.level, 1);
  assert.strictEqual(initialLevel.currentXp, 0);
  assert.strictEqual(initialLevel.baseCurrentLevelXp, 0);
  assert.strictEqual(initialLevel.nextLevelXp, 60);
  assert.strictEqual(initialLevel.progressPercent, 0);

  // Mid-level 1 (30 XP out of 60)
  const midLevel = engine.calculateUserLevel(30);
  assert.strictEqual(midLevel.level, 1);
  assert.strictEqual(midLevel.progressPercent, 50);

  // Level 2 boundary (60 XP)
  const levelTwo = engine.calculateUserLevel(60);
  assert.strictEqual(levelTwo.level, 2);
  assert.strictEqual(levelTwo.baseCurrentLevelXp, 60);
  assert.strictEqual(levelTwo.nextLevelXp, 240);
  assert.strictEqual(levelTwo.progressPercent, 0);

  // High tier level check
  const levelMaster = engine.calculateUserLevel(1000);
  assert.strictEqual(levelMaster.level >= 4, true);
  assert.strictEqual(levelMaster.progressPercent >= 0 && levelMaster.progressPercent <= 100, true);
});

test('SmartIotNexusQuestEngine - tracks quest progress, awards XP, and prevents duplicate rewards', () => {
  const engine = new SmartIotNexusQuestEngine();

  // Partial progress
  const step1 = engine.recordProgress('deploy-nodes', 2);
  assert.strictEqual(step1.completedNow, false);
  assert.strictEqual(step1.questProgress, 2);
  assert.strictEqual(step1.xpGained, 0);
  assert.strictEqual(engine.xp, 0);

  // Complete quest (target is 5)
  const step2 = engine.recordProgress('deploy-nodes', 3);
  assert.strictEqual(step2.completedNow, true);
  assert.strictEqual(step2.questProgress, 5);
  assert.strictEqual(step2.xpGained, 150);
  assert.strictEqual(engine.xp, 150);

  // Subsequent progress attempts on already completed quest should yield 0 XP
  const step3 = engine.recordProgress('deploy-nodes', 2);
  assert.strictEqual(step3.completedNow, false);
  assert.strictEqual(step3.xpGained, 0);
  assert.strictEqual(engine.xp, 150);
});

test('SmartIotNexusQuestEngine - triggers progressive badge unlocks across Bronze, Silver, Gold, Platinum tiers', () => {
  const engine = new SmartIotNexusQuestEngine();

  const overviewInitial = engine.getOverview();
  assert.strictEqual(overviewInitial.badges.every(b => !b.unlocked), true);

  // Award Bronze (150 XP) by completing deploy-nodes
  const event1 = engine.recordProgress('deploy-nodes', 5);
  assert.strictEqual(event1.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event1.newlyUnlockedBadges[0].tier, 'Bronze');

  // Award Silver (370 XP requirement: 150 + 220 = 370 XP)
  const event2 = engine.recordProgress('calibrate-mesh', 3);
  assert.strictEqual(engine.xp, 370);
  assert.strictEqual(event2.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event2.newlyUnlockedBadges[0].tier, 'Silver');

  // Award Gold (720 XP requirement: 370 + 350 = 720 XP)
  const event3 = engine.recordProgress('resolve-alerts', 8);
  assert.strictEqual(engine.xp, 720);
  assert.strictEqual(event3.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event3.newlyUnlockedBadges[0].tier, 'Gold');

  // Award Platinum (1200 XP requirement: 720 + 480 = 1200 XP)
  const event4 = engine.recordProgress('uptime-streak', 24);
  assert.strictEqual(engine.xp, 1200);
  assert.strictEqual(event4.newlyUnlockedBadges.length, 1);
  assert.strictEqual(event4.newlyUnlockedBadges[0].tier, 'Platinum');

  const finalOverview = engine.getOverview();
  assert.strictEqual(finalOverview.badges.every(b => b.unlocked), true);
});

test('SmartIotNexusQuestEngine - dispatches notifications to subscribers and allows unsubscribing', () => {
  const engine = new SmartIotNexusQuestEngine();
  const receivedEvents = [];

  const unsubscribe = engine.on(evt => receivedEvents.push(evt));

  engine.recordProgress('deploy-nodes', 1);
  assert.strictEqual(receivedEvents.length, 1);
  assert.strictEqual(receivedEvents[0].questId, 'deploy-nodes');

  unsubscribe();
  engine.recordProgress('deploy-nodes', 1);
  assert.strictEqual(receivedEvents.length, 1); // No new events after unsubscription
});

test('SmartIotNexusQuestEngine - throws error on invalid quest ID', () => {
  const engine = new SmartIotNexusQuestEngine();
  assert.throws(
    () => engine.recordProgress('invalid-quest-id', 1),
    /was not found in registered catalog/
  );
});
