/**
 * CybersecuritySentinelSnippetVault
 * Reusable preset snippet library & tag-based search vault for YARA rules, Sigma templates, and IDS signatures.
 */
export class CybersecuritySentinelSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = new Map();

    const defaults = initialSnippets || [
      {
        id: 'cs-yara-cobalt',
        title: 'YARA Rule: Cobalt Strike Beacon Memory Pattern',
        description: 'Scans running process memory space for default named pipes and staged beacon watermarks.',
        code: `rule CobaltStrike_Beacon_Generic {
  meta:
    description = "Detects in-memory Cobalt Strike Beacon payload"
    author = "Sentinel-SOC"
    reference = "MITRE ATT&CK T1059"
  strings:
    $pipe1 = "\\\\.\\pipe\\msagent_" ascii wide
    $pipe2 = "\\\\.\\pipe\\status_" ascii wide
    $magic = { 4D 5A 41 52 55 48 89 E5 }
  condition:
    uint16(0) == 0x5A4D and ($magic or any of ($pipe*))
}`,
        tags: ['yara', 'malware', 'threat-hunting', 'c2']
      },
      {
        id: 'cs-sigma-wmi-lateral',
        title: 'Sigma Rule: Lateral Movement via WMI Process Call',
        description: 'Detects remote process execution using wmic.exe or PowerShell WMI calls across internal subnets.',
        code: `title: Remote Process Creation via WMI
id: b32a8490-581b-410a-9d62-120938f830a1
status: test
description: Detects wmic process call create targeting remote host
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith: '\\wmic.exe'
    CommandLine|contains|all:
      - '/node:'
      - 'process'
      - 'call'
      - 'create'
  condition: selection
falsepositives:
  - Legitimate IT management scripts
level: high`,
        tags: ['sigma', 'lateral-movement', 'siem', 'detection']
      },
      {
        id: 'cs-suricata-kerberoast',
        title: 'Suricata Rule: Active Directory Kerberoasting Activity',
        description: 'Flags excessive RC4-HMAC ticket-granting service requests associated with offline TGS cracking.',
        code: `alert krb5 $HOME_NET any -> $EXTERNAL_NET 88 (
  msg:"SENTINEL AD Kerberos TGS-REQ RC4-HMAC Ticket Request (Potential Kerberoast)";
  flow:to_server,established;
  content:"|05|"; offset:0; depth:1;
  content:"|a2|"; distance:0;
  content:"|17|"; distance:2;
  classtype:credential-theft;
  sid:20260401;
  rev:1;
)`,
        tags: ['suricata', 'ids', 'active-directory', 'kerberos']
      },
      {
        id: 'cs-iptables-quarantine',
        title: 'Linux IP Isolation & Zero-Trust Quarantine Script',
        description: 'Bypasses standard interfaces to drop all incoming and outgoing connections except SOC logging port.',
        code: `#!/bin/bash
# Host Emergency Isolation Script
TARGET_IP="$1"
echo "Isolating compromised host: $TARGET_IP"
iptables -F
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -p tcp -s 10.0.0.5 --dport 514 -j ACCEPT
iptables -A OUTPUT -p tcp -d 10.0.0.5 --dport 514 -j ACCEPT`,
        tags: ['firewall', 'quarantine', 'incident-response', 'linux']
      },
      {
        id: 'cs-snort-sqli',
        title: 'SNORT Rule: SQL Injection Boolean Extraction Signature',
        description: 'Detects blind SQL injection union and comment bypasses targeting web applications.',
        code: `alert tcp $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
  msg:"SENTINEL WEB-ATTACKS Blind SQL Injection 'OR 1=1' Union Select";
  flow:to_server,established;
  content:"union"; nocase;
  content:"select"; nocase;
  pcre:"/(\\x27|%27)(\\s)*(or|union|and)(\\s)*.*(\\x3D|=|--)/i";
  classtype:web-application-attack;
  sid:20260909;
  rev:2;
)`,
        tags: ['snort', 'sqli', 'web-security', 'ids']
      }
    ];

    for (const item of defaults) {
      this.addSnippet(item);
    }
  }

  addSnippet(snippet) {
    if (!snippet || !snippet.title || !snippet.code) {
      throw new Error('Snippet requires title and code');
    }

    const id = snippet.id || `cs-snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (this.snippets.has(id)) {
      throw new Error(`Snippet with ID "${id}" already exists`);
    }

    const normalizedTags = Array.isArray(snippet.tags)
      ? snippet.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : [];

    const item = {
      id,
      title: String(snippet.title).trim(),
      description: snippet.description ? String(snippet.description).trim() : '',
      code: String(snippet.code).trim(),
      tags: normalizedTags,
      createdAt: snippet.createdAt || new Date().toISOString()
    };

    this.snippets.set(id, item);
    return item;
  }

  getById(id) {
    return this.snippets.get(id) || null;
  }

  removeSnippet(id) {
    return this.snippets.delete(id);
  }

  getAll() {
    return Array.from(this.snippets.values());
  }

  getAllTags() {
    const tagsSet = new Set();
    for (const item of this.snippets.values()) {
      for (const tag of item.tags) {
        tagsSet.add(tag);
      }
    }
    return Array.from(tagsSet).sort();
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') {
      return this.getAll();
    }
    const cleanTag = String(tag).trim().toLowerCase();
    return this.getAll().filter(item => item.tags.includes(cleanTag));
  }

  searchSnippets(query) {
    if (!query || !query.trim()) {
      return this.getAll();
    }
    const tokens = query.trim().toLowerCase().split(/\s+/);
    return this.getAll().filter(item => {
      const targetText = `${item.title} ${item.description} ${item.tags.join(' ')} ${item.code}`.toLowerCase();
      return tokens.every(token => targetText.includes(token));
    });
  }

  render(container, options = {}) {
    if (!container) return;
    container.replaceChildren();

    const items = options.items || this.getAll();
    const onCopy = options.onCopy || null;

    if (items.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'cs-empty-vault';
      emptyMsg.textContent = 'No security rules match your query.';
      container.append(emptyMsg);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'cs-snippet-card';
      card.dataset.id = item.id;

      const cardHeader = document.createElement('div');
      cardHeader.className = 'cs-snippet-header';

      const title = document.createElement('h3');
      title.className = 'cs-snippet-title';
      title.textContent = item.title;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'cs-btn-copy';
      copyBtn.textContent = 'Copy Rule';
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(item.code);
        }
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Rule';
        }, 1500);
        if (onCopy) onCopy(item);
      });

      cardHeader.append(title, copyBtn);

      const desc = document.createElement('p');
      desc.className = 'cs-snippet-desc';
      desc.textContent = item.description;

      const codePre = document.createElement('pre');
      codePre.className = 'cs-snippet-code';
      const codeElem = document.createElement('code');
      codeElem.textContent = item.code;
      codePre.append(codeElem);

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'cs-snippet-tags';
      for (const tag of item.tags) {
        const badge = document.createElement('span');
        badge.className = 'cs-tag-chip';
        badge.textContent = `#${tag}`;
        tagsContainer.append(badge);
      }

      card.append(cardHeader, desc, codePre, tagsContainer);
      container.append(card);
    }
  }
}
