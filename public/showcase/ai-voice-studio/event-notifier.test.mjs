import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioNotificationManager } from './event-notifier.js';

test('AiVoiceStudioNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new AiVoiceStudioNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'Model Downloaded', 'Checkpoint cached in IndexedDB', { duration: 0 });
  manager.dispatch('danger', 'Vocoder Failure', 'Inference timeout exceeded', { duration: 0 });
  manager.dispatch('warning', 'High VRAM', 'WebGPU buffer nearing capacity', { duration: 0 });
  manager.dispatch('success', 'Synthesis Complete', 'Rendered speech waveform', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active voice studio alerts', () => {
  const manager = new AiVoiceStudioNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Buffer Warning', 'Audio buffer underrun detected', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact duplicate
  const duplicate = manager.dispatch('warning', 'Buffer Warning', 'Audio buffer underrun detected', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new AiVoiceStudioNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Voice Ping 1', 'Sample rate ok', { duration: 0 });
  manager.dispatch('info', 'Voice Ping 2', 'Pitch scale normalized', { duration: 0 });
  manager.dispatch('info', 'Voice Ping 3', 'Phoneme map verified', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // Critical alert evicts lowest priority info item
  manager.dispatch('danger', 'Audio Core Crash', 'AudioContext hardware disconnected', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new AiVoiceStudioNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Quick Ping', 'Ephemeral toast message', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
