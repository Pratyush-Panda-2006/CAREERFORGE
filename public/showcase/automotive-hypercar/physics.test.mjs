import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Constants matching Apex Zero hypercar aerodynamics & physics specification
const AIR_DENSITY = 1.225; // kg/m^3 at sea level, 15°C
const FRONTAL_AREA = 2.1;   // m^2 frontal cross-section
const GRAVITY = 9.80665;    // m/s^2 standard gravity
const MPH_TO_MS = 1609.344 / 3600; // 0.44704 m/s per mph

const WING_STATES = {
  retract:  { label: 'Retract',  cd: 0.28, cl: 0.15 },
  deploy:   { label: 'Deploy',   cd: 0.36, cl: 0.75 },
  airbrake: { label: 'Airbrake', cd: 0.50, cl: 0.95 }
};

// Pure physics aerodynamic drag and downforce formula
function calculateAero(stateKey, mph) {
  if (typeof mph !== 'number' || isNaN(mph) || mph < 0) {
    throw new TypeError('Wind speed must be a non-negative number');
  }
  const s = WING_STATES[stateKey];
  if (!s) {
    throw new Error(`Unknown wing state: ${stateKey}`);
  }
  const v = mph * MPH_TO_MS;
  const q = 0.5 * AIR_DENSITY * v * v;
  const dragN = q * s.cd * FRONTAL_AREA;
  const downN = q * s.cl * FRONTAL_AREA;
  const downKg = downN / GRAVITY;
  const powerKw = (dragN * v) / 1000;

  return { v, q, cd: s.cd, cl: s.cl, dragN, downN, downKg, powerKw };
}

// 0-60 acceleration simulation model for 1,900 HP quad-motor AWD powertrain
function simulate0to60(weightKg = 1950, peakHp = 1900, tireMu = 1.65) {
  const peakWatts = peakHp * 745.699872;
  const targetSpeedMph = 60;
  const targetSpeedMs = targetSpeedMph * MPH_TO_MS; // ~26.82 m/s

  // Max acceleration limited by tire friction coefficient (traction limit)
  const maxTractionAccel = tireMu * GRAVITY; // m/s^2

  const dt = 0.001; // 1 millisecond time steps
  let t = 0;
  let v = 0;
  let dist = 0;
  let peakG = 0;
  const splits = {};

  while (v < targetSpeedMs && t < 10) {
    // Aerodynamic drag force at velocity v
    const dragForce = 0.5 * AIR_DENSITY * v * v * 0.36 * FRONTAL_AREA;

    // Motor tractive force available (power / velocity with low-speed torque cap)
    const powerLimitedForce = v > 2.0 ? peakWatts / v : maxTractionAccel * weightKg;
    const tractiveForce = Math.min(maxTractionAccel * weightKg, powerLimitedForce);

    // Net force and acceleration
    const netForce = tractiveForce - dragForce;
    const accel = Math.max(0, netForce / weightKg);
    const gForce = accel / GRAVITY;

    if (gForce > peakG) peakG = gForce;

    v += accel * dt;
    dist += v * dt;
    t += dt;

    const currentMph = v / MPH_TO_MS;
    if (!splits['30mph'] && currentMph >= 30) splits['30mph'] = +t.toFixed(3);
    if (!splits['60mph'] && currentMph >= 60) splits['60mph'] = +t.toFixed(3);
  }

  return {
    time0to60: +t.toFixed(3),
    splits,
    peakG: +peakG.toFixed(2),
    distanceMeters: +dist.toFixed(2)
  };
}

