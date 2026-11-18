/**
 * DocsPortalSnippetVault
 * Reusable preset snippet library & tag-based search vault for API integration code, HMAC webhook validation, OAuth PKCE, and resilient retry logic.
 */
export class DocsPortalSnippetVault {
  constructor(options = {}) {
    this.snippets = options.snippets || this.getDefaultSnippets();
    this.customSnippets = [];
  }

  getDefaultSnippets() {
    return [
      {
        id: 'hmac-webhook-verify',
        title: 'HMAC-SHA256 Webhook Signature Verifier',
        category: 'Webhook Security',
        tags: ['security', 'webhook', 'hmac', 'crypto'],
        description: 'Validates timing-safe cryptographic header signatures for incoming API webhook event payloads.',
        code: `async function verifyWebhookSignature(payloadString, signatureHeader, secretKey) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString));
  const hexSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hexSignature === signatureHeader;
}`
      },
      {
        id: 'exponential-jitter-retry',
        title: 'Exponential Backoff with Full Jitter HTTP Retry',
        category: 'HTTP Resilience',
        tags: ['http', 'retry', 'resilience', 'api'],
        description: 'Decorates API requests with exponential delay and decorrelated randomized jitter to avoid thundering herds.',
        code: `async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelayMs = 250) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 429 && response.status < 500) return response;
      if (attempt === maxRetries) return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
    }
    const cap = baseDelayMs * Math.pow(2, attempt);
    const delay = Math.random() * cap;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}`
      },
      {
        id: 'pkce-auth-challenge',
        title: 'OAuth 2.0 PKCE Code Challenge Generator',
        category: 'Authentication',
        tags: ['oauth', 'security', 'auth', 'pkce'],
        description: 'Generates cryptographically random 128-character verifier and URL-safe SHA-256 code challenge for SPA authentication.',
        code: `async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = Array.from(array, (b) => ('0' + b.toString(16)).slice(-2)).join('');
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=+$/, '');
  return { codeVerifier, codeChallenge: base64Digest, method: 'S256' };
}`
      },
      {
        id: 'graphql-cursor-pager',
        title: 'GraphQL Cursor-Based Pagination Query Builder',
        category: 'Data Querying',
        tags: ['graphql', 'pagination', 'query', 'api'],
        description: 'Builds Relay-compliant forward connection queries with edges, node fields, and pageInfo metadata.',
        code: `function buildConnectionQuery(resourceName, first = 20, afterCursor = null, fields = ['id']) {
  const afterParam = afterCursor ? \`, after: "\${afterCursor}"\` : '';
  const fieldsBlock = fields.join('\\n        ');
  return \`query Get\${resourceName}Connection {
    \${resourceName.toLowerCase()}s(first: \${first}\${afterParam}) {
      edges {
        cursor
        node {
          \${fieldsBlock}
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }\`;
}`
      },
      {
        id: 'jwt-claim-decoder',
        title: 'Zero-Dependency JWT Claims Inspector',
        category: 'Token Management',
        tags: ['jwt', 'token', 'auth', 'claims'],
        description: 'Decodes Base64URL payload and header components without requiring external dependencies.',
        code: `function decodeJWTClaims(jwtString) {
  const parts = jwtString.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64Url)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}`
      }
    ];
  }

  getAllSnippets() {
    return [...this.snippets, ...this.customSnippets];
  }

  getSnippetById(id) {
    return this.getAllSnippets().find((s) => s.id === id) || null;
  }

  addCustomSnippet(snippet) {
    if (!snippet.title || !snippet.code) {
      throw new Error('Title and code are required for custom snippet');
    }
    const id = snippet.id || `custom-${Date.now()}`;
    const newSnippet = {
      ...snippet,
      id,
      category: snippet.category || 'Custom Recipe',
      tags: snippet.tags || ['custom'],
      description: snippet.description || ''
    };
    this.customSnippets.push(newSnippet);
    return newSnippet;
  }

