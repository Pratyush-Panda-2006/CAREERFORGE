const isScore = (score) => Number.isInteger(score) && score >= 1 && score <= 5;

export class LegalSmartContractsFeedbackWidget {
  constructor({ storage = null, key = 'lex-escrow-feedback', limit = 50 } = {}) {
    this.storage = storage;
    this.key = key;
    this.limit = limit;
    this.entries = this.load();
  }

  // Saved data may be missing, blocked or edited by hand, so only valid entries are kept.
  load() {
    try {
      const saved = JSON.parse(this.storage?.getItem(this.key) ?? '[]');
      return Array.isArray(saved) ? saved.filter((entry) => isScore(entry?.score)).slice(-this.limit) : [];
    } catch {
      return [];
    }
  }

  submitRating(score, comment = '') {
    if (!isScore(score)) return false;
    this.entries = [...this.entries, { score, comment: String(comment).trim().slice(0, 500) }].slice(-this.limit);
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.entries));
    } catch {
      // Storage is full or unavailable; the rating still counts until the page is closed.
    }
    return true;
  }

  getAverageRating() {
    if (!this.entries.length) return 0;
    const total = this.entries.reduce((sum, entry) => sum + entry.score, 0);
    return Math.round((total / this.entries.length) * 10) / 10;
  }

  hasUserVoted() {
    return this.entries.length > 0;
  }
}

if (typeof document !== 'undefined') {
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    // Some privacy modes throw on access.
  }
  const widget = new LegalSmartContractsFeedbackWidget({ storage });
  const form = document.querySelector('form');
  const thanks = document.getElementById('thanks');

  const showThanks = () => {
    const count = widget.entries.length;
    document.getElementById('summary').textContent =
      `Your average rating is ${widget.getAverageRating()} out of 5 from ${count} ${count === 1 ? 'answer' : 'answers'}.`;
    form.hidden = true;
    thanks.hidden = false;
  };

  if (widget.hasUserVoted()) showThanks();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (widget.submitRating(Number(data.get('score')), data.get('comment'))) showThanks();
  });
  document.getElementById('again').addEventListener('click', () => {
    form.reset();
    thanks.hidden = true;
    form.hidden = false;
    form.querySelector('input').focus();
  });
}
