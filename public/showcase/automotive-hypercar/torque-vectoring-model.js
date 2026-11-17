const MASS_KG = 1950;
const GRAVITY = 9.80665;
const WHEELBASE_M = 2.8;
const FRONT_AXLE_M = 1.35;
const REAR_AXLE_M = WHEELBASE_M - FRONT_AXLE_M;
const TRACK_M = 1.68;
const WHEEL_RADIUS_M = 0.34;
const YAW_INERTIA_KGM2 = 2900;
const FRONT_CORNERING_STIFFNESS = 82_000;
const REAR_CORNERING_STIFFNESS = 88_000;
const TIRE_FRICTION = 1.45;
const MAX_MOTOR_TORQUE_NM = 500;
const MAX_TORQUE_BIAS_NM = 170;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function validateInput(input) {
  const bounds = {
    speedKph: [60, 240],
    steeringAngleDeg: [-15, 15],
    corneringRadiusM: [30, 180],
    torqueDemandPct: [0, 100]
  };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`${key} must be between ${min} and ${max}`);
    }
  }
}

function calculateForces(state, speedMs, steeringRad, yawMomentNm) {
  const frontSlipRad = steeringRad - Math.atan2(state.lateralVelocity + FRONT_AXLE_M * state.yawRate, speedMs);
  const rearSlipRad = -Math.atan2(state.lateralVelocity - REAR_AXLE_M * state.yawRate, speedMs);
  const frontLimitN = TIRE_FRICTION * MASS_KG * GRAVITY * (REAR_AXLE_M / WHEELBASE_M);
  const rearLimitN = TIRE_FRICTION * MASS_KG * GRAVITY * (FRONT_AXLE_M / WHEELBASE_M);
  const frontLateralForceN = clamp(FRONT_CORNERING_STIFFNESS * frontSlipRad, -frontLimitN, frontLimitN);
  const rearLateralForceN = clamp(REAR_CORNERING_STIFFNESS * rearSlipRad, -rearLimitN, rearLimitN);
  const cosSteer = Math.cos(steeringRad);
  const lateralAcceleration = (frontLateralForceN * cosSteer + rearLateralForceN) / MASS_KG;
  const lateralVelocityRate = lateralAcceleration - speedMs * state.yawRate;
  const yawAcceleration = (FRONT_AXLE_M * frontLateralForceN * cosSteer
    - REAR_AXLE_M * rearLateralForceN + yawMomentNm) / YAW_INERTIA_KGM2;

  return {
    frontSlipRad,
    rearSlipRad,
    frontLateralForceN,
    rearLateralForceN,
    lateralAcceleration,
    lateralVelocityRate,
    yawAcceleration
  };
}

export function stepTorqueVectoring(state, input, deltaSeconds) {
  validateInput(input);
  if (!state || !Number.isFinite(state.lateralVelocity) || !Number.isFinite(state.yawRate)) {
    throw new TypeError('Vehicle state must contain finite lateralVelocity and yawRate values');
  }
  if (typeof deltaSeconds !== 'number' || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('deltaSeconds must be a non-negative finite number');
  }

  const speedMs = input.speedKph / 3.6;
  const steeringRad = input.steeringAngleDeg * Math.PI / 180;
  const turnSign = Math.sign(steeringRad);
  const radiusYawRate = turnSign * speedMs / input.corneringRadiusM;
  const steeringYawRate = speedMs * Math.tan(steeringRad) / WHEELBASE_M;
  const targetYawRate = turnSign * Math.min(Math.abs(radiusYawRate), Math.abs(steeringYawRate));
  const yawRateError = targetYawRate - state.yawRate;
  const requestedYawMomentNm = clamp(yawRateError * 3200, -2500, 2500);
  const baseWheelTorqueNm = input.torqueDemandPct * 5;
  const maxTorqueBiasNm = Math.min(
    MAX_TORQUE_BIAS_NM,
    baseWheelTorqueNm,
    MAX_MOTOR_TORQUE_NM - baseWheelTorqueNm
  );
  const torqueBiasNm = clamp(
    requestedYawMomentNm * WHEEL_RADIUS_M / (2 * TRACK_M),
    -maxTorqueBiasNm,
    maxTorqueBiasNm
  );
  const yawMomentNm = 2 * TRACK_M * torqueBiasNm / WHEEL_RADIUS_M;
  const wheelTorquesNm = {
    frontLeft: baseWheelTorqueNm - torqueBiasNm,
    frontRight: baseWheelTorqueNm + torqueBiasNm,
    rearLeft: baseWheelTorqueNm - torqueBiasNm,
    rearRight: baseWheelTorqueNm + torqueBiasNm
  };

  const forces = calculateForces(state, speedMs, steeringRad, yawMomentNm);
  const dt = Math.min(deltaSeconds, 0.05);
  const nextState = {
    lateralVelocity: clamp(state.lateralVelocity + forces.lateralVelocityRate * dt, -speedMs * 0.5, speedMs * 0.5),
    yawRate: clamp(state.yawRate + forces.yawAcceleration * dt, -3, 3)
  };
  const lateralG = forces.lateralAcceleration / GRAVITY;
  const outsideShare = clamp(0.5 + Math.abs(lateralG) * 0.07, 0.5, 0.68);
  const outsideIsRight = lateralG >= 0;
  const wheelLateralForcesN = {
    frontLeft: forces.frontLateralForceN * (outsideIsRight ? 1 - outsideShare : outsideShare),
    frontRight: forces.frontLateralForceN * (outsideIsRight ? outsideShare : 1 - outsideShare),
    rearLeft: forces.rearLateralForceN * (outsideIsRight ? 1 - outsideShare : outsideShare),
    rearRight: forces.rearLateralForceN * (outsideIsRight ? outsideShare : 1 - outsideShare)
  };
  const axleNormalForceN = {
    frontLeft: MASS_KG * GRAVITY * (REAR_AXLE_M / WHEELBASE_M) / 2,
    frontRight: MASS_KG * GRAVITY * (REAR_AXLE_M / WHEELBASE_M) / 2,
    rearLeft: MASS_KG * GRAVITY * (FRONT_AXLE_M / WHEELBASE_M) / 2,
    rearRight: MASS_KG * GRAVITY * (FRONT_AXLE_M / WHEELBASE_M) / 2
  };
  const tireGrip = Object.fromEntries(Object.keys(wheelTorquesNm).map(wheel => {
    const isRight = wheel.endsWith('Right');
    const isOutside = isRight === outsideIsRight;
    const loadFactor = isOutside ? 2 * outsideShare : 2 * (1 - outsideShare);
    const tireLimitN = TIRE_FRICTION * axleNormalForceN[wheel] * loadFactor;
    const driveForceN = wheelTorquesNm[wheel] / WHEEL_RADIUS_M;
    const utilization = Math.hypot(wheelLateralForcesN[wheel], driveForceN) / tireLimitN;
    return [wheel, clamp(utilization, 0, 1.5)];
  }));
  const signedYawError = turnSign * yawRateError;
  const handlingBalance = signedYawError > 0.025 ? 'UNDERSTEER'
    : signedYawError < -0.025 ? 'OVERSTEER' : 'NEUTRAL';

  return {
    state: nextState,
    telemetry: {
      wheelTorquesNm,
      tireGrip,
      lateralG,
      yawRate: state.yawRate,
      frontSlipDeg: forces.frontSlipRad * 180 / Math.PI,
      rearSlipDeg: forces.rearSlipRad * 180 / Math.PI,
      yawMomentNm,
      torqueBiasNm,
      targetYawRate,
      handlingBalance
    }
  };
}
