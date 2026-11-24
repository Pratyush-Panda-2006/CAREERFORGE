const COMPLETION_KEY = "edtech-academy-tour-completed";
const GAP = 16;
const MARGIN = 12;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export class EdtechAcademyTourGuide {
  constructor(storage) {
    this.storage = storage;
    this.steps = [];
    this.index = 0;
  }

  get currentStep() {
    return this.steps[this.index];
  }

  startTour(steps) {
    this.steps = [...steps];
    return this.goToStep(0);
  }

  goToStep(index) {
    this.index = clamp(index, 0, this.steps.length - 1);
    return this.currentStep;
  }

  nextStep() {
    return this.goToStep(this.index + 1);
  }

  prevStep() {
    return this.goToStep(this.index - 1);
  }

  calculateTooltipCoords(target, tooltip, viewport) {
    const below = viewport.height - target.bottom - GAP - MARGIN;
    const above = target.top - GAP - MARGIN;
    const side = below >= tooltip.height || below >= above ? "below" : "above";
    const idealTop = side === "below" ? target.bottom + GAP : target.top - GAP - tooltip.height;
    return {
      left: clamp((target.left + target.right - tooltip.width) / 2, MARGIN, viewport.width - tooltip.width - MARGIN),
      top: clamp(idealTop, MARGIN, viewport.height - tooltip.height - MARGIN),
      side,
    };
  }

  get completed() {
    try {
      return this.storage?.getItem(COMPLETION_KEY) === "yes";
    } catch {
      return false;
    }
  }

  finish() {
    try {
      this.storage?.setItem(COMPLETION_KEY, "yes");
    } catch {
      // The tour still finishes if this browser cannot store its completion.
    }
  }
}

function mountTour(doc, win) {
  const get = (id) => doc.getElementById(id);
  const start = get("start-tour");
  const dialog = get("tour");
  const spotlight = get("spotlight");
  const title = get("tour-title");
  const message = get("tour-description");
  const stepLabel = get("tour-step");
  const dots = get("tour-dots");
  const previous = get("previous-step");
  const next = get("next-step");
  const status = get("tour-status");

  let storage;
  try { storage = win.localStorage; } catch { /* Storage is optional. */ }
  const guide = new EdtechAcademyTourGuide(storage);
  const steps = [
    { target: get("learning-paths"), title: "Pick a learning path", description: "Compare course levels and time commitments before you choose." },
    { target: get("syllabus-roadmap"), title: "See what comes next", description: "The syllabus shows how course foundations lead to practice and a capstone." },
    { target: get("course-progress"), title: "Check your progress", description: "The progress meter shows how much of a course you have completed." },
  ];
  const dotButtons = steps.map((step, index) => {
    const dot = doc.createElement("button");
    dot.type = "button";
    dot.textContent = String(index + 1);
    dot.setAttribute("aria-label", `Step ${index + 1} of ${steps.length} · ${step.title}`);
    dot.addEventListener("click", () => {
      guide.goToStep(index);
      renderStep();
    });
    dots.append(dot);
    return dot;
  });

  function position() {
    if (!dialog.open) return;
    const rect = guide.currentStep.target.getBoundingClientRect();
    const viewport = { width: doc.documentElement.clientWidth, height: win.innerHeight };
    const coords = guide.calculateTooltipCoords(rect, dialog.getBoundingClientRect(), viewport);
    Object.assign(dialog.style, { left: `${coords.left}px`, top: `${coords.top}px` });
    dialog.dataset.side = coords.side;
    Object.assign(spotlight.style, {
      left: `${rect.left - 4}px`, top: `${rect.top - 4}px`,
      width: `${rect.width + 8}px`, height: `${rect.height + 8}px`,
    });
  }

  function renderStep() {
    const step = guide.currentStep;
    title.textContent = step.title;
    message.textContent = step.description;
    stepLabel.textContent = `Step ${guide.index + 1} of ${steps.length}`;
    previous.disabled = guide.index === 0;
    next.textContent = guide.index === steps.length - 1 ? "Finish tour" : "Next";
    dotButtons.forEach((dot, index) => {
      if (index === guide.index) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });
    step.target.scrollIntoView({ block: "nearest", behavior: "instant" });
    position();
    title.focus({ preventScroll: true });
  }

  start.textContent = guide.completed ? "Replay guided tour" : "Start guided tour";
  start.addEventListener("click", () => {
    status.textContent = "";
    guide.startTour(steps);
    dialog.showModal();
    spotlight.hidden = false;
    renderStep();
  });
  previous.addEventListener("click", () => {
    guide.prevStep();
    renderStep();
  });
  next.addEventListener("click", () => {
    if (guide.index === steps.length - 1) {
      guide.finish();
      dialog.close("finished");
    } else {
      guide.nextStep();
      renderStep();
    }
  });
  get("skip-tour").addEventListener("click", () => dialog.close("skipped"));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close("skipped");
  });
  dialog.addEventListener("close", () => {
    spotlight.hidden = true;
    status.textContent = dialog.returnValue === "finished" ? "Tour complete." : "Tour closed.";
    if (guide.completed) start.textContent = "Replay guided tour";
    start.focus();
  });
  win.addEventListener("resize", position);
  win.addEventListener("scroll", position, { passive: true });
}

if (typeof document !== "undefined") mountTour(document, window);
