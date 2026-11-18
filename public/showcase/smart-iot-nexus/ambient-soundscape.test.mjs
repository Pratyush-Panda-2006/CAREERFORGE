import test from "node:test";
import assert from "node:assert/strict";
import { SmartIotNexusSoundscapeSynth as Synth } from "./ambient-soundscape.js";
class Param {
  value = 0;
  setValueAtTime(value) {
    this.value = value;
  }
  setTargetAtTime(value) {
    this.value = value;
  }
  linearRampToValueAtTime(value) {
    this.value = value;
  }
  exponentialRampToValueAtTime(value) {
    this.value = value;
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  frequencyBinCount = 128;
  connections = [];
  starts = 0;
  stops = 0;
  disconnected = false;
  connect(target) {
    this.connections.push(target);
    return target;
  }
  disconnect() {
    this.disconnected = true;
  }
  start() {
    this.starts++;
  }
  stop() {
    this.stops++;
  }
  getByteFrequencyData(data) {
    data.fill(90);
  }
}
class Context {
  state = "suspended";
  sampleRate = 16000;
  currentTime = 0;
  destination = {};
  nodes = [];
  sources = [];
  filters = [];
  node() {
    const n = new Node();
    this.nodes.push(n);
    return n;
  }
  createGain() {
    return this.node();
  }
  createAnalyser() {
    return this.node();
  }
  createBiquadFilter() {
    const n = this.node();
    this.filters.push(n);
    return n;
  }
  createBufferSource() {
    const n = this.node();
    this.sources.push(n);
    return n;
  }
  createOscillator() {
    const n = this.node();
    this.sources.push(n);
    return n;
  }
  createBuffer(channels, length, sampleRate) {
    const data = new Float32Array(length);
    return { sampleRate, length, getChannelData: () => data };
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
  async close() {
    this.state = "closed";
  }
}
function rng() {
  let seed = 123;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function setup() {
  const context = new Context();
  const synth = new Synth(() => context, rng());
  return { context, synth };
}

test("gains clamp safely and invalid channels/non-finite gains leave settings unchanged", () => {
  const { synth } = setup();
  assert.equal(synth.adjustMasterGain(9), 1);
  assert.equal(synth.adjustChannelGain("rain", -3), 0);
  const before = synth.serializePreset();
  for (const v of [NaN, Infinity, "0.5"])
    assert.throws(() => synth.adjustChannelGain("rain", v), TypeError);
  assert.throws(() => synth.adjustChannelGain("__proto__", 0.5), TypeError);
  assert.equal(synth.serializePreset(), before);
});
test("presets serialize complete bounded state without exposing shared mutation", () => {
  const { synth } = setup();
  synth.setPreset("workshop");
  const state = JSON.parse(synth.serializePreset());
  assert.equal(state.version, 1);
  assert.equal(state.preset, "workshop");
  assert.equal(state.master, 0.2);
  assert.deepEqual(Object.keys(state.channels), [
    "rain",
    "wind",
    "white",
    "chimes",
  ]);
  state.channels.rain = 99;
  assert.ok(JSON.parse(synth.serializePreset()).channels.rain <= 1);
  assert.throws(() => synth.setPreset("unknown"), TypeError);
});
test("starting is idempotent, filters respect Nyquist and pause/resume reuse nodes", async () => {
  const { context, synth } = setup();
  try {
    assert.equal(synth.state, "idle");
    await synth.startAmbience();
    assert.equal(synth.state, "running");
    const count = context.nodes.length;
    await synth.startAmbience();
    assert.equal(context.nodes.length, count);
    assert.equal(context.sources.filter((n) => n.loop).length, 3);
    assert.ok(context.sources.every((n) => n.starts === 1));
    assert.ok(
      context.filters.every(
        (n) =>
          n.frequency.value > 0 && n.frequency.value < context.sampleRate / 2,
      ),
    );
    assert.ok(
      context.nodes.filter((n) => n.gain.value).every((n) => n.gain.value <= 1),
    );
    await synth.pause();
    assert.equal(synth.state, "suspended");
    assert.ok(synth.getFrequencyData().every((v) => v === 0));
    await synth.startAmbience("wind");
    assert.equal(synth.state, "running");
    assert.equal(context.sources.filter((n) => n.loop).length, 3);
    assert.ok(synth.getFrequencyData().some((v) => v > 0));
  } finally {
    await synth.dispose();
  }
  assert.equal(context.state, "closed");
  assert.ok(context.nodes.every((n) => n.disconnected));
  assert.ok(context.sources.every((n) => n.stops >= 1));
  assert.equal(synth.state, "idle");
});
test("concurrent start requests create one audio graph", async () => {
  const { context, synth } = setup();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let resumes = 0;
  context.resume = async () => {
    resumes++;
    await gate;
    context.state = "running";
  };
  const first = synth.startAmbience(),
    second = synth.startAmbience();
  release();
  try {
    await Promise.all([first, second]);
    assert.equal(resumes, 1);
    assert.equal(context.sources.filter((n) => n.loop).length, 3);
  } finally {
    await synth.dispose();
  }
});
test("noise buffers are finite, bounded and non-silent; pink is smoother than white", async () => {
  const { synth } = setup();
  try {
    await synth.startAmbience("wind");
    const white = synth.generateNoiseBuffer("white").getChannelData(0),
      pink = synth.generateNoiseBuffer("pink").getChannelData(0);
    const variance = (a) => a.reduce((s, v) => s + v * v, 0) / a.length;
    const difference = (a) =>
      a.slice(1).reduce((s, v, i) => s + (v - a[i]) ** 2, 0) / (a.length - 1);
    for (const data of [white, pink]) {
      assert.equal(data.length, 32000);
      assert.ok(data.every((v) => Number.isFinite(v) && Math.abs(v) <= 1));
      assert.ok(variance(data) > 0.001);
    }
    assert.ok(variance(white) > 0.25);
    assert.ok(
      difference(pink) / variance(pink) < difference(white) / variance(white),
    );
    assert.throws(() => synth.generateNoiseBuffer("invalid"), TypeError);
  } finally {
    await synth.dispose();
  }
});
test("gain changes reach live audio parameters and do not allocate another graph", async () => {
  const { context, synth } = setup();
  try {
    await synth.startAmbience();
    const count = context.nodes.length;
    synth.adjustMasterGain(0);
    synth.adjustChannelGain("rain", 1);
    assert.equal(context.nodes[0].gain.value, 0);
    assert.equal(context.nodes.length, count);
    assert.ok(context.nodes.some((n) => n.gain.value === 0.25));
  } finally {
    await synth.dispose();
  }
});
test("failed resume releases all resources and surfaces the error", async () => {
  const { context, synth } = setup();
  context.resume = async () => {
    throw new Error("Autoplay rejected");
  };
  await assert.rejects(synth.startAmbience(), /Autoplay rejected/);
  assert.equal(synth.state, "idle");
  assert.equal(context.state, "closed");
  assert.ok(context.nodes.every((n) => n.disconnected));
  assert.ok(context.sources.every((n) => n.stops >= 1));
});
