/**
 * Health Vitality - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Clinical biometric voice control, intent recognition, audio feedback, and accessibility dispatcher.
 * Part of Health & Vitality Clinical Telehealth Infrastructure (NSoC 2026).
 */

export class HealthVitalityVoiceCommander {
  /**
   * @param {Object} [options={}] Configuration options
   * @param {boolean} [options.audioFeedback=true] Enable or disable synthesized speech output
   * @param {string} [options.voiceLang='en-US'] BCP 47 language code for speech recognition & synthesis
   * @param {string} [options.initialPage='vitals'] Initial dashboard page
   * @param {boolean} [options.highContrast=false] Initial accessibility high-contrast state
   * @param {Object} [options.vitals={}] Initial patient vitals
   * @param {Array} [options.workouts=[]] Initial workout records
   * @param {Object} [options.hydrationGoal={ amount: 2.5, unit: 'liters' }] Initial hydration goal
   */
  constructor(options = {}) {
    this.audioFeedback = options.audioFeedback !== false;
    this.voiceLang = options.voiceLang || 'en-US';
    this.currentPage = options.initialPage || 'vitals';
    this.highContrast = Boolean(options.highContrast);
    this.listening = false;

    // Clinical Vitals State
    this.vitals = {
      heartRate: null,
      bloodPressure: null,
      bloodGlucose: null,
      weight: null,
      ...(options.vitals || {})
    };

    // Activity & Hydration State
    this.workouts = Array.isArray(options.workouts) ? [...options.workouts] : [];
    this.activeWorkout = null;
    this.hydrationGoal = {
      amount: 2.5,
      unit: 'liters',
      ...(options.hydrationGoal || {})
    };

    // Command History & Audit Log
    this.history = [];

    // Audio Feedback & Dispatch State
    this.lastSpoken = null;
    this.spokenQueue = [];

    // Event Emitter Listeners
    this.listeners = new Map();

    // Web Speech API references (browser environment)
    this.recognition = null;
    this.synthesis = null;

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.voiceLang;

        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              this.emit('transcript_final', { transcript: finalTranscript.trim(), confidence });
              this.processTranscript(finalTranscript.trim());
            } else {
              interimTranscript += transcript;
              this.emit('transcript_interim', { transcript: interimTranscript.trim(), confidence });
            }
          }
        };

        this.recognition.onerror = (event) => {
          this.emit('error', { type: 'recognition_error', error: event.error, event });
        };

        this.recognition.onend = () => {
          if (this.listening) {
            try {
              this.recognition.start();
            } catch {
              this.listening = false;
              this.emit('listening', { listening: false });
            }
          } else {
            this.emit('listening', { listening: false });
          }
        };
      }

      if (window.speechSynthesis) {
        this.synthesis = window.speechSynthesis;
      }

      if (this.highContrast && typeof document !== 'undefined') {
        document.documentElement.classList.add('high-contrast');
      }
    }
  }

  // ==========================================
  // EVENT EMITTER IMPLEMENTATION
  // ==========================================

  /**
   * Register an event listener.
   * @param {string} event Event name
   * @param {Function} handler Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Event handler must be a function');
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Remove an event listener.
   * @param {string} event Event name
   * @param {Function} handler Callback function
   * @returns {boolean} Whether handler was removed
   */
  off(event, handler) {
    if (!this.listeners.has(event)) return false;
    return this.listeners.get(event).delete(handler);
  }

  /**
   * Dispatch an event to all registered listeners.
   * @param {string} event Event name
   * @param {*} data Payload
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    const handlers = Array.from(this.listeners.get(event));
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        // Listener errors are caught so other handlers still execute safely
      }
    }
  }

  // ==========================================
  // AUDIO FEEDBACK & SPEECH SYNTHESIS
  // ==========================================

  /**
   * Synthesize audio feedback via SpeechSynthesisUtterance with headless fallback.
   * @param {string} message Text message to articulate
   * @param {Object} [options={}] Synthesis options
   * @returns {string} The spoken message
   */
  speak(message, options = {}) {
    if (!message || typeof message !== 'string') return '';

    this.lastSpoken = message;
    this.spokenQueue.push({ message, timestamp: Date.now() });
    this.emit('speak', { message, options });

    if (!this.audioFeedback) {
      return message;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        window.speechSynthesis.cancel(); // Cancel any lingering speech
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = options.lang || this.voiceLang;
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume !== undefined ? options.volume : 1.0;

        utterance.onend = () => {
          this.emit('speak_end', { message });
        };
        utterance.onerror = (err) => {
          this.emit('speak_error', { message, error: err });
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        this.emit('speak_error', { message, error: err });
      }
    }

    return message;
  }

  // ==========================================
  // MICROPHONE & RECOGNITION CONTROLS
  // ==========================================

  /**
   * Start listening for speech inputs.
   * @returns {boolean} Whether listening started
   */
  startListening() {
    this.listening = true;
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Recognition may already be running
      }
    }
    this.emit('listening', { listening: true });
    return this.listening;
  }

  /**
   * Stop listening for speech inputs.
   * @returns {boolean} Whether listening stopped
   */
  stopListening() {
    this.listening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Recognition may already be stopped
      }
    }
    this.emit('listening', { listening: false });
    return this.listening;
  }

  /**
   * Toggle listening state.
   * @returns {boolean} Current listening state
   */
  toggleListening() {
    if (this.listening) {
      return this.stopListening();
    }
    return this.startListening();
  }

  // ==========================================
  // ACCESSIBILITY STATE TOGGLING
  // ==========================================

  /**
   * Toggle high contrast accessibility mode.
   * @param {boolean} [forcedValue] Explicit state override
   * @returns {boolean} Current high contrast state
   */
  toggleHighContrast(forcedValue) {
    if (typeof forcedValue === 'boolean') {
      this.highContrast = forcedValue;
    } else {
      this.highContrast = !this.highContrast;
    }

    if (typeof document !== 'undefined') {
      if (this.highContrast) {
        document.documentElement.classList.add('high-contrast');
        document.body?.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
        document.body?.classList.remove('high-contrast');
      }
    }

    this.emit('contrast', { highContrast: this.highContrast });
    return this.highContrast;
  }

  // ==========================================
  // VOICE GRAMMAR REGISTRY & INTENT PARSER
  // ==========================================

  /**
   * Parse a speech transcript into an intent, action, and extracted parameters.
   * @param {string} transcript Speech input string
   * @returns {Object} Parse result
   */
  parseTranscript(transcript) {
    if (transcript === null || transcript === undefined || typeof transcript !== 'string') {
      return {
        intent: 'INVALID_TRANSCRIPT',
        action: 'NONE',
        params: {},
        confidence: 0,
        rawTranscript: transcript,
        error: 'Transcript must be a non-empty string'
      };
    }

    const clean = transcript.trim();
    if (clean.length === 0) {
      return {
        intent: 'EMPTY_TRANSCRIPT',
        action: 'NONE',
        params: {},
        confidence: 0,
        rawTranscript: transcript,
        error: 'Transcript is empty'
      };
    }

    const text = clean.toLowerCase();

    // 1. HELP INTENT
    if (/^(?:help|what\s+can\s+i\s+say|voice\s+commands?|list\s+commands?|show\s+help|available\s+commands?)$/i.test(text) ||
        /\b(?:help\s+me|show\s+command\s+list)\b/i.test(text)) {
      return {
        intent: 'HELP',
        action: 'SHOW_HELP',
        params: { commands: this.getAvailableCommands() },
        confidence: 0.98,
        rawTranscript: clean
      };
    }

    // 2. TOGGLE_HIGH_CONTRAST INTENT
    const contrastMatch = text.match(/(?:toggle|switch|enable|disable|turn\s+on|turn\s+off|activate|deactivate)?\s*(?:high\s+contrast|contrast\s+mode|accessibility\s+contrast)(?:\s+mode)?/i);
    if (contrastMatch && (text.includes('contrast') || text.includes('accessibility'))) {
      let targetVal = 'toggle';
      if (/\b(?:enable|turn\s+on|activate)\b/i.test(text)) {
        targetVal = true;
      } else if (/\b(?:disable|turn\s+off|deactivate)\b/i.test(text)) {
        targetVal = false;
      }
      return {
        intent: 'TOGGLE_HIGH_CONTRAST',
        action: 'TOGGLE_CONTRAST',
        params: { highContrast: targetVal },
        confidence: 0.95,
        rawTranscript: clean
      };
    }

    // 3. EXPORT_HEALTH_REPORT INTENT
    const exportMatch = text.match(/(?:export|download|generate)\s+(?:health\s+)?report(?:\s+(?:as|in|to)\s+|\s+)?(json|pdf|csv)?/i) ||
                        text.match(/(?:export|download|generate)\s+(json|pdf|csv)\s+(?:health\s+)?report/i);
    if (exportMatch) {
      const format = (exportMatch[1] || 'pdf').toLowerCase();
      return {
        intent: 'EXPORT_HEALTH_REPORT',
        action: 'EXPORT_REPORT',
        params: { format },
        confidence: 0.96,
        rawTranscript: clean
      };
    }

    // 4. NAVIGATE_PAGE INTENT
    // Supported destinations: vitals, workouts, nutrition, sleep, settings
    const navMatch = text.match(/(?:navigate(?:\s+to|\s+page)?|go\s+to|open|show|switch\s+to|view)\s+(?:the\s+)?(vitals?|biometrics?|workouts?|exercises?|fitness|activity|nutrition|diet|food|meals?|sleep(?:ing)?|rest|settings?|preferences?|config(?:uration)?)(?:\s+(?:page|screen|dashboard|tab|view))?/i) ||
                     text.match(/^(?:vitals?|workouts?|nutrition|sleep|settings)\s+(?:page|dashboard|screen)$/i);
    if (navMatch) {
      const rawTarget = (navMatch[1] || navMatch[0].split(' ')[0]).toLowerCase();
      let page = 'vitals';
      if (/^(?:vitals?|biometrics?)$/.test(rawTarget)) page = 'vitals';
      else if (/^(?:workouts?|exercises?|fitness|activity)$/.test(rawTarget)) page = 'workouts';
      else if (/^(?:nutrition|diet|food|meals?)$/.test(rawTarget)) page = 'nutrition';
      else if (/^(?:sleep(?:ing)?|rest)$/.test(rawTarget)) page = 'sleep';
      else if (/^(?:settings?|preferences?|config(?:uration)?)$/.test(rawTarget)) page = 'settings';

      return {
        intent: 'NAVIGATE_PAGE',
        action: 'NAVIGATE',
        params: { page },
        confidence: 0.95,
        rawTranscript: clean
      };
    }

    // 5. LOG_VITALS INTENT
    // 5a. Blood Pressure: e.g. "blood pressure 120 over 80", "bp 120/80", "blood pressure 130 85"
    const bpMatch = text.match(/(?:log|record|track|save)?\s*(?:my\s*)?(?:blood\s*pressure|bp)\s*(?:is|of|at|to)?\s*(\d{2,3})\s*(?:over|\/|\s)\s*(\d{2,3})(?:\s*mm\s*hg)?/i);
    if (bpMatch) {
      const systolic = parseInt(bpMatch[1], 10);
      const diastolic = parseInt(bpMatch[2], 10);
      return {
        intent: 'LOG_VITALS',
        action: 'LOG_BLOOD_PRESSURE',
        params: {
          type: 'bloodPressure',
          systolic,
          diastolic,
          value: `${systolic}/${diastolic}`,
          unit: 'mmHg'
        },
        confidence: 0.96,
        rawTranscript: clean
      };
    }

    // 5b. Heart Rate: e.g. "heart rate 72 bpm", "pulse 75", "log heart rate of 80"
    const hrMatch = text.match(/(?:log|record|track|save)?\s*(?:my\s*)?(?:heart\s*rate|pulse)\s*(?:is|of|at|to)?\s*(\d{2,3})(?:\s*bpm)?/i);
    if (hrMatch) {
      const val = parseInt(hrMatch[1], 10);
      return {
        intent: 'LOG_VITALS',
        action: 'LOG_HEART_RATE',
        params: {
          type: 'heartRate',
          value: val,
          unit: 'bpm'
        },
        confidence: 0.95,
        rawTranscript: clean
      };
    }

    // 5c. Blood Glucose: e.g. "blood glucose 95", "blood sugar 110 mg/dl", "glucose 5.5 mmol/l"
    const bgMatch = text.match(/(?:log|record|track|save)?\s*(?:my\s*)?(?:blood\s*glucose|blood\s*sugar|glucose)\s*(?:is|of|at|to)?\s*(\d+(?:\.\d+)?)\s*(mg\/?dl|mmol\/?l)?/i);
    if (bgMatch) {
      const val = parseFloat(bgMatch[1]);
      let unit = 'mg/dL';
      if (bgMatch[2] && /mmol/i.test(bgMatch[2])) {
        unit = 'mmol/L';
      }
      return {
        intent: 'LOG_VITALS',
        action: 'LOG_BLOOD_GLUCOSE',
        params: {
          type: 'bloodGlucose',
          value: val,
          unit
        },
        confidence: 0.95,
        rawTranscript: clean
      };
    }

    // 5d. Weight: e.g. "weight 70 kg", "log weight 160 lbs", "weight 75"
    const weightMatch = text.match(/(?:log|record|track|save)?\s*(?:my\s*)?(?:weight)\s*(?:is|of|at|to)?\s*(\d+(?:\.\d+)?)\s*(kg|kilos?|kilograms?|lbs?|pounds?)?/i);
    if (weightMatch) {
      const val = parseFloat(weightMatch[1]);
      let unit = 'kg';
      if (weightMatch[2] && /lb|pound/i.test(weightMatch[2])) {
        unit = 'lbs';
      }
      return {
        intent: 'LOG_VITALS',
        action: 'LOG_WEIGHT',
        params: {
          type: 'weight',
          value: val,
          unit
        },
        confidence: 0.94,
        rawTranscript: clean
      };
    }

    // 6. START_WORKOUT INTENT
    // Activities: running, cycling, swimming, yoga
    const workoutMatch = text.match(/(?:start|begin|track|record)\s*(?:a\s*)?(running|run|jogging|jog|cycling|cycle|biking|bike|ride|swimming|swim|yoga|stretching|meditation)(?:\s+(?:workout|session|exercise))?(?:.*?\b(\d+)\s*(mins?|minutes?|hours?|hrs?))?/i) ||
                         text.match(/(?:start|begin)\s+(?:a\s+)?workout\s+(?:of\s+)?(running|run|jogging|jog|cycling|cycle|biking|bike|ride|swimming|swim|yoga)(?:.*?\b(\d+)\s*(mins?|minutes?|hours?|hrs?))?/i);
    if (workoutMatch) {
      const rawAct = workoutMatch[1].toLowerCase();
      let activity = 'running';
      if (/^(?:running|run|jogging|jog)$/.test(rawAct)) activity = 'running';
      else if (/^(?:cycling|cycle|biking|bike|ride)$/.test(rawAct)) activity = 'cycling';
      else if (/^(?:swimming|swim)$/.test(rawAct)) activity = 'swimming';
      else if (/^(?:yoga|stretching|meditation)$/.test(rawAct)) activity = 'yoga';

      let duration = null;
      if (workoutMatch[2]) {
        duration = parseInt(workoutMatch[2], 10);
        if (workoutMatch[3] && /hour|hr/i.test(workoutMatch[3])) {
          duration = duration * 60;
        }
      }

      return {
        intent: 'START_WORKOUT',
        action: 'START_WORKOUT',
        params: { activity, duration },
        confidence: 0.95,
        rawTranscript: clean
      };
    }

    // 7. SET_HYDRATION_GOAL INTENT
    // e.g. "set hydration goal 2.5 liters", "set water goal 8 glasses", "drink 3 liters"
    const hydrationMatch = text.match(/(?:set\s+)?(?:hydration|water)\s*(?:intake\s*)?(?:goal|target)\s*(?:is|of|at|to)?\s*(\d+(?:\.\d+)?)\s*(liters?|litres?|l|glasses?|cups?|ml)?/i) ||
                          text.match(/(?:drink|target)\s+(\d+(?:\.\d+)?)\s*(liters?|litres?|l|glasses?|cups?|ml)\s*(?:of\s+water|hydration)?/i);
    if (hydrationMatch) {
      const amount = parseFloat(hydrationMatch[1]);
      let unit = 'liters';
      const rawUnit = hydrationMatch[2] ? hydrationMatch[2].toLowerCase() : '';
      if (/glass|cup/i.test(rawUnit)) {
        unit = 'glasses';
      } else if (/ml/i.test(rawUnit)) {
        unit = 'ml';
      } else if (rawUnit === '' && amount > 10) {
        unit = 'glasses';
      }

      return {
        intent: 'SET_HYDRATION_GOAL',
        action: 'SET_HYDRATION_GOAL',
        params: { amount, unit },
        confidence: 0.94,
        rawTranscript: clean
      };
    }

    // 8. UNKNOWN / UNRECOGNIZED FALLBACK
    return {
      intent: 'UNKNOWN',
      action: 'NONE',
      params: {},
      confidence: 0,
      rawTranscript: clean
    };
  }

  // ==========================================
  // COMMAND EXECUTION & TRANSCRIPT PROCESSOR
  // ==========================================

  /**
   * Process and execute a speech transcript.
   * Mutates internal state, logs history, articulates speech feedback, and emits events.
   * @param {string} transcript Speech input string
   * @returns {Object} Execution result
   */
  processTranscript(transcript) {
    const parsed = this.parseTranscript(transcript);

    if (parsed.intent === 'INVALID_TRANSCRIPT' || parsed.intent === 'EMPTY_TRANSCRIPT') {
      return {
        success: false,
        intent: parsed.intent,
        action: parsed.action,
        params: parsed.params,
        error: parsed.error,
        transcript: parsed.rawTranscript
      };
    }

    const commandId = 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now();

    if (parsed.intent === 'UNKNOWN') {
      const response = 'Command not recognized. Say help for a list of available voice commands.';
      this.speak(response);

      const historyEntry = {
        id: commandId,
        timestamp,
        transcript: parsed.rawTranscript,
        intent: 'UNKNOWN',
        action: 'NONE',
        params: {},
        status: 'unrecognized',
        response
      };
      this.history.push(historyEntry);
      this.emit('unknown', { transcript: parsed.rawTranscript, response, historyEntry });

      return {
        success: false,
        intent: 'UNKNOWN',
        action: 'NONE',
        params: {},
        response,
        historyEntry
      };
    }

    let response = '';

    // Execute based on Intent
    switch (parsed.intent) {
      case 'NAVIGATE_PAGE': {
        const from = this.currentPage;
        this.currentPage = parsed.params.page;
        response = `Navigating to ${parsed.params.page} dashboard.`;
        this.speak(response);
        this.emit('navigate', { page: this.currentPage, from });
        break;
      }

      case 'LOG_VITALS': {
        const { type, value, unit, systolic, diastolic } = parsed.params;
        const entry = {
          value,
          unit,
          systolic,
          diastolic,
          loggedAt: timestamp
        };
        this.vitals[type] = entry;

        const valDisplay = type === 'bloodPressure' ? `${systolic} over ${diastolic} mmHg` : `${value} ${unit}`;
        const typeDisplay = type.replace(/([A-Z])/g, ' $1').toLowerCase();
        response = `Logged ${typeDisplay}: ${valDisplay}.`;
        this.speak(response);
        this.emit('vitals', {
          type,
          data: entry,
          vitals: { ...this.vitals }
        });
        break;
      }

      case 'START_WORKOUT': {
        const workoutRecord = {
          id: 'w_' + timestamp + '_' + Math.random().toString(36).substring(2, 6),
          activity: parsed.params.activity,
          duration: parsed.params.duration,
          startedAt: timestamp
        };
        this.workouts.push(workoutRecord);
        this.activeWorkout = workoutRecord;

        const durText = parsed.params.duration ? ` for ${parsed.params.duration} minutes` : '';
        response = `Started ${parsed.params.activity} workout session${durText}.`;
        this.speak(response);
        this.emit('workout', {
          workout: workoutRecord,
          action: 'start'
        });
        break;
      }

      case 'SET_HYDRATION_GOAL': {
        const previous = { ...this.hydrationGoal };
        this.hydrationGoal = {
          amount: parsed.params.amount,
          unit: parsed.params.unit
        };
        response = `Hydration goal updated to ${parsed.params.amount} ${parsed.params.unit}.`;
        this.speak(response);
        this.emit('hydration', {
          goal: { ...this.hydrationGoal },
          previous
        });
        break;
      }

      case 'TOGGLE_HIGH_CONTRAST': {
        const targetVal = parsed.params.highContrast === 'toggle' ? !this.highContrast : parsed.params.highContrast;
        this.toggleHighContrast(targetVal);
        response = `High contrast accessibility mode ${this.highContrast ? 'enabled' : 'disabled'}.`;
        this.speak(response);
        break;
      }

      case 'EXPORT_HEALTH_REPORT': {
        const format = parsed.params.format;
        response = `Exporting clinical health report in ${format.toUpperCase()} format.`;
        this.speak(response);
        this.emit('export', {
          format,
          timestamp,
          vitals: { ...this.vitals },
          workouts: [...this.workouts],
          hydrationGoal: { ...this.hydrationGoal }
        });
        break;
      }

      case 'HELP': {
        response = 'Available commands: navigate to vitals or workouts, log vitals such as heart rate or blood pressure, start workouts, set hydration goal, toggle high contrast, and export health report.';
        this.speak(response);
        this.emit('help', {
          commands: this.getAvailableCommands()
        });
        break;
      }
    }

    const historyEntry = {
      id: commandId,
      timestamp,
      transcript: parsed.rawTranscript,
      intent: parsed.intent,
      action: parsed.action,
      params: parsed.params,
      status: 'success',
      response
    };
    this.history.push(historyEntry);

    // Emit generic command execution event
    this.emit('command', historyEntry);

    return {
      success: true,
      intent: parsed.intent,
      action: parsed.action,
      params: parsed.params,
      response,
      historyEntry
    };
  }

  // ==========================================
  // UTILITY & AUDIT METHODS
  // ==========================================

  /**
   * Return an immutable copy of the command history.
   * @returns {Array<Object>} List of executed and attempted commands
   */
  getHistory() {
    return this.history.map(entry => ({ ...entry, params: { ...entry.params } }));
  }

  /**
   * Clear all command history entries.
   * @returns {boolean} True if cleared
   */
  clearHistory() {
    this.history = [];
    this.emit('history_cleared', { timestamp: Date.now() });
    return true;
  }

  /**
   * Get an immutable snapshot of patient vitals.
   * @returns {Object} Vitals record
   */
  getVitalsSummary() {
    return JSON.parse(JSON.stringify(this.vitals));
  }

  /**
   * Get standard list of supported voice commands and example utterances.
   * @returns {Array<Object>} List of voice commands
   */
  getAvailableCommands() {
    return [
      {
        intent: 'NAVIGATE_PAGE',
        description: 'Navigate between clinical pages (vitals, workouts, nutrition, sleep, settings)',
        examples: ['Navigate to workouts', 'Go to vitals', 'Open sleep dashboard', 'Switch to settings']
      },
      {
        intent: 'LOG_VITALS',
        description: 'Record biometric vital signs (heart rate, blood pressure, blood glucose, weight)',
        examples: ['Heart rate 72 bpm', 'Log blood pressure 120 over 80', 'Blood glucose 95', 'Log weight 70 kg']
      },
      {
        intent: 'START_WORKOUT',
        description: 'Initiate a physical exercise workout (running, cycling, swimming, yoga)',
        examples: ['Start running', 'Start cycling for 45 minutes', 'Begin swimming session', 'Start yoga']
      },
      {
        intent: 'SET_HYDRATION_GOAL',
        description: 'Update daily hydration fluid intake target',
        examples: ['Set hydration goal 2.5 liters', 'Water goal 8 glasses', 'Drink 3 liters']
      },
      {
        intent: 'TOGGLE_HIGH_CONTRAST',
        description: 'Toggle accessible WCAG AAA high contrast color mode',
        examples: ['Toggle high contrast', 'Enable high contrast', 'Turn off high contrast']
      },
      {
        intent: 'EXPORT_HEALTH_REPORT',
        description: 'Export comprehensive clinical biometric telemetry (PDF, JSON, CSV)',
        examples: ['Export health report', 'Download report as JSON', 'Export CSV report']
      },
      {
        intent: 'HELP',
        description: 'List supported voice commands and clinical speech interactions',
        examples: ['Help', 'What can I say', 'Voice commands']
      }
    ];
  }
}

