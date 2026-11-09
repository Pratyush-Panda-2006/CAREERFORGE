// Dependencies are injected so permission races and cleanup can be tested without a microphone.
export class VoiceRecorder {
  constructor(api, changed = () => {}) {
    this.api = api; this.changed = changed; this.state = 'idle'; this.generation = 0;
    this.stream = null; this.context = null; this.recorder = null; this.url = null;
  }
  emit(state, message) { this.state = state; this.changed({ state, message, url: this.url }); }
  releaseCapture() {
    this.api.clearTimeout(this.timer);
    this.source?.disconnect(); this.analyser?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    this.context?.close().catch(() => {});
    this.source = this.analyser = this.stream = this.context = null;
  }
  clearPreview() { if (this.url) this.api.revokeURL(this.url); this.url = null; }
  async start() {
    if (this.state === 'requesting' || this.state === 'recording' || this.state === 'stopping') return;
    const generation = ++this.generation;
    this.clearPreview(); this.emit('requesting', 'Allow microphone access to record locally.');
    let acquired;
    try {
      acquired = await this.api.getStream();
      if (generation !== this.generation) { acquired.getTracks().forEach(track => track.stop()); return; }
      this.stream = acquired;
      this.context = this.api.createContext();
      await this.context.resume();
      if (generation !== this.generation) return;
      this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 1024;
      this.source = this.context.createMediaStreamSource(acquired); this.source.connect(this.analyser);
      // Never connect microphone input to speakers (avoids feedback).
      const recorder = this.api.createRecorder(acquired); this.recorder = recorder;
      const chunks = []; let bytes = 0;
      recorder.ondataavailable = event => {
        if (generation !== this.generation || !event.data.size) return;
        if (bytes + event.data.size > 8 * 1024 * 1024) { this.stop(); return; }
        bytes += event.data.size; chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (generation !== this.generation) return;
        this.cancel(); this.emit('error', 'Recording failed. Please try again.');
      };
      recorder.onstop = () => {
        if (generation !== this.generation) return;
        this.releaseCapture(); this.recorder = null;
        if (!chunks.length) { this.emit('error', 'No audio was captured. Please try again.'); return; }
        this.url = this.api.createURL(new Blob(chunks, { type: recorder.mimeType || chunks[0].type }));
        this.emit('ready', 'Sample ready for local playback. Nothing was uploaded.');
      };
      recorder.start(250);
      this.timer = this.api.setTimeout(() => this.stop(), 30000);
      this.emit('recording', 'Recording locally — stops automatically after 30 seconds.');
    } catch (error) {
      if (generation !== this.generation) return;
      this.releaseCapture(); this.recorder = null;
      this.emit('error', error.name === 'NotAllowedError' ? 'Microphone permission denied. You can retry when ready.' : 'Microphone unavailable or recording unsupported. Check your device and try again.');
    }
  }
  stop() {
    if (this.state !== 'recording') return;
    this.emit('stopping', 'Finishing sample…'); this.api.clearTimeout(this.timer);
    try { this.recorder.stop(); } catch { this.cancel(); this.emit('error', 'Could not finish this recording. Please retry.'); }
    // Stop hardware immediately, without waiting for the final blob event.
    this.stream?.getTracks().forEach(track => track.stop());
  }
  cancel() {
    ++this.generation;
    if (this.recorder?.state !== 'inactive') { try { this.recorder?.stop(); } catch { /* Already stopped. */ } }
    this.recorder = null; this.releaseCapture(); this.clearPreview();
    this.emit('idle', 'Ready. Audio stays in this tab and is discarded when you leave.');
  }
}
