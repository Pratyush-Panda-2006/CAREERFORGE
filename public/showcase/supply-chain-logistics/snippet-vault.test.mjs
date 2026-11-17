import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsSnippetVault } from './snippet-vault.js';

describe('SupplyChainLogisticsSnippetVault', () => {
  it('should filter trade presets accurately by category tag', () => {
    const vault = new SupplyChainLogisticsSnippetVault();
    const ediPresets = vault.filterByTag('edi');

    assert.ok(ediPresets.length > 0);
    assert.ok(ediPresets.every(p => p.tags.includes('edi')));
  });

  it('should search presets with multi-token query across title, code, and tags', () => {
    const vault = new SupplyChainLogisticsSnippetVault();
    const results = vault.searchSnippets('incoterms risk');

    assert.ok(results.length > 0);
    assert.ok(results[0].title.toLowerCase().includes('incoterms'));
  });

  it('should prevent adding duplicate presets with same title or identifier', () => {
    const vault = new SupplyChainLogisticsSnippetVault();

    assert.throws(() => {
      vault.addSnippet('ANSI X12 EDI 214 Transportation Carrier Shipment Status', 'ISA*', ['edi']);
    }, /already exists/);
  });

  it('should allow adding new customs tariff presets and maintain unique tags', () => {
    const vault = new SupplyChainLogisticsSnippetVault();
    const created = vault.addSnippet(
      'Automated Commercial Environment ACE Manifest Transmission',
      'const acePayload = { entry_type: "01" };',
      ['ace', 'cbp', 'customs']
    );

    assert.equal(created.id, 'automated-commercial-environment-ace-manifest-transmission');
    assert.ok(vault.getAllTags().includes('ace'));
  });
});
