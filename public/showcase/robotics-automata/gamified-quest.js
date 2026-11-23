import { forwardKinematics } from "./script.js";

const ARM = [2, 1.5];
const XP_PER_POSE = 100;
const STORAGE_PREFIX = "automata:robot-arm-quest:v1:";

export const POSES = [
  { id: "home", name: "Home alignment", jointAngles: [0, 0] },
  { id: "lift", name: "Vertical lift", jointAngles: [90, 0] },
  { id: "bend", name: "Elbow transfer", jointAngles: [90, -90] },
  { id: "fold", name: "Compact fold", jointAngles: [0, 180] },
];

const BADGES = [
  { name: "Bronze", xp: 100 },
  { name: "Silver", xp: 200 },
  { name: "Gold", xp: 300 },
  { name: "Platinum", xp: 400 },
];

const toRadians = (angle) => angle * Math.PI / 180;

export function armPosition(base, elbow) {
  return forwardKinematics(...ARM, toRadians(base), toRadians(elbow));
}

export function matchesPose(id, base, elbow) {
  const target = POSES.find((pose) => pose.id === id);
  if (!target || !Number.isFinite(base) || !Number.isFinite(elbow)) return false;
  const actual = armPosition(base, elbow);
  const expected = armPosition(...target.jointAngles);
  return Math.hypot(actual.x - expected.x, actual.y - expected.y) <= 0.025;
}

export class RoboticsAutomataQuestEngine extends EventTarget {
  #completed;
  #awarded;

  constructor(completed = []) {
    super();
    this.#completed = new Set(POSES.filter((pose) => completed.includes(pose.id)).map((pose) => pose.id));
    this.#awarded = new Set(BADGES.filter((badge) => this.xp >= badge.xp));
  }

