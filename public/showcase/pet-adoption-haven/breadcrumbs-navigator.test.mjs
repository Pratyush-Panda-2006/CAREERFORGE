import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PetAdoptionHavenBreadcrumbNav } from './breadcrumbs-navigator.js';

// A list element with just enough of the DOM for renderTrail.
function fakeList() {
  const createElement = () => {
    const element = { children: [], attributes: {}, listeners: {} };
    element.append = (child) => element.children.push(child);
    element.setAttribute = (name, value) => { element.attributes[name] = value; };
    element.addEventListener = (name, fn) => { element.listeners[name] = fn; };
    return element;
  };
  const list = { ownerDocument: { createElement }, items: [] };
  list.replaceChildren = (...items) => { list.items = items; };
  return list;
}

const names = (nav) => nav.trail.map((crumb) => crumb.segment);

test('pushes and pops routes but never removes home', () => {
  const nav = new PetAdoptionHavenBreadcrumbNav();
  nav.pushRoute('Dogs', '#/dogs');
  assert.deepEqual(names(nav), ['Home', 'Dogs']);
  assert.equal(nav.popRoute().segment, 'Dogs');
  assert.equal(nav.popRoute(), null);
  assert.deepEqual(names(nav), ['Home']);
});

test('refuses a route without a name or url', () => {
  const nav = new PetAdoptionHavenBreadcrumbNav();
  assert.equal(nav.pushRoute('  ', '#/x'), false);
  assert.equal(nav.pushRoute('Dogs', ''), false);
  assert.deepEqual(names(nav), ['Home']);
});

test('going to an ancestor cuts the trail back', () => {
  const nav = new PetAdoptionHavenBreadcrumbNav();
  nav.pushRoute('Dogs', '#/dogs');
  nav.pushRoute('Puppies', '#/dogs/puppies');
  nav.pushRoute('Dogs', '#/dogs');
  assert.deepEqual(names(nav), ['Home', 'Dogs']);
});

test('history lists newest first, without repeats, up to the limit', () => {
  const nav = new PetAdoptionHavenBreadcrumbNav({ historyLimit: 2 });
  nav.pushRoute('Dogs', '#/dogs');
  nav.pushRoute('Cats', '#/cats');
  nav.pushRoute('Dogs', '#/dogs');
  assert.deepEqual(nav.history.map((entry) => entry.segment), ['Dogs', 'Cats']);
});

test('renders links, marks the current page and navigates on click', () => {
  const seen = [];
  const nav = new PetAdoptionHavenBreadcrumbNav({ onNavigate: (page) => seen.push(page.segment) });
  nav.pushRoute('Dogs', '#/dogs');
  const list = fakeList();

  assert.equal(nav.renderTrail(list), 2);
  const [home, dogs] = list.items.map((item) => item.children[0]);
  assert.equal(dogs.attributes['aria-current'], 'page');
  assert.equal(home.attributes['aria-current'], undefined);

  home.listeners.click({ preventDefault() {} });
  assert.deepEqual(names(nav), ['Home']);
  assert.deepEqual(seen, ['Dogs', 'Home']);
});
