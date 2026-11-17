(function (root) {
  const BATTERY_KWH = 130;
  const START_SOC = 10;
  const END_SOC = 80;
  const MODES = {
    ac: { label: 'Level 2 AC', rateKw: 11, taper: 1 },
    dc: { label: 'Ultra-Fast 800V DC', rateKw: 350, taper: 1.15 }
  };

  function estimate(mode) {
    const spec = MODES[mode];
    if (!spec) throw new Error('Unknown charging mode');
    const energyKwh = BATTERY_KWH * (END_SOC - START_SOC) / 100;
    const minutes = energyKwh / spec.rateKw * 60 * spec.taper;
    return { ...spec, minutes, energyKwh };
  }

  root.ChargingModel = { BATTERY_KWH, START_SOC, END_SOC, MODES, estimate };
})(typeof window !== 'undefined' ? window : globalThis);
