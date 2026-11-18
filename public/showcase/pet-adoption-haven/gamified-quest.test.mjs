import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenQuestEngine } from './gamified-quest.js';

describe('PetAdoptionHavenQuestEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PetAdoptionHavenQuestEngine();
  });

  it('initializes with default animal rescue quests and guardian badges', () => {
    const quests = engine.getQuests();
    assert.equal(quests.length, 4);
    assert.equal(quests[0].id, 'foster-onboarding');

    const badges = engine.getBadges();
    assert.equal(badges.length, 4);
    assert.equal(badges[0].tier, 'Bronze');
    assert.equal(badges[3].tier, 'Platinum');
  });

  it('calculates level progression accurately based on quadratic curve', () => {
    const lvl1 = engine.calculateUserLevel(0);
    assert.equal(lvl1.level, 1);

    const lvl2 = engine.calculateUserLevel(100);
    assert.equal(lvl2.level, 2);

    const lvl3 = engine.calculateUserLevel(400);
    assert.equal(lvl3.level, 3);
  });

  it('records progress on rescue milestone, completes quest, and awards XP', () => {
    const p1 = engine.recordProgress('foster-onboarding', 1);
    assert.equal(p1.quest.progress, 1);
    assert.equal(p1.newlyCompleted, true);
    assert.equal(engine.getXp(), 250);
  });

  it('unlocks badges and notifies listeners on milestone completion', () => {
    let unlocked = [];
    engine.subscribe((levelInfo, lastQuest, newlyUnlocked) => {
      if (newlyUnlocked.length > 0) {
        unlocked = newlyUnlocked;
      }
    });

    const res = engine.recordProgress('foster-onboarding', 1);
    assert.equal(res.unlockedBadges.length, 1);
    assert.equal(res.unlockedBadges[0].id, 'bronze-foster-friend');
    assert.equal(unlocked.length, 1);
    assert.equal(unlocked[0].unlocked, true);
  });

  it('throws an error for invalid quest id', () => {
    assert.throws(() => {
      engine.recordProgress('invalid-id', 1);
    }, /Quest invalid-id not found/);
  });
});
