export class PetAdoptionHavenBreadcrumbNav {
  constructor({ home = { segment: 'Home', url: '#/' }, historyLimit = 5, onNavigate = () => {} } = {}) {
    this.trail = [{ ...home }];
    this.history = [];
    this.historyLimit = historyLimit;
    this.onNavigate = onNavigate;
  }

  get current() {
    return this.trail[this.trail.length - 1];
  }

  // Going to a page already on the trail jumps back to it instead of adding it twice.
  pushRoute(segment, url) {
    const name = String(segment ?? '').trim();
    if (!name || !url) return false;
    const existing = this.trail.findIndex((crumb) => crumb.url === url);
    this.trail = existing >= 0 ? this.trail.slice(0, existing + 1) : [...this.trail, { segment: name, url }];
    this.visit();
    return true;
  }

  // Returns the page that was left, or null at the home page.
  popRoute() {
    if (this.trail.length === 1) return null;
    const left = this.current;
    this.trail = this.trail.slice(0, -1);
    this.visit();
    return left;
  }

  // Keeps the newest visits first, each page listed once.
  visit() {
    const page = this.current;
    this.history = [page, ...this.history.filter((entry) => entry.url !== page.url)].slice(0, this.historyLimit);
    this.onNavigate(page);
  }

  renderTrail(list) {
    const doc = list.ownerDocument;
    const items = this.trail.map((crumb, i) => {
      const item = doc.createElement('li');
      const link = doc.createElement('a');
      link.href = crumb.url;
      link.textContent = i === 0 ? `⌂ ${crumb.segment}` : crumb.segment;
      if (i === this.trail.length - 1) link.setAttribute('aria-current', 'page');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.pushRoute(crumb.segment, crumb.url);
      });
      item.append(link);
      return item;
    });
    list.replaceChildren(...items);
    return items.length;
  }
}

if (typeof document !== 'undefined') {
  const PAGES = {
    Home: ['Dogs', 'Cats'],
    Dogs: ['Puppies', 'Senior dogs'],
    Cats: ['Kittens', 'Senior cats'],
    Puppies: ['Bruno', 'Daisy'],
    'Senior dogs': ['Max'],
    Kittens: ['Mochi', 'Pepper'],
    'Senior cats': ['Willow'],
  };
  const $ = (id) => document.getElementById(id);
  const urlFor = (trail, name) => `${trail.at(-1).url.replace(/\/$/, '')}/${encodeURIComponent(name.toLowerCase())}`;

  const show = (page) => {
    nav.renderTrail($('trail'));
    $('page').textContent = page.segment;
    $('back').disabled = nav.trail.length === 1;
    $('children').replaceChildren(...(PAGES[page.segment] ?? []).map((name) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = name;
      button.addEventListener('click', () => nav.pushRoute(name, urlFor(nav.trail, name)));
      return button;
    }));
    $('history').replaceChildren(...nav.history.map((entry) => {
      const item = document.createElement('li');
      item.textContent = entry.segment;
      return item;
    }));
  };
  // Focus moves to the page title so keyboard users are not dropped when the button they used disappears.
  const nav = new PetAdoptionHavenBreadcrumbNav({
    onNavigate: (page) => {
      show(page);
      $('page').focus();
    },
  });

  $('back').addEventListener('click', () => nav.popRoute());
  show(nav.current);
}
