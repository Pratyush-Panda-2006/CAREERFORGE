import { stepTorqueVectoring } from './torque-vectoring-model.js';

const panel = document.getElementById('torque-vectoring');
if (panel) {
  const controls = {
    speedKph: panel.querySelector('#tv-speed'),
    steeringAngleDeg: panel.querySelector('#tv-steering'),
    corneringRadiusM: panel.querySelector('#tv-radius'),
    torqueDemandPct: panel.querySelector('#tv-demand')
  };
  const state = { lateralVelocity: 0, yawRate: 0 };
  const wheels = {
    frontLeft: 'fl',
    frontRight: 'fr',
    rearLeft: 'rl',
    rearRight: 'rr'
  };
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const readInput = () => Object.fromEntries(Object.entries(controls)
    .map(([key, control]) => [key, Number(control.value)]));
  let frameId = null;
  let lastStamp = null;
  let previousBalance = '';

  function render(deltaSeconds) {
    const { state: nextState, telemetry } = stepTorqueVectoring(state, readInput(), deltaSeconds);
    state.lateralVelocity = nextState.lateralVelocity;
    state.yawRate = nextState.yawRate;

    panel.querySelector('#tv-speed-value').textContent = `${controls.speedKph.value} km/h`;
    panel.querySelector('#tv-steering-value').textContent = `${Number(controls.steeringAngleDeg.value).toFixed(1)}°`;
    panel.querySelector('#tv-radius-value').textContent = `${controls.corneringRadiusM.value} m`;
    panel.querySelector('#tv-demand-value').textContent = `${controls.torqueDemandPct.value}%`;
    panel.querySelector('#tv-lateral-g').textContent = `${telemetry.lateralG.toFixed(2)} g`;
    panel.querySelector('#tv-yaw-rate').textContent = `${(telemetry.yawRate * 180 / Math.PI).toFixed(1)} °/s`;
    panel.querySelector('#tv-front-slip').textContent = `${telemetry.frontSlipDeg.toFixed(2)}°`;
    panel.querySelector('#tv-rear-slip').textContent = `${telemetry.rearSlipDeg.toFixed(2)}°`;
    panel.querySelector('#tv-yaw-correction').textContent = `${Math.round(telemetry.yawMomentNm)} Nm`;
    panel.querySelector('#tv-balance').textContent = telemetry.handlingBalance;

    for (const [wheel, suffix] of Object.entries(wheels)) {
      const torque = telemetry.wheelTorquesNm[wheel];
      const grip = telemetry.tireGrip[wheel];
      const heat = Math.round(125 - Math.min(grip, 1) * 125);
      panel.querySelector(`#tv-torque-${suffix}`).textContent = `${Math.round(torque)} Nm`;
      panel.querySelector(`#tv-grip-${suffix}`).textContent = `${Math.round(grip * 100)}%`;
      panel.querySelector(`#tv-tire-${suffix}`).style.fill = `hsl(${heat} 82% 48%)`;
      panel.querySelector(`#tv-tire-${suffix}`).style.setProperty('--tire-heat', `hsl(${heat} 82% 48%)`);
    }

    const positiveBias = telemetry.torqueBiasNm > 0.5;
    const negativeBias = telemetry.torqueBiasNm < -0.5;
    const leftArrow = panel.querySelector('#tv-arrow-left');
    const rightArrow = panel.querySelector('#tv-arrow-right');
    leftArrow.classList.toggle('tv-active', positiveBias || negativeBias);
    rightArrow.classList.toggle('tv-active', positiveBias || negativeBias);
    leftArrow.classList.toggle('tv-inner', positiveBias);
    rightArrow.classList.toggle('tv-inner', negativeBias);
    panel.querySelector('#tv-left-role').textContent = positiveBias ? 'INNER' : negativeBias ? 'OUTER' : 'LEFT';
    panel.querySelector('#tv-right-role').textContent = positiveBias ? 'OUTER' : negativeBias ? 'INNER' : 'RIGHT';

    if (telemetry.handlingBalance !== previousBalance) {
      panel.querySelector('#tv-status').textContent = `${telemetry.handlingBalance} · ACTIVE YAW CONTROL`;
      previousBalance = telemetry.handlingBalance;
    }
  }

  function frame(now) {
    if (document.hidden || motion.matches) {
      frameId = null;
      lastStamp = null;
      return;
    }
    const deltaSeconds = lastStamp === null ? 0 : (now - lastStamp) / 1000;
    lastStamp = now;
    render(deltaSeconds);
    frameId = requestAnimationFrame(frame);
  }

  function startAnimation() {
    if (!motion.matches && !document.hidden && frameId === null) {
      frameId = requestAnimationFrame(frame);
    }
  }

  Object.values(controls).forEach(control => {
    control.addEventListener('input', () => render(motion.matches ? 1 / 30 : 0));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
      lastStamp = null;
    } else startAnimation();
  });
  motion.addEventListener('change', () => {
    if (motion.matches && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
      lastStamp = null;
    } else startAnimation();
  });

  render(0);
  startAnimation();
}
