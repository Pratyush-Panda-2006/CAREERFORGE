import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyFsmVisualizer } from './state-diagram.js';

describe('EdtechAcademyFsmVisualizer', () => {
  it('initializes in COURSE_ENROLLED state with predefined academic transitions', () => {
    const fsm = new EdtechAcademyFsmVisualizer();
    assert.equal(fsm.currentState, 'COURSE_ENROLLED');
    assert.ok(fsm.transitions.length >= 6);
    assert.ok(fsm.states.has('LESSON_PROGRESS'));
    assert.ok(fsm.states.has('CERTIFICATE_ISSUED'));
  });

  it('transitions sequentially through learning journey lifecycle', () => {
    const fsm = new EdtechAcademyFsmVisualizer();

    let res = fsm.dispatch('START_LESSON');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'LESSON_PROGRESS');

    res = fsm.dispatch('TAKE_QUIZ');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'QUIZ_ASSESSMENT');

    res = fsm.dispatch('SUBMIT_PROJECT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'PROJECT_SUBMISSION');

    res = fsm.dispatch('REQUEST_PEER_REVIEW');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'PEER_REVIEW');

    res = fsm.dispatch('APPROVE_GRADUATION');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CERTIFICATE_ISSUED');

    res = fsm.dispatch('ARCHIVE_COURSE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'COURSE_ENROLLED');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new EdtechAcademyFsmVisualizer();
    const res = fsm.dispatch('APPROVE_GRADUATION');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'COURSE_ENROLLED');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('supports quiz retake and project revision loops back to lessons', () => {
    const fsm = new EdtechAcademyFsmVisualizer();
    fsm.dispatch('START_LESSON');
    fsm.dispatch('TAKE_QUIZ');
    assert.equal(fsm.currentState, 'QUIZ_ASSESSMENT');

    const res = fsm.dispatch('RETAKE_LESSON');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'LESSON_PROGRESS');
  });

  it('dynamically registers custom transitions and expands state universe', () => {
    const fsm = new EdtechAcademyFsmVisualizer();
    fsm.addTransition('COURSE_ENROLLED', 'TEST_OUT', 'CERTIFICATE_ISSUED');

    const res = fsm.dispatch('TEST_OUT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CERTIFICATE_ISSUED');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition with state transitions', () => {
    const fsm = new EdtechAcademyFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.match(mermaid, /^stateDiagram-v2/);
    assert.match(mermaid, /\[\*\] --> COURSE_ENROLLED/);
    assert.match(mermaid, /COURSE_ENROLLED --> LESSON_PROGRESS : START_LESSON/);
  });

  it('records chronological transition history and resets state safely', () => {
    const fsm = new EdtechAcademyFsmVisualizer();
    fsm.dispatch('START_LESSON');
    fsm.dispatch('TAKE_QUIZ');
    assert.equal(fsm.history.length, 2);

    fsm.reset();
    assert.equal(fsm.currentState, 'COURSE_ENROLLED');
    assert.equal(fsm.history.length, 0);
  });
});
