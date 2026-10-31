// Tournament knockout bracket (Issue #71). All teams, scores and stats are made-up demo data.
// Own file and own global (BracketLogic) so it cannot collide with script.js.
// Run tests with: node --test public/showcase/gaming-esports-hub/bracket.test.mjs

var BracketLogic = (function () {
  'use strict';

  var TEAMS = {
    cyber:   { name: 'Team Cyber',     tag: 'TC', color: '#a855f7', players: ['NOVA', 'HEX', 'PIXEL'] },
    phantom: { name: 'Phantom Squad',  tag: 'PS', color: '#06b6d4', players: ['SPECTER', 'RYO', 'GHOST'] },
    neon:    { name: 'Neon Riders',    tag: 'NR', color: '#f43f5e', players: ['BLAZE', 'VEX', 'DRIFT'] },
    apex:    { name: 'Apex Titans',    tag: 'AT', color: '#f59e0b', players: ['TITAN', 'ECHO', 'ATLAS'] },
    storm:   { name: 'Storm Reapers',  tag: 'SR', color: '#10b981', players: ['BOLT', 'REAPER', 'GALE'] },
    iron:    { name: 'Iron Vanguard',  tag: 'IV', color: '#60a5fa', players: ['RIVET', 'ANVIL', 'BASTION'] },
    lunar:   { name: 'Lunar Wolves',   tag: 'LW', color: '#e879f9', players: ['LUNA', 'FANG', 'HOWL'] },
    solar:   { name: 'Solar Flare',    tag: 'SF', color: '#fb923c', players: ['NOVAE', 'CORONA', 'EMBER'] }
  };

  // stats rows are [kills, deaths, assists] per player, in the same order as TEAMS[x].players.
  // Rounds 2 and 3 take their teams from the winners of the matches in `from`.
  var MATCHES = [
    { id: 'qf1', round: 0, label: 'Quarterfinal 1', teams: ['cyber', 'solar'],   score: [2, 0], stats: [[[41, 22, 12], [33, 25, 18], [28, 27, 21]], [[24, 38, 10], [26, 35, 9], [19, 37, 14]]] },
    { id: 'qf2', round: 0, label: 'Quarterfinal 2', teams: ['phantom', 'iron'],  score: [2, 1], stats: [[[52, 40, 19], [47, 43, 15], [35, 46, 27]], [[44, 45, 20], [38, 47, 22], [41, 44, 17]]] },
    { id: 'qf3', round: 0, label: 'Quarterfinal 3', teams: ['neon', 'storm'],    score: [1, 2], stats: [[[39, 41, 13], [31, 43, 20], [29, 46, 16]], [[50, 36, 18], [45, 39, 24], [37, 40, 22]]] },
    { id: 'qf4', round: 0, label: 'Quarterfinal 4', teams: ['apex', 'lunar'],    score: [2, 0], stats: [[[36, 20, 15], [32, 24, 22], [27, 26, 25]], [[21, 34, 11], [25, 33, 14], [18, 35, 12]]] },
    { id: 'sf1', round: 1, label: 'Semifinal 1',    from: ['qf1', 'qf2'],         score: [3, 1], stats: [[[58, 44, 21], [49, 47, 26], [40, 50, 30]], [[47, 56, 18], [51, 53, 20], [38, 55, 24]]] },
    { id: 'sf2', round: 1, label: 'Semifinal 2',    from: ['qf3', 'qf4'],         score: [1, 3], stats: [[[45, 52, 20], [42, 55, 19], [34, 57, 23]], [[60, 41, 22], [55, 45, 27], [43, 48, 31]]] },
    { id: 'gf',  round: 2, label: 'Grand Final',    from: ['sf1', 'sf2'],         score: [3, 2], stats: [[[72, 61, 28], [66, 64, 33], [55, 67, 35]], [[70, 63, 25], [64, 66, 30], [58, 65, 29]]] }
  ];

  var ROUND_NAMES = ['Quarterfinals', 'Semifinals', 'Grand Final'];

  function kda(kills, deaths, assists) {
    return Math.round(((kills + assists) / Math.max(deaths, 1)) * 100) / 100;
  }

  function winnerIndex(score) {
    if (score[0] === score[1]) return -1;
    return score[0] > score[1] ? 0 : 1;
  }

  // Resolve every match into { id, round, label, teams, score, winnerIdx, winner, loser, rows }.
  function resolve(matches, teams) {
    var byId = {};
    return matches.map(function (m) {
      var ids = m.teams;
      if (!ids) {
        ids = m.from.map(function (srcId) {
          var src = byId[srcId];
          return src ? src.teams[src.winnerIdx] : null;
        });
      }
      var w = winnerIndex(m.score);
      var r = {
        id: m.id, round: m.round, label: m.label, from: m.from || null,
        teams: ids, score: m.score, winnerIdx: w,
        winner: w < 0 ? null : ids[w], loser: w < 0 ? null : ids[1 - w],
        rows: ids.map(function (tid, side) {
          return teams[tid].players.map(function (p, i) {
            var s = m.stats[side][i];
            return { player: p, kills: s[0], deaths: s[1], assists: s[2], kda: kda(s[0], s[1], s[2]) };
          });
        })
      };
      byId[m.id] = r;
      return r;
    });
  }

  function validate(matches, teams) {
    var errors = [];
    var seen = {};
    matches.forEach(function (m) {
      if (m.score[0] === m.score[1]) errors.push(m.id + ': tied score');
      if (m.teams) {
        m.teams.forEach(function (t) {
          if (!teams[t]) errors.push(m.id + ': unknown team ' + t);
          if (seen[t]) errors.push(m.id + ': team ' + t + ' used twice in round 1');
          seen[t] = true;
        });
      }
    });
    return errors;
  }

  return { TEAMS: TEAMS, MATCHES: MATCHES, ROUND_NAMES: ROUND_NAMES, kda: kda, winnerIndex: winnerIndex, resolve: resolve, validate: validate };
})();

