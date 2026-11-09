(function () {
  const catalogue = {
    '142': { title: 'The Future of Agentic AI & Spatial Compute', duration: 2880 },
    '141': { title: 'Scaling Vector Databases to 10 Billion Chunks', duration: 3240 }
  };
  const queue = new EpisodeQueue(catalogue); const dialog = document.getElementById('queue-drawer');
  const list = document.getElementById('queue-list'); const status = document.getElementById('queue-status');
  const opener = document.getElementById('queue-open');
  function button(text, label, action, disabled = false) {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
    element.setAttribute('aria-label', label); element.disabled = disabled; element.addEventListener('click', action); return element;
  }
  function render(message = '') {
    list.replaceChildren();
    queue.items.forEach((item, index) => {
      const row = document.createElement('li'); const title = document.createElement('p');
      title.textContent = `EP ${item.episode} · ${catalogue[item.episode].title} · ${Math.round(catalogue[item.episode].duration / 60)} min`;
      const controls = document.createElement('div'); controls.className = 'queue-row-controls';
      function act(action) { action(); render(); document.getElementById(`queue-row-${item.key}`)?.querySelector('button:not(:disabled)')?.focus(); }
      row.id = `queue-row-${item.key}`;
      controls.append(button('↑', `Move queued episode ${index + 1} up`, () => act(() => queue.move(item.key, -1)), index === 0),
        button('↓', `Move queued episode ${index + 1} down`, () => act(() => queue.move(item.key, 1)), index === queue.items.length - 1),
        button('Remove', `Remove queued episode ${index + 1}`, () => { queue.remove(item.key); render('Episode removed.'); document.getElementById('queue-next').focus(); }));
      row.append(title, controls); list.append(row);
    });
    document.getElementById('queue-total').textContent = `${queue.items.length} upcoming episodes · ${Math.floor(queue.seconds() / 60)} min at 1× speed`;
    document.getElementById('queue-next').disabled = queue.items.length === 0;
    document.getElementById('queue-clear').disabled = queue.items.length === 0;
    opener.textContent = `Playback queue (${queue.items.length})`;
    if (message) status.textContent = message;
    else status.textContent = queue.items.length ? 'Move or remove upcoming episodes. Played entries leave the queue automatically.' : 'Your upcoming queue is empty. Add an episode from the cards.';
  }
  function playNext() {
    const episode = queue.next(); if (!episode) return false;
    seekTo(0); playEpisode(`Ep ${episode}`); render(`Now playing episode ${episode} in the simulated player.`); return true;
  }
  window.PodcastQueue = { complete: playNext };
  Object.keys(catalogue).forEach(episode => {
    const card = document.getElementById(`card-${episode}`);
    card.append(button('Add to queue', `Add episode ${episode} to queue`, event => {
      event.stopPropagation();
      const added = queue.add(episode); render(added ? `Episode ${episode} queued.` : 'Queue limit reached (50 episodes).');
      document.getElementById('queue-announcement').textContent = status.textContent;
    }));
  });
  opener.addEventListener('click', () => dialog.showModal());
  document.getElementById('queue-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener.focus());
  document.getElementById('queue-next').addEventListener('click', playNext);
  document.getElementById('queue-clear').addEventListener('click', () => { queue.clear(); render('Upcoming queue cleared. Current playback continues.'); document.getElementById('queue-close').focus(); });
  render();
})();
