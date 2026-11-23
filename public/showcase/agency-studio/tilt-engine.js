/**
 * Agency Studio - 3D Tilt Perspective Card Engine with Gyroscope & Mouse Inertia
 */

export class AgencyStudioTiltEngine {
  constructor(options = {}) {
    this.maxTilt = options.maxTilt || 20;
    this.perspective = options.perspective || 1000;
  }

  computeTilt(mouseX, mouseY, rect) {
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { rotateX: 0, rotateY: 0 };
    }
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;

    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    const rotateX = Number((-normY * this.maxTilt).toFixed(2));
    const rotateY = Number((normX * this.maxTilt).toFixed(2));

    return { rotateX, rotateY };
  }

  applyInertia(current, target, factor = 0.15) {
    return Number((current + (target - current) * factor).toFixed(2));
  }

  getTransform(rotateX, rotateY) {
    return `perspective(${this.perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }
}
