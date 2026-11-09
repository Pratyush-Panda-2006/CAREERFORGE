// Illustrative point-mass model, SI units. Segment layouts are synthetic,
// not surveyed circuit geometry or validated vehicle-performance predictions.
// Each [length metres, corner radius metres (0 = straight), sector] is subdivided.
export const CIRCUITS = {
  nordschleife: { name: 'Nürburgring Nordschleife', segments: [
    [2400, 0, 1], [1300, 110, 1], [1600, 65, 1], [1700, 220, 1],
    [1800, 0, 2], [1500, 90, 2], [1700, 160, 2], [2000, 55, 2],
    [1800, 140, 3], [1600, 75, 3], [3000, 0, 3], [600, 100, 3]] },
  silverstone: { name: 'Silverstone', segments: [
    [700, 0, 1], [500, 180, 1], [700, 65, 1],
    [800, 0, 2], [500, 230, 2], [700, 100, 2],
    [800, 0, 3], [600, 85, 3], [600, 160, 3]] },
  laguna: { name: 'Laguna Seca', segments: [
    [600, 0, 1], [300, 45, 1], [300, 100, 1],
    [450, 0, 2], [350, 65, 2], [400, 40, 2],
    [500, 0, 3], [400, 60, 3], [300, 35, 3]] }
};
export const COMPOUNDS = {
  soft: { name: 'Soft Slick', dry: 1.65, wet: 0.55, wearPerKm: 0.007 },
  medium: { name: 'Medium', dry: 1.48, wet: 0.6, wearPerKm: 0.0035 },
  wet: { name: 'Wet', dry: 1.12, wet: 1.2, wearPerKm: 0.0045 }
};
const G = 9.81;
const MASS = 1800;
const POWER = 700_000;
const TOP_SPEED = 115; // m/s, illustrative capped model speed

export function simulateLap(trackId, compoundId, condition = 'dry', ageKm = 0) {
  const track = CIRCUITS[trackId], compound = COMPOUNDS[compoundId];
  if (!track || !compound || !['dry', 'wet'].includes(condition)
      || !Number.isFinite(ageKm) || ageKm < 0 || ageKm > 50) throw new Error('Invalid lap configuration.');
  let distance = 0;
  const cells = [];
  for (const [length, radius, sector] of track.segments) {
    const count = Math.ceil(length / 25);
    for (let index = 0; index < count; index++) {
      const wear = Math.min(0.4, compound.wearPerKm * (ageKm + distance / 1000));
      const grip = compound[condition] * (1 - wear);
      cells.push({ length: length / count, radius, sector, grip, wear,
        cap: radius ? Math.min(TOP_SPEED, Math.sqrt(grip * G * radius)) : TOP_SPEED });
      distance += length / count;
    }
  }
  // Nodes respect both adjacent corner limits. The backward pass anticipates
  // braking zones; the forward pass limits traction/power acceleration.
  const speeds = Array.from({ length: cells.length + 1 }, (_, index) =>
    Math.min(cells[Math.max(0, index - 1)].cap, cells[Math.min(index, cells.length - 1)].cap));
  speeds[0] = 0; // a standing start, not a flying qualifying lap
  for (let index = cells.length - 1; index > 0; index--) {
    speeds[index] = Math.min(speeds[index], Math.sqrt(speeds[index + 1] ** 2 + 2 * cells[index].grip * G * cells[index].length));
  }
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];
    const acceleration = Math.max(0.3, Math.min(cell.grip * G * 0.85, POWER / (MASS * Math.max(speeds[index], 5))) - 0.00035 * speeds[index] ** 2);
    speeds[index + 1] = Math.min(speeds[index + 1], Math.sqrt(speeds[index] ** 2 + 2 * acceleration * cell.length));
  }
  let time = 0, travelled = 0;
  const sectors = [0, 0, 0];
  const samples = [{ time: 0, distance: 0, speed: 0, lateralG: 0, wear: cells[0].wear, sector: 1 }];
  cells.forEach((cell, index) => {
    const duration = 2 * cell.length / (speeds[index] + speeds[index + 1]);
    time += duration;
    travelled += cell.length;
    sectors[cell.sector - 1] += duration;
    const speed = speeds[index + 1];
    samples.push({ time, distance: travelled, speed, lateralG: cell.radius ? speed ** 2 / (cell.radius * G) : 0,
      wear: cell.wear, sector: cell.sector });
  });
  return { trackId, compoundId, condition, ageKm, duration: time, distance: travelled, sectors, samples };
}

export function sampleLap(lap, elapsed) {
  if (!Number.isFinite(elapsed)) throw new Error('Elapsed time must be finite.');
  const time = Math.max(0, Math.min(lap.duration, elapsed));
  let low = 0, high = lap.samples.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (lap.samples[middle].time <= time) low = middle;
    else high = middle;
  }
  const a = lap.samples[low], b = lap.samples[high];
  const ratio = (time - a.time) / (b.time - a.time);
  const interpolate = key => a[key] + (b[key] - a[key]) * ratio;
  return { time, distance: interpolate('distance'), speed: interpolate('speed'), lateralG: interpolate('lateralG'),
    wear: interpolate('wear'), progress: time === lap.duration ? 1 : interpolate('distance') / lap.distance };
}
