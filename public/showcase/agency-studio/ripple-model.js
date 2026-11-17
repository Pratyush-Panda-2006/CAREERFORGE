const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export class RippleField {
  waves = [];
  add(x, y, time) {
    this.waves.push({ x: clamp(x, 0, 1), y: clamp(y, 0, 1), time });
    if (this.waves.length > 8) this.waves.shift();
  }
  clear() { this.waves = []; }
  prune(time, damping) {
    this.waves = this.waves.filter(wave => Math.exp(-damping * Math.max(0, time-wave.time)/1000) > 0.008);
    return this.waves.length > 0;
  }
  sample(x, y, time, { frequency, amplitude, damping }) {
    let dx = 0, dy = 0;
    for (const wave of this.waves) {
      const age = Math.max(0, time-wave.time)/1000;
      const rx = x-wave.x, ry = y-wave.y, distance = Math.hypot(rx,ry);
      if (distance < 0.0001) continue;
      const strength = Math.sin(distance*frequency*Math.PI*2-age*9)
        * amplitude * Math.exp(-damping*age-distance*3);
      dx += rx/distance*strength; dy += ry/distance*strength;
    }
    return { x: clamp(dx,-amplitude,amplitude), y: clamp(dy,-amplitude,amplitude) };
  }
}
