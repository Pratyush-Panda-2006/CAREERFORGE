import assert from "node:assert/strict";
import test from "node:test";
import { EdtechAcademyTourGuide } from "./virtual-tour.js";

const guide = new EdtechAcademyTourGuide();
const viewport = { width: 390, height: 720 };
const tooltip = { width: 300, height: 200 };

test("starts at the first step and clamps navigation in either direction", () => {
  assert.equal(guide.startTour(["paths", "roadmap", "progress"]), "paths");
  assert.equal(guide.prevStep(), "paths");
  assert.equal(guide.nextStep(), "roadmap");
  assert.equal(guide.goToStep(99), "progress");
  assert.equal(guide.nextStep(), "progress");
  assert.equal(guide.startTour([]), undefined);
});

test("puts the tooltip below and prevents left overflow", () => {
  assert.deepEqual(
    guide.calculateTooltipCoords({ left: 8, right: 135, top: 70, bottom: 155 }, tooltip, viewport),
    { left: 12, top: 171, side: "below" },
  );
});

test("flips above a low target and prevents right overflow", () => {
  assert.deepEqual(
    guide.calculateTooltipCoords({ left: 270, right: 385, top: 550, bottom: 680 }, tooltip, viewport),
    { left: 78, top: 334, side: "above" },
  );
});

test("keeps a tall tooltip inside the viewport when neither side fits", () => {
  const coords = guide.calculateTooltipCoords(
    { left: 20, right: 370, top: 270, bottom: 440 }, { width: 300, height: 490 }, viewport,
  );
  assert.equal(coords.top, 218);
  assert.equal(coords.left, 45);
});

test("remembers completion across instances only after finishing", () => {
  const map = new Map();
  const storage = { getItem: (key) => map.get(key), setItem: (key, value) => map.set(key, value) };
  const first = new EdtechAcademyTourGuide(storage);
  first.startTour(["paths"]);
  assert.equal(first.completed, false);
  first.finish();
  assert.equal(new EdtechAcademyTourGuide(storage).completed, true);
});

test("continues when browser storage is blocked", () => {
  const blocked = () => { throw new Error("Storage unavailable"); };
  const instance = new EdtechAcademyTourGuide({ getItem: blocked, setItem: blocked });
  assert.equal(instance.completed, false);
  assert.doesNotThrow(() => instance.finish());
});