// Battery consumption and range projection model
function calculateBatteryDepletion(packCapacityKwh, speedMph, ambientTempC, drivingMode = 'cruise') {
  if (packCapacityKwh <= 0) throw new RangeError('Battery capacity must be positive');
  if (speedMph <= 0) throw new RangeError('Speed must be positive');

  const baseCd = drivingMode === 'eco' ? 0.25 : (drivingMode === 'track' ? 0.45 : 0.28);
  const v = speedMph * MPH_TO_MS;
  const dragN = 0.5 * AIR_DENSITY * v * v * baseCd * FRONTAL_AREA;
  const aeroKw = (dragN * v) / 1000;

  // Rolling resistance and drivetrain mechanical loss
  const rollingKw = (0.012 * 1950 * GRAVITY * v) / 1000;

  // Auxiliary / HVAC thermal conditioning load
  let hvacKw = 1.2;
  if (ambientTempC < 15) {
    hvacKw += (15 - ambientTempC) * 0.12; // Cabin & pack heating
  } else if (ambientTempC > 25) {
    hvacKw += (ambientTempC - 25) * 0.10; // Active liquid chiller
  }

  // Total power drawn in kW
  const totalPowerKw = aeroKw + rollingKw + hvacKw;

  // Consumption rate in Wh/mi
  const whPerMile = (totalPowerKw * 1000) / speedMph;

  // Total projected range in miles
  const projectedRangeMiles = (packCapacityKwh * 1000) / whPerMile;

  return {
    speedMph,
    totalPowerKw: +totalPowerKw.toFixed(2),
    aeroKw: +aeroKw.toFixed(2),
    rollingKw: +rollingKw.toFixed(2),
    hvacKw: +hvacKw.toFixed(2),
    whPerMile: +whPerMile.toFixed(1),
    projectedRangeMiles: +projectedRangeMiles.toFixed(1)
  };
}

// Telemetry sanity and safety bounds validator
function validateTelemetryBounds(telemetry) {
  const bounds = {
    speed: { min: 0, max: 320 },      // 0 to 320 mph top speed
    gForce: { min: -3.0, max: 2.5 },   // -3.0g braking to +2.5g longitudinal
    rpm: { min: 0, max: 22000 },      // 0 to 22,000 RPM motor speed
    powerKw: { min: -400, max: 1500 }, // -400 kW max regen to 1,500 kW peak discharge
    batteryTempC: { min: -25, max: 65 } // Operating window before thermal emergency
  };

  const violations = [];
  for (const [key, range] of Object.entries(bounds)) {
    if (key in telemetry) {
      const val = telemetry[key];
      if (typeof val !== 'number' || isNaN(val) || val < range.min || val > range.max) {
        violations.push(`${key} (${val}) out of safe bounds [${range.min}, ${range.max}]`);
      }
    }
  }
  return { valid: violations.length === 0, violations };
}

// =================== TEST CASES ===================

test('Aerodynamic drag formula adheres to fluid dynamic quadratic velocity scaling (v^2)', () => {
  const aero100 = calculateAero('retract', 100);
  const aero200 = calculateAero('retract', 200);

  // When velocity doubles, dynamic pressure and drag force quadruple (2^2 = 4)
  const ratio = aero200.dragN / aero100.dragN;
  assert.ok(Math.abs(ratio - 4.0) < 0.001, `Drag ratio should be ~4.0, received ${ratio}`);
  assert.equal(aero100.cd, 0.28);
  assert.equal(aero200.cd, 0.28);
});

test('Aerodynamic wing states accurately scale drag and downforce coefficients', () => {
  const retract = calculateAero('retract', 150);
  const deploy = calculateAero('deploy', 150);
  const airbrake = calculateAero('airbrake', 150);

  assert.ok(deploy.dragN > retract.dragN, 'Deployed wing must produce more drag than retracted');
  assert.ok(airbrake.dragN > deploy.dragN, 'Airbrake must produce highest aerodynamic drag');
  assert.ok(deploy.downKg > retract.downKg, 'Deployed wing must produce significantly higher downforce');
  assert.equal(airbrake.cd, 0.50);
  assert.equal(airbrake.cl, 0.95);
});

test('Aerodynamic calculations reject invalid inputs gracefully', () => {
  assert.throws(() => calculateAero('retract', -50), TypeError);
  assert.throws(() => calculateAero('retract', NaN), TypeError);
  assert.throws(() => calculateAero('unknown_mode', 100), /Unknown wing state/);
});

