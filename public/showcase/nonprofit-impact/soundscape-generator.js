/**
 * Nonprofit Impact - Procedural Web Audio Ambient Soundscape Generator & Acoustic Mixer
 */

export class NonprofitImpactSoundscapeGenerator {
  constructor() {
    this.presets = {
      rainforest: { baseFreq: 120, harmonicCount: 4, gain: 0.7 },
      oceanShore: { baseFreq: 60, harmonicCount: 3, gain: 0.8 },
      forestBreeze: { baseFreq: 220, harmonicCount: 5, gain: 0.6 }
    };
  }

  getHarmonics(baseFreq, count) {
    const harmonics = [];
    for (let i = 1; i <= count; i++) {
      harmonics.push({
        harmonic: i,
        frequency: Number((baseFreq * i).toFixed(1)),
        amplitude: Number((1 / i).toFixed(2))
      });
    }
    return harmonics;
  }

  computeEnvelope(durationSec = 2, attack = 0.2, release = 0.3) {
    const safeAttack = Math.min(attack, durationSec / 2);
    const safeRelease = Math.min(release, durationSec / 2);
    const sustainDuration = durationSec - safeAttack - safeRelease;

    return {
      totalDuration: durationSec,
      attackDuration: safeAttack,
      sustainDuration: Math.max(0, sustainDuration),
      releaseDuration: safeRelease,
      peakGain: 1.0,
      sustainGain: 0.7
    };
  }

  getPreset(name) {
    return this.presets[name] || this.presets.rainforest;
  }
}
