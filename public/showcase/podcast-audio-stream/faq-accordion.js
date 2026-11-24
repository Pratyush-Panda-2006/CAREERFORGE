/**
 * Podcast Audio Stream - Interactive Searchable FAQ & Collapsible Accordion Drawer
 */

export class PodcastAudioStreamFaqAccordion {
  constructor() {
    this.items = [
      { id: 1, question: 'How do I initialize the showcase?', answer: 'Import the main ES module and call initialize() with configuration options.', open: false },
      { id: 2, question: 'What browsers are supported?', answer: 'All modern Evergreen browsers supporting ES2022+ are fully supported.', open: false },
      { id: 3, question: 'Is offline state persisted?', answer: 'Yes, offline mutations queue into local storage with Lamport clock timestamps.', open: false }
    ];
  }

  toggle(id) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.open = !item.open;
    }
    return item;
  }

  search(query) {
    if (!query) return [...this.items];
    const q = query.toLowerCase();
    return this.items.filter(i => i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q));
  }
}
