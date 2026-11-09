export const WORDS = ['kernel', 'cipher', 'packet', 'thread', 'buffer', 'socket', 'vector', 'mutex', 'binary', 'daemon', 'router', 'signal'];
export const SCORE_KEY = 'devcraft-typing-v1';

export class TypingRound {
  constructor(now, rng = Math.random) {
    if (!Number.isFinite(now)) throw new Error('Start time must be finite.');
    this.started = now; this.lastTime = now; this.deadline = now + 30_000;
    this.rng = rng; this.state = 'playing'; this.input = ''; this.target = '';
    this.typed = 0; this.correct = 0; this.words = 0; this.completedLetters = 0; this.rejected = 0;
    this.nextWord();
  }
  nextWord() {
    const choices = WORDS.filter(word => word !== this.target);
    const value = this.rng();
    const index = Number.isFinite(value) ? Math.min(choices.length - 1, Math.max(0, Math.floor(value * choices.length))) : 0;
    this.target = choices[index]; this.input = '';
  }
  tick(now) {
    if (!Number.isFinite(now)) throw new Error('Clock must be finite.');
    this.lastTime = Math.max(this.lastTime, now);
    if (this.state === 'playing' && this.lastTime >= this.deadline) this.state = 'finished';
    return Math.max(0, this.deadline - this.lastTime);
  }
  type(next, now) {
    this.tick(now);
    if (this.state !== 'playing') return;
    next = String(next).slice(0, 32);
    let prefix = 0;
    while (prefix < next.length && prefix < this.input.length && next[prefix] === this.input[prefix]) prefix++;
    let suffix = 0;
    while (suffix < next.length - prefix && suffix < this.input.length - prefix
      && next[next.length - 1 - suffix] === this.input[this.input.length - 1 - suffix]) suffix++;
    for (let index = prefix; index < next.length - suffix; index++) {
      this.typed++;
      if (next[index] === this.target[index]) this.correct++;
    }
    this.input = next;
  }
  submit(now) {
    this.tick(now);
    if (this.state !== 'playing') return false;
    if (this.input !== this.target) { this.rejected++; return false; }
    this.words++; this.completedLetters += this.target.length;
    if (this.words === 100) this.state = 'finished';
    else this.nextWord();
    return true;
  }
  cancel() { if (this.state === 'playing') this.state = 'cancelled'; }
  result() {
    const accuracy = this.typed ? this.correct / this.typed : 0;
    return { score: Math.floor(this.completedLetters * 10 * accuracy), words: this.words,
      accuracy: Math.round(accuracy * 100), typed: this.typed, state: this.state };
  }
}

export function readScores(storage) {
  try {
    const data = JSON.parse(storage.getItem(SCORE_KEY));
    if (data?.version !== 1 || !Array.isArray(data.scores)) return [];
    return data.scores.filter(item => item && Number.isInteger(item.score) && item.score >= 0 && item.score <= 6000
      && Number.isInteger(item.words) && item.words >= 0 && item.words <= 100
      && Number.isInteger(item.accuracy) && item.accuracy >= 0 && item.accuracy <= 100)
      .map(({ score, words, accuracy }) => ({ score, words, accuracy }))
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy).slice(0, 5);
  } catch { return []; }
}

export function saveScore(storage, result) {
  if (result.state !== 'finished' || !Number.isInteger(result.score) || result.score < 0 || result.score > 6000
    || !Number.isInteger(result.words) || result.words < 0 || result.words > 100
    || !Number.isInteger(result.accuracy) || result.accuracy < 0 || result.accuracy > 100) return { saved: false, scores: readScores(storage) };
  const scores = [...readScores(storage), { score: result.score, words: result.words, accuracy: result.accuracy }]
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy).slice(0, 5);
  try { storage.setItem(SCORE_KEY, JSON.stringify({ version: 1, scores })); return { saved: true, scores }; }
  catch { return { saved: false, scores }; }
}
