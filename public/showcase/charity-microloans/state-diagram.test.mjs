import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansFsmVisualizer } from './state-diagram.js';

describe('CharityMicroloansFsmVisualizer', () => {
  it('initializes with default APPLICATION_DRAFT state and microloan transitions', () => {
    const fsm = new CharityMicroloansFsmVisualizer();
    assert.equal(fsm.getState(), 'APPLICATION_DRAFT');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'SUBMIT_FOR_VOUCHING'));
  });

  it('updates state upon valid dispatched loan lifecycle transitions', () => {
    const fsm = new CharityMicroloansFsmVisualizer();
    const result1 = fsm.dispatch('SUBMIT_FOR_VOUCHING');
    assert.equal(result1.previousState, 'APPLICATION_DRAFT');
    assert.equal(result1.currentState, 'COMMUNITY_VOUCHING');
    assert.equal(fsm.getState(), 'COMMUNITY_VOUCHING');

    const result2 = fsm.dispatch('VOUCH_CONFIRMED');
    assert.equal(result2.currentState, 'CREDIT_APPRAISAL');
    assert.equal(fsm.getState(), 'CREDIT_APPRAISAL');

    const result3 = fsm.dispatch('APPROVE_CAMPAIGN');
    assert.equal(result3.currentState, 'CAMPAIGN_FUNDING');
    assert.equal(fsm.getState(), 'CAMPAIGN_FUNDING');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new CharityMicroloansFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('TRANSFER_CAPITAL');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'APPLICATION_DRAFT');
  });

  it('supports custom transition additions and cyclic loan grace restructuring graph execution', () => {
    const fsm = new CharityMicroloansFsmVisualizer({
      initialState: 'SPECIAL_AUDIT',
      transitions: []
    });
    fsm.addTransition('SPECIAL_AUDIT', 'FIELD_VERIFY', 'AUDIT_APPROVED');
    fsm.addTransition('AUDIT_APPROVED', 'NEW_INQUIRY', 'SPECIAL_AUDIT');

    assert.equal(fsm.getState(), 'SPECIAL_AUDIT');
    fsm.dispatch('FIELD_VERIFY');
    assert.equal(fsm.getState(), 'AUDIT_APPROVED');
    fsm.dispatch('NEW_INQUIRY');
    assert.equal(fsm.getState(), 'SPECIAL_AUDIT');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new CharityMicroloansFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> APPLICATION_DRAFT'));
    assert.ok(mermaid.includes('APPLICATION_DRAFT --> COMMUNITY_VOUCHING: SUBMIT_FOR_VOUCHING'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new CharityMicroloansFsmVisualizer();
    fsm.dispatch('SUBMIT_FOR_VOUCHING');
    fsm.reset();
    assert.equal(fsm.getState(), 'APPLICATION_DRAFT');
    assert.ok(fsm.getHistory().length >= 3);
  });
});
