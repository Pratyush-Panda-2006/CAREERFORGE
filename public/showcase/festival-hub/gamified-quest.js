const KEY = "pulse-wave:festival-passport:v1";

export const QUESTS = [
  { id: "sets", title: "Explore the lineup", xp: 25, items: ["Review a main-stage set", "Review a synth set", "Review a closing set"] },
  { id: "workshops", title: "Plan a workshop", xp: 35, items: ["Pick a sound-design session", "Pick a visual-synth session"] },
  { id: "arrival", title: "Prepare for arrival", xp: 30, items: ["Check the festival map", "Plan a meeting spot", "Review accessibility information"] },
];
export const BADGES = [
  { name: "Bronze", threshold: 40, color: "#eba87b" },
  { name: "Silver", threshold: 100, color: "#c9d8ff" },
  { name: "Gold", threshold: 170, color: "#f8d688" },
  { name: "Platinum", threshold: 230, color: "#97eadc" },
];

export class FestivalHubQuestEngine extends EventTarget {
  constructor(storage) {
    super();
    this.storage = storage;
    this.progress = this.loadProgress();
  }

  loadProgress() {
    let saved;
    try { saved = JSON.parse(this.storage?.getItem(KEY) ?? "{}"); } catch { saved = null; }
    return Object.fromEntries(QUESTS.map(({ id, items }) => {
      const raw = saved?.[id];
      return [id, Number.isSafeInteger(raw) ? Math.max(0, Math.min(raw, items.length)) : 0];
    }));
  }

  get xp() {
    return QUESTS.reduce((total, quest) => total + this.progress[quest.id] * quest.xp, 0);
  }

  calculateUserLevel(xp = this.xp) {
    return 1 + Math.floor(Math.sqrt(Math.max(Number.isFinite(xp) ? xp : 0, 0) / 40));
  }

  checkUnlocks() {
    return BADGES.filter(({ threshold }) => this.xp >= threshold);
  }

  recordProgress(questId, amount = 1) {
    const quest = QUESTS.find(({ id }) => id === questId);
    if (!quest || !Number.isSafeInteger(amount) || amount <= 0) return false;
    const previous = this.progress[questId];
    const next = Math.min(quest.items.length, previous + amount);
    if (next === previous) return false;

    const before = this.xp;
    this.progress[questId] = next;
    try { this.storage?.setItem(KEY, JSON.stringify(this.progress)); } catch { /* Continue in memory. */ }

    const unlocked = this.checkUnlocks().filter(({ threshold }) => threshold > before);
    if (unlocked.length) this.dispatchEvent(new CustomEvent("badgeunlock", { detail: unlocked }));
    return true;
  }
}

function mount(doc, win) {
  const byId = (id) => doc.getElementById(id);
  let storage;
  try { storage = win.localStorage; } catch { /* Storage is optional. */ }
  const engine = new FestivalHubQuestEngine(storage);
  const dialog = byId("celebration");
  let restoreFocus = null;

  const controls = QUESTS.map((quest) => {
    const card = doc.createElement("section");
    card.className = "quest";
    const title = doc.createElement("h3");
    title.textContent = quest.title;
    const list = doc.createElement("ul");
    const count = doc.createElement("p");
    card.append(title, list, count);
    byId("quests").append(card);

    const inputs = quest.items.map((name) => {
      const li = doc.createElement("li");
      const label = doc.createElement("label");
      label.className = "objective";
      const input = doc.createElement("input");
      input.type = "checkbox";
      label.append(input, name);
      li.append(label);
      list.append(li);
      input.addEventListener("change", () => {
        if (!input.checked) return;
        restoreFocus = input;
        engine.recordProgress(quest.id);
        render();
        if (!dialog.open) {
          byId("status").textContent = `${name} complete · +${quest.xp} XP`;
          focusNext();
        }
      });
      return input;
    });
    return { quest, inputs, count };
  });

  const cards = BADGES.map((badge) => {
    const card = doc.createElement("li");
    card.className = "badge";
    card.style.setProperty("--tier-color", badge.color);
    const label = doc.createElement("h3");
    label.textContent = badge.name;
    const state = doc.createElement("p");
    state.className = "badge-meta";
    card.append(label, state);
    byId("badges").append(card);
    return { badge, card, state };
  });

  function focusNext() {
    const allInputs = controls.flatMap(({ inputs }) => inputs);
    const position = allInputs.indexOf(restoreFocus);
    const after = allInputs.slice(position + 1).find((input) => !input.disabled);
    const next = after ?? allInputs.find((input) => !input.disabled);
    if (next) next.focus();
    else {
      byId("progress-title").tabIndex = -1;
      byId("progress-title").focus();
    }
    restoreFocus = null;
  }

  function render() {
    const level = engine.calculateUserLevel();
    const previousThreshold = 40 * (level - 1) ** 2;
    const nextThreshold = 40 * level ** 2;
    const meter = byId("xp-meter");
    byId("xp-summary").textContent = `Level ${level} · ${engine.xp} XP`;
    meter.max = nextThreshold - previousThreshold;
    meter.value = engine.xp - previousThreshold;
    byId("next-level").textContent = `${nextThreshold - engine.xp} XP to Level ${level + 1}`;

    controls.forEach(({ quest, inputs, count }) => {
      const completed = engine.progress[quest.id];
      inputs.forEach((input, index) => {
        input.checked = index < completed;
        input.disabled = index !== completed;
        input.parentElement.classList.toggle("is-complete", input.checked);
      });
      count.textContent = `${completed}/${inputs.length} complete · +${quest.xp} XP per objective`;
    });
    cards.forEach(({ badge, card, state }) => {
      const unlocked = engine.xp >= badge.threshold;
      card.dataset.unlocked = String(unlocked);
      const percent = Math.floor(100 * engine.xp / badge.threshold);
      state.textContent = unlocked ? "Unlocked" : `${percent}% · ${badge.threshold - engine.xp} XP to unlock`;
    });
  }

  engine.addEventListener("badgeunlock", ({ detail }) => {
    const names = detail.map(({ name }) => name).join(", ");
    byId("award-description").textContent = `You earned ${names}.`;
    dialog.showModal();
  });
  dialog.addEventListener("close", focusNext);
  render();
}

if (typeof document !== "undefined") mount(document, window);
