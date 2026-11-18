import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubQuestEngine } from './gamified-quest.js';

describe('StreamingCinemaHubQuestEngine', () => {
  it('initializes with default cinema quests and badges', () => {
    const engine = new StreamingCinemaHubQuestEngine();
    assert.equal(engine.getXp(), 0);
    assert.equal(engine.getQuests().length, 4);
    assert.equal(engine.getBadges().length, 4);
    assert.equal(engine.getBadges()[0].unlocked, false);
  });

  it('calculates cinephile level and progression curve accurately', () => {
    const engine = new StreamingCinemaHubQuestEngine({ initialXp: 0 });
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

  it('records screening progress, completes objectives, and grants XP', () => {
    const engine = new StreamingCinemaHubQuestEngine();
    const result = engine.recordProgress('first-screening', 1);

    assert.equal(result.newlyCompleted, true);
    assert.equal(result.quest.completed, true);
    assert.equal(engine.getXp(), 250);
    assert.equal(result.unlockedBadges.length, 1);
    assert.equal(result.unlockedBadges[0].id, 'bronze-cinephile-initiate');
    assert.equal(result.unlockedBadges[0].unlocked, true);
  });

  it('handles multi-step watchlist curation progress correctly', () => {
    const engine = new StreamingCinemaHubQuestEngine();
    const step1 = engine.recordProgress('film-critic', 2);
    assert.equal(step1.newlyCompleted, false);
    assert.equal(step1.quest.progress, 2);
    assert.equal(engine.getXp(), 0);

    const step2 = engine.recordProgress('film-critic', 3);
    assert.equal(step2.newlyCompleted, true);
    assert.equal(step2.quest.progress, 5);
    assert.equal(engine.getXp(), 500);
    assert.equal(step2.unlockedBadges.length, 1);
    assert.equal(step2.unlockedBadges[0].id, 'silver-curator-critic');
  });

  it('dispatches notifications to registered subscribers on film screening progress', () => {
    const engine = new StreamingCinemaHubQuestEngine();
    let notifiedLevel = null;
    let notifiedQuest = null;

    engine.subscribe((levelInfo, quest) => {
      notifiedLevel = levelInfo;
      notifiedQuest = quest;
    });

    engine.recordProgress('first-screening', 1);
    assert.notEqual(notifiedLevel, null);
    assert.equal(notifiedLevel.level, 2);
    assert.equal(notifiedQuest.id, 'first-screening');
  });

  it('throws error when recording progress on nonexistent cinema objective', () => {
    const engine = new StreamingCinemaHubQuestEngine();
    assert.throws(() => {
      engine.recordProgress('nonexistent-film', 1);
    }, /not found/);
  });
});
