import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataFilterEngine, SAMPLE_ROBOTICS_DATA } from './search-filter.js';

test('RoboticsAutomataFilterEngine - case-insensitive keyword search', () => {
  const engine = new RoboticsAutomataFilterEngine(SAMPLE_ROBOTICS_DATA);
  const arms = engine.filterByKeyword('welder');
  assert.equal(arms.length, 1);
  assert.equal(arms[0].name, 'Cobot Arm V6 - Precision Welder');

  const upperQuery = engine.filterByKeyword('MOBILE BASE');
  assert.equal(upperQuery.length, 1);
  assert.equal(upperQuery[0].name, 'Autonomous Mobile Base AMR-200');
});

test('RoboticsAutomataFilterEngine - compound tag filtering', () => {
  const engine = new RoboticsAutomataFilterEngine(SAMPLE_ROBOTICS_DATA);
  engine.toggleTag('active');
  let activeRobots = engine.getFilteredAndSorted();
  assert.equal(activeRobots.length, 3); // Cobot, Delta, SCARA

  engine.toggleTag('6dof');
  let activeAnd6dof = engine.getFilteredAndSorted();
  assert.equal(activeAnd6dof.length, 1);
  assert.equal(activeAnd6dof[0].name, 'Cobot Arm V6 - Precision Welder');

  // Untoggle
  engine.toggleTag('6dof');
  assert.equal(engine.getFilteredAndSorted().length, 3);
});

test('RoboticsAutomataFilterEngine - multi-column ascending/descending sorting precision', () => {
  const engine = new RoboticsAutomataFilterEngine(SAMPLE_ROBOTICS_DATA);

  // Payload ascending
  engine.sort('payloadKg', 'asc');
  let sortedPayloadAsc = engine.getFilteredAndSorted();
  assert.equal(sortedPayloadAsc[0].payloadKg, 3);
  assert.equal(sortedPayloadAsc[sortedPayloadAsc.length - 1].payloadKg, 500);

  // Payload descending
  engine.sort('payloadKg', 'desc');
  let sortedPayloadDesc = engine.getFilteredAndSorted();
  assert.equal(sortedPayloadDesc[0].payloadKg, 500);
  assert.equal(sortedPayloadDesc[sortedPayloadDesc.length - 1].payloadKg, 3);

  // Name alphabetical
  engine.sort('name', 'asc');
  let sortedNameAsc = engine.getFilteredAndSorted();
  assert.equal(sortedNameAsc[0].name, 'Autonomous Mobile Base AMR-200');
});

test('RoboticsAutomataFilterEngine - combined search, tag, and sort', () => {
  const engine = new RoboticsAutomataFilterEngine(SAMPLE_ROBOTICS_DATA);
  engine.filterByKeyword('robot');
  engine.toggleTag('active');
  engine.sort('payloadKg', 'desc');

  const results = engine.getFilteredAndSorted();
  assert.ok(results.length > 0);
  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i].payloadKg >= results[i + 1].payloadKg);
  }
});

test('RoboticsAutomataFilterEngine - reset filters restores complete dataset', () => {
  const engine = new RoboticsAutomataFilterEngine(SAMPLE_ROBOTICS_DATA);
  engine.filterByKeyword('nonexistent-actuator');
  assert.equal(engine.getFilteredAndSorted().length, 0);

  engine.resetFilters();
  assert.equal(engine.getFilteredAndSorted().length, SAMPLE_ROBOTICS_DATA.length);
});
