import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataSnippetVault } from './snippet-vault.js';

describe('RoboticsAutomataSnippetVault', () => {
  it('should filter robotics presets accurately by category tag', () => {
    const vault = new RoboticsAutomataSnippetVault();
    const pidPresets = vault.filterByTag('pid');

    assert.ok(pidPresets.length > 0);
    assert.ok(pidPresets.every(p => p.tags.includes('pid')));
  });

  it('should search presets with multi-token query across title, code, and tags', () => {
    const vault = new RoboticsAutomataSnippetVault();
    const results = vault.searchSnippets('quintic trajectory');

    assert.ok(results.length > 0);
    assert.ok(results[0].title.toLowerCase().includes('quintic'));
  });

  it('should prevent adding duplicate presets with same title or identifier', () => {
    const vault = new RoboticsAutomataSnippetVault();

    assert.throws(() => {
      vault.addSnippet('6-DOF Articulated Robotic Manipulator Arm URDF Kinematic Chain', '<robot/>', ['urdf']);
    }, /already exists/);
  });

  it('should allow adding new kinematic presets and maintain unique tags', () => {
    const vault = new RoboticsAutomataSnippetVault();
    const created = vault.addSnippet(
      'Cartesian Impedance Compliant Contact Force Controller',
      'const stiffnessMatrixK = [[500, 0], [0, 500]];',
      ['impedance', 'force-control', 'dynamics']
    );

    assert.equal(created.id, 'cartesian-impedance-compliant-contact-force-controller');
    assert.ok(vault.getAllTags().includes('impedance'));
  });
});
