import fs from 'fs';
import path from 'path';

const showcaseDir = path.resolve('public', 'showcase');

const newProjects = [
  {
    slug: 'aerospace-orbiter',
    name: 'ORBITER-X // Orbital Mission Control & Telemetry Hub',
    category: 'AEROSPACE & SPACEFLIGHT',
    accentColor: '#38bdf8',
    description: 'High-precision orbital mechanics telemetry console with live launch countdown, multi-stage altitude calculation, and satellite orbital inclination tracking.',
    extraFile: 'mission-brief.html',
    extraFileTitle: 'Orbiter-X Mission Dossier',
    extraFileContent: 'Flight trajectory logs, telemetry specs, and orbital insertion parameters for active spacecraft.',
    mathModule: `
export function calculateOrbitalPeriod(altitudeKm) {
  const G = 6.67430e-11;
  const M = 5.972e24;
  const R = 6371e3;
  const r = R + (altitudeKm * 1000);
  const T = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / (G * M));
  return Math.round(T / 60); // minutes
}

export function calculateOrbitalVelocity(altitudeKm) {
  const G = 6.67430e-11;
  const M = 5.972e24;
  const R = 6371e3;
  const r = R + (altitudeKm * 1000);
  const v = Math.sqrt((G * M) / r);
  return (v / 1000).toFixed(2); // km/s
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrbitalPeriod, calculateOrbitalVelocity } from './script.js';

test('Orbiter-X calculates LEO orbital period around 400km (ISS altitude)', () => {
  const period = calculateOrbitalPeriod(400);
  assert.ok(period >= 90 && period <= 95, \`Expected ~92 mins, got \${period}\`);
});

test('Orbiter-X orbital velocity at 400km is approx 7.67 km/s', () => {
  const v = parseFloat(calculateOrbitalVelocity(400));
  assert.ok(v >= 7.6 && v <= 7.8, \`Expected ~7.67 km/s, got \${v}\`);
});
    `
  },
  {
    slug: 'quantum-forge',
    name: 'QUANTUM FORGE // Quantum Circuit & Qubit State Simulator',
    category: 'QUANTUM COMPUTING',
    accentColor: '#a855f7',
    description: 'Visual quantum computing circuit designer with draggable Hadamard, Pauli-X, CNOT gates, state-vector amplitude visualizer, and quantum superposition measurement.',
    mathModule: `
export function applyHadamard(qubitState) {
  // Input: [alpha, beta], Output: 1/sqrt(2) * [alpha + beta, alpha - beta]
  const invSqrt2 = 1 / Math.SQRT2;
  return [
    invSqrt2 * (qubitState[0] + qubitState[1]),
    invSqrt2 * (qubitState[0] - qubitState[1])
  ];
}

export function measureProbabilities(state) {
  const p0 = Math.pow(state[0], 2);
  const p1 = Math.pow(state[1], 2);
  return { p0: Number(p0.toFixed(4)), p1: Number(p1.toFixed(4)) };
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHadamard, measureProbabilities } from './script.js';

test('Hadamard gate on |0> produces equal superposition (50/50)', () => {
  const state = applyHadamard([1, 0]);
  const probs = measureProbabilities(state);
  assert.equal(probs.p0, 0.5);
  assert.equal(probs.p1, 0.5);
});
    `
  },
  {
    slug: 'biotech-genomics',
    name: 'GENOME-LAB // CRISPR-Cas9 & DNA Sequence Workbench',
    category: 'BIOTECHNOLOGY & GENOMICS',
    accentColor: '#10b981',
    description: 'Interactive bioinformatics suite supporting DNA to mRNA transcription, codon translation into amino acids, CRISPR PAM motif detection, and point mutation simulation.',
    mathModule: `
export const CODON_TABLE = {
  'AUG': 'Met (Start)', 'UUU': 'Phe', 'UUC': 'Phe', 'UUA': 'Leu', 'UUG': 'Leu',
  'GCU': 'Ala', 'GCC': 'Ala', 'GCA': 'Ala', 'GCG': 'Ala',
  'GAU': 'Asp', 'GAC': 'Asp', 'GAA': 'Glu', 'GAG': 'Glu',
  'UAA': 'STOP', 'UAG': 'STOP', 'UGA': 'STOP'
};

export function transcribeDNAtoRNA(dna) {
  return dna.toUpperCase().replace(/T/g, 'U');
}

export function translateRNA(rna) {
  const cleaned = rna.toUpperCase().replace(/[^AUCG]/g, '');
  const peptide = [];
  for (let i = 0; i < cleaned.length - 2; i += 3) {
    const codon = cleaned.substring(i, i + 3);
    const aa = CODON_TABLE[codon] || 'Unknown';
    peptide.push(aa);
    if (aa === 'STOP') break;
  }
  return peptide;
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribeDNAtoRNA, translateRNA } from './script.js';

test('Transcribe DNA ATGTTT to RNA AUGUUU', () => {
  assert.equal(transcribeDNAtoRNA('ATGTTT'), 'AUGUUU');
});

test('Translate AUGUUUUAA to Met, Phe, STOP', () => {
  const res = translateRNA('AUGUUUUAA');
  assert.deepEqual(res, ['Met (Start)', 'Phe', 'STOP']);
});
    `
  },
  {
    slug: 'smart-iot-nexus',
    name: 'NEXUS-IOT // Industrial IoT Sensor Matrix & Telemetry Stream',
    category: 'INTERNET OF THINGS',
    accentColor: '#f59e0b',
    description: 'Industrial telemetric sensor hub monitoring real-time vibration, temperature, pressure, and flow rates with configurable trigger thresholds and automated fail-safe alerts.',
    mathModule: `
export function evaluateSensorAlert(reading, minThreshold, maxThreshold) {
  if (reading < minThreshold) return { alert: true, level: 'CRITICAL_LOW', delta: minThreshold - reading };
  if (reading > maxThreshold) return { alert: true, level: 'CRITICAL_HIGH', delta: reading - maxThreshold };
  return { alert: false, level: 'NOMINAL', delta: 0 };
}

export function calculateMovingAverage(windowArray, newSample) {
  const updated = [...windowArray, newSample];
  if (updated.length > 10) updated.shift();
  const sum = updated.reduce((a, b) => a + b, 0);
  return { window: updated, average: Number((sum / updated.length).toFixed(2)) };
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSensorAlert, calculateMovingAverage } from './script.js';

test('Sensor alerts triggered when temperature exceeds max limit', () => {
  const result = evaluateSensorAlert(95, 20, 80);
  assert.equal(result.alert, true);
  assert.equal(result.level, 'CRITICAL_HIGH');
});

test('Moving average computes accurately across 5 samples', () => {
  const res = calculateMovingAverage([10, 20, 30, 40], 50);
  assert.equal(res.average, 30);
});
    `
  },
  {
    slug: 'defi-yield-matrix',
    name: 'YIELD MATRIX // Decentralized Liquidity & APY Optimizer',
    category: 'DEFI & LIQUIDITY',
    accentColor: '#06b6d4',
    description: 'Algorithmic DeFi liquidity provision optimizer computing real-time APY compounding schedules, impermanent loss matrices across crypto pairs, and slippage protection.',
    mathModule: `
export function calculateImpermanentLoss(priceRatio) {
  // IL = 2 * sqrt(k) / (1 + k) - 1
  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  return Number((Math.abs(il) * 100).toFixed(2));
}

export function calculateCompoundedYield(principal, apyPercent, days) {
  const rate = apyPercent / 100;
  const time = days / 365;
  const amount = principal * Math.pow(1 + rate / 365, 365 * time);
  return Number(amount.toFixed(2));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateImpermanentLoss, calculateCompoundedYield } from './script.js';

test('2x price change yields approx 5.72% impermanent loss', () => {
  const il = calculateImpermanentLoss(2.0);
  assert.ok(il >= 5.7 && il <= 5.8, \`Expected ~5.72%, got \${il}%\`);
});

test('Compounded yield on $1000 at 10% APY after 365 days', () => {
  const val = calculateCompoundedYield(1000, 10, 365);
  assert.ok(val >= 1105 && val <= 1106, \`Expected ~1105.16, got \${val}\`);
});
    `
  },
  {
    slug: 'virtual-museum-3d',
    name: 'LOUVRE-VIRTUAL // Curated Antiquities & 3D Artifact Gallery',
    category: 'ART & VIRTUAL EXHIBITION',
    accentColor: '#ec4899',
    description: 'Immersive digital museum and archaeological archive featuring high-DPI artifact inspection, curation audio tour narration, and historical era timeline mapping.',
    mathModule: `
export function filterArtifactsByCentury(artifacts, startCentury, endCentury) {
  return artifacts.filter(item => item.century >= startCentury && item.century <= endCentury);
}

export function calculateViewerMagnification(zoomLevel, baseDpi = 72) {
  const clampedZoom = Math.min(Math.max(zoomLevel, 1), 10);
  return clampedZoom * (baseDpi / 72);
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterArtifactsByCentury, calculateViewerMagnification } from './script.js';

test('Filter artifacts between 15th and 18th century', () => {
  const mock = [{ id: 1, century: 16 }, { id: 2, century: 19 }, { id: 3, century: 14 }];
  const filtered = filterArtifactsByCentury(mock, 15, 18);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
});
    `
  },
  {
    slug: 'renewable-microgrid',
    name: 'SOLIS-GRID // Clean Energy Microgrid Load Balancer',
    category: 'CLEAN ENERGY & CLIMATE',
    accentColor: '#84cc16',
    description: 'Smart autonomous power grid simulator balancing solar, wind, and battery storage against fluctuating city demand curves with carbon offset metrics.',
    mathModule: `
export function balancePowerGrid(generationTotalKw, consumptionTotalKw, batteryCapacityKwh, currentBatteryKwh) {
  const netKw = generationTotalKw - consumptionTotalKw;
  let newBattery = currentBatteryKwh;
  let gridStatus = 'BALANCED';

  if (netKw > 0) {
    newBattery = Math.min(batteryCapacityKwh, currentBatteryKwh + netKw);
    gridStatus = 'SURPLUS_CHARGING';
  } else if (netKw < 0) {
    const deficit = Math.abs(netKw);
    if (currentBatteryKwh >= deficit) {
      newBattery = currentBatteryKwh - deficit;
      gridStatus = 'BATTERY_DISCHARGING';
    } else {
      newBattery = 0;
      gridStatus = 'BROWNOUT_RISK';
    }
  }

  return { netKw, newBattery, gridStatus };
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { balancePowerGrid } from './script.js';

test('Grid surplus charges battery correctly up to capacity', () => {
  const res = balancePowerGrid(120, 100, 50, 40);
  assert.equal(res.gridStatus, 'SURPLUS_CHARGING');
  assert.equal(res.newBattery, 50); // capped at capacity
});
    `
  },
  {
    slug: 'vr-metaverse-hub',
    name: 'METASPACE // WebXR Spatial Lounge & Digital World Hub',
    category: 'SPATIAL COMPUTING & XR',
    accentColor: '#6366f1',
    description: 'Next-generation WebXR spatial computing hub with avatar identity customization, spatial 3D audio attenuation calculation, and multi-room portal navigation.',
    mathModule: `
export function calculateSpatialAudioGain(listenerPos, sourcePos, maxDistance = 50) {
  const dx = listenerPos.x - sourcePos.x;
  const dy = listenerPos.y - sourcePos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= maxDistance) return 0;
  return Number((1 - dist / maxDistance).toFixed(3));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSpatialAudioGain } from './script.js';

test('Spatial audio gain drops to zero at max distance', () => {
  const gain = calculateSpatialAudioGain({ x: 0, y: 0 }, { x: 50, y: 0 }, 50);
  assert.equal(gain, 0);
});
    `
  },
  {
    slug: 'supply-chain-logistics',
    name: 'FREIGHT-FLOW // Global Maritime & Air Logistics Corridor',
    category: 'SUPPLY CHAIN & LOGISTICS',
    accentColor: '#14b8a6',
    description: 'Real-time intermodal freight dashboard computing container vessel route ETA, port dwell-time congestion indices, and fuel emission cost curves.',
    mathModule: `
export function estimateVoyageDurationHours(distanceNauticalMiles, cruiseSpeedKnots, portWaitHours = 12) {
  const sailingHours = distanceNauticalMiles / cruiseSpeedKnots;
  return Number((sailingHours + portWaitHours).toFixed(1));
}

export function calculateCarbonEmissionsTons(fuelConsumedTons) {
  // Heavy fuel oil produces approx 3.114 metric tons of CO2 per ton of fuel
  return Number((fuelConsumedTons * 3.114).toFixed(2));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateVoyageDurationHours, calculateCarbonEmissionsTons } from './script.js';

test('Voyage duration calculates sailing plus port dwell hours', () => {
  const hours = estimateVoyageDurationHours(200, 20, 10);
  assert.equal(hours, 20.0);
});
    `
  },
  {
    slug: 'robotics-automata',
    name: 'AUTOMATA // Robotic Arm Inverse Kinematics Simulator',
    category: 'ROBOTICS & KINEMATICS',
    accentColor: '#ef4444',
    description: 'Interactive 2D/3D planar robotic manipulator simulator with 3-link forward and inverse kinematics, end-effector reach envelopes, and waypoint interpolation.',
    mathModule: `
export function forwardKinematics(l1, l2, theta1Rad, theta2Rad) {
  const x = l1 * Math.cos(theta1Rad) + l2 * Math.cos(theta1Rad + theta2Rad);
  const y = l1 * Math.sin(theta1Rad) + l2 * Math.sin(theta1Rad + theta2Rad);
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { forwardKinematics } from './script.js';

test('Forward kinematics with zero angles returns collinear arm length', () => {
  const pos = forwardKinematics(10, 10, 0, 0);
  assert.equal(pos.x, 20);
  assert.equal(pos.y, 0);
});
    `
  },
  {
    slug: 'neurotech-interface',
    name: 'SYNAPSE-EEG // Neural Waveform Monitor & Cognitive Telemetry',
    category: 'NEUROTECH & BCI',
    accentColor: '#8b5cf6',
    description: 'Brain-Computer Interface dashboard streaming simulated multi-channel EEG frequency spectrums (Delta, Theta, Alpha, Beta) with real-time focus & engagement scorers.',
    mathModule: `
export function calculateFocusScore(betaPower, thetaPower, alphaPower) {
  // Standard Engagement Index = Beta / (Alpha + Theta)
  const denominator = alphaPower + thetaPower;
  if (denominator === 0) return 0;
  const index = betaPower / denominator;
  return Number(Math.min(100, index * 50).toFixed(1));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFocusScore } from './script.js';

test('High beta wave presence indicates high focus score', () => {
  const score = calculateFocusScore(4.0, 1.0, 1.0);
  assert.equal(score, 100);
});
    `
  },
  {
    slug: 'weather-radar-atlas',
    name: 'ATLAS-METEO // Severe Weather Doppler Radar & Pressure Stream',
    category: 'METEOROLOGY & WEATHER',
    accentColor: '#3b82f6',
    description: 'Live atmospheric weather workstation displaying Doppler storm cell velocities, barometric pressure trend charts, humidity saturation, and storm advisories.',
    mathModule: `
export function calculateDewPoint(tempCelsius, relativeHumidity) {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempCelsius) / (b + tempCelsius)) + Math.log(relativeHumidity / 100);
  const dp = (b * alpha) / (a - alpha);
  return Number(dp.toFixed(1));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDewPoint } from './script.js';

test('Calculate dew point at 20C and 50% relative humidity', () => {
  const dp = calculateDewPoint(20, 50);
  assert.ok(dp >= 9.0 && dp <= 9.6, \`Expected ~9.3C, got \${dp}\`);
});
    `
  },
  {
    slug: 'streaming-cinema-hub',
    name: 'CINE-STREAM // Indie Cinema & 4K Watch Party Lounge',
    category: 'ENTERTAINMENT & MEDIA',
    accentColor: '#f43f5e',
    description: 'Cinematic indie film festival platform featuring adaptive 4K video preview containers, real-time synchronized community watch parties, and audience ratings.',
    mathModule: `
export function calculateWatchProgress(currentTimeSec, durationSec) {
  if (durationSec <= 0) return 0;
  return Number(Math.min(100, (currentTimeSec / durationSec) * 100).toFixed(1));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWatchProgress } from './script.js';

test('Watch progress calculates 50% at midpoint', () => {
  assert.equal(calculateWatchProgress(60, 120), 50.0);
});
    `
  },
  {
    slug: 'fitness-crossfit-pro',
    name: 'PULSE-WOD // Functional HIIT & Calorie Expenditure Tracker',
    category: 'FITNESS & ATHLETICS',
    accentColor: '#f97316',
    description: 'High-intensity interval training (HIIT) workout suite with customizable Tabata/EMOM countdown audio beepers, heart-rate zones, and MET calorie burns.',
    mathModule: `
export function calculateCaloriesBurned(met, weightKg, durationMinutes) {
  // Calories = MET * 3.5 * weightKg / 200 * durationMinutes
  const cal = (met * 3.5 * weightKg * durationMinutes) / 200;
  return Math.round(cal);
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCaloriesBurned } from './script.js';

test('Calorie burn for 10 MET exercise, 70kg user over 30 mins', () => {
  const cal = calculateCaloriesBurned(10, 70, 30);
  assert.ok(cal >= 360 && cal <= 375, \`Expected ~367 kcal, got \${cal}\`);
});
    `
  },
  {
    slug: 'charity-microloans',
    name: 'MICRO-IMPACT // Global Peer-to-Peer Microfinance Network',
    category: 'SOCIAL IMPACT & FINANCE',
    accentColor: '#059669',
    description: 'Crowdfunded microfinance portal connecting lenders with global entrepreneurs, featuring loan repayment amortization schedules and community impact metrics.',
    mathModule: `
export function calculateMonthlyRepayment(principal, annualRatePercent, months) {
  const r = annualRatePercent / 1200;
  if (r === 0) return Number((principal / months).toFixed(2));
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -months));
  return Number(pmt.toFixed(2));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlyRepayment } from './script.js';

test('Monthly repayment on $1200 loan at 0% for 12 months is $100', () => {
  assert.equal(calculateMonthlyRepayment(1200, 0, 12), 100.0);
});
    `
  },
  {
    slug: 'drone-delivery-skyway',
    name: 'SKYWAY-EXPRESS // Autonomous Urban Drone Dispatch & Air Corridor',
    category: 'AUTONOMOUS DRONES',
    accentColor: '#0284c7',
    description: 'Urban drone air-traffic management terminal with geofenced delivery altitude corridors, battery discharge curves, and automated weather dispatch clearance.',
    mathModule: `
export function checkDispatchClearance(windSpeedKnots, packageWeightKg, maxWind = 25, maxWeight = 5.0) {
  const windOk = windSpeedKnots <= maxWind;
  const weightOk = packageWeightKg <= maxWeight;
  return {
    cleared: windOk && weightOk,
    reasons: [
      ...(windOk ? [] : ['Wind exceeds safe limits']),
      ...(weightOk ? [] : ['Package payload exceeds drone capacity'])
    ]
  };
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDispatchClearance } from './script.js';

test('Dispatch cleared under safe conditions', () => {
  assert.equal(checkDispatchClearance(15, 3.2).cleared, true);
});

test('Dispatch rejected when overweight', () => {
  assert.equal(checkDispatchClearance(15, 6.0).cleared, false);
});
    `
  },
  {
    slug: 'music-daw-studio',
    name: 'BEAT-FORGE // 16-Step Drum Sequencer & Polyphonic Synthesizer',
    category: 'AUDIO PRODUCTION & DAW',
    accentColor: '#d946ef',
    description: 'Browser-based digital audio workstation with 16-step drum pattern matrix, real-time Web Audio API polyphonic oscillators, tempo BPM tap, and audio filters.',
    mathModule: `
export function noteToFrequency(noteNumber) {
  // A4 = 69 = 440 Hz
  return Number((440 * Math.pow(2, (noteNumber - 69) / 12)).toFixed(2));
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { noteToFrequency } from './script.js';

test('MIDI note 69 produces 440 Hz (A4)', () => {
  assert.equal(noteToFrequency(69), 440.0);
});

test('MIDI note 60 produces approx 261.63 Hz (Middle C)', () => {
  assert.equal(noteToFrequency(60), 261.63);
});
    `
  },
  {
    slug: 'pet-adoption-haven',
    name: 'PAWS & HAVEN // Animal Rescue & Foster Matching Network',
    category: 'ANIMAL WELFARE & RESCUE',
    accentColor: '#e11d48',
    description: 'Animal sanctuary adoption hub with interactive pet personality quiz, multi-attribute filter (age, size, energy level), foster application workflows, and bookmarking.',
    mathModule: `
export function matchPetCompatibility(userLifestyle, petProfile) {
  let score = 0;
  if (userLifestyle.hasYard && petProfile.needsYard) score += 30;
  if (!userLifestyle.hasYard && !petProfile.needsYard) score += 30;
  if (userLifestyle.activityLevel === petProfile.energyLevel) score += 40;
  else score += 15;
  if (userLifestyle.hasKids && petProfile.goodWithKids) score += 30;
  return Math.min(100, score);
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchPetCompatibility } from './script.js';

test('Perfect lifestyle match scores 100', () => {
  const user = { hasYard: true, activityLevel: 'high', hasKids: true };
  const pet = { needsYard: true, energyLevel: 'high', goodWithKids: true };
  assert.equal(matchPetCompatibility(user, pet), 100);
});
    `
  },
  {
    slug: 'legal-smart-contracts',
    name: 'LEX-ESCROW // Smart Legal Contract Clause & Escrow Machine',
    category: 'LEGALTECH & CONTRACTS',
    accentColor: '#4f46e5',
    description: 'Modular legal agreement builder with automated clause variable parameterization, multi-party electronic signatures, and milestone-locked escrow disbursement simulator.',
    mathModule: `
export function calculateEscrowRelease(milestones) {
  const total = milestones.length;
  if (total === 0) return { percentComplete: 0, unlockedAmount: 0 };
  const completed = milestones.filter(m => m.approved);
  const unlocked = completed.reduce((sum, m) => sum + m.amount, 0);
  const percent = Math.round((completed.length / total) * 100);
  return { percentComplete: percent, unlockedAmount: unlocked };
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEscrowRelease } from './script.js';

test('Escrow releases proportional funds for completed milestones', () => {
  const milestones = [
    { id: 1, amount: 500, approved: true },
    { id: 2, amount: 500, approved: false }
  ];
  const res = calculateEscrowRelease(milestones);
  assert.equal(res.percentComplete, 50);
  assert.equal(res.unlockedAmount, 500);
});
    `
  },
  {
    slug: 'agritech-precision-farming',
    name: 'TERRA-AGRI // Precision Agriculture & Drone Crop Telemetry',
    category: 'AGRITECH & CLIMATE',
    accentColor: '#15803d',
    description: 'Autonomous crop health monitoring portal computing NDVI vegetation health indices, automated soil moisture sensor alerts, smart irrigation schedules, and yield forecasts.',
    mathModule: `
export function calculateNDVI(nirBand, redBand) {
  // NDVI = (NIR - Red) / (NIR + Red)
  const sum = nirBand + redBand;
  if (sum === 0) return 0;
  return Number(((nirBand - redBand) / sum).toFixed(3));
}

export function evaluateCropVigor(ndvi) {
  if (ndvi > 0.6) return 'EXCELLENT_VIGOR';
  if (ndvi > 0.3) return 'MODERATE_HEALTH';
  if (ndvi > 0.1) return 'STRESSED_NEEDS_WATER';
  return 'BARREN_OR_DAMAGED';
}
    `,
    testCode: `
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNDVI, evaluateCropVigor } from './script.js';

test('Healthy vegetation gives high positive NDVI', () => {
  const ndvi = calculateNDVI(0.8, 0.1);
  assert.ok(ndvi > 0.7);
  assert.equal(evaluateCropVigor(ndvi), 'EXCELLENT_VIGOR');
});
    `
  }
];

