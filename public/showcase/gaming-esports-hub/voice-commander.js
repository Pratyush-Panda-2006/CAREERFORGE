const SHORTCUTS = 'Try champion, final score, semifinal one, or semifinal two.';

export class GamingEsportsHubVoiceCommander {
  constructor(bracket, browser, { onState, onResult }) {
    this.bracket = bracket;
    this.browser = browser;
    this.onState = onState;
    this.onResult = onResult;
    this.active = false;
    this.hasFeedback = false;
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    this.recognition = Recognition ? new Recognition() : null;
    if (!this.recognition) return;

    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onstart = () => this.onState('Listening for a tournament command.', true);
    this.recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      if (result?.isFinal) {
        this.hasFeedback = true;
        this.runCommand(result[0].transcript);
      }
    };
    this.recognition.onerror = ({ error }) => {
      this.active = false;
      this.hasFeedback = true;
      const message = error === 'not-allowed' || error === 'service-not-allowed'
        ? 'Microphone access is unavailable. Type a command below.'
        : 'Speech recognition could not complete. Try the microphone again or type a command.';
      this.onState(message, false);
    };
    this.recognition.onend = () => {
      this.active = false;
      this.onState(this.hasFeedback ? null : 'Microphone off.', false);
    };
  }

  startListening() {
    if (!this.recognition) {
      this.onState('Speech recognition is unavailable. Type a command below.', false);
      return;
    }
    if (this.active) return;
    this.active = true;
    this.hasFeedback = false;
    try {
      this.recognition.start();
      this.onState('Starting microphone…', true);
    } catch {
      this.active = false;
      this.onState('Could not start the microphone. Type a command below.', false);
    }
  }

  stopListening() {
    if (!this.active) return;
    try {
      this.recognition.stop();
    } catch {
      this.active = false;
      this.onState('Could not stop the microphone normally. Type a command below.', false);
    }
  }

  parseVoiceGrammar(transcript) {
    const phrase = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ');
    if (/^(help|commands|show commands)$/.test(phrase)) return 'help';
    if (/^(champion|tournament champion|who won|who won the tournament)$/.test(phrase)) return 'champion';
    if (/^(final score|grand final|grand final score)$/.test(phrase)) return 'gf';
    if (/^semi ?final (1|one|first)( score)?$/.test(phrase)) return 'sf1';
    if (/^semi ?final (2|two|second)( score)?$/.test(phrase)) return 'sf2';
    return null;
  }

  runCommand(transcript) {
    const command = this.parseVoiceGrammar(transcript);
    let reply = command === 'help' ? SHORTCUTS : 'Command not recognized. ' + SHORTCUTS;
    if (command && command !== 'help') {
      const matchId = command === 'champion' ? 'gf' : command;
      const { TEAMS, MATCHES, resolve } = this.bracket;
      const match = resolve(MATCHES, TEAMS).find(({ id }) => id === matchId);
      const winner = TEAMS[match.winner].name;
      if (command === 'champion') {
        reply = `${winner} won the tournament.`;
      } else {
        const [home, away] = match.teams.map((team) => TEAMS[team].name);
        const [homeScore, awayScore] = match.score;
        reply = `${match.label}: ${home} ${homeScore}, ${away} ${awayScore}. ${winner} won.`;
      }
    }
    this.onResult(transcript, reply);
    return reply;
  }

  synthesizeResponse(message) {
    const { speechSynthesis, SpeechSynthesisUtterance } = this.browser;
    if (!speechSynthesis || !SpeechSynthesisUtterance) return;
    speechSynthesis.cancel();
    const response = new SpeechSynthesisUtterance(message);
    response.lang = 'en-US';
    speechSynthesis.speak(response);
  }
}

if (typeof document !== 'undefined') {
  const mic = document.querySelector('#voice-mic');
  const micLabel = document.querySelector('#voice-mic-label');
  const speak = document.querySelector('#voice-replies');
  const form = document.querySelector('#voice-form');
  const input = document.querySelector('#voice-command');
  const status = document.querySelector('#voice-status');
  const history = document.querySelector('#voice-history');
  const commander = new GamingEsportsHubVoiceCommander(window.BracketLogic, window, {
    onState(message, active) {
      if (message !== null) status.textContent = message;
      mic.setAttribute('aria-pressed', String(active));
      micLabel.textContent = active ? 'Stop microphone' : 'Start microphone';
    },
    onResult(transcript, reply) {
      const entry = document.createElement('li');
      const text = document.createElement('strong');
      text.textContent = transcript;
      entry.append(text, document.createTextNode(reply));
      history.prepend(entry);
      if (history.children.length > 10) history.lastElementChild.remove();
      status.textContent = reply;
      if (speak.checked) commander.synthesizeResponse(reply);
    },
  });

  mic.disabled = !commander.recognition;
  if (mic.disabled) status.textContent = 'Speech recognition is unavailable. Type a command below.';
  speak.disabled = !window.speechSynthesis || !window.SpeechSynthesisUtterance;
  mic.addEventListener('click', () => {
    if (commander.active) commander.stopListening();
    else commander.startListening();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const transcript = input.value.trim();
    if (!transcript) return;
    commander.runCommand(transcript);
    input.value = '';
  });
}
