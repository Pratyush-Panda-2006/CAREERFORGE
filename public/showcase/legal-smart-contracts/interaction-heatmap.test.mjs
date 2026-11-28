import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LegalSmartContractsHeatmapTracker, thermalColor } from './interaction-heatmap.js';

// Records the gradients drawn; the image data is one half-covered pixel and one empty one.
function fakeCanvas() {
  const calls = { gradients: [], written: null };
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]);
  const context = {
    clearRect() {},
    fillRect() {},
    createRadialGradient: (x, y) => {
      calls.gradients.push([x, y]);
      return { addColorStop() {} };
    },
    getImageData: () => ({ data: pixels }),
    putImageData: (image) => { calls.written = Array.from(image.data); },
  };
  return { canvas: { width: 200, height: 100, getContext: () => context }, calls };
}

test('maps heat from blue to red and clamps out of range values', () => {
  assert.deepEqual(thermalColor(0), [37, 99, 235]);
  assert.deepEqual(thermalColor(0.6), [250, 204, 21]);
  assert.deepEqual(thermalColor(1), [239, 68, 68]);
  assert.deepEqual(thermalColor(7), thermalColor(1));
  assert.deepEqual(thermalColor(-1), thermalColor(0));
});

test('rejects unusable points and caps the weight', () => {
  const tracker = new LegalSmartContractsHeatmapTracker();
  assert.equal(tracker.recordPoint(Number.NaN, 1), false);
  assert.equal(tracker.recordPoint(1, 1, 0), false);
  assert.equal(tracker.recordPoint(1, 1, 9), true);
  assert.equal(tracker.points[0].weight, 1);
});

test('keeps only the newest points', () => {
  const tracker = new LegalSmartContractsHeatmapTracker({ limit: 2 });
  for (const x of [1, 2, 3]) tracker.recordPoint(x, 0);
  assert.deepEqual(tracker.points.map((p) => p.x), [2, 3]);
});

test('draws visible points relative to the scroll position and colours them', () => {
  const tracker = new LegalSmartContractsHeatmapTracker({ radius: 10 });
  tracker.recordPoint(100, 540);
  tracker.recordPoint(100, 5000);
  const { canvas, calls } = fakeCanvas();

  assert.equal(tracker.renderHeatmap(canvas, { offsetY: 500, scale: 0.5 }), 1);
  assert.deepEqual(calls.gradients, [[50, 20]]);
  assert.deepEqual(calls.written, [239, 68, 68, 255, 0, 0, 0, 0]);
});

test('reset empties the map and nothing is coloured', () => {
  const tracker = new LegalSmartContractsHeatmapTracker();
  tracker.recordPoint(10, 10);
  tracker.resetData();
  const { canvas, calls } = fakeCanvas();

  assert.equal(tracker.renderHeatmap(canvas), 0);
  assert.equal(calls.written, null);
});