for (const p of newProjects) {
  const targetDir = path.join(showcaseDir, p.slug);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Generate styles.css
  const stylesContent = `
:root {
  --bg-color: #090a0f;
  --card-bg: rgba(255, 255, 255, 0.04);
  --card-border: rgba(255, 255, 255, 0.1);
  --accent: ${p.accentColor};
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--bg-color);
  color: var(--text-main);
  font-family: var(--font-sans);
  min-height: 100vh;
  display: flex;
  flex-col: column;
  overflow-x: hidden;
  background-image: 
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.15), transparent),
    radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.03), transparent);
}

.glass-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: rgba(9, 10, 15, 0.75);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--card-border);
}

.brand {
  font-weight: 700;
  letter-spacing: 0.1em;
  font-size: 1rem;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  font-size: 0.75rem;
  font-family: monospace;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--card-border);
  color: var(--accent);
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.hero {
  text-align: center;
  max-width: 750px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1rem;
  background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero p {
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.6;
}

.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 1rem;
  padding: 1.75rem;
  backdrop-filter: blur(8px);
  transition: transform 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card:hover {
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #fff;
}

.card p {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.metric-val {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent);
  font-family: monospace;
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.interactive-panel {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 1rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.9rem;
  color: var(--text-muted);
}

input, select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--card-border);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
}

input:focus, select:focus {
  border-color: var(--accent);
}

.btn {
  background: var(--accent);
  color: #000;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  align-self: flex-start;
}

.btn:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.btn:active {
  transform: scale(0.98);
}

.output-box {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--card-border);
  border-radius: 0.5rem;
  padding: 1rem;
  font-family: monospace;
  color: #a7f3d0;
  white-space: pre-wrap;
  min-height: 60px;
}

footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid var(--card-border);
  color: var(--text-muted);
  font-size: 0.85rem;
}
  `.trim();

  fs.writeFileSync(path.join(targetDir, 'styles.css'), stylesContent, 'utf-8');

  // Generate script.js
  const scriptContent = `
/**
 * ${p.name}
 * Isolated Showcase Module for CAREERFORGE
 */

${p.mathModule}

// Client-side UI Interactions
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const calcBtn = document.getElementById('run-calc-btn');
    const outputEl = document.getElementById('calc-output');
    const inputEl = document.getElementById('main-input');

    if (calcBtn && outputEl) {
      calcBtn.addEventListener('click', () => {
        const val = inputEl ? inputEl.value : '';
        outputEl.textContent = \`[Telemetry Ready] Processed parameter input: "\${val || 'Default Execution'}" at \${new Date().toISOString()}\`;
      });
    }

    // Metric animation ticker
    const metricEl = document.getElementById('live-metric-val');
    if (metricEl) {
      let tick = 0;
      setInterval(() => {
        tick++;
        const base = parseFloat(metricEl.getAttribute('data-base') || '100');
        const jitter = (Math.sin(tick) * 2.5).toFixed(1);
        metricEl.textContent = (base + parseFloat(jitter)).toFixed(1);
      }, 2500);
    }
  });
}
  `.trim();

  fs.writeFileSync(path.join(targetDir, 'script.js'), scriptContent, 'utf-8');

  // Generate index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${p.name} — CAREERFORGE Showcase</title>
  <link rel="stylesheet" href="styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
</head>
<body>
  <header class="glass-nav">
    <div class="brand">
      <span>⚡</span>
      <span>${p.name.split(' // ')[0]}</span>
    </div>
    <div class="badge">${p.category}</div>
  </header>

  <main class="container">
    <section class="hero">
      <div class="badge" style="margin-bottom: 1rem;">STANDALONE ISOLATED TEMPLATE</div>
      <h1>${p.name.split(' // ')[1] || p.name}</h1>
      <p>${p.description}</p>
    </section>

    <section class="grid-cards">
      <div class="card">
        <div>
          <h3>System Status</h3>
          <p>Real-time node telemetry and operational diagnostics.</p>
        </div>
        <div>
          <div class="metric-val" id="live-metric-val" data-base="99.4">99.4</div>
          <div class="metric-label">Operational Reliability (%)</div>
        </div>
      </div>

      <div class="card">
        <div>
          <h3>Core Throughput</h3>
          <p>Processed events across high-frequency execution pipelines.</p>
        </div>
        <div>
          <div class="metric-val">42.8k</div>
          <div class="metric-label">Processed Invocations / Min</div>
        </div>
      </div>

      <div class="card">
        <div>
          <h3>Sub-Module Files</h3>
          <p>Extend this showcase with 1 or more HTML, CSS, and JS files.</p>
        </div>
        <div>
          <div class="metric-val">Ready</div>
          <div class="metric-label">Open-Source Modular Scope</div>
        </div>
      </div>
    </section>

    <section class="interactive-panel">
      <h3>Interactive Command &amp; Telemetry Controller</h3>
      <p style="color: var(--text-muted); font-size: 0.95rem;">
        Trigger real-time state calculations and simulate live operational responses.
      </p>
      <div class="form-group">
        <label for="main-input">Parameter Input / Target Vector:</label>
        <input type="text" id="main-input" placeholder="e.g. ALPHA-492 / Nominal Vector" />
      </div>
      <button class="btn" id="run-calc-btn">Execute Diagnostic Run</button>
      <div class="output-box" id="calc-output">[System Nominal] Ready for user command execution...</div>
    </section>
  </main>

  <footer>
    <p>CAREERFORGE Open-Source Isolated Showcase &copy; 2026. Built for Nexus Spring of Code.</p>
  </footer>

  <script type="module" src="script.js"></script>
</body>
</html>
  `.trim();

  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent, 'utf-8');

  // Generate test file
  fs.writeFileSync(path.join(targetDir, `${p.slug.split('-')[0]}.test.mjs`), p.testCode.trim(), 'utf-8');

  // If extraFile requested, create it to demonstrate multi-file showcase capability!
  if (p.extraFile) {
    const extraHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.extraFileTitle}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body style="padding: 2rem;">
  <div class="container">
    <h1>${p.extraFileTitle}</h1>
    <p style="color: var(--text-muted); margin-top: 1rem;">${p.extraFileContent}</p>
    <div style="margin-top: 2rem;">
      <a href="index.html" class="btn">Return to Primary View</a>
    </div>
  </div>
</body>
</html>`;
    fs.writeFileSync(path.join(targetDir, p.extraFile), extraHtml, 'utf-8');
  }
}

console.log('Successfully generated 20 new standalone showcase templates in public/showcase/!');