/* ---------- DOM ---------- */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var L = BracketLogic;
  var resolved = L.resolve(L.MATCHES, L.TEAMS);
  var dialog, lastTrigger;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function logo(teamId) {
    var t = L.TEAMS[teamId];
    var s = el('span', 'br-logo', t.tag);
    s.style.setProperty('--logo', t.color);
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function matchButton(m) {
    var btn = el('button', 'br-match');
    btn.type = 'button';
    btn.dataset.match = m.id;
    btn.setAttribute('aria-label', m.label + ': ' + L.TEAMS[m.teams[0]].name + ' ' + m.score[0] + ', ' +
      L.TEAMS[m.teams[1]].name + ' ' + m.score[1] + '. ' + L.TEAMS[m.winner].name + ' won. Open player stats.');
    m.teams.forEach(function (tid, i) {
      var row = el('span', 'br-team' + (m.winnerIdx === i ? ' is-winner' : ''));
      row.appendChild(logo(tid));
      row.appendChild(el('span', 'br-team-name', L.TEAMS[tid].name));
      row.appendChild(el('span', 'br-score', String(m.score[i])));
      btn.appendChild(row);
    });
    btn.addEventListener('click', function () { openModal(m, btn); });
    return btn;
  }

  function openModal(m, trigger) {
    lastTrigger = trigger;
    dialog.querySelector('#br-modal-title').textContent = m.label + ' - post-match stats';
    var body = dialog.querySelector('#br-modal-body');
    body.textContent = '';
    m.teams.forEach(function (tid, side) {
      var won = m.winnerIdx === side;
      var sec = el('section', 'br-stat-team' + (won ? ' is-winner' : ''));
      var h = el('h4');
      h.appendChild(logo(tid));
      h.appendChild(document.createTextNode(' ' + L.TEAMS[tid].name + ' - ' + m.score[side] + (won ? ' (winner)' : '')));
      sec.appendChild(h);
      var wrap = el('div', 'br-table-wrap');
      var table = el('table', 'br-stat-table');
      var head = el('tr');
      ['Player', 'K', 'D', 'A', 'KDA'].forEach(function (c) {
        var th = el('th', '', c);
        th.scope = 'col';
        head.appendChild(th);
      });
      var thead = el('thead');
      thead.appendChild(head);
      table.appendChild(thead);
      var tbody = el('tbody');
      m.rows[side].forEach(function (r) {
        var tr = el('tr');
        var th = el('th', '', r.player);
        th.scope = 'row';
        tr.appendChild(th);
        [r.kills, r.deaths, r.assists, r.kda.toFixed(2)].forEach(function (v) { tr.appendChild(el('td', '', String(v))); });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      sec.appendChild(wrap);
      body.appendChild(sec);
    });
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    dialog.querySelector('.br-close').focus();
  }

  function closeModal() {
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    if (lastTrigger) lastTrigger.focus();
  }

  function init() {
    var host = document.getElementById('bracket-rounds');
    if (!host) return;
    dialog = document.getElementById('br-modal');
    L.ROUND_NAMES.forEach(function (name, r) {
      var col = el('div', 'br-round br-round-' + r);
      col.setAttribute('role', 'group');
      col.setAttribute('aria-label', name);
      col.appendChild(el('h3', 'br-round-title', name));
      var list = el('div', 'br-round-matches');
      resolved.filter(function (m) { return m.round === r; }).forEach(function (m) {
        var cell = el('div', 'br-cell');
        cell.appendChild(matchButton(m));
        list.appendChild(cell);
      });
      col.appendChild(list);
      host.appendChild(col);
    });
    var gf = resolved[resolved.length - 1];
    document.getElementById('br-champion').textContent = L.TEAMS[gf.winner].name;
    dialog.querySelector('.br-close').addEventListener('click', closeModal);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeModal(); });
    dialog.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
