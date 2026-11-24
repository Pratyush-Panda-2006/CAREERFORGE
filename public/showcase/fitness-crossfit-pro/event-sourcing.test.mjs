import test from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProEventSourcingLedger } from './event-sourcing.js';

function fakeClock(start = 1000) {
  let now = start;
  return {
    tick: () => { now += 1000; return now; },
    now: () => now,
    set: (t) => { now = t; }
  };
}

test('FitnessCrossfitProEventSourcingLedger - initial state is genesis with no events', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  assert.equal(ledger.getEventCount(), 0);
  assert.deepEqual(ledger.getEvents(), []);
  const state = ledger.getMaterializedState();
  assert.equal(state.totalWorkouts, 0);
  assert.equal(state.totalExercises, 0);
  assert.equal(state.totalVolume, 0);
  assert.equal(state.currentWorkoutId, null);
  assert.equal(state.lastEventId, null);
});

test('FitnessCrossfitProEventSourcingLedger - appendEvent adds immutable append-only events', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  const e1 = ledger.appendEvent('WORKOUT_STARTED', { name: 'Murph', workoutId: 'w1' });
  clock.tick();
  const e2 = ledger.appendEvent('EXERCISE_LOGGED', { name: 'Pull-ups', sets: 3, reps: 10, weight: 0, workoutId: 'w1' });

  assert.equal(ledger.getEventCount(), 2);
  assert.equal(e1.sequence, 1);
  assert.equal(e2.sequence, 2);
  assert.equal(e1.type, 'WORKOUT_STARTED');
  assert.equal(e2.type, 'EXERCISE_LOGGED');
  assert.equal(e1.timestamp, 1000);
  assert.equal(e2.timestamp, 2000);

  // events are ordered append-only
  const events = ledger.getEvents();
  assert.equal(events[0].id, e1.id);
  assert.equal(events[1].id, e2.id);

  // immutability: stored events are deeply frozen; ledger is append-only
  const stored = ledger.getEvents();
  assert.throws(() => { stored[0].type = 'TAMPERED'; }, TypeError);
  assert.throws(() => { stored[0].payload.name = 'TAMPERED'; }, TypeError);
  assert.equal(stored[0].type, 'WORKOUT_STARTED');
  assert.equal(stored[0].payload.name, 'Murph');
  assert.equal(stored.length, 2);
});

test('FitnessCrossfitProEventSourcingLedger - deep freeze protects nested payload', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  const nested = { workout: { name: 'Fran', details: { rounds: 3 } } };
  ledger.appendEvent('WORKOUT_STARTED', nested);
  const stored = ledger.getEvents()[0].payload;

  assert.throws(() => { stored.workout.name = 'TAMPERED'; }, TypeError);
  assert.throws(() => { stored.workout.details.rounds = 99; }, TypeError);
  assert.equal(stored.workout.name, 'Fran');
  assert.equal(stored.workout.details.rounds, 3);
});

test('FitnessCrossfitProEventSourcingLedger - deterministic state reconstruction', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  ledger.appendEvent('WORKOUT_STARTED', { name: 'Murph', workoutId: 'w1' });   // t=1000
  clock.tick();
  ledger.appendEvent('EXERCISE_LOGGED', { name: 'Pull-ups', sets: 3, reps: 10, weight: 0, workoutId: 'w1' }); // t=2000
  clock.tick();
  ledger.appendEvent('EXERCISE_LOGGED', { name: 'Push-ups', sets: 3, reps: 15, weight: 0, workoutId: 'w1' }); // t=3000
  clock.tick();
  ledger.appendEvent('WEIGHT_UPDATED', { weight: 80 });                           // t=4000
  clock.tick();
  ledger.appendEvent('WORKOUT_ENDED', { workoutId: 'w1' });                       // t=5000

  const stateA = ledger.getMaterializedState();
  const stateB = ledger.replayToTimestamp(Infinity);
  assert.deepEqual(stateA, stateB);

  assert.equal(stateA.totalWorkouts, 1);
  assert.equal(stateA.totalExercises, 2);
  assert.equal(stateA.totalVolume, 0);
  assert.equal(stateA.bodyWeight, 80);
  assert.equal(stateA.currentWorkoutId, null);
  assert.equal(stateA.workouts[0].id, 'w1');
  assert.equal(stateA.workouts[0].endedAt, 5000);

  // replaying again yields identical result (deterministic)
  const stateC = ledger.replayToTimestamp(stateA.lastTimestamp);
  assert.deepEqual(stateA, stateC);
});