  get completed() {
    return [...this.#completed];
  }

  get xp() {
    return this.#completed.size * XP_PER_POSE;
  }

  calculateUserLevel(xp = this.xp) {
    return Number.isFinite(xp) && xp > 0 ? 1 + Math.floor(xp / XP_PER_POSE) : 1;
  }

  recordProgress(questId, amount = 1) {
    if (!Number.isSafeInteger(amount) || amount < 1 || !POSES.some((pose) => pose.id === questId)) {
      return false;
    }
    if (this.#completed.has(questId)) return false;
    this.#completed.add(questId);
    this.checkUnlocks();
    return true;
  }

  checkUnlocks() {
    for (const badge of BADGES) {
      if (this.xp < badge.xp || this.#awarded.has(badge)) continue;
      this.#awarded.add(badge);
      this.dispatchEvent(new CustomEvent("badge-unlocked", { detail: badge }));
    }
  }
}

export function loadCompleted(storage) {
  try {
    return POSES.filter((pose) => storage.getItem(STORAGE_PREFIX + pose.id) === "done")
      .map((pose) => pose.id);
  } catch {
    return [];
  }
}

export function saveCompletion(storage, id) {
  if (!POSES.some((pose) => pose.id === id)) return false;
  try {
    // Each pose has its own key so separate tabs cannot overwrite one another's progress.
    storage.setItem(STORAGE_PREFIX + id, "done");
    return true;
  } catch {
    return false;
  }
}

function drawArm(canvas, base, elbow, target) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const scale = 40;
  const centerX = width / 2;
  const centerY = height / 2;
  const x = (coordinate) => centerX + coordinate * scale;
  const y = (coordinate) => centerY - coordinate * scale;
  const pivot = { x: ARM[0] * Math.cos(toRadians(base)), y: ARM[0] * Math.sin(toRadians(base)) };
  const tip = armPosition(base, elbow);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#28303d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let step = -6; step <= 6; step += 1) {
    ctx.moveTo(x(step), 0);
    ctx.lineTo(x(step), height);
    ctx.moveTo(0, y(step));
    ctx.lineTo(width, y(step));
  }
  ctx.stroke();

  ctx.strokeStyle = "#ffc78e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x(target.x), y(target.y), 11, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "#ff7878";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(x(pivot.x), y(pivot.y));
  ctx.lineTo(x(tip.x), y(tip.y));
  ctx.stroke();

  ctx.fillStyle = "#fce8e8";
  for (const point of [{ x: 0, y: 0 }, pivot, tip]) {
    ctx.beginPath();
    ctx.arc(x(point.x), y(point.y), 4.5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function mountQuest(document) {
  const byId = (id) => document.getElementById(id);
  const view = document.defaultView;
  let storage;
  try { storage = view.localStorage; } catch { /* The quest still works for this visit. */ }
  const engine = new RoboticsAutomataQuestEngine(loadCompleted(storage));
  const first = byId("joint-one");
  const second = byId("joint-two");
  const feedback = byId("pose-feedback");
  const dialog = byId("badge-dialog");
  let selected = POSES.find((pose) => !engine.completed.includes(pose.id)) || POSES[0];

  const pointText = ({ x, y }) => "(" + x.toFixed(2) + ", " + y.toFixed(2) + ")";

  function renderPose() {
    const base = first.valueAsNumber;
    const elbow = second.valueAsNumber;
    const target = armPosition(...selected.jointAngles);
    const tip = armPosition(base, elbow);
    byId("joint-one-value").value = base + "°";
    byId("joint-two-value").value = elbow + "°";
    byId("pose-output").textContent = "Arm tip " + pointText(tip);
    byId("target-guide").textContent = selected.name + " · target " + pointText(target)
      + " · joints " + selected.jointAngles[0] + "° and " + selected.jointAngles[1] + "°";
    drawArm(byId("arm-plot"), base, elbow, target);
  }

  const questButtons = new Map();
  for (const pose of POSES) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const state = document.createElement("span");
    button.type = "button";
    button.textContent = pose.name;
    state.className = "pose-state";
    button.append(state);
    button.addEventListener("click", () => {
      selected = pose;
      feedback.textContent = "";
      renderProgress();
      renderPose();
    });
    item.append(button);
    byId("quest-list").append(item);
    questButtons.set(pose.id, { button, state });
  }

  const badgeItems = BADGES.map((badge) => {
    const item = document.createElement("li");
    item.dataset.tier = badge.name.toLowerCase();
    const name = document.createElement("strong");
    const description = document.createElement("span");
    name.textContent = badge.name;
    item.append(name, description);
    byId("badge-list").append(item);
    return { badge, item, description };
  });

  function renderProgress() {
    byId("xp-meter").value = engine.xp;
    const maxXp = BADGES.at(-1).xp;
    const percentage = Math.round(engine.xp * 100 / maxXp);
    byId("xp-value").textContent = engine.xp + " / " + maxXp + " XP · " + percentage + "%";
    byId("level-value").textContent = "Level " + engine.calculateUserLevel();
    const completed = engine.completed;
    for (const [id, { button, state }] of questButtons) {
      button.setAttribute("aria-pressed", String(selected.id === id));
      state.textContent = completed.includes(id) ? "Complete" : "To do";
    }
    for (const { badge, item, description } of badgeItems) {
      const earned = engine.xp >= badge.xp;
      item.dataset.earned = String(earned);
      description.textContent = earned ? "Unlocked" : badge.xp + " XP";
    }
  }

  function updateInput() {
    feedback.textContent = "";
    renderPose();
  }
  first.addEventListener("input", updateInput);
  second.addEventListener("input", updateInput);

  engine.addEventListener("badge-unlocked", ({ detail }) => {
    byId("badge-title").textContent = detail.name + " badge unlocked";
    byId("badge-detail").textContent = selected.name + " complete. You have " + engine.xp + " XP.";
    dialog.dataset.tier = detail.name.toLowerCase();
    dialog.showModal();
  });

  byId("pose-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!matchesPose(selected.id, first.valueAsNumber, second.valueAsNumber)) {
      feedback.textContent = "The arm hasn’t reached this target. Adjust the joints and try again.";
      return;
    }
    if (!engine.recordProgress(selected.id)) {
      feedback.textContent = "Pose matched. You’ve already earned XP for this objective.";
      return;
    }
    feedback.textContent = "Pose matched. " + XP_PER_POSE + " XP earned.";
    byId("storage-feedback").textContent = saveCompletion(storage, selected.id)
      ? "" : "Progress could not be saved. It will reset when this page reloads.";
    renderProgress();
  });

  renderProgress();
  renderPose();
}

if (typeof document !== "undefined" && document.getElementById("pose-form")) {
  mountQuest(document);
}
