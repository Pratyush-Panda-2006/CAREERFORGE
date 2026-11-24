import assert from "node:assert/strict";
import test from "node:test";
import { FestivalHubQuestEngine } from "./gamified-quest.js";

test("caps progress per quest and refuses invalid changes", () => {
  const engine = new FestivalHubQuestEngine();
  assert.equal(engine.recordProgress("missing"), false);
  assert.equal(engine.recordProgress("sets", -1), false);
  assert.equal(engine.recordProgress("sets", 1.5), false);
  assert.equal(engine.recordProgress("sets", 999), true);
  assert.equal(engine.recordProgress("sets"), false);
  assert.equal(engine.xp, 75);
});

test("calculates levels at increasing thresholds", () => {
  const engine = new FestivalHubQuestEngine();
  assert.deepEqual([0, 39, 40, 159, 160, 360].map((xp) => engine.calculateUserLevel(xp)), [1, 1, 2, 2, 3, 4]);
});

test("emits milestones only when crossing thresholds", () => {
  const engine = new FestivalHubQuestEngine();
  const events = [];
  engine.addEventListener("badgeunlock", ({ detail }) => events.push(detail.map(({ name }) => name)));
  engine.recordProgress("sets", 1);
  engine.recordProgress("sets", 1);
  engine.recordProgress("sets", 1);
  engine.recordProgress("arrival", 3);
  engine.recordProgress("workshops", 2);
  engine.recordProgress("workshops", 1);
  assert.deepEqual(events, [["Bronze"], ["Silver"], ["Gold", "Platinum"]]);
  assert.equal(engine.xp, 235);
});

test("restores bounded progress and keeps the next unlock fresh", () => {
  let saved;
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  new FestivalHubQuestEngine(storage).recordProgress("sets", 2);
  const again = new FestivalHubQuestEngine(storage);
  assert.deepEqual(again.checkUnlocks().map(({ name }) => name), ["Bronze"]);
  assert.equal(again.xp, 50);
  saved = '{"sets":900,"arrival":-8,"workshops":"2"}';
  assert.equal(new FestivalHubQuestEngine(storage).xp, 75);
});

test("continues after invalid storage or a failed write", () => {
  const store = { getItem: () => "bad JSON", setItem: () => { throw new Error("quota"); } };
  const engine = new FestivalHubQuestEngine(store);
  assert.equal(engine.xp, 0);
  assert.equal(engine.recordProgress("sets"), true);
  assert.equal(engine.xp, 25);
});