// Browser UI Auto-Initialization Helper
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-health-vitality-voice-commander]');
    if (!root) return;

    const commander = new HealthVitalityVoiceCommander();

    // Bind DOM Elements
    const micBtn = document.getElementById('micToggleBtn');
    const micStatusText = document.getElementById('micStatusText');
    const ecgVisualizer = document.getElementById('ecgVisualizer');
    const confidenceMeterBar = document.getElementById('confidenceMeterBar');
    const confidenceVal = document.getElementById('confidenceVal');
    const transcriptLiveText = document.getElementById('transcriptLiveText');
    const speechFeedbackText = document.getElementById('speechFeedbackText');
    const contrastToggleBtn = document.getElementById('contrastToggleBtn');
    const commandFeed = document.getElementById('commandFeed');
    const btnClearHistory = document.getElementById('btnClearHistory');

    // Vitals HUD elements
    const hudHeartRate = document.getElementById('hudHeartRate');
    const hudBloodPressure = document.getElementById('hudBloodPressure');
    const hudBloodGlucose = document.getElementById('hudBloodGlucose');
    const hudWeight = document.getElementById('hudWeight');
    const hudActivePage = document.getElementById('hudActivePage');
    const hudHydrationGoal = document.getElementById('hudHydrationGoal');

    // Update Vitals HUD
    function updateHUD() {
      if (hudActivePage) hudActivePage.textContent = commander.currentPage.toUpperCase();
      if (hudHydrationGoal) hudHydrationGoal.textContent = `${commander.hydrationGoal.amount} ${commander.hydrationGoal.unit}`;

      if (hudHeartRate) {
        hudHeartRate.textContent = commander.vitals.heartRate ? `${commander.vitals.heartRate.value} bpm` : '-- bpm';
      }
      if (hudBloodPressure) {
        hudBloodPressure.textContent = commander.vitals.bloodPressure ? `${commander.vitals.bloodPressure.value} mmHg` : '--/-- mmHg';
      }
      if (hudBloodGlucose) {
        hudBloodGlucose.textContent = commander.vitals.bloodGlucose ? `${commander.vitals.bloodGlucose.value} ${commander.vitals.bloodGlucose.unit}` : '-- mg/dL';
      }
      if (hudWeight) {
        hudWeight.textContent = commander.vitals.weight ? `${commander.vitals.weight.value} ${commander.vitals.weight.unit}` : '-- kg';
      }
    }

    // Render Command History Feed
    function renderHistory() {
      if (!commandFeed) return;
      const history = commander.getHistory();
      if (history.length === 0) {
        commandFeed.innerHTML = '<div class="feed-empty">No voice commands recorded yet. Tap the microphone or click a quick command chip below.</div>';
        return;
      }

      commandFeed.innerHTML = history.slice().reverse().map(entry => {
        const timeStr = new Date(entry.timestamp).toLocaleTimeString();
        const isSuccess = entry.status === 'success';
        const badgeClass = isSuccess ? 'badge-success' : 'badge-unrecognized';
        return `
          <div class="feed-item ${isSuccess ? 'item-success' : 'item-unrecognized'}">
            <div class="feed-meta">
              <span class="badge ${badgeClass}">${entry.intent}</span>
              <span class="feed-time">${timeStr}</span>
            </div>
            <div class="feed-transcript">"${entry.transcript}"</div>
            <div class="feed-response">🔊 ${entry.response}</div>
          </div>
        `;
      }).join('');
    }

    // Microphone toggle click
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        commander.toggleListening();
      });
    }

    // Contrast toggle click
    if (contrastToggleBtn) {
      contrastToggleBtn.addEventListener('click', () => {
        commander.toggleHighContrast();
      });
    }

    // Clear history click
    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', () => {
        commander.clearHistory();
        renderHistory();
      });
    }

    // Quick Command Chips
    document.querySelectorAll('.command-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const phrase = chip.getAttribute('data-command');
        if (phrase) {
          if (transcriptLiveText) transcriptLiveText.textContent = `"${phrase}"`;
          if (confidenceMeterBar) confidenceMeterBar.style.width = '96%';
          if (confidenceVal) confidenceVal.textContent = '96%';
          commander.processTranscript(phrase);
        }
      });
    });

    // Commander Event Listeners
    commander.on('listening', ({ listening }) => {
      if (micBtn) {
        micBtn.classList.toggle('active', listening);
        micBtn.setAttribute('aria-pressed', listening ? 'true' : 'false');
      }
      if (micStatusText) {
        micStatusText.textContent = listening ? 'Microphone Active • Listening for Voice Commands...' : 'Microphone Idle • Tap to Activate';
      }
      if (ecgVisualizer) {
        ecgVisualizer.classList.toggle('animating', listening);
      }
    });

    commander.on('transcript_interim', ({ transcript, confidence }) => {
      if (transcriptLiveText) transcriptLiveText.textContent = `"${transcript}"...`;
      const confPercent = Math.round((confidence || 0.75) * 100);
      if (confidenceMeterBar) confidenceMeterBar.style.width = `${confPercent}%`;
      if (confidenceVal) confidenceVal.textContent = `${confPercent}%`;
    });

    commander.on('transcript_final', ({ transcript, confidence }) => {
      if (transcriptLiveText) transcriptLiveText.textContent = `"${transcript}"`;
      const confPercent = Math.round((confidence || 0.95) * 100);
      if (confidenceMeterBar) confidenceMeterBar.style.width = `${confPercent}%`;
      if (confidenceVal) confidenceVal.textContent = `${confPercent}%`;
    });

    commander.on('speak', ({ message }) => {
      if (speechFeedbackText) {
        speechFeedbackText.textContent = `"${message}"`;
      }
    });

    commander.on('command', () => {
      updateHUD();
      renderHistory();
    });

    commander.on('unknown', () => {
      renderHistory();
    });

    commander.on('contrast', ({ highContrast }) => {
      if (contrastToggleBtn) {
        contrastToggleBtn.setAttribute('aria-pressed', highContrast ? 'true' : 'false');
        contrastToggleBtn.textContent = highContrast ? '☀️ Normal Contrast' : '👁️ High Contrast';
      }
    });

    // Initial render
    updateHUD();
    renderHistory();
  });
}
