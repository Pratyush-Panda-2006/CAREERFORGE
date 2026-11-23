const SHORTCUTS = [
  [/^(?:next lesson|go next)$/, "next"],
  [/^(?:previous lesson|go back)$/, "previous"],
  [/^(?:read (?:this |current )?lesson|read aloud)$/, "read"],
  [/^(?:show (?:the )?(?:shortcuts|commands)|help)$/, "help"],
];
const ERRORS = {
  "not-allowed": "Microphone permission was denied. You can type a command below.",
  "service-not-allowed": "This browser blocked speech recognition. Try typing a command.",
  "audio-capture": "A microphone is unavailable. You can type a command below.",
  "no-speech": "No speech was detected. Try again or type a command.",
  network: "The recognition service is unavailable. You can type a command below.",
};
const FALLBACK = "Command not recognized. Try “next lesson” or “show shortcuts”.";

export class EdtechAcademyVoiceCommander {
  #session = null;

  constructor({
    Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition,
    synthesis = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    onStatus = () => {},
    onCommand = () => {},
  } = {}) {
    this.Recognition = Recognition;
    this.synthesis = synthesis;
    this.Utterance = Utterance;
    this.onStatus = onStatus;
    this.onCommand = onCommand;
  }

  get listening() {
    return this.#session !== null;
  }

  parseVoiceGrammar(transcript) {
    if (typeof transcript !== "string" || transcript.length > 120) return null;
    const phrase = transcript.trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
    return SHORTCUTS.find(([pattern]) => pattern.test(phrase))?.[1] ?? null;
  }

  submit(transcript) {
    const command = this.parseVoiceGrammar(transcript);
    if (!command) {
      this.onStatus("idle", FALLBACK);
      return false;
    }
    this.onCommand(command);
    return true;
  }

  startListening() {
    if (this.#session) return false;
    if (typeof this.Recognition !== "function") {
      this.onStatus("unavailable", "Speech recognition is unavailable. You can type a command below.");
      return false;
    }

    try {
      const recognizer = new this.Recognition();
      const current = () => this.#session === recognizer;
      recognizer.lang = "en-US";
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.onstart = () => {
        if (current()) this.onStatus("listening", "Listening for one command.");
      };
      recognizer.onresult = (event) => {
        if (!current()) return;
        const result = event.results[event.resultIndex ?? 0];
        if (!result?.isFinal) return;
        this.stopListening();
        this.submit(result[0]?.transcript);
      };
      recognizer.onerror = (event) => {
        if (!current()) return;
        this.#session = null;
        this.onStatus("error", ERRORS[event.error] ?? "Speech recognition stopped. Try typing a command.");
      };
      recognizer.onend = () => {
        if (!current()) return;
        this.#session = null;
        this.onStatus("idle", "Microphone off. Start listening to try again.");
      };

      this.#session = recognizer;
      this.onStatus("starting", "Starting microphone…");
      recognizer.start();
      return this.listening;
    } catch {
      this.#session = null;
      this.onStatus("error", "The microphone could not start. You can type a command below.");
      return false;
    }
  }

  stopListening() {
    if (!this.#session) return;
    const recognizer = this.#session;
    this.#session = null;
    recognizer.abort();
    this.onStatus("idle", "Microphone off.");
  }

  synthesizeResponse(message) {
    if (!this.synthesis || typeof this.Utterance !== "function") return false;
    try {
      const utterance = new this.Utterance(message);
      utterance.lang = "en-US";
      this.synthesis.cancel();
      this.synthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }
}

const LESSONS = [
  {
    title: "Read a model output",
    content: "Compare a model’s answer with the task it received. Identify one claim you can verify and one uncertainty that needs a follow-up.",
  },
  {
    title: "Test an example",
    content: "Pick a small input with an expected answer. Run it once, write down the result, and change one variable at a time to see what changed.",
  },
  {
    title: "Capture the evidence",
    content: "Record the input, expected result, and actual result. Include enough detail for someone else to repeat the test.",
  },
];

function start(root) {
  const mic = root.querySelector("#microphone");
  const status = root.querySelector("#status");
  const audio = root.querySelector("#speak-responses");
  const title = root.querySelector("#lesson-title");
  const lessonBody = root.querySelector("#lesson-body");
  const position = root.querySelector("#lesson-position");
  const shortcuts = root.querySelector("#shortcuts");
  const form = root.querySelector("#command-form");
  const commandInput = root.querySelector("#command");
  const history = root.querySelector("#history");
  const empty = root.querySelector("#empty-history");
  let lesson = 0;

  function showStatus(state, message) {
    const listening = state === "starting" || state === "listening";
    mic.dataset.state = state;
    mic.setAttribute("aria-pressed", String(listening));
    mic.textContent = listening ? "Stop listening" : "Start microphone";
    status.textContent = message;
  }

  function displayLesson() {
    title.textContent = LESSONS[lesson].title;
    lessonBody.textContent = LESSONS[lesson].content;
    position.textContent = "Lesson " + (lesson + 1) + " of " + LESSONS.length;
  }

  const actions = {
    next() {
      if (lesson === LESSONS.length - 1) return "You’re on the last lesson.";
      lesson += 1;
      displayLesson();
      return "Opened " + LESSONS[lesson].title + ".";
    },
    previous() {
      if (lesson === 0) return "You’re on the first lesson.";
      lesson -= 1;
      displayLesson();
      return "Opened " + LESSONS[lesson].title + ".";
    },
    read: () => LESSONS[lesson].content,
    help() {
      shortcuts.open = true;
      return "Try next lesson, previous lesson, read lesson, or show shortcuts.";
    },
  };
  const commander = new EdtechAcademyVoiceCommander({
    onStatus: showStatus,
    onCommand(command) {
      const message = actions[command]();
      empty.hidden = true;
      const item = document.createElement("li");
      item.textContent = message;
      history.prepend(item);
      if (history.children.length > 8) history.lastElementChild.remove();
      showStatus("idle", message);
      if (audio.checked) commander.synthesizeResponse(message);
    },
  });

  if (typeof commander.Recognition !== "function") {
    mic.disabled = true;
    showStatus("unavailable", "Speech recognition is unavailable. You can type a command below.");
  }
  if (!commander.synthesis || typeof commander.Utterance !== "function") audio.disabled = true;

  mic.addEventListener("click", () => {
    if (commander.listening) commander.stopListening();
    else commander.startListening();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    commander.stopListening();
    if (commander.submit(commandInput.value)) commandInput.value = "";
  });
  root.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      commander.stopListening();
      commander.submit(button.dataset.command);
    });
  });
  window.addEventListener("pagehide", () => commander.stopListening());
  displayLesson();
}

if (typeof document !== "undefined") {
  const root = document.querySelector("#voice-commander");
  if (root) start(root);
}