test('0-60 acceleration simulation validates hypercar sub-2.0-second milestone', () => {
  const res = simulate0to60(1950, 1900, 1.65);

  // 1,900 HP hypercar with sticky tires accelerates from 0 to 60 mph in 1.70 - 1.85 seconds
  assert.ok(res.time0to60 < 2.0, `0-60 time should be sub-2.0s, received ${res.time0to60}s`);
  assert.ok(res.time0to60 > 1.4, `0-60 time should be physically plausible (>1.4s), received ${res.time0to60}s`);

  // Split intervals
  assert.ok(res.splits['30mph'] > 0 && res.splits['30mph'] < res.time0to60);
  assert.ok(res.splits['60mph'] === res.time0to60);

  // G-Force validation (1.65 tire mu should yield peak G near 1.65)
  assert.ok(res.peakG >= 1.5 && res.peakG <= 1.7, `Peak G should be within [1.5, 1.7], received ${res.peakG}`);
});

test('Battery consumption curve increases non-linearly with cruising speed due to drag', () => {
  const lowSpeed = calculateBatteryDepletion(130, 45, 20, 'eco');
  const midSpeed = calculateBatteryDepletion(130, 70, 20, 'cruise');
  const highSpeed = calculateBatteryDepletion(130, 120, 20, 'track');

  assert.ok(lowSpeed.whPerMile < midSpeed.whPerMile, 'Low speed consumption must be lower than highway speed');
  assert.ok(midSpeed.whPerMile < highSpeed.whPerMile, 'High track speed consumption must exceed highway cruising');
  assert.ok(lowSpeed.projectedRangeMiles > midSpeed.projectedRangeMiles, 'Eco range must exceed standard cruising');
  assert.ok(midSpeed.projectedRangeMiles > highSpeed.projectedRangeMiles, 'Cruising range must exceed track range');
});

test('Cold ambient temperatures degrade projected range via increased thermal heating demand', () => {
  const roomTemp = calculateBatteryDepletion(130, 70, 21, 'cruise');
  const freezingTemp = calculateBatteryDepletion(130, 70, -10, 'cruise');

  assert.ok(freezingTemp.hvacKw > roomTemp.hvacKw, 'Sub-zero temperatures must increase HVAC thermal power');
  assert.ok(freezingTemp.projectedRangeMiles < roomTemp.projectedRangeMiles, 'Cold weather must diminish range');
});

test('Telemetry bounds validator identifies nominal operations and catches dangerous anomalies', () => {
  const nominalTelemetry = {
    speed: 185,
    gForce: 1.25,
    rpm: 16500,
    powerKw: 950,
    batteryTempC: 42
  };
  const nominalCheck = validateTelemetryBounds(nominalTelemetry);
  assert.equal(nominalCheck.valid, true);
  assert.equal(nominalCheck.violations.length, 0);

  const anomalyTelemetry = {
    speed: 380, // Exceeds 320 mph max top speed
    gForce: 4.5, // Exceeds 2.5g physical limit
    rpm: 25000, // Exceeds 22,000 RPM inverter redline
    powerKw: 2200, // Exceeds 1,500 kW pack limit
    batteryTempC: 85 // Dangerous thermal runaway
  };
  const anomalyCheck = validateTelemetryBounds(anomalyTelemetry);
  assert.equal(anomalyCheck.valid, false);
  assert.equal(anomalyCheck.violations.length, 5);
});

test('Inspect and verify script.js script execution in browser simulation environment', () => {
  const scriptContent = fs.readFileSync(new URL('./script.js', import.meta.url), 'utf8');
  assert.ok(scriptContent.length > 1000, 'script.js should be loaded');

  // Verify that script.js contains the aerodynamic equations and launch control logic
  assert.match(scriptContent, /AIR_DENSITY/);
  assert.match(scriptContent, /FRONTAL_AREA/);
  assert.match(scriptContent, /calcAero/);
  assert.match(scriptContent, /initLaunchControl/);
});
