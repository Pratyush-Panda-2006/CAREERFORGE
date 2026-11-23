import assert from "node:assert/strict";
import test from "node:test";
import { StreamingCinemaHubStateDebugger } from "./state-debugger.js";
import { StreamingCinemaHubFsmVisualizer } from "./state-diagram.js";

test("stores independent state and returns clones", () => {
  const recorder = new StreamingCinemaHubStateDebugger();
  const state = { player: { bitrate: 4 } };
  assert.equal(recorder.recordSnapshot("Load", state), true);
  state.player.bitrate = 10;
  const selected = recorder.current;
  selected.state.player.bitrate = 20;
  assert.equal(recorder.steps[0].state.player.bitrate, 4);
});

test("clamps step access and retains history when appending after a jump", () => {
  const recorder = new StreamingCinemaHubStateDebugger();
  recorder.recordSnapshot("A", { a: 1 });
  recorder.recordSnapshot("B", { a: 2 });
  assert.equal(recorder.jumpToStep(-1).action, "A");
  recorder.recordSnapshot("C", { a: 3 });
  assert.equal(recorder.jumpToStep(88).action, "C");
  assert.equal(recorder.jumpToStep(NaN).action, "C");
  assert.equal(recorder.steps.length, 3);
});

test("diffs nested additions and removals, and treats arrays as ordered values", () => {
  const recorder = new StreamingCinemaHubStateDebugger();
  assert.deepEqual(
    recorder.computeDiff({ player: { quality: "SD", flags: [1, 2] }, cache: 2 },
      { player: { quality: "HD", flags: [2, 1], ready: true } }),
    [
      { path: ["cache"], before: 2, after: undefined },
      { path: ["player", "flags"], before: [1, 2], after: [2, 1] },
      { path: ["player", "quality"], before: "SD", after: "HD" },
      { path: ["player", "ready"], before: undefined, after: true },
    ],
  );
});

test("exports actual playback transitions and restores them in order", () => {
  const playback = new StreamingCinemaHubFsmVisualizer();
  const original = new StreamingCinemaHubStateDebugger();
  for (const action of ["SELECT_TITLE", "NETWORK_TIMEOUT", "RETRY", "BUFFER_COMPLETE"]) {
    assert.equal(playback.dispatch(action).success, true);
    original.recordSnapshot(action, { state: playback.currentState });
  }
  const clone = new StreamingCinemaHubStateDebugger();
  clone.importReplay(original.exportReplay());
  assert.equal(clone.current.action, "SELECT_TITLE");
  assert.deepEqual(clone.steps, original.steps);
});

test("invalid imports preserve the active replay", () => {
  const recorder = new StreamingCinemaHubStateDebugger();
  recorder.recordSnapshot("A", { a: 1 });
  for (const invalid of ["x", '{"version":2,"steps":[]}', '{"version":1,"steps":[{"state":{}}]}', "x".repeat(256001)]) {
    assert.throws(() => recorder.importReplay(invalid));
    assert.equal(recorder.current.action, "A");
  }
});

test("bounds snapshot depth, size, and history length", () => {
  const recorder = new StreamingCinemaHubStateDebugger();
  const cyclic = {};
  cyclic.ref = cyclic;
  assert.equal(recorder.recordSnapshot("Cycle", cyclic), false);
  assert.equal(recorder.recordSnapshot("Oversized", { text: "x".repeat(256001) }), false);
  for (let i = 0; i < 120; i++) assert.equal(recorder.recordSnapshot("A", { i }), true);
  assert.equal(recorder.recordSnapshot("Extra", { i: 120 }), false);
});
