export const PRESETS = Object.freeze({
  rain: Object.freeze({ rain: 0.5, wind: 0.12, white: 0, chimes: 0.08 }),
  wind: Object.freeze({ rain: 0.06, wind: 0.6, white: 0, chimes: 0 }),
  workshop: Object.freeze({ rain: 0.15, wind: 0.1, white: 0.12, chimes: 0.15 }),
});
const clamp = (value) => {
  if (!Number.isFinite(value))
    throw new TypeError("Gain must be a finite number.");
  return Math.max(0, Math.min(1, value));
};

export class SmartIotNexusSoundscapeSynth {
  #context = null;
  #master = null;
  #analyser = null;
  #channelNodes = {};
  #sources = new Set();
  #nodes = new Set();
  #timer = null;
  #pending = null;
  #channels = { ...PRESETS.rain };
  #volume = 0.2;
  #preset = "rain";
  constructor(
    contextFactory = () => {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context)
        throw new Error("Web Audio is not supported in this browser.");
      return new Context();
    },
    random = Math.random,
  ) {
    this.contextFactory = contextFactory;
    this.random = random;
  }
  get state() {
    return this.#context?.state ?? "idle";
  }
  serializePreset() {
    return JSON.stringify({
      version: 1,
      preset: this.#preset,
      master: this.#volume,
      channels: { ...this.#channels },
    });
  }
  setPreset(name) {
    if (!Object.hasOwn(PRESETS, name))
      throw new TypeError("Unknown sound preset.");
    for (const [channel, value] of Object.entries(PRESETS[name]))
      this.adjustChannelGain(channel, value);
    this.#preset = name;
  }
  adjustMasterGain(value) {
    this.#volume = clamp(value);
    if (this.#master)
      this.#master.gain.setTargetAtTime(
        this.#volume,
        this.#context.currentTime,
        0.02,
      );
    return this.#volume;
  }
  adjustChannelGain(channel, value) {
    if (!Object.hasOwn(this.#channels, channel))
      throw new TypeError("Unknown sound channel.");
    const gain = clamp(value);
    this.#channels[channel] = gain;
    this.#preset = "custom";
    if (this.#channelNodes[channel])
      this.#channelNodes[channel].gain.setTargetAtTime(
        gain * 0.25,
        this.#context.currentTime,
        0.02,
      );
    return gain;
  }
  generateNoiseBuffer(type) {
    if (!["white", "pink"].includes(type))
      throw new TypeError("Noise type must be white or pink.");
    if (!this.#context)
      throw new Error("Start the mixer before creating noise.");
    const context = this.#context;
    const buffer = context.createBuffer(
      1,
      Math.floor(context.sampleRate * 2),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    const rows = new Float32Array(8);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const white = this.random() * 2 - 1;
      if (type === "white") data[i] = white;
      else {
        // Octave-rate random rows approximate pink noise without a long filter tail.
        let counter = i + 1,
          row = 0;
        while (!(counter & 1) && row < 7) {
          row++;
          counter >>>= 1;
        }
        sum -= rows[row];
        rows[row] = this.random() * 2 - 1;
        sum += rows[row];
        data[i] = (sum + white) / 9;
      }
    }
    return buffer;
  }
  #buildGraph() {
    const context = this.#context;
    this.#master = context.createGain();
    this.#nodes.add(this.#master);
    this.#master.gain.setValueAtTime(this.#volume, context.currentTime);
    this.#analyser = context.createAnalyser();
    this.#nodes.add(this.#analyser);
    this.#analyser.fftSize = 256;
    this.#master.connect(this.#analyser);
    this.#analyser.connect(context.destination);
    for (const channel of Object.keys(this.#channels)) {
      const gain = context.createGain();
      this.#nodes.add(gain);
      gain.gain.setValueAtTime(
        this.#channels[channel] * 0.25,
        context.currentTime,
      );
      gain.connect(this.#master);
      this.#channelNodes[channel] = gain;
      if (channel === "chimes") continue;
      const source = context.createBufferSource();
      this.#sources.add(source);
      source.buffer = this.generateNoiseBuffer(
        channel === "wind" ? "pink" : "white",
      );
      source.loop = true;
      const filter = context.createBiquadFilter();
      this.#nodes.add(filter);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(
        Math.min(
          { rain: 4900, wind: 500, white: 12000 }[channel],
          context.sampleRate / 2 - 1,
        ),
        context.currentTime,
      );
      filter.Q.setValueAtTime(0.7, context.currentTime);
      source.connect(filter);
      filter.connect(gain);
      source.start();
    }
  }
  #chime() {
    const context = this.#context;
    if (!context || context.state !== "running" || !this.#channels.chimes)
      return;
    const source = context.createOscillator(),
      envelope = context.createGain();
    this.#sources.add(source);
    this.#nodes.add(envelope);
    source.type = "sine";
    source.frequency.setValueAtTime(
      [261.63, 329.63, 392, 523.25][Math.floor(this.random() * 4)],
      context.currentTime,
    );
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.linearRampToValueAtTime(0.6, context.currentTime + 0.02);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 1.5,
    );
    source.connect(envelope);
    envelope.connect(this.#channelNodes.chimes);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      this.#sources.delete(source);
      this.#nodes.delete(envelope);
    };
    source.start();
    source.stop(context.currentTime + 1.6);
  }
  async startAmbience(preset = this.#preset) {
    if (this.#pending) return this.#pending;
    if (preset !== "custom") this.setPreset(preset);
    if (this.#context?.state === "running") return;
    this.#pending = (async () => {
      try {
        if (!this.#context || this.#context.state === "closed") {
          this.#context = this.contextFactory();
          this.#buildGraph();
        }
        await this.#context.resume();
        clearInterval(this.#timer);
        this.#chime();
        this.#timer = setInterval(() => this.#chime(), 2500);
      } catch (error) {
        await this.#release();
        throw error;
      }
    })();
    try {
      await this.#pending;
    } finally {
      this.#pending = null;
    }
  }
  async pause() {
    if (this.#pending) await this.#pending;
    clearInterval(this.#timer);
    this.#timer = null;
    if (this.#context?.state === "running") await this.#context.suspend();
  }
  getFrequencyData() {
    const data = new Uint8Array(this.#analyser?.frequencyBinCount ?? 128);
    if (this.#analyser && this.state === "running")
      this.#analyser.getByteFrequencyData(data);
    return data;
  }
  async #release() {
    clearInterval(this.#timer);
    this.#timer = null;
    for (const source of this.#sources) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    for (const node of this.#nodes) node.disconnect();
    this.#sources.clear();
    this.#nodes.clear();
    this.#channelNodes = {};
    this.#master = null;
    this.#analyser = null;
    const context = this.#context;
    this.#context = null;
    if (context && context.state !== "closed") await context.close();
  }
  async dispose() {
    if (this.#pending) {
      try {
        await this.#pending;
      } catch {}
    }
    await this.#release();
  }
}

if (typeof document !== "undefined") {
  const synth = new SmartIotNexusSoundscapeSynth();
  const status = document.querySelector("#audio-status");
  const controls = document.querySelector("#mixer-controls");
  const play = document.querySelector("#play");
  const pause = document.querySelector("#pause");
  const stop = document.querySelector("#stop");
  const preset = document.querySelector("#preset");
  const bars = [...document.querySelectorAll(".meter span")];
  let frame = null;
  const update = () => {
    const state = JSON.parse(synth.serializePreset());
    preset.value = state.preset;
    document.querySelector("#master").value = state.master;
    document.querySelector("#master-value").textContent =
      `${Math.round(state.master * 100)}%`;
    for (const [channel, gain] of Object.entries(state.channels)) {
      document.querySelector(`#${channel}`).value = gain;
      document.querySelector(`#${channel}-value`).textContent =
        `${Math.round(gain * 100)}%`;
    }
    play.disabled = synth.state === "running";
    pause.disabled = synth.state !== "running";
    stop.disabled = synth.state === "idle";
    document.querySelector("#audio-state").textContent = synth.state;
  };
  const animate = () => {
    if (synth.state !== "running") return;
    const data = synth.getFrequencyData();
    bars.forEach((bar, index) => {
      bar.style.transform = `scaleY(${Math.max(0.03, data[index * 4] / 255)})`;
    });
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      frame = requestAnimationFrame(animate);
  };
  const action = async (operation, message) => {
    controls.disabled = true;
    play.disabled = pause.disabled = stop.disabled = true;
    try {
      await operation();
      status.textContent = message;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      controls.disabled = false;
      cancelAnimationFrame(frame);
      bars.forEach((bar) => {
        bar.style.transform = "scaleY(0.03)";
      });
      update();
      if (synth.state === "running") animate();
    }
  };
  play.addEventListener("click", () =>
    action(
      () => synth.startAmbience(),
      "Playing generated audio. Adjust levels below.",
    ),
  );
  pause.addEventListener("click", () =>
    action(() => synth.pause(), "Paused. Press Play to resume this mix."),
  );
  stop.addEventListener("click", () =>
    action(() => synth.dispose(), "Stopped. Audio resources released."),
  );
  preset.addEventListener("change", () => {
    try {
      synth.setPreset(preset.value);
      update();
      status.textContent = "Preset applied.";
    } catch (error) {
      status.textContent = error.message;
    }
  });
  controls.addEventListener("input", (event) => {
    const { id, value } = event.target;
    if (!["master", "rain", "wind", "white", "chimes"].includes(id)) return;
    try {
      if (id === "master") synth.adjustMasterGain(Number(value));
      else if (["rain", "wind", "white", "chimes"].includes(id))
        synth.adjustChannelGain(id, Number(value));
      update();
    } catch (error) {
      status.textContent = error.message;
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && synth.state === "running")
      action(() => synth.pause(), "Paused because this tab is hidden.");
  });
  window.addEventListener("pagehide", () => {
    synth.dispose().catch(() => {});
  });
  update();
}
