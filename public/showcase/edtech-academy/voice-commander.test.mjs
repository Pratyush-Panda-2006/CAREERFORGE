import assert from "node:assert/strict";
import { test } from "node:test";
import { EdtechAcademyVoiceCommander as Commander } from "./voice-commander.js";

function fixture() {
  const recognition = [];
  const states = [];
  const commands = [];
  class FakeRecognition {
    constructor() { recognition.push(this); }
    start() { this.onstart(); }
    abort() { this.aborted = true; this.onend(); }
  }
  return {
    states,
    commands,
    recognition,
    commander: new Commander({
      Recognition: FakeRecognition,
      onStatus: (...state) => states.push(state),
      onCommand: (command) => commands.push(command),
    }),
  };
}

test("normalizes case, whitespace and sentence punctuation", () => {
  const { commander } = fixture();
  assert.equal(commander.parseVoiceGrammar("  NEXT   lesson! "), "next");
  assert.equal(commander.parseVoiceGrammar("Go back."), "previous");
  assert.equal(commander.parseVoiceGrammar("read this lesson"), "read");
  assert.equal(commander.parseVoiceGrammar("Show the shortcuts?"), "help");
});

test("rejects incidental phrases and reports a typed fallback", () => {
  const { commander, states, commands } = fixture();
  assert.equal(commander.submit("could you maybe next lesson"), false);
  assert.equal(commander.submit(null), false);
  assert.equal(commander.parseVoiceGrammar("x".repeat(121)), null);
  assert.equal(states.at(-1)[0], "idle");
  assert.match(states.at(-1)[1], /command not recognized/i);
  assert.deepEqual(commands, []);
});

test("dispatches a final result once and ignores interim results", () => {
  const { commander, recognition, commands, states } = fixture();
  assert.equal(commander.startListening(), true);
  assert.equal(commander.startListening(), false);
  const [session] = recognition;
  session.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "next lesson" } }] });
  assert.deepEqual(commands, []);
  const final = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "next lesson" } }] };
  session.onresult(final);
  session.onresult(final);
  assert.deepEqual(commands, ["next"]);
  assert.equal(session.aborted, true);
  assert.equal(commander.listening, false);
  assert.equal(states.at(-1)[0], "idle");
});

test("clears a denied session and ignores callbacks from it after retry", () => {
  const { commander, recognition, states, commands } = fixture();
  commander.startListening();
  recognition[0].onerror({ error: "not-allowed" });
  assert.match(states.at(-1)[1], /permission was denied/i);
  assert.equal(commander.listening, false);
  assert.equal(commander.startListening(), true);
  recognition[0].onend();
  recognition[0].onresult({ results: [{ isFinal: true, 0: { transcript: "next lesson" } }] });
  assert.deepEqual(commands, []);
  assert.equal(commander.listening, true);
  commander.stopListening();
  assert.equal(commander.listening, false);
});

test("handles missing speech recognition and synchronous start errors", () => {
  const states = [];
  const onStatus = (...state) => states.push(state);
  assert.equal(new Commander({ Recognition: null, onStatus }).startListening(), false);
  assert.equal(states.at(-1)[0], "unavailable");
  class BadRecognition { start() { throw new Error("Permission error"); } }
  const commander = new Commander({ Recognition: BadRecognition, onStatus });
  assert.equal(commander.startListening(), false);
  assert.equal(commander.listening, false);
  assert.equal(states.at(-1)[0], "error");
});

test("constructs a controlled speech response and tolerates absent synthesis", () => {
  const spoken = [];
  class Utterance { constructor(text) { this.text = text; } }
  const commander = new Commander({
    synthesis: { cancel() { spoken.push("cancel"); }, speak(text) { spoken.push(text); } },
    Utterance,
  });
  assert.equal(commander.synthesizeResponse("Opened lesson two."), true);
  assert.equal(spoken[0], "cancel");
  assert.ok(spoken[1] instanceof Utterance);
  assert.deepEqual({ ...spoken[1] }, { text: "Opened lesson two.", lang: "en-US" });
  assert.equal(new Commander({ synthesis: null }).synthesizeResponse("Text only"), false);
});
