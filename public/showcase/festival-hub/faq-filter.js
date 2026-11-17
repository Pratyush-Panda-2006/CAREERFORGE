(function (root) {
  function matches(item, category, query) {
    const term = String(query || '').trim().toLocaleLowerCase();
    return (category === 'all' || item.category === category)
      && (!term || item.text.toLocaleLowerCase().includes(term));
  }

  root.FestivalFaqFilter = { matches };
})(typeof window !== 'undefined' ? window : globalThis);
