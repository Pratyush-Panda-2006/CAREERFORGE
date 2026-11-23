import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityVoiceCommander } from './voice-commander.js';

describe('HealthVitalityVoiceCommander', () => {
  let commander;

  beforeEach(() => {
    commander = new HealthVitalityVoiceCommander();
  });

  // 1. Default initialization and configuration options
  describe('1. Default initialization & configuration options', () => {
    it('initializes with default clinical settings', () => {
      assert.strictEqual(commander.currentPage, 'vitals');
      assert.strictEqual(commander.highContrast, false);
      assert.strictEqual(commander.listening, false);
      assert.strictEqual(commander.audioFeedback, true);
      assert.strictEqual(commander.voiceLang, 'en-US');
      assert.strictEqual(commander.lastSpoken, null);

      // Vitals defaults
      assert.deepStrictEqual(commander.vitals, {
        heartRate: null,
        bloodPressure: null,
        bloodGlucose: null,
        weight: null
      });

      // Hydration & workout defaults
      assert.deepStrictEqual(commander.hydrationGoal, {
        amount: 2.5,
        unit: 'liters'
      });
      assert.deepStrictEqual(commander.workouts, []);
      assert.strictEqual(commander.activeWorkout, null);
      assert.deepStrictEqual(commander.history, []);
    });

    it('accepts custom configuration overrides', () => {
      const custom = new HealthVitalityVoiceCommander({
        initialPage: 'workouts',
        highContrast: true,
        audioFeedback: false,
        voiceLang: 'en-GB',
        vitals: {
          heartRate: { value: 68, unit: 'bpm', loggedAt: 123456 }
        },
        hydrationGoal: {
          amount: 3.0,
          unit: 'liters'
        },
        workouts: [{ id: 'w1', activity: 'running' }]
      });

      assert.strictEqual(custom.currentPage, 'workouts');
      assert.strictEqual(custom.highContrast, true);
      assert.strictEqual(custom.audioFeedback, false);
      assert.strictEqual(custom.voiceLang, 'en-GB');
      assert.strictEqual(custom.vitals.heartRate.value, 68);
      assert.strictEqual(custom.hydrationGoal.amount, 3.0);
      assert.strictEqual(custom.workouts.length, 1);
    });
  });

  // 2. Handling of empty, null, and malformed transcripts
  describe('2. Empty, null, and malformed transcript handling', () => {
    it('handles null, undefined, and non-string inputs safely', () => {
      const nullResult = commander.parseTranscript(null);
      assert.strictEqual(nullResult.intent, 'INVALID_TRANSCRIPT');
      assert.strictEqual(nullResult.confidence, 0);

      const undefResult = commander.parseTranscript(undefined);
      assert.strictEqual(undefResult.intent, 'INVALID_TRANSCRIPT');

      const numResult = commander.parseTranscript(12345);
      assert.strictEqual(numResult.intent, 'INVALID_TRANSCRIPT');

      const objResult = commander.parseTranscript({ text: 'heart rate 72' });
      assert.strictEqual(objResult.intent, 'INVALID_TRANSCRIPT');
    });

    it('handles empty and whitespace-only transcripts safely', () => {
      const emptyResult = commander.parseTranscript('');
      assert.strictEqual(emptyResult.intent, 'EMPTY_TRANSCRIPT');

      const whitespaceResult = commander.parseTranscript('   \t\n  ');
      assert.strictEqual(whitespaceResult.intent, 'EMPTY_TRANSCRIPT');
    });

    it('returns error when executing invalid or empty transcripts in processTranscript', () => {
      const resNull = commander.processTranscript(null);
      assert.strictEqual(resNull.success, false);
      assert.strictEqual(resNull.intent, 'INVALID_TRANSCRIPT');

      const resEmpty = commander.processTranscript('   ');
      assert.strictEqual(resEmpty.success, false);
      assert.strictEqual(resEmpty.intent, 'EMPTY_TRANSCRIPT');
    });

    it('handles unrecognized commands by logging history and returning false', () => {
      let unknownEmitted = null;
      commander.on('unknown', (data) => {
        unknownEmitted = data;
      });

      const res = commander.processTranscript('order some pizza please');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.intent, 'UNKNOWN');
      assert.match(res.response, /not recognized/i);
      assert.ok(unknownEmitted);
      assert.strictEqual(unknownEmitted.transcript, 'order some pizza please');

      // History should have the unrecognized attempt
      const history = commander.getHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].status, 'unrecognized');
    });
  });

  // 3. Grammar parsing for all actions with parameter extraction
  describe('3. Voice grammar registry & intent parsing', () => {
    it('parses NAVIGATE_PAGE with multiple alias variations', () => {
      const tests = [
        { text: 'navigate to vitals', expectedPage: 'vitals' },
        { text: 'go to workouts', expectedPage: 'workouts' },
        { text: 'open nutrition dashboard', expectedPage: 'nutrition' },
        { text: 'show sleep screen', expectedPage: 'sleep' },
        { text: 'switch to settings', expectedPage: 'settings' },
        { text: 'view biometrics tab', expectedPage: 'vitals' },
        { text: 'go to diet', expectedPage: 'nutrition' },
        { text: 'open exercises', expectedPage: 'workouts' }
      ];

      for (const { text, expectedPage } of tests) {
        const parsed = commander.parseTranscript(text);
        assert.strictEqual(parsed.intent, 'NAVIGATE_PAGE', `Failed intent for: ${text}`);
        assert.strictEqual(parsed.params.page, expectedPage, `Failed page extraction for: ${text}`);
        assert.ok(parsed.confidence > 0.8);
      }
    });

    it('parses LOG_VITALS - heart rate and pulse', () => {
      const p1 = commander.parseTranscript('heart rate 72 bpm');
      assert.strictEqual(p1.intent, 'LOG_VITALS');
      assert.strictEqual(p1.params.type, 'heartRate');
      assert.strictEqual(p1.params.value, 72);
      assert.strictEqual(p1.params.unit, 'bpm');

      const p2 = commander.parseTranscript('log pulse 68');
      assert.strictEqual(p2.params.type, 'heartRate');
      assert.strictEqual(p2.params.value, 68);

      const p3 = commander.parseTranscript('my heart rate is 84');
      assert.strictEqual(p3.params.value, 84);
    });

    it('parses LOG_VITALS - blood pressure', () => {
      const p1 = commander.parseTranscript('blood pressure 120 over 80');
      assert.strictEqual(p1.intent, 'LOG_VITALS');
      assert.strictEqual(p1.params.type, 'bloodPressure');
      assert.strictEqual(p1.params.systolic, 120);
      assert.strictEqual(p1.params.diastolic, 80);
      assert.strictEqual(p1.params.value, '120/80');
      assert.strictEqual(p1.params.unit, 'mmHg');

      const p2 = commander.parseTranscript('log bp 135/88 mm hg');
      assert.strictEqual(p2.params.systolic, 135);
      assert.strictEqual(p2.params.diastolic, 88);

      const p3 = commander.parseTranscript('blood pressure 118 76');
      assert.strictEqual(p3.params.systolic, 118);
      assert.strictEqual(p3.params.diastolic, 76);
    });

    it('parses LOG_VITALS - blood glucose', () => {
      const p1 = commander.parseTranscript('blood glucose 95');
      assert.strictEqual(p1.intent, 'LOG_VITALS');
      assert.strictEqual(p1.params.type, 'bloodGlucose');
      assert.strictEqual(p1.params.value, 95);
      assert.strictEqual(p1.params.unit, 'mg/dL');

      const p2 = commander.parseTranscript('blood sugar 108 mg/dl');
      assert.strictEqual(p2.params.value, 108);
      assert.strictEqual(p2.params.unit, 'mg/dL');

      const p3 = commander.parseTranscript('glucose 5.5 mmol/l');
      assert.strictEqual(p3.params.value, 5.5);
      assert.strictEqual(p3.params.unit, 'mmol/L');
    });

    it('parses LOG_VITALS - weight', () => {
      const p1 = commander.parseTranscript('log weight 70 kg');
      assert.strictEqual(p1.intent, 'LOG_VITALS');
      assert.strictEqual(p1.params.type, 'weight');
      assert.strictEqual(p1.params.value, 70);
      assert.strictEqual(p1.params.unit, 'kg');

      const p2 = commander.parseTranscript('weight 155.5 lbs');
      assert.strictEqual(p2.params.value, 155.5);
      assert.strictEqual(p2.params.unit, 'lbs');

      const p3 = commander.parseTranscript('my weight is 68 kilograms');
      assert.strictEqual(p3.params.value, 68);
      assert.strictEqual(p3.params.unit, 'kg');
    });

    it('parses START_WORKOUT with activities and durations', () => {
      const p1 = commander.parseTranscript('start running');
      assert.strictEqual(p1.intent, 'START_WORKOUT');
      assert.strictEqual(p1.params.activity, 'running');
      assert.strictEqual(p1.params.duration, null);

      const p2 = commander.parseTranscript('start cycling for 45 minutes');
      assert.strictEqual(p2.params.activity, 'cycling');
      assert.strictEqual(p2.params.duration, 45);

      const p3 = commander.parseTranscript('begin swimming');
      assert.strictEqual(p3.params.activity, 'swimming');

      const p4 = commander.parseTranscript('start yoga session for 1 hour');
      assert.strictEqual(p4.params.activity, 'yoga');
      assert.strictEqual(p4.params.duration, 60);
    });

    it('parses SET_HYDRATION_GOAL with liters and glasses', () => {
      const p1 = commander.parseTranscript('set hydration goal 2.5 liters');
      assert.strictEqual(p1.intent, 'SET_HYDRATION_GOAL');
      assert.strictEqual(p1.params.amount, 2.5);
      assert.strictEqual(p1.params.unit, 'liters');

      const p2 = commander.parseTranscript('set water goal 8 glasses');
      assert.strictEqual(p2.params.amount, 8);
      assert.strictEqual(p2.params.unit, 'glasses');

      const p3 = commander.parseTranscript('drink 3 liters');
      assert.strictEqual(p3.params.amount, 3);
      assert.strictEqual(p3.params.unit, 'liters');
    });

    it('parses TOGGLE_HIGH_CONTRAST accessibility commands', () => {
      const p1 = commander.parseTranscript('toggle high contrast');
      assert.strictEqual(p1.intent, 'TOGGLE_HIGH_CONTRAST');
      assert.strictEqual(p1.params.highContrast, 'toggle');

      const p2 = commander.parseTranscript('enable high contrast mode');
      assert.strictEqual(p2.params.highContrast, true);

      const p3 = commander.parseTranscript('turn off high contrast');
      assert.strictEqual(p3.params.highContrast, false);
    });

    it('parses EXPORT_HEALTH_REPORT for PDF, JSON, and CSV', () => {
      const p1 = commander.parseTranscript('export health report');
      assert.strictEqual(p1.intent, 'EXPORT_HEALTH_REPORT');
      assert.strictEqual(p1.params.format, 'pdf');

      const p2 = commander.parseTranscript('export report as json');
      assert.strictEqual(p2.params.format, 'json');

      const p3 = commander.parseTranscript('download csv health report');
      assert.strictEqual(p3.params.format, 'csv');
    });

    it('parses HELP commands', () => {
      const p1 = commander.parseTranscript('help');
      assert.strictEqual(p1.intent, 'HELP');
      assert.strictEqual(p1.action, 'SHOW_HELP');
      assert.ok(Array.isArray(p1.params.commands));
      assert.strictEqual(p1.params.commands.length, 7);

      const p2 = commander.parseTranscript('what can I say');
      assert.strictEqual(p2.intent, 'HELP');

      const p3 = commander.parseTranscript('voice commands');
      assert.strictEqual(p3.intent, 'HELP');
    });
  });

  // 4. Command execution and internal state mutations
  describe('4. Command execution & internal state mutations', () => {
    it('mutates currentPage upon NAVIGATE_PAGE command', () => {
      const res = commander.processTranscript('navigate to workouts');
      assert.strictEqual(res.success, true);
      assert.strictEqual(commander.currentPage, 'workouts');
      assert.match(res.response, /workouts/i);

      commander.processTranscript('go to sleep');
      assert.strictEqual(commander.currentPage, 'sleep');
    });

    it('mutates vitals upon LOG_VITALS commands', () => {
      commander.processTranscript('heart rate 74 bpm');
      assert.strictEqual(commander.vitals.heartRate.value, 74);
      assert.strictEqual(commander.vitals.heartRate.unit, 'bpm');

      commander.processTranscript('blood pressure 125 over 82');
      assert.strictEqual(commander.vitals.bloodPressure.systolic, 125);
      assert.strictEqual(commander.vitals.bloodPressure.diastolic, 82);
      assert.strictEqual(commander.vitals.bloodPressure.value, '125/82');

      commander.processTranscript('blood glucose 98');
      assert.strictEqual(commander.vitals.bloodGlucose.value, 98);

      commander.processTranscript('weight 72.5 kg');
      assert.strictEqual(commander.vitals.weight.value, 72.5);

      const summary = commander.getVitalsSummary();
      assert.strictEqual(summary.heartRate.value, 74);
      assert.strictEqual(summary.bloodPressure.value, '125/82');
      assert.strictEqual(summary.bloodGlucose.value, 98);
      assert.strictEqual(summary.weight.value, 72.5);
    });

    it('mutates workouts upon START_WORKOUT command', () => {
      const res = commander.processTranscript('start running for 30 minutes');
      assert.strictEqual(res.success, true);
      assert.strictEqual(commander.workouts.length, 1);
      assert.strictEqual(commander.workouts[0].activity, 'running');
      assert.strictEqual(commander.workouts[0].duration, 30);
      assert.strictEqual(commander.activeWorkout.activity, 'running');
    });

    it('mutates hydrationGoal upon SET_HYDRATION_GOAL command', () => {
      const res = commander.processTranscript('set hydration goal 3.5 liters');
      assert.strictEqual(res.success, true);
      assert.strictEqual(commander.hydrationGoal.amount, 3.5);
      assert.strictEqual(commander.hydrationGoal.unit, 'liters');
    });

    it('mutates highContrast accessibility mode', () => {
      assert.strictEqual(commander.highContrast, false);
      commander.processTranscript('toggle high contrast');
      assert.strictEqual(commander.highContrast, true);

      commander.processTranscript('turn off high contrast');
      assert.strictEqual(commander.highContrast, false);

      commander.processTranscript('enable high contrast');
      assert.strictEqual(commander.highContrast, true);
    });
  });

  // 5. Command history logging and clearing
  describe('5. Command history logging & clearing', () => {
    it('assigns unique IDs, timestamps, and preserves transcripts', () => {
      commander.processTranscript('navigate to nutrition');
      commander.processTranscript('heart rate 80 bpm');

      const history = commander.getHistory();
      assert.strictEqual(history.length, 2);

      assert.ok(history[0].id.startsWith('cmd_'));
      assert.ok(history[1].id.startsWith('cmd_'));
      assert.notStrictEqual(history[0].id, history[1].id);

      assert.ok(typeof history[0].timestamp === 'number');
      assert.strictEqual(history[0].transcript, 'navigate to nutrition');
      assert.strictEqual(history[0].status, 'success');

      assert.strictEqual(history[1].transcript, 'heart rate 80 bpm');
      assert.strictEqual(history[1].params.value, 80);
    });

    it('clears command history and emits history_cleared event', () => {
      commander.processTranscript('help');
      assert.strictEqual(commander.getHistory().length, 1);

      let eventTriggered = false;
      commander.on('history_cleared', () => {
        eventTriggered = true;
      });

      const cleared = commander.clearHistory();
      assert.strictEqual(cleared, true);
      assert.strictEqual(commander.getHistory().length, 0);
      assert.strictEqual(eventTriggered, true);
    });

    it('returns an immutable copy of history', () => {
      commander.processTranscript('help');
      const histCopy = commander.getHistory();
      histCopy.push({ fake: true });

      assert.strictEqual(commander.getHistory().length, 1);
    });
  });

  // 6. Event emitter subscriptions and event dispatch
  describe('6. Event emitter subscriptions & event dispatch', () => {
    it('subscribes and fires specific command event payloads', () => {
      let navEvent = null;
      let vitalsEvent = null;
      let workoutEvent = null;
      let hydrationEvent = null;
      let exportEvent = null;

      commander.on('navigate', (e) => { navEvent = e; });
      commander.on('vitals', (e) => { vitalsEvent = e; });
      commander.on('workout', (e) => { workoutEvent = e; });
      commander.on('hydration', (e) => { hydrationEvent = e; });
      commander.on('export', (e) => { exportEvent = e; });

      commander.processTranscript('navigate to settings');
      assert.deepStrictEqual(navEvent, { page: 'settings', from: 'vitals' });

      commander.processTranscript('heart rate 76');
      assert.strictEqual(vitalsEvent.type, 'heartRate');
      assert.strictEqual(vitalsEvent.data.value, 76);

      commander.processTranscript('start cycling for 20 minutes');
      assert.strictEqual(workoutEvent.workout.activity, 'cycling');
      assert.strictEqual(workoutEvent.workout.duration, 20);

      commander.processTranscript('set water goal 10 glasses');
      assert.strictEqual(hydrationEvent.goal.amount, 10);
      assert.strictEqual(hydrationEvent.goal.unit, 'glasses');

      commander.processTranscript('export health report as json');
      assert.strictEqual(exportEvent.format, 'json');
    });

    it('allows unsubscribing via returned function or off() method', () => {
      let callCount = 0;
      const handler = () => { callCount++; };

      const unsubscribe = commander.on('command', handler);
      commander.processTranscript('help');
      assert.strictEqual(callCount, 1);

      unsubscribe();
      commander.processTranscript('help');
      assert.strictEqual(callCount, 1); // Not incremented

      commander.on('command', handler);
      commander.processTranscript('help');
      assert.strictEqual(callCount, 2);

      commander.off('command', handler);
      commander.processTranscript('help');
      assert.strictEqual(callCount, 2);
    });

    it('handles listener throwing without interrupting execution', () => {
      commander.on('command', () => {
        throw new Error('Explosion in listener');
      });

      // Should not throw
      const res = commander.processTranscript('help');
      assert.strictEqual(res.success, true);
    });
  });

  // 7. Headless speech synthesis fallback and microphone toggle
  describe('7. Headless speech synthesis fallback & microphone toggle', () => {
    it('executes speak() in headless mode safely', () => {
      let spokenData = null;
      commander.on('speak', (data) => {
        spokenData = data;
      });

      const msg = commander.speak('Test clinical biometric notification.');
      assert.strictEqual(msg, 'Test clinical biometric notification.');
      assert.strictEqual(commander.lastSpoken, 'Test clinical biometric notification.');
      assert.ok(spokenData);
      assert.strictEqual(spokenData.message, 'Test clinical biometric notification.');
      assert.strictEqual(commander.spokenQueue.length, 1);
    });

    it('respects audioFeedback: false flag', () => {
      const silentCommander = new HealthVitalityVoiceCommander({ audioFeedback: false });
      const msg = silentCommander.speak('Silent feedback message');
      assert.strictEqual(msg, 'Silent feedback message');
      assert.strictEqual(silentCommander.lastSpoken, 'Silent feedback message');
    });

    it('toggles microphone listening state and emits listening event', () => {
      const states = [];
      commander.on('listening', ({ listening }) => {
        states.push(listening);
      });

      assert.strictEqual(commander.listening, false);

      commander.startListening();
      assert.strictEqual(commander.listening, true);

      commander.stopListening();
      assert.strictEqual(commander.listening, false);

      commander.toggleListening();
      assert.strictEqual(commander.listening, true);

      commander.toggleListening();
      assert.strictEqual(commander.listening, false);

      assert.deepStrictEqual(states, [true, false, true, false]);
    });
  });

  // 8. End-to-end processTranscript integration
  describe('8. End-to-end clinical workflow integration', () => {
    it('runs a complete clinical interaction flow', () => {
      const logs = [];
      commander.on('command', (entry) => {
        logs.push(entry.intent);
      });

      // Step 1: Request help
      const r1 = commander.processTranscript('help');
      assert.strictEqual(r1.success, true);
      assert.strictEqual(r1.intent, 'HELP');

      // Step 2: Navigate to vitals
      const r2 = commander.processTranscript('go to vitals');
      assert.strictEqual(r2.success, true);
      assert.strictEqual(commander.currentPage, 'vitals');

      // Step 3: Record multiple vital signs
      commander.processTranscript('heart rate 72 bpm');
      commander.processTranscript('blood pressure 120 over 80');
      commander.processTranscript('blood glucose 95');
      commander.processTranscript('weight 70 kg');

      assert.strictEqual(commander.vitals.heartRate.value, 72);
      assert.strictEqual(commander.vitals.bloodPressure.value, '120/80');
      assert.strictEqual(commander.vitals.bloodGlucose.value, 95);
      assert.strictEqual(commander.vitals.weight.value, 70);

      // Step 4: Update hydration goal
      commander.processTranscript('set hydration goal 3 liters');
      assert.strictEqual(commander.hydrationGoal.amount, 3);

      // Step 5: Start a workout
      commander.processTranscript('start running for 25 minutes');
      assert.strictEqual(commander.activeWorkout.activity, 'running');

      // Step 6: Enable accessibility high contrast
      commander.processTranscript('enable high contrast');
      assert.strictEqual(commander.highContrast, true);

      // Step 7: Export health report
      const r7 = commander.processTranscript('export health report as pdf');
      assert.strictEqual(r7.success, true);
      assert.strictEqual(r7.params.format, 'pdf');

      // Verify overall history count
      const history = commander.getHistory();
      assert.strictEqual(history.length, 10);
      assert.strictEqual(logs.length, 10);
      assert.deepStrictEqual(logs, [
        'HELP',
        'NAVIGATE_PAGE',
        'LOG_VITALS',
        'LOG_VITALS',
        'LOG_VITALS',
        'LOG_VITALS',
        'SET_HYDRATION_GOAL',
        'START_WORKOUT',
        'TOGGLE_HIGH_CONTRAST',
        'EXPORT_HEALTH_REPORT'
      ]);
    });
  });
});