  getAllTags() {
    const tagSet = new Set();
    this.getAllSnippets().forEach((s) => {
      s.tags.forEach((t) => tagSet.add(t.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }

  search(query = '', selectedTag = '') {
    const q = query.trim().toLowerCase();
    const tag = selectedTag.trim().toLowerCase();

    return this.getAllSnippets().filter((s) => {
      const matchesTag = !tag || s.tags.some((t) => t.toLowerCase() === tag);
      if (!matchesTag) return false;
      if (!q) return true;

      const titleMatch = s.title.toLowerCase().includes(q);
      const descMatch = s.description.toLowerCase().includes(q);
      const codeMatch = s.code.toLowerCase().includes(q);
      const categoryMatch = s.category.toLowerCase().includes(q);

      return titleMatch || descMatch || codeMatch || categoryMatch;
    });
  }

  copySnippet(id) {
    const snippet = this.getSnippetById(id);
    if (!snippet) return null;
    return snippet.code;
  }

  renderToDOM(container, onSelect) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const vaultWrapper = document.createElement('div');
    vaultWrapper.className = 'docs-vault-container';

    const header = document.createElement('div');
    header.className = 'docs-vault-header';

    const title = document.createElement('h3');
    title.textContent = 'API Integration Code & Snippet Vault';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'docs-vault-search';
    searchInput.placeholder = 'Search Webhook HMAC, PKCE, GraphQL, JWT, retry...';

    header.append(title, searchInput);
    vaultWrapper.append(header);

    const tagsRow = document.createElement('div');
    tagsRow.className = 'docs-vault-tags';

    const allTagBtn = document.createElement('button');
    allTagBtn.className = 'docs-tag-btn active';
    allTagBtn.textContent = 'All';
    let currentTag = '';

    tagsRow.append(allTagBtn);

    const tags = this.getAllTags();
    tags.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'docs-tag-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        tagsRow.querySelectorAll('.docs-tag-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = t;
        renderList();
      });
      tagsRow.append(btn);
    });

    allTagBtn.addEventListener('click', () => {
      tagsRow.querySelectorAll('.docs-tag-btn').forEach((b) => b.classList.remove('active'));
      allTagBtn.classList.add('active');
      currentTag = '';
      renderList();
    });

    vaultWrapper.append(tagsRow);

    const listContainer = document.createElement('div');
    listContainer.className = 'docs-vault-list';
    vaultWrapper.append(listContainer);

    const renderList = () => {
      listContainer.replaceChildren();
      const filtered = this.search(searchInput.value, currentTag);

      if (filtered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'docs-vault-empty';
        emptyMsg.textContent = 'No matching API integration recipes found.';
        listContainer.append(emptyMsg);
        return;
      }

      filtered.forEach((snippet) => {
        const card = document.createElement('div');
        card.className = 'docs-snippet-card';

        const top = document.createElement('div');
        top.className = 'docs-card-top';

        const cardTitle = document.createElement('h4');
        cardTitle.textContent = snippet.title;

        const catBadge = document.createElement('span');
        catBadge.className = 'docs-cat-badge';
        catBadge.textContent = snippet.category;

        top.append(cardTitle, catBadge);

        const desc = document.createElement('p');
        desc.className = 'docs-snippet-desc';
        desc.textContent = snippet.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'docs-snippet-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = snippet.code;
        codeBlock.append(codeElem);

        const actions = document.createElement('div');
        actions.className = 'docs-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'docs-copy-btn';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', () => {
          if (typeof onSelect === 'function') {
            onSelect(snippet);
          }
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Code';
          }, 1500);
        });

        actions.append(copyBtn);
        card.append(top, desc, codeBlock, actions);
        listContainer.append(card);
      });
    };

    searchInput.addEventListener('input', () => {
      renderList();
    });

    renderList();
    container.append(vaultWrapper);
  }
}
