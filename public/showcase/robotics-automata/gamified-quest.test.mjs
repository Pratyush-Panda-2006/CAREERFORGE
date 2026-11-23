import assert from "node:assert/strict";
import { test } from "node:test";
import {
  armPosition,
  loadCompleted,
  matchesPose,
  POSES,
  RoboticsAutomataQuestEngine,
  saveCompletion,
} from "./gamified-quest.js";

test("coordinates use the showcase's arm math", () => {
  assert.deepEqual(armPosition(0, 0), { x: 3.5, y: 0 });
  assert.deepEqual(armPosition(90, -90), { x: 1.5, y: 2 });
});

test("all four exercise targets accept their intended angles", () => {
  for (const { id, jointAngles } of POSES) assert.equal(matchesPose(id, ...jointAngles), true);
});

test("invalid inputs and a missed pose don't qualify", () => {
  assert.equal(matchesPose("home", 90, 0), false);
  assert.equal(matchesPose("home", Number.NaN, 0), false);
  assert.equal(matchesPose("missing", 0, 0), false);
});

test("fresh users start at Level 1 and level thresholds are precise", () => {
  const q = new RoboticsAutomataQuestEngine();
  assert.equal(q.xp, 0);
  assert.equal(q.calculateUserLevel(), 1);
  assert.equal(q.calculateUserLevel(99), 1);
  assert.equal(q.calculateUserLevel(100), 2);
  assert.equal(q.calculateUserLevel(400), 5);
  assert.equal(q.calculateUserLevel(-5), 1);
});

test("four distinct completions dispatch the badge milestones once", () => {
  const q = new RoboticsAutomataQuestEngine();
  const events = [];
  q.addEventListener("badge-unlocked", ({ detail }) => events.push([detail.name, detail.xp]));
  for (const { id } of POSES) assert.equal(q.recordProgress(id), true);
  q.checkUnlocks();
  assert.equal(q.xp, 400);
  assert.equal(q.calculateUserLevel(), 5);
  assert.deepEqual(events, [["Bronze", 100], ["Silver", 200], ["Gold", 300], ["Platinum", 400]]);
});

test("duplicate completions, unknown objectives and invalid amounts earn nothing", () => {
  const q = new RoboticsAutomataQuestEngine();
  assert.equal(q.recordProgress("home", 20), true);
  assert.equal(q.recordProgress("home"), false);
  assert.equal(q.recordProgress("lift", 0), false);
  assert.equal(q.recordProgress("bend", 0.5), false);
  assert.equal(q.recordProgress("fold", Number.POSITIVE_INFINITY), false);
  assert.equal(q.recordProgress("unknown"), false);
  assert.equal(q.xp, 100);
});

test("restored achievements are filtered and not announced a second time", () => {
  const q = new RoboticsAutomataQuestEngine(["home", "home", "unknown"]);
  const events = [];
  q.addEventListener("badge-unlocked", ({ detail }) => events.push(detail.name));
  q.checkUnlocks();
  assert.deepEqual(q.completed, ["home"]);
  assert.equal(q.recordProgress("fold"), true);
  assert.deepEqual(events, ["Silver"]);
});

test("separate tabs can persist different completions without overwriting progress", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  assert.deepEqual(loadCompleted(storage), []);
  assert.equal(saveCompletion(storage, "bend"), true);
  assert.equal(saveCompletion(storage, "home"), true);
  assert.equal(saveCompletion(storage, "unknown"), false);
  assert.deepEqual(loadCompleted(storage), ["home", "bend"]);
});

test("corrupted or unavailable storage leaves the engine usable", () => {
  const storage = {
    getItem: () => { throw new Error("Blocked"); },
    setItem: () => { throw new Error("Full"); },
  };
  assert.deepEqual(loadCompleted({ getItem: () => "invalid" }), []);
  assert.deepEqual(loadCompleted(storage), []);
  assert.equal(saveCompletion(storage, "lift"), false);
  const q = new RoboticsAutomataQuestEngine(loadCompleted(storage));
  assert.equal(q.recordProgress("lift"), true);
  assert.equal(q.xp, 100);
});
