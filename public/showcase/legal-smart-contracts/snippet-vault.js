/**
 * Legal Smart Contracts - Preset Snippet Library & Tag-Based Search Vault
 * Provides categorized smart contract clause presets, multi-token search, and clipboard export.
 */

export class LegalSmartContractsSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'escrow-timelock',
        title: 'Timelocked Escrow Release Clause',
        code: `modifier onlyAfterUnlock() {\n  require(block.timestamp >= unlockTime, "Contract: Escrow is locked");\n  _;\n}\n\nfunction releaseEscrow(address payable recipient) external onlyOwner onlyAfterUnlock {\n  uint256 balance = address(this).balance;\n  require(balance > 0, "No funds");\n  recipient.transfer(balance);\n  emit EscrowReleased(recipient, balance);\n}`,
        tags: ['escrow', 'timelock', 'security', 'solidity']
      },
      {
        id: 'arbitration-clause',
        title: 'Decentralized Arbitration Routing Clause',
        code: `function fileDispute(bytes32 contractHash, bytes calldata evidence) external payable returns (uint256 disputeId) {\n  require(msg.value >= arbitrationFee, "Insufficient arb fee");\n  disputeId = arbitrator.createDispute{value: msg.value}(disputeRulingsCount, contractHash);\n  disputes[disputeId] = Dispute({ status: DisputeStatus.Active, claimant: msg.sender, hash: contractHash });\n  emit DisputeOpened(disputeId, msg.sender);\n}`,
        tags: ['arbitration', 'dispute', 'compliance', 'governance']
      },
      {
        id: 'reentrancy-guard',
        title: 'Zero-Gas Reentrancy Lock Pattern',
        code: `uint256 private constant _NOT_ENTERED = 1;\nuint256 private constant _ENTERED = 2;\nuint256 private _status = _NOT_ENTERED;\n\nmodifier nonReentrant() {\n  require(_status != _ENTERED, "ReentrancyGuard: reentrant call");\n  _status = _ENTERED;\n  _;\n  _status = _NOT_ENTERED;\n}`,
        tags: ['security', 'solidity', 'audit', 'best-practice']
      },
      {
        id: 'e-signature-verify',
        title: 'ERC-712 EIP Typed Structured Data Signer',
        code: `function verifySignature(bytes32 digest, bytes memory sig, address signer) public pure returns (bool) {\n  bytes32 ethSignedDigest = ECDSA.toEthSignedMessageHash(digest);\n  return ECDSA.recover(ethSignedDigest, sig) == signer;\n}`,
        tags: ['cryptography', 'signatures', 'compliance', 'identity']
      },
      {
        id: 'royalty-split',
        title: 'Multi-Party Royalty Distribution Splitter',
        code: `function distributeRoyalties(address[] calldata payees, uint256[] calldata shares) external payable nonReentrant {\n  require(payees.length == shares.length, "Mismatched arrays");\n  for (uint256 i = 0; i < payees.length; i++) {\n    uint256 payment = (msg.value * shares[i]) / 10000;\n    payable(payees[i]).transfer(payment);\n  }\n}`,
        tags: ['payments', 'royalties', 'escrow', 'governance']
      }
    ];
  }

  getAllSnippets() {
    return [...this.snippets];
  }

  addSnippet(title, code, tags = []) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Snippet title is required');
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new Error('Snippet code content is required');
    }

    const trimmedTitle = title.trim();
    const id = trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Duplicate check
    const duplicate = this.snippets.some(s => s.id === id || s.title.toLowerCase() === trimmedTitle.toLowerCase());
    if (duplicate) {
      throw new Error(`Snippet with title or ID '${trimmedTitle}' already exists in vault.`);
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    const newSnippet = {
      id,
      title: trimmedTitle,
      code: code.trim(),
      tags: [...new Set(normalizedTags)]
    };

    this.snippets.push(newSnippet);
    return newSnippet;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') {
      return [...this.snippets];
    }
    const cleanTag = tag.trim().toLowerCase();
    return this.snippets.filter(s => s.tags.includes(cleanTag));
  }

  searchSnippets(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [...this.snippets];
    }

    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

    return this.snippets.filter(snippet => {
      const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
      return tokens.every(token => fullText.includes(token));
    });
  }

  getAllTags() {
    const tagSet = new Set();
    this.snippets.forEach(s => s.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('snippetsGrid');
    if (!grid) return;

    const vault = new LegalSmartContractsSnippetVault();
    let activeTag = 'all';
    let searchQuery = '';

    const searchInput = document.getElementById('searchQueryInput');
    const tagBar = document.getElementById('tagFilterBar');
    const toast = document.getElementById('copyToast');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function renderTagFilters() {
      if (!tagBar) return;
      tagBar.replaceChildren();

      const tags = ['all', ...vault.getAllTags()];
      tags.forEach(tag => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `filter-chip ${activeTag === tag ? 'active' : ''}`;
        chip.textContent = tag === 'all' ? '✦ All Clauses' : `#${tag}`;
        chip.addEventListener('click', () => {
          activeTag = tag;
          renderTagFilters();
          renderCards();
        });
        tagBar.appendChild(chip);
      });
    }

    function renderCards() {
      grid.replaceChildren();

      let results = activeTag === 'all' ? vault.getAllSnippets() : vault.filterByTag(activeTag);
      if (searchQuery) {
        const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        results = results.filter(snippet => {
          const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
          return tokens.every(token => fullText.includes(token));
        });
      }

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.gridColumn = '1 / -1';
        empty.style.textAlign = 'center';
        empty.style.padding = '3rem 1rem';
        empty.textContent = 'No smart contract snippets found matching your query.';
        grid.appendChild(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'card-top';

        const title = document.createElement('h3');
        title.className = 'snippet-title';
        title.textContent = item.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.textContent = '📋 Copy';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}" to clipboard!`);
          }).catch(() => {
            showToast('Snippet copied!');
          });
        });

        topRow.append(title, copyBtn);

        const codeBox = document.createElement('div');
        codeBox.className = 'code-container';
        const pre = document.createElement('pre');
        pre.textContent = item.code;
        codeBox.appendChild(pre);

        const tagList = document.createElement('div');
        tagList.className = 'tag-list';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'card-tag';
          tSpan.textContent = `#${t}`;
          tagList.appendChild(tSpan);
        }

        card.append(topRow, codeBox, tagList);
        grid.appendChild(card);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCards();
      });
    }

    renderTagFilters();
    renderCards();
  });
}
