import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsFsmVisualizer } from './state-diagram.js';

describe('LegalSmartContractsFsmVisualizer', () => {
  it('initializes with default DRAFT_PENDING state and contract transitions', () => {
    const fsm = new LegalSmartContractsFsmVisualizer();
    assert.equal(fsm.getState(), 'DRAFT_PENDING');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'SUBMIT_FOR_REVIEW'));
  });

  it('updates state upon valid dispatched contract lifecycle transitions', () => {
    const fsm = new LegalSmartContractsFsmVisualizer();
    const result1 = fsm.dispatch('SUBMIT_FOR_REVIEW');
    assert.equal(result1.previousState, 'DRAFT_PENDING');
    assert.equal(result1.currentState, 'COUNTERPARTY_REVIEW');
    assert.equal(fsm.getState(), 'COUNTERPARTY_REVIEW');

    const result2 = fsm.dispatch('APPROVE_TERMS');
    assert.equal(result2.currentState, 'SIGNATURES_COLLECTED');
    assert.equal(fsm.getState(), 'SIGNATURES_COLLECTED');

    const result3 = fsm.dispatch('DEPOSIT_COLLATERAL');
    assert.equal(result3.currentState, 'ESCROW_LOCKED');
    assert.equal(fsm.getState(), 'ESCROW_LOCKED');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new LegalSmartContractsFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('TRIGGER_SETTLEMENT');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'DRAFT_PENDING');
  });

  it('supports custom transition additions and cyclic dispute graph execution', () => {
    const fsm = new LegalSmartContractsFsmVisualizer({
      initialState: 'ARBITRATION_PENDING',
      transitions: []
    });
    fsm.addTransition('ARBITRATION_PENDING', 'REQUEST_EVIDENCE', 'EVIDENCE_SUBMISSION');
    fsm.addTransition('EVIDENCE_SUBMISSION', 'SUBMIT_DOCS', 'ARBITRATION_PENDING');

    assert.equal(fsm.getState(), 'ARBITRATION_PENDING');
    fsm.dispatch('REQUEST_EVIDENCE');
    assert.equal(fsm.getState(), 'EVIDENCE_SUBMISSION');
    fsm.dispatch('SUBMIT_DOCS');
    assert.equal(fsm.getState(), 'ARBITRATION_PENDING');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new LegalSmartContractsFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> DRAFT_PENDING'));
    assert.ok(mermaid.includes('DRAFT_PENDING --> COUNTERPARTY_REVIEW: SUBMIT_FOR_REVIEW'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new LegalSmartContractsFsmVisualizer();
    fsm.dispatch('SUBMIT_FOR_REVIEW');
    fsm.reset();
    assert.equal(fsm.getState(), 'DRAFT_PENDING');
    assert.ok(fsm.getHistory().length >= 3);
  });
});
