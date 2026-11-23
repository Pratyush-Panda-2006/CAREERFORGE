import { forwardKinematics } from './script.js';

export const RECEIPT_WIDTH = 760;
export const RECEIPT_HEIGHT = 480;
const ARM_LENGTHS = [100, 75];
const PLOT = { left: 409, top: 154, width: 300, height: 233, centerX: 559, centerY: 270, scale: 0.56 };
const normalizeAngle = angle => Number.isFinite(angle) ? Math.max(-180, Math.min(180, Math.round(angle))) : 0;
const radians = degrees => degrees * Math.PI / 180;

export function poseReceipt(title, shoulder, elbow) {
  const a = normalizeAngle(shoulder);
  const b = normalizeAngle(elbow);
  const [upper, lower] = ARM_LENGTHS;
  const joint = forwardKinematics(upper, 0, radians(a), 0);
  const endpoint = forwardKinematics(upper, lower, radians(a), radians(b));
  const code = [a, b].map(angle => (angle + 180).toString(16).padStart(3, '0')).join('').toUpperCase();
  return { title: String(title ?? '').trim().slice(0, 48) || 'Arm pose record', a, b, joint, endpoint, code };
}

export function poseDiagramPoints({ joint, endpoint }) {
  const map = ({ x, y }) => ({ x: PLOT.centerX + x * PLOT.scale, y: PLOT.centerY - y * PLOT.scale });
  return [map({ x: 0, y: 0 }), map(joint), map(endpoint)];
}

export function barcodeBits(code) {
  if (!/^[0-9A-F]{6}$/.test(code)) throw new RangeError('Use a six-digit hexadecimal pose code.');
  const digits = [...code].map(digit => {
    const nibble = Number.parseInt(digit, 16).toString(2).padStart(4, '0');
    const ones = [...nibble].filter(bit => bit === '1').length;
    return nibble + (ones % 2);
  });
  return '1011' + digits.join('') + '1101';
}

export class RoboticsAutomataReceiptGenerator {
  constructor(canvas) {
    this.canvas = canvas;
  }

  drawBarcode(ctx, code, x, y) {
    const bits = barcodeBits(code);
    const unit = 3;
    ctx.fillStyle = '#123043';
    for (let i = 0; i < bits.length; i += 1) {
      if (bits[i] === '1') ctx.fillRect(x + i * unit, y, unit, 30);
    }
    return bits.length * unit;
  }

  renderCanvas(ctx, data) {
    ctx.setTransform(this.canvas.width / RECEIPT_WIDTH, 0, 0, this.canvas.height / RECEIPT_HEIGHT, 0, 0);
    ctx.fillStyle = '#fdfdfb';
    ctx.fillRect(0, 0, RECEIPT_WIDTH, RECEIPT_HEIGHT);
    ctx.fillStyle = '#123043';
    ctx.fillRect(0, 0, RECEIPT_WIDTH, 66);
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillStyle = '#eaf7fb';
    ctx.fillText('ROBOTICS AUTOMATA', 40, 41);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('SIMULATION RECORD', 548, 41);

    ctx.fillStyle = '#142b3c';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText(data.title, 40, 122, 667);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Shoulder angle  ' + data.a + '°', 40, 186);
    ctx.fillText('Elbow angle  ' + data.b + '°', 40, 226);
    ctx.fillText('End position', 40, 281);
    ctx.font = 'bold 23px system-ui, sans-serif';
    ctx.fillText('(' + data.endpoint.x + ', ' + data.endpoint.y + ')', 40, 315);

    ctx.fillStyle = '#eaf2f4';
    ctx.fillRect(PLOT.left, PLOT.top, PLOT.width, PLOT.height);
    ctx.strokeStyle = '#d0dfe1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PLOT.left + 10, PLOT.centerY);
    ctx.lineTo(PLOT.left + PLOT.width - 10, PLOT.centerY);
    ctx.moveTo(PLOT.centerX, PLOT.top + 10);
    ctx.lineTo(PLOT.centerX, PLOT.top + PLOT.height - 10);
    ctx.stroke();

    const [base, joint, tip] = poseDiagramPoints(data);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#16677b';
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(joint.x, joint.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    for (const point of [base, joint, tip]) {
      ctx.fillStyle = point === tip ? '#0c7256' : '#123043';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    this.drawBarcode(ctx, data.code, 40, 370);
    ctx.fillStyle = '#345766';
    ctx.font = '14px ui-monospace, monospace';
    ctx.fillText('POSE ' + data.code, 40, 423);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Two-link arm simulation', 478, 422);
  }

  pngDataUrl() {
    const url = this.canvas.toDataURL('image/png');
    if (!url.startsWith('data:image/png;base64,')) throw new Error('PNG encoding is unavailable.');
    return url;
  }

  async downloadBlob(filename) {
    const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
    const url = blob ? URL.createObjectURL(blob) : this.pngDataUrl();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    if (blob) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

if (typeof document !== 'undefined') {
  const element = id => document.getElementById(id);
  const canvas = element('receipt');
  const context = canvas.getContext('2d');
  const frame = element('frame');
  const title = element('receipt-title');
  const shoulder = element('shoulder');
  const elbow = element('elbow');
  const button = element('download');
  const status = element('download-status');
  const generator = new RoboticsAutomataReceiptGenerator(canvas);
  let pose;

  function updatePose() {
    pose = poseReceipt(title.value, shoulder.valueAsNumber, elbow.valueAsNumber);
    element('shoulder-value').value = pose.a + '°';
    element('elbow-value').value = pose.b + '°';
    element('endpoint').textContent = '(' + pose.endpoint.x + ', ' + pose.endpoint.y + ')';
    element('pose-code').textContent = pose.code;
    canvas.setAttribute('aria-label', pose.title + ', simulation pose ' + pose.code);
    if (context) generator.renderCanvas(context, pose);
  }

  for (const control of [title, shoulder, elbow]) control.addEventListener('input', updatePose);
  element('zoom').addEventListener('change', ({ target }) => {
    frame.classList.toggle('actual', target.checked);
    frame.tabIndex = target.checked ? 0 : -1;
  });

  button.disabled = !context;
  if (!context) status.textContent = 'Canvas preview and download are unavailable in this browser.';
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Preparing receipt…';
    try {
      await generator.downloadBlob('robotics-pose-' + pose.code.toLowerCase() + '.png');
      status.textContent = 'PNG receipt download started.';
    } catch {
      status.textContent = 'The receipt could not be encoded. Try downloading again.';
    } finally {
      button.disabled = false;
    }
  });
  updatePose();
}
