import test from 'node:test';
import assert from 'node:assert/strict';
import { stepTorqueVectoring } from './torque-vectoring-model.js';

const straight = {
  speedKph: 140,
  steeringAngleDeg: 0,
  corneringRadiusM: 70,
  torqueDemandPct: 72
};
const stoppedState = { lateralVelocity: 0, yawRate: 0 };

test('straight-line torque stays even across all four motors', () => {
  const { telemetry } = stepTorqueVectoring(stoppedState, straight, 1 / 60);
  assert.deepEqual(Object.values(telemetry.wheelTorquesNm), [360, 360, 360, 360]);
  assert.equal(telemetry.lateralG, 0);
  assert.equal(telemetry.yawMomentNm, 0);
  assert.equal(telemetry.handlingBalance, 'NEUTRAL');
});

test('left and right corner corrections bias the outside wheels and preserve requested torque', () => {
  for (const steeringAngleDeg of [7.5, -7.5]) {
    const { telemetry } = stepTorqueVectoring(stoppedState, {
      ...straight,
      steeringAngleDeg
    }, 1 / 60);
    const torques = telemetry.wheelTorquesNm;
    assert.equal(torques.frontLeft + torques.frontRight, 720);
    assert.equal(torques.rearLeft + torques.rearRight, 720);
    assert.ok(telemetry.yawMomentNm * steeringAngleDeg > 0);
    if (steeringAngleDeg > 0) {
      assert.ok(torques.frontRight > torques.frontLeft);
    } else {
      assert.ok(torques.frontLeft > torques.frontRight);
    }
    assert.ok(Object.values(torques).every(torque => torque >= 0 && torque <= 500));
  }
});

test('high-speed tight corner produces bounded, finite tire telemetry', () => {
  const input = {
    speedKph: 240,
    steeringAngleDeg: 15,
    corneringRadiusM: 30,
    torqueDemandPct: 100
  };
  let state = stoppedState;
  let telemetry;
  for (let index = 0; index < 120; index++) {
    ({ state, telemetry } = stepTorqueVectoring(state, input, 1 / 60));
  }
  assert.ok(Number.isFinite(telemetry.lateralG));
  assert.ok(Math.abs(telemetry.lateralG) <= 1.46);
  assert.ok(Object.values(telemetry.tireGrip).every(grip => Number.isFinite(grip) && grip >= 0 && grip <= 1.5));
  assert.ok(Object.values(state).every(Number.isFinite));
});

test('invalid control ranges and non-finite chassis state are rejected', () => {
  assert.throws(() => stepTorqueVectoring(stoppedState, { ...straight, speedKph: 0 }, 0.01), RangeError);
  assert.throws(() => stepTorqueVectoring({ lateralVelocity: NaN, yawRate: 0 }, straight, 0.01), TypeError);
});
