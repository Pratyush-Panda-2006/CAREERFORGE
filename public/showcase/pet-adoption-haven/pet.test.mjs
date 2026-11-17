import test from 'node:test';
import assert from 'node:assert/strict';
import { matchPetCompatibility } from './script.js';

test('Perfect lifestyle match scores 100', () => {
  const user = { hasYard: true, activityLevel: 'high', hasKids: true };
  const pet = { needsYard: true, energyLevel: 'high', goodWithKids: true };
  assert.equal(matchPetCompatibility(user, pet), 100);
});