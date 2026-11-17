// Build and parse links independently of the player UI so shared timestamps
// work even when the recipient has a different local playback state.
(function (root) {
  function formatTimestamp(seconds) {
    const time = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const parts = [hours && `${hours}h`, minutes && `${minutes}m`, `${time % 60}s`];
    return parts.filter(Boolean).join('');
  }

  function parseTimestamp(value) {
    if (!value) return 0;
    if (/^\d+$/.test(value)) return Number(value);
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
    if (!match || !match[0]) return null;
    return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  }

  function buildLink(href, episode, seconds, includeTimestamp) {
    const url = new URL(href);
    url.searchParams.set('episode', episode === '141' ? '141' : '142');
    if (includeTimestamp) url.searchParams.set('t', formatTimestamp(seconds));
    else url.searchParams.delete('t');
    url.hash = '';
    return url.toString();
  }

  function parseLink(search) {
    const params = new URLSearchParams(search);
    const episode = params.get('episode');
    if (episode !== '141' && episode !== '142') return null;
    const rawTime = params.get('t');
    const time = parseTimestamp(rawTime);
    return { episode, time: time === null ? 0 : Math.min(time, episode === '141' ? 3240 : 2880) };
  }

  root.ShareLogic = { formatTimestamp, parseTimestamp, buildLink, parseLink };
})(typeof window !== 'undefined' ? window : globalThis);
