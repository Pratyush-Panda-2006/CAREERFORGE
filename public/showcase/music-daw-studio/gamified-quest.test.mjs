import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioQuestEngine } from './gamified-quest.js';

describe('MusicDawStudioQuestEngine', () => {
  it('initializes with default production quests and badges', () => {
    const engine = new MusicDawStudioQuestEngine();
    assert.equal(engine.getXp(), 0);
    assert.equal(engine.getQuests().length, 4);
    assert.equal(engine.getBadges().length, 4);
    assert.equal(engine.getBadges()[0].unlocked, false);
  });

  it('calculates producer level and progression curve accurately', () => {
    const engine = new MusicDawStudioQuestEngine({ initialXp: 0 });
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

  it('records quest progress, completes objectives, and grants XP', () => {
    const engine = new MusicDawStudioQuestEngine();
    const result = engine.recordProgress('beat-foundry', 1);

    assert.equal(result.newlyCompleted, true);
    assert.equal(result.quest.completed, true);
    assert.equal(engine.getXp(), 250);
    assert.equal(result.unlockedBadges.length, 1);
    assert.equal(result.unlockedBadges[0].id, 'bronze-beat-maker');
    assert.equal(result.unlockedBadges[0].unlocked, true);
  });

  it('handles multi-step quest incremental progress correctly', () => {
    const engine = new MusicDawStudioQuestEngine();
    const step1 = engine.recordProgress('synth-patch', 2);
    assert.equal(step1.newlyCompleted, false);
    assert.equal(step1.quest.progress, 2);
    assert.equal(engine.getXp(), 0);

    const step2 = engine.recordProgress('synth-patch', 3);
    assert.equal(step2.newlyCompleted, true);
    assert.equal(step2.quest.progress, 5);
    assert.equal(engine.getXp(), 500);
    assert.equal(step2.unlockedBadges.length, 1);
    assert.equal(step2.unlockedBadges[0].id, 'silver-synth-sculptor');
  });

  it('dispatches notifications to registered subscribers on progress', () => {
    const engine = new MusicDawStudioQuestEngine();
    let notifiedLevel = null;
    let notifiedQuest = null;

    engine.subscribe((levelInfo, quest) => {
      notifiedLevel = levelInfo;
      notifiedQuest = quest;
    });

    engine.recordProgress('beat-foundry', 1);
    assert.notEqual(notifiedLevel, null);
    assert.equal(notifiedLevel.level, 2);
    assert.equal(notifiedQuest.id, 'beat-foundry');
  });

  it('throws error when recording progress on nonexistent quest', () => {
    const engine = new MusicDawStudioQuestEngine();
    assert.throws(() => {
      engine.recordProgress('nonexistent-quest', 1);
    }, /not found/);
  });
});
