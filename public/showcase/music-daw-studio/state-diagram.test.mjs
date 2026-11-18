import test from "node:test";
import assert from "node:assert/strict";
import { MusicDawStudioFsmVisualizer as Machine } from "./state-diagram.js";
const machine = () => {
  const m = new Machine("Stopped");
  m.addTransition("Stopped", "PLAY", "Playing");
  m.addTransition("Playing", "STOP", "Stopped");
  return m;
};
test("valid transitions change state and record history; invalid transitions do neither", () => {
  const m = machine();
  assert.equal(m.dispatch("STOP"), false);
  assert.equal(m.history.length, 0);
  assert.equal(m.currentState, "Stopped");
  assert.equal(m.dispatch("PLAY"), true);
  assert.equal(m.currentState, "Playing");
  assert.deepEqual(m.history, [
    { from: "Stopped", event: "PLAY", to: "Playing" },
  ]);
  assert.equal(m.dispatch("PLAY"), false);
  assert.equal(m.history.length, 1);
});
test("duplicate definitions are idempotent and conflicting definitions are rejected atomically", () => {
  const m = machine();
  assert.equal(m.addTransition("Stopped", "PLAY", "Playing"), false);
  assert.throws(
    () => m.addTransition("Stopped", "PLAY", "Recording"),
    /already/,
  );
  assert.equal(m.states.includes("Recording"), false);
  assert.equal(m.transitions.length, 2);
});
test("cyclic and self transitions serialize with generated IDs and initial state", () => {
  const m = machine();
  m.addTransition("Playing", "TICK", "Playing");
  assert.equal(
    m.exportMermaid(),
    'stateDiagram-v2\n    state "Stopped" as s0\n    state "Playing" as s1\n    [*] --> s0\n    s0 --> s1 : PLAY\n    s1 --> s0 : STOP\n    s1 --> s1 : TICK',
  );
  assert.equal(m.dispatch("PLAY"), true);
  assert.equal(m.dispatch("TICK"), true);
  assert.equal(m.dispatch("STOP"), true);
  assert.equal(m.currentState, "Stopped");
});
test("unsafe, empty, excessive and non-string labels cannot enter a diagram", () => {
  for (const bad of [
    "",
    null,
    42,
    "<script>",
    'A" as injected',
    "A\nB",
    "A --> B",
    "a".repeat(61),
  ])
    assert.throws(() => new Machine(bad), TypeError);
  const m = machine();
  assert.throws(
    () => m.addTransition("Stopped", "PLAY\nstateDiagram", "Unsafe"),
    TypeError,
  );
  assert.equal(m.transitions.length, 2);
  const spaced = new Machine("Take one");
  spaced.addTransition("Take one", "START_take", "Take-two");
  assert.match(spaced.exportMermaid(), /state "Take-two" as s1/);
});
test("history is bounded and snapshots cannot mutate machine state", () => {
  const m = machine();
  for (let i = 0; i < 75; i++) {
    m.dispatch("PLAY");
    m.dispatch("STOP");
  }
  assert.equal(m.history.length, 100);
  m.history[0].to = "Injected";
  m.transitions[0].to = "Injected";
  m.states.push("Injected");
  assert.equal(
    m.history.some((t) => t.to === "Injected"),
    false,
  );
  assert.equal(m.transitions[0].to, "Playing");
  assert.equal(m.states.includes("Injected"), false);
  m.reset();
  assert.equal(m.currentState, "Stopped");
  assert.equal(m.history.length, 0);
  assert.equal(m.transitions.length, 2);
});
test("state and transition limits reject excess without partial additions", () => {
  const m = new Machine("Initial");
  for (let i = 0; i < 31; i++) m.addTransition("Initial", `E${i}`, `S${i}`);
  assert.throws(
    () => m.addTransition("Initial", "OVER", "Too many"),
    RangeError,
  );
  assert.equal(m.states.length, 32);
  const edges = new Machine("Only");
  for (let i = 0; i < 128; i++) edges.addTransition("Only", `E${i}`, "Only");
  assert.throws(() => edges.addTransition("Only", "OVER", "Only"), RangeError);
  assert.equal(edges.transitions.length, 128);
});