test('FitnessCrossfitProEventSourcingLedger - historical rewind accuracy', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  ledger.appendEvent('WORKOUT_STARTED', { name: 'Murph', workoutId: 'w1' });   // t=1000
  clock.tick();
  ledger.appendEvent('EXERCISE_LOGGED', { name: 'Pull-ups', sets: 3, reps: 10, weight: 0, workoutId: 'w1' }); // t=2000
  clock.tick();
  ledger.appendEvent('WORKOUT_ENDED', { workoutId: 'w1' });                       // t=3000
  clock.tick();
  ledger.appendEvent('WEIGHT_UPDATED', { weight: 85 });                           // t=4000

  // Rewind to before workout ended: current workout still active
  const atT2000 = ledger.replayToTimestamp(2000);
  assert.equal(atT2000.totalWorkouts, 1);
  assert.equal(atT2000.totalExercises, 1);
  assert.equal(atT2000.currentWorkoutId, 'w1');
  assert.equal(atT2000.workouts[0].endedAt, null);

  // Rewind to after workout ended but before weight updated: bodyWeight still 0
  const atT3000 = ledger.replayToTimestamp(3000);
  assert.equal(atT3000.workouts[0].endedAt, 3000);
  assert.equal(atT3000.currentWorkoutId, null);
  assert.equal(atT3000.bodyWeight, 0);

  // Rewind after weight updated: bodyWeight 85
  const atT4000 = ledger.replayToTimestamp(4000);
  assert.equal(atT4000.bodyWeight, 85);

  // Before any events: genesis state
  const atT0 = ledger.replayToTimestamp(0);
  assert.equal(atT0.totalWorkouts, 0);
  assert.equal(atT0.totalExercises, 0);
  assert.equal(atT0.bodyWeight, 0);

  // Future timestamp: full materialized state
  const atFuture = ledger.replayToTimestamp(999999);
  assert.deepEqual(atFuture, ledger.getMaterializedState());
});

test('FitnessCrossfitProEventSourcingLedger - forward/backward time travel is monotonic', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  ledger.appendEvent('WORKOUT_STARTED', { name: 'Fran', workoutId: 'w1' }); // t=1000
  clock.tick();
  ledger.appendEvent('EXERCISE_LOGGED', { name: 'Thrusters', sets: 3, reps: 21, weight: 45, workoutId: 'w1' }); // t=2000

  const states = [
    ledger.replayToTimestamp(500),   // before all
    ledger.replayToTimestamp(1000),  // after started
    ledger.replayToTimestamp(2000),  // after exercise logged
    ledger.replayToTimestamp(5000)   // full
  ];

  // Exercise count should be non-decreasing as we move forward in time
  const counts = states.map(s => s.totalExercises);
  for (let i = 1; i < counts.length; i++) {
    assert.ok(counts[i] >= counts[i - 1], `exercises should not decrease: ${counts}`);
  }
  assert.deepEqual(counts, [0, 0, 1, 1]);

  // Volume non-decreasing
  const volumes = states.map(s => s.totalVolume);
  for (let i = 1; i < volumes.length; i++) {
    assert.ok(volumes[i] >= volumes[i - 1], `volume should not decrease: ${volumes}`);
  }
  assert.deepEqual(volumes, [0, 0, 3 * 21 * 45, 3 * 21 * 45]);
});

test('FitnessCrossfitProEventSourcingLedger - getEventTypes returns supported types', () => {
  const ledger = new FitnessCrossfitProEventSourcingLedger();
  const types = ledger.getEventTypes();
  assert.ok(Array.isArray(types));
  assert.ok(types.includes('WORKOUT_STARTED'));
  assert.ok(types.includes('EXERCISE_LOGGED'));
  assert.ok(types.includes('WORKOUT_ENDED'));
  assert.ok(types.includes('WEIGHT_UPDATED'));
  assert.ok(types.includes('PR_SET'));
});

test('FitnessCrossfitProEventSourcingLedger - clear removes all events', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  ledger.appendEvent('WORKOUT_STARTED', { name: 'Test' });
  assert.equal(ledger.getEventCount(), 1);

  ledger.clear();
  assert.equal(ledger.getEventCount(), 0);
  assert.deepEqual(ledger.getEvents(), []);
  const state = ledger.getMaterializedState();
  assert.equal(state.totalWorkouts, 0);
});

test('FitnessCrossfitProEventSourcingLedger - PR_SET records personal records', () => {
  const clock = fakeClock(1000);
  const ledger = new FitnessCrossfitProEventSourcingLedger({ clock: clock.now });

  ledger.appendEvent('PR_SET', { exercise: 'Deadlift', weight: 200 });
  ledger.appendEvent('PR_SET', { exercise: 'Squat', weight: 150 });

  const state = ledger.getMaterializedState();
  assert.equal(state.prs.length, 2);
  assert.equal(state.prs[0].exercise, 'Deadlift');
  assert.equal(state.prs[0].weight, 200);
  assert.equal(state.prs[1].exercise, 'Squat');
  assert.equal(state.prs[1].weight, 150);
});
