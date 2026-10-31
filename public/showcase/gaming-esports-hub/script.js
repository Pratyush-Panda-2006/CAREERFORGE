/**
 * Vortex Arena — Fantasy Esports Roster Builder
 * Implementation for Issue #102: Interactive Fantasy Roster with $50k Salary Cap
 * Features: Role Slots, Bench Pool, Synergy Scoring, Fantasy Points Projection,
 * LocalStorage Persistence, and Strict Security Hardening.
 */

// Global handler preserved for hero stream button
window.watchStream = function watchStream() {
  alert('Connecting to Vortex Esports Twitch stream feed...');
};

(function () {
  'use strict';

  // ===== Security & Game Configurations (Deeply Frozen) =====
  var CONFIG = Object.freeze({
    SALARY_CAP: 50000,
    SYNERGY_ROLE_COVERAGE_PTS: 10,   // 10 pts per filled slot (max 50)
    SYNERGY_PAIR_PTS: 8,             // 8 pts per teammate pair (max 30)
    SYNERGY_PAIR_CAP: 30,
    SYNERGY_IGL_LINK_PTS: 10,        // 10 pts per IGL teammate (max 20)
    SYNERGY_IGL_CAP: 20,
    SYNERGY_MAX_BONUS: 0.20,         // Up to +20% fantasy points multiplier
    STORAGE_KEY: 'vortex_fantasy_roster_v2',
    NOTIFICATION_COOLDOWN_MS: 400
  });

  var ROLES = Object.freeze(['Duelist', 'Initiator', 'Controller', 'Sentinel', 'IGL']);

  var ROLE_META = Object.freeze({
    Duelist: Object.freeze({
      color: '#f43f5e',
      iconSvg: 'M14.5 4l5.5 5.5M4 14.5L14.5 4M4 20l5.5-5.5M19 5l-4 4M5 19l4-4M19 19L5 5',
      desc: 'Entry fragger & primary firepower'
    }),
    Initiator: Object.freeze({
      color: '#f59e0b',
      iconSvg: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 3a3 3 0 100 6 3 3 0 000-6zM12 2v20M2 12h20',
      desc: 'Recon, utility & engagement setup'
    }),
    Controller: Object.freeze({
      color: '#06b6d4',
      iconSvg: 'M17.5 19H9a7 7 0 116.71-9h1.79a4.5 4.5 0 110 9z',
      desc: 'Vision denial, site smokes & map control'
    }),
    Sentinel: Object.freeze({
      color: '#10b981',
      iconSvg: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      desc: 'Site lockdown, flank watch & stalling'
    }),
    IGL: Object.freeze({
      color: '#a855f7',
      iconSvg: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      desc: 'In-Game Leader, shot-caller & tactical mastermind'
    })
  });

  // 25 Curated Pro Players across 5 top esports teams
  var PLAYER_CATALOG = Object.freeze([
    // Duelists
    Object.freeze({ id: 'zenith',  name: 'ZENITH',  team: 'Phantom Squad', role: 'Duelist',    salary: 13000, pts: 49.5, stats: '1.42 K/D • 285 ACS' }),
    Object.freeze({ id: 'kairo',   name: 'KAIRO',   team: 'Team Cyber',    role: 'Duelist',    salary: 11500, pts: 44.2, stats: '1.31 K/D • 262 ACS' }),
    Object.freeze({ id: 'drift',   name: 'DRIFT',   team: 'Neon Riders',   role: 'Duelist',    salary: 9400,  pts: 37.8, stats: '1.18 K/D • 238 ACS' }),
    Object.freeze({ id: 'striker', name: 'STRIKER', team: 'Vortex Prime',  role: 'Duelist',    salary: 8200,  pts: 33.5, stats: '1.12 K/D • 220 ACS' }),
    Object.freeze({ id: 'rook',    name: 'ROOK',    team: 'Apex Titans',   role: 'Duelist',    salary: 6800,  pts: 28.0, stats: '1.04 K/D • 198 ACS' }),

    // Initiators
    Object.freeze({ id: 'pulse',   name: 'PULSE',   team: 'Team Cyber',    role: 'Initiator',  salary: 12000, pts: 43.5, stats: '78% KAST • 14.2 Ast' }),
    Object.freeze({ id: 'sable',   name: 'SABLE',   team: 'Neon Riders',   role: 'Initiator',  salary: 10400, pts: 39.0, stats: '74% KAST • 12.8 Ast' }),
    Object.freeze({ id: 'echo',    name: 'ECHO',    team: 'Vortex Prime',  role: 'Initiator',  salary: 8900,  pts: 34.6, stats: '72% KAST • 11.4 Ast' }),
    Object.freeze({ id: 'quill',   name: 'QUILL',   team: 'Apex Titans',   role: 'Initiator',  salary: 7600,  pts: 30.2, stats: '69% KAST • 9.8 Ast' }),
    Object.freeze({ id: 'wren',    name: 'WREN',    team: 'Phantom Squad', role: 'Initiator',  salary: 6400,  pts: 25.5, stats: '67% KAST • 8.6 Ast' }),

    // Controllers
    Object.freeze({ id: 'nimbus',  name: 'NIMBUS',  team: 'Apex Titans',   role: 'Controller', salary: 11800, pts: 41.5, stats: '91% Site Smoke • 1.15 K/D' }),
    Object.freeze({ id: 'haze',    name: 'HAZE',    team: 'Phantom Squad', role: 'Controller', salary: 10000, pts: 37.0, stats: '88% Site Smoke • 1.08 K/D' }),
    Object.freeze({ id: 'vapor',   name: 'VAPOR',   team: 'Vortex Prime',  role: 'Controller', salary: 8600,  pts: 33.0, stats: '84% Site Smoke • 1.02 K/D' }),
    Object.freeze({ id: 'ember',   name: 'EMBER',   team: 'Team Cyber',    role: 'Controller', salary: 7400,  pts: 29.5, stats: '81% Site Smoke • 0.98 K/D' }),
    Object.freeze({ id: 'frost',   name: 'FROST',   team: 'Neon Riders',   role: 'Controller', salary: 6200,  pts: 24.0, stats: '78% Site Smoke • 0.92 K/D' }),

    // Sentinels
    Object.freeze({ id: 'warden',  name: 'WARDEN',  team: 'Neon Riders',   role: 'Sentinel',   salary: 11200, pts: 40.5, stats: '34% Clutch • 1.22 Rating' }),
    Object.freeze({ id: 'anvil',   name: 'ANVIL',   team: 'Apex Titans',   role: 'Sentinel',   salary: 9800,  pts: 36.2, stats: '29% Clutch • 1.14 Rating' }),
    Object.freeze({ id: 'aegis',   name: 'AEGIS',   team: 'Vortex Prime',  role: 'Sentinel',   salary: 8400,  pts: 32.0, stats: '26% Clutch • 1.06 Rating' }),
    Object.freeze({ id: 'lock',    name: 'LOCK',    team: 'Team Cyber',    role: 'Sentinel',   salary: 7200,  pts: 28.5, stats: '24% Clutch • 1.01 Rating' }),
    Object.freeze({ id: 'ward',    name: 'WARD',    team: 'Phantom Squad', role: 'Sentinel',   salary: 6000,  pts: 23.2, stats: '21% Clutch • 0.95 Rating' }),

    // IGLs (In-Game Leaders)
    Object.freeze({ id: 'oracle',  name: 'ORACLE',  team: 'Team Cyber',    role: 'IGL',        salary: 11600, pts: 39.8, stats: '68% Round Call • 1.10 K/D' }),
    Object.freeze({ id: 'maestro', name: 'MAESTRO', team: 'Phantom Squad', role: 'IGL',        salary: 10200, pts: 35.5, stats: '64% Round Call • 1.05 K/D' }),
    Object.freeze({ id: 'nexus',   name: 'NEXUS',   team: 'Vortex Prime',  role: 'IGL',        salary: 8800,  pts: 31.8, stats: '61% Round Call • 0.99 K/D' }),
    Object.freeze({ id: 'marshal', name: 'MARSHAL', team: 'Apex Titans',   role: 'IGL',        salary: 7500,  pts: 28.0, stats: '58% Round Call • 0.94 K/D' }),
    Object.freeze({ id: 'cadet',   name: 'CADET',   team: 'Neon Riders',   role: 'IGL',        salary: 5800,  pts: 22.0, stats: '55% Round Call • 0.88 K/D' })
  ]);

  // Lookup map indexed by player ID
  var PLAYER_BY_ID = {};
  PLAYER_CATALOG.forEach(function (p) {
    PLAYER_BY_ID[p.id] = p;
  });

  // ===== Application State =====
  var state = {
    roster: {
      Duelist: null,
      Initiator: null,
      Controller: null,
      Sentinel: null,
      IGL: null
    },
    activeFilter: 'ALL',
    searchQuery: '',
    sortOrder: 'salary-desc'
  };

  var lastToastTimestamp = 0;


  function formatMoney(amount) {
    var num = Math.round(Number(amount) || 0);
    return '$' + num.toLocaleString('en-US');
  }

  // Safe SVG Role Icon Builder
  function createRoleSvg(role) {
    var meta = ROLE_META[role] || ROLE_META.Duelist;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'fr-role-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', meta.iconSvg);
    svg.appendChild(path);
    return svg;
  }

  // Toast System with Rate-Limiting and strict textContent
  function showToast(message) {
    var now = Date.now();
    if (now - lastToastTimestamp < CONFIG.NOTIFICATION_COOLDOWN_MS) return;
    lastToastTimestamp = now;

    var container = document.getElementById('fr-toast-container');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'fr-toast';

    var textNode = document.createElement('span');
    textNode.textContent = message;
    toast.appendChild(textNode);

    container.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }

  function announceStatus(message) {
    var statusEl = document.getElementById('fr-live-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  // ===== Roster Calculations =====
  function getDraftedPlayers() {
    var drafted = [];
    ROLES.forEach(function (role) {
      var id = state.roster[role];
      if (id && Object.prototype.hasOwnProperty.call(PLAYER_BY_ID, id)) {
        drafted.push(PLAYER_BY_ID[id]);
      }
    });
    return drafted;
  }

  function calculateSpent() {
    return getDraftedPlayers().reduce(function (sum, p) {
      return sum + p.salary;
    }, 0);
  }

  function calculateRemainingCap() {
    return CONFIG.SALARY_CAP - calculateSpent();
  }

  function calculateNetCost(player) {
    var currentDraftedId = state.roster[player.role];
    var currentDrafted = currentDraftedId && Object.prototype.hasOwnProperty.call(PLAYER_BY_ID, currentDraftedId)
      ? PLAYER_BY_ID[currentDraftedId]
      : null;
    return player.salary - (currentDrafted ? currentDrafted.salary : 0);
  }

  function computeSynergy(team) {
    var teamCounts = {};
    team.forEach(function (p) {
      teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
    });

    // Teammate pairs
    var pairs = 0;
    Object.keys(teamCounts).forEach(function (t) {
      var count = teamCounts[t];
      if (count > 1) {
        pairs += (count * (count - 1)) / 2;
      }
    });

    // IGL Link: teammates belonging to the same organization as the drafted IGL
    var iglId = state.roster.IGL;
    var iglPlayer = iglId && Object.prototype.hasOwnProperty.call(PLAYER_BY_ID, iglId) ? PLAYER_BY_ID[iglId] : null;
    var iglTeammates = iglPlayer && teamCounts[iglPlayer.team] ? teamCounts[iglPlayer.team] - 1 : 0;

    var coveragePts = team.length * CONFIG.SYNERGY_ROLE_COVERAGE_PTS;
    var chemistryPts = Math.min(pairs * CONFIG.SYNERGY_PAIR_PTS, CONFIG.SYNERGY_PAIR_CAP);
    var iglLinkPts = Math.min(iglTeammates * CONFIG.SYNERGY_IGL_LINK_PTS, CONFIG.SYNERGY_IGL_CAP);
    var totalSynergy = Math.min(coveragePts + chemistryPts + iglLinkPts, 100);

    return {
      coverage: coveragePts,
      chemistry: chemistryPts,
      iglLink: iglLinkPts,
      total: totalSynergy
    };
  }

  function computeProjection(team) {
    var basePoints = team.reduce(function (sum, p) {
      return sum + p.pts;
    }, 0);

    var synergy = computeSynergy(team);
    var bonusMultiplier = 1 + (synergy.total / 100) * CONFIG.SYNERGY_MAX_BONUS;
    var totalProjected = basePoints * bonusMultiplier;

    return {
      base: basePoints,
      synergy: synergy,
      multiplier: bonusMultiplier,
      total: totalProjected
    };
  }

  // ===== LocalStorage Persistence with Strict Tampering Checks =====
  function saveRoster() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.roster));
    } catch {
      // Storage access blocked or quota exceeded
    }
  }

  function loadRoster() {
    try {
      var raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return false;

      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;

      var validated = {};
      var totalCost = 0;

      for (var i = 0; i < ROLES.length; i++) {
        var role = ROLES[i];
        var id = parsed[role];
        if (typeof id === 'string' && Object.prototype.hasOwnProperty.call(PLAYER_BY_ID, id)) {
          var p = PLAYER_BY_ID[id];
          if (p.role === role) {
            validated[role] = p.id;
            totalCost += p.salary;
          } else {
            validated[role] = null;
          }
        } else {
          validated[role] = null;
        }
      }

      // Security check: Reject tampered storage payload if salary exceeds limit
      if (totalCost > CONFIG.SALARY_CAP) {
        return false;
      }

      ROLES.forEach(function (role) {
        state.roster[role] = validated[role];
      });

      return true;
    } catch {
      return false;
    }
  }

  // ===== Roster Actions =====
  function draftPlayer(player) {
    var netCost = calculateNetCost(player);
    var remaining = calculateRemainingCap();

    if (netCost > remaining) {
      var overage = netCost - remaining;
      showToast('⚠️ Salary cap exceeded by ' + formatMoney(overage) + '! Cannot draft ' + player.name + '.');
      announceStatus('Cannot draft ' + player.name + ': exceeds budget by ' + formatMoney(overage));
      return false;
    }

    var prevId = state.roster[player.role];
    var replaced = prevId && Object.prototype.hasOwnProperty.call(PLAYER_BY_ID, prevId) ? PLAYER_BY_ID[prevId] : null;

    state.roster[player.role] = player.id;
    saveRoster();
    render();

    var msg = replaced
      ? 'Swapped ' + replaced.name + ' for ' + player.name + ' at ' + player.role + '. ' + formatMoney(calculateRemainingCap()) + ' cap left.'
      : 'Drafted ' + player.name + ' as ' + player.role + '. ' + formatMoney(calculateRemainingCap()) + ' cap left.';

    showToast('✓ ' + msg);
    announceStatus(msg);
    return true;
  }

  function releaseRole(role) {
    var currentId = state.roster[role];
    if (!currentId) return;

    var player = Object.prototype.hasOwnProperty.call(PLAYER_BY_ID, currentId) ? PLAYER_BY_ID[currentId] : null;
    state.roster[role] = null;
    saveRoster();
    render();

    var name = player ? player.name : role;
    showToast('Removed ' + name + ' from active roster.');
    announceStatus('Removed ' + name + ' from ' + role + '. ' + formatMoney(calculateRemainingCap()) + ' cap remaining.');
  }

  function clearAllSlots() {
    ROLES.forEach(function (r) {
      state.roster[r] = null;
    });
    saveRoster();
    render();
    showToast('Roster reset. $50,000 salary budget available.');
    announceStatus('Roster cleared. Full $50,000 budget available.');
  }

  // Auto-Draft Algorithm: Maximize projected fantasy points within $50k salary cap
  function autoDraftOptimal() {
    var rolesPool = {};
    ROLES.forEach(function (r) {
      rolesPool[r] = PLAYER_CATALOG.filter(function (p) { return p.role === r; });
    });

    var bestRoster = null;
    var maxProjected = -1;

    // Explore combinations to find highest projected points legal lineup
    var duelists = rolesPool.Duelist;
    var initiators = rolesPool.Initiator;
    var controllers = rolesPool.Controller;
    var sentinels = rolesPool.Sentinel;
    var igls = rolesPool.IGL;

    for (var d = 0; d < duelists.length; d++) {
      var dPlayer = duelists[d];
      for (var i = 0; i < initiators.length; i++) {
        var iPlayer = initiators[i];
        if (dPlayer.salary + iPlayer.salary > CONFIG.SALARY_CAP - 15000) continue;

        for (var c = 0; c < controllers.length; c++) {
          var cPlayer = controllers[c];
          if (dPlayer.salary + iPlayer.salary + cPlayer.salary > CONFIG.SALARY_CAP - 11000) continue;

          for (var s = 0; s < sentinels.length; s++) {
            var sPlayer = sentinels[s];
            var subCost = dPlayer.salary + iPlayer.salary + cPlayer.salary + sPlayer.salary;
            if (subCost > CONFIG.SALARY_CAP - 5000) continue;

            for (var g = 0; g < igls.length; g++) {
              var gPlayer = igls[g];
              var totalCost = subCost + gPlayer.salary;

              if (totalCost <= CONFIG.SALARY_CAP) {
                var candidate = [dPlayer, iPlayer, cPlayer, sPlayer, gPlayer];
                var testRoster = {
                  Duelist: dPlayer.id,
                  Initiator: iPlayer.id,
                  Controller: cPlayer.id,
                  Sentinel: sPlayer.id,
                  IGL: gPlayer.id
                };

                // Temporary simulate for synergy evaluation
                var origRoster = state.roster;
                state.roster = testRoster;
                var proj = computeProjection(candidate);
                state.roster = origRoster;

                if (proj.total > maxProjected) {
                  maxProjected = proj.total;
                  bestRoster = testRoster;
                }
              }
            }
          }
        }
      }
    }

    if (bestRoster) {
      state.roster = bestRoster;
      saveRoster();
      render();
      showToast('⚡ Auto-drafted optimal synergy lineup (' + maxProjected.toFixed(1) + ' projected PTS)!');
      announceStatus('Optimal fantasy lineup drafted successfully.');
    } else {
      showToast('Could not calculate optimal lineup.');
    }
  }

  // Share / Export Roster Lineup
  function shareRoster() {
    var team = getDraftedPlayers();
    if (team.length === 0) {
      showToast('⚠️ Draft at least one player before sharing your roster.');
      return;
    }

    var spent = calculateSpent();
    var proj = computeProjection(team);
    var text = '🎮 VORTEX FANTASY ESPORTS ROSTER 🎮\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    ROLES.forEach(function (role) {
      var id = state.roster[role];
      var p = id && PLAYER_BY_ID[id];
      if (p) {
        text += '[' + role.toUpperCase() + '] ' + p.name + ' (' + p.team + ') — ' + formatMoney(p.salary) + ' | ' + p.pts.toFixed(1) + ' PTS\n';
      } else {
        text += '[' + role.toUpperCase() + '] (Empty Slot)\n';
      }
    });

    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += 'Salary: ' + formatMoney(spent) + ' / ' + formatMoney(CONFIG.SALARY_CAP) + '\n';
    text += 'Synergy: ' + proj.synergy.total + '/100 | Projected: ' + proj.total.toFixed(1) + ' PTS\n';
    text += 'Build your team at Vortex Global Championship!';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('📋 Roster lineup copied to clipboard!');
      }).catch(function () {
        showToast('📋 Lineup summary ready.');
      });
    } else {
      showToast('📋 Lineup summary ready.');
    }
  }

  // ===== UI Rendering with Safe DOM Manipulation =====
  function renderDashboard() {
    var drafted = getDraftedPlayers();
    var spent = calculateSpent();
    var remaining = calculateRemainingCap();
    var proj = computeProjection(drafted);

    // Draft counter
    var counterEl = document.getElementById('fr-draft-counter');
    if (counterEl) {
      counterEl.textContent = drafted.length + ' / ' + ROLES.length + ' PLAYERS';
    }

    // Salary progress meter
    var pct = Math.min((spent / CONFIG.SALARY_CAP) * 100, 100);
    var salaryMeter = document.getElementById('fr-salary-meter');
    var salaryFill = document.getElementById('fr-salary-fill');
    var spentVal = document.getElementById('fr-spent-val');
    var remainingVal = document.getElementById('fr-remaining-val');

    if (salaryMeter) {
      salaryMeter.setAttribute('aria-valuenow', spent);
    }
    if (salaryFill) {
      salaryFill.style.width = pct + '%';
      salaryFill.classList.toggle('meter-warning', spent > 42000 && spent <= 48000);
      salaryFill.classList.toggle('meter-danger', spent > 48000);
    }
    if (spentVal) {
      spentVal.textContent = formatMoney(spent);
    }
    if (remainingVal) {
      remainingVal.textContent = formatMoney(remaining);
      remainingVal.classList.toggle('val-red', remaining < 6000);
      remainingVal.classList.toggle('val-green', remaining >= 6000);
    }

    // Synergy meter & breakdown
    var synValEl = document.getElementById('fr-synergy-val');
    var synMeter = document.getElementById('fr-synergy-meter');
    var synFill = document.getElementById('fr-synergy-fill');
    var synRolesChip = document.getElementById('syn-roles-chip');
    var synChemChip = document.getElementById('syn-chem-chip');
    var synIglChip = document.getElementById('syn-igl-chip');

    if (synValEl) synValEl.textContent = proj.synergy.total;
    if (synMeter) synMeter.setAttribute('aria-valuenow', proj.synergy.total);
    if (synFill) synFill.style.width = proj.synergy.total + '%';

    if (synRolesChip) synRolesChip.textContent = 'Coverage: ' + proj.synergy.coverage + '/50';
    if (synChemChip) synChemChip.textContent = 'Chemistry: ' + proj.synergy.chemistry + '/30';
    if (synIglChip) synIglChip.textContent = 'IGL Link: ' + proj.synergy.iglLink + '/20';

    // Projected fantasy points
    var projPtsEl = document.getElementById('fr-projected-pts');
    var basePtsEl = document.getElementById('fr-base-pts');
    var multValEl = document.getElementById('fr-multiplier-val');
    var bonusBadge = document.getElementById('fr-multiplier-badge');

    if (projPtsEl) projPtsEl.textContent = proj.total.toFixed(1);
    if (basePtsEl) basePtsEl.textContent = proj.base.toFixed(1);
    if (multValEl) multValEl.textContent = 'x' + proj.multiplier.toFixed(2);
    if (bonusBadge) {
      var bonusPct = Math.round((proj.multiplier - 1) * 100);
      bonusBadge.textContent = '+' + bonusPct + '% SYNERGY BONUS';
    }
  }

  function renderSlots() {
    var container = document.getElementById('fr-slots-container');
    if (!container) return;

    container.textContent = ''; // Safe wipe

    ROLES.forEach(function (role) {
      var meta = ROLE_META[role];
      var playerId = state.roster[role];
      var player = playerId && Object.prototype.hasOwnProperty.call(PLAYER_BY_ID, playerId)
        ? PLAYER_BY_ID[playerId]
        : null;

      var slotCard = document.createElement('div');
      slotCard.className = 'fr-slot-card' + (player ? ' slot-filled' : '');
      slotCard.style.setProperty('--role-color', meta.color);

      // Slot Header
      var header = document.createElement('div');
      header.className = 'fr-slot-header';
      header.appendChild(createRoleSvg(role));

      var roleLabel = document.createElement('span');
      roleLabel.className = 'fr-role-label';
      roleLabel.textContent = role.toUpperCase();
      header.appendChild(roleLabel);

      slotCard.appendChild(header);

      if (player) {
        // Filled Slot Body
        var body = document.createElement('div');
        body.className = 'fr-slot-player-content';

        var nameEl = document.createElement('div');
        nameEl.className = 'fr-slot-name';
        nameEl.textContent = player.name;
        body.appendChild(nameEl);

        var teamEl = document.createElement('div');
        teamEl.className = 'fr-slot-team';
        teamEl.textContent = '🛡️ ' + player.team;
        body.appendChild(teamEl);

        var metaRow = document.createElement('div');
        metaRow.className = 'fr-slot-meta-row';

        var salaryCol = document.createElement('div');
        salaryCol.className = 'meta-item';
        var salaryLabel = document.createElement('span');
        salaryLabel.className = 'meta-k';
        salaryLabel.textContent = 'SALARY';
        var salaryVal = document.createElement('span');
        salaryVal.className = 'meta-v';
        salaryVal.textContent = formatMoney(player.salary);
        salaryCol.appendChild(salaryLabel);
        salaryCol.appendChild(salaryVal);
        metaRow.appendChild(salaryCol);

        var ptsCol = document.createElement('div');
        ptsCol.className = 'meta-item text-right';
        var ptsLabel = document.createElement('span');
        ptsLabel.className = 'meta-k';
        ptsLabel.textContent = 'PROJ PTS';
        var ptsVal = document.createElement('span');
        ptsVal.className = 'meta-v';
        ptsVal.textContent = player.pts.toFixed(1);
        ptsCol.appendChild(ptsLabel);
        ptsCol.appendChild(ptsVal);
        metaRow.appendChild(ptsCol);

        body.appendChild(metaRow);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'fr-btn fr-btn-remove-slot';
        removeBtn.textContent = '✖ Remove';
        removeBtn.setAttribute('aria-label', 'Remove ' + player.name + ' from ' + role + ' slot');
        removeBtn.addEventListener('click', function () {
          releaseRole(role);
        });

        body.appendChild(removeBtn);
        slotCard.appendChild(body);
      } else {
        // Empty Slot Placeholder
        var emptyBody = document.createElement('div');
        emptyBody.className = 'fr-slot-empty-content';

        var emptyIcon = document.createElement('div');
        emptyIcon.className = 'empty-icon';
        emptyIcon.textContent = '➕';
        emptyBody.appendChild(emptyIcon);

        var emptyTitle = document.createElement('div');
        emptyTitle.className = 'empty-title';
        emptyTitle.textContent = 'EMPTY SLOT';
        emptyBody.appendChild(emptyTitle);

        var emptyHint = document.createElement('div');
        emptyHint.className = 'empty-hint';
        emptyHint.textContent = 'Select ' + role + ' from bench';
        emptyBody.appendChild(emptyHint);

        slotCard.appendChild(emptyBody);
      }

      container.appendChild(slotCard);
    });
  }

  function renderFilterChips() {
    var container = document.getElementById('fr-role-filters');
    if (!container) return;

    container.textContent = ''; // Safe wipe

    var filterOptions = ['ALL'].concat(ROLES);

    filterOptions.forEach(function (opt) {
      var count = opt === 'ALL'
        ? PLAYER_CATALOG.length
        : PLAYER_CATALOG.filter(function (p) { return p.role === opt; }).length;

      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'fr-chip' + (state.activeFilter === opt ? ' active' : '');
      if (opt !== 'ALL') {
        chip.style.setProperty('--chip-color', ROLE_META[opt].color);
      }

      chip.textContent = opt + ' (' + count + ')';
      chip.setAttribute('aria-pressed', state.activeFilter === opt ? 'true' : 'false');

      chip.addEventListener('click', function () {
        state.activeFilter = opt;
        renderFilterChips();
        renderBench();
      });

      container.appendChild(chip);
    });
  }

  function renderBench() {
    var container = document.getElementById('fr-bench-container');
    var countEl = document.getElementById('fr-bench-pool-count');
    if (!container) return;

    container.textContent = ''; // Safe wipe

    // 1. Filter by role
    var list = PLAYER_CATALOG.filter(function (p) {
      if (state.activeFilter !== 'ALL' && p.role !== state.activeFilter) return false;
      if (state.searchQuery) {
        var query = state.searchQuery.toLowerCase();
        var matchName = p.name.toLowerCase().indexOf(query) !== -1;
        var matchTeam = p.team.toLowerCase().indexOf(query) !== -1;
        if (!matchName && !matchTeam) return false;
      }
      return true;
    });

    // 2. Sort
    list.sort(function (a, b) {
      switch (state.sortOrder) {
        case 'salary-asc':
          return a.salary - b.salary;
        case 'pts-desc':
          return b.pts - a.pts;
        case 'pts-asc':
          return a.pts - b.pts;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'salary-desc':
        default:
          return b.salary - a.salary;
      }
    });

    if (countEl) {
      countEl.textContent = 'Showing ' + list.length + ' of ' + PLAYER_CATALOG.length + ' players';
    }

    var remainingCap = calculateRemainingCap();

    list.forEach(function (player) {
      var isDrafted = state.roster[player.role] === player.id;
      var netCost = calculateNetCost(player);
      var isOverCap = !isDrafted && netCost > remainingCap;
      var roleMeta = ROLE_META[player.role];

      var card = document.createElement('div');
      var cardClass = 'fr-player-card';
      if (isDrafted) cardClass += ' card-drafted';
      if (isOverCap) cardClass += ' card-over-cap';

      card.className = cardClass;
      card.style.setProperty('--role-color', roleMeta.color);

      // Top Header
      var topRow = document.createElement('div');
      topRow.className = 'fr-player-card-top';

      var identity = document.createElement('div');
      identity.className = 'player-identity';
      identity.appendChild(createRoleSvg(player.role));

      var infoText = document.createElement('div');
      infoText.className = 'player-info-text';

      var nameEl = document.createElement('div');
      nameEl.className = 'player-name';
      nameEl.textContent = player.name;
      infoText.appendChild(nameEl);

      var teamEl = document.createElement('div');
      teamEl.className = 'player-team';
      teamEl.textContent = player.team;
      infoText.appendChild(teamEl);

      identity.appendChild(infoText);
      topRow.appendChild(identity);

      var roleBadge = document.createElement('div');
      roleBadge.className = 'player-role-badge';
      roleBadge.textContent = player.role;
      topRow.appendChild(roleBadge);

      card.appendChild(topRow);

      // Player Stats Grid
      var statsRow = document.createElement('div');
      statsRow.className = 'fr-player-stats-row';

      var salaryCol = document.createElement('div');
      salaryCol.className = 'stat-item';
      var sKey = document.createElement('span');
      sKey.className = 'stat-key';
      sKey.textContent = 'SALARY';
      var sVal = document.createElement('span');
      sVal.className = 'stat-val salary-highlight';
      sVal.textContent = formatMoney(player.salary);
      salaryCol.appendChild(sKey);
      salaryCol.appendChild(sVal);
      statsRow.appendChild(salaryCol);

      var ptsCol = document.createElement('div');
      ptsCol.className = 'stat-item text-right';
      var pKey = document.createElement('span');
      pKey.className = 'stat-key';
      pKey.textContent = 'PROJ PTS';
      var pVal = document.createElement('span');
      pVal.className = 'stat-val pts-highlight';
      pVal.textContent = player.pts.toFixed(1);
      ptsCol.appendChild(pKey);
      ptsCol.appendChild(pVal);
      statsRow.appendChild(ptsCol);

      card.appendChild(statsRow);

      // Tagline Stats
      var tagEl = document.createElement('div');
      tagEl.className = 'player-tagline';
      var dot = document.createElement('span');
      dot.className = 'tagline-dot';
      tagEl.appendChild(dot);
      var tagText = document.createTextNode(' ' + player.stats);
      tagEl.appendChild(tagText);
      card.appendChild(tagEl);

      // Action Button
      var actionBtn = document.createElement('button');
      actionBtn.type = 'button';

      if (isDrafted) {
        actionBtn.className = 'fr-btn fr-btn-draft btn-in-roster';
        actionBtn.textContent = '✓ In Roster (Remove)';
        actionBtn.setAttribute('aria-label', 'Remove ' + player.name + ' from roster');
        actionBtn.addEventListener('click', function () {
          releaseRole(player.role);
        });
      } else if (isOverCap) {
        var diff = netCost - remainingCap;
        actionBtn.className = 'fr-btn fr-btn-draft btn-over-cap';
        actionBtn.textContent = 'Over Cap (+' + formatMoney(diff) + ')';
        actionBtn.setAttribute('aria-disabled', 'true');
        actionBtn.addEventListener('click', function () {
          showToast('⚠️ Cannot draft ' + player.name + ': exceeds remaining budget by ' + formatMoney(diff));
        });
      } else {
        var currentRolePlayerId = state.roster[player.role];
        var isSwap = currentRolePlayerId !== null;

        actionBtn.className = 'fr-btn fr-btn-draft';
        actionBtn.textContent = isSwap ? '🔄 Swap at ' + player.role : '➕ Draft ' + player.role;
        actionBtn.setAttribute('aria-label', (isSwap ? 'Swap with ' : 'Draft ') + player.name + ' as ' + player.role);
        actionBtn.addEventListener('click', function () {
          draftPlayer(player);
        });
      }

      card.appendChild(actionBtn);
      container.appendChild(card);
    });
  }

  function render() {
    renderDashboard();
    renderSlots();
    renderBench();
  }

  // ===== Event Listeners Initialization =====
  function init() {
    var searchInput = document.getElementById('fr-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchQuery = (e.target.value || '').trim();
        renderBench();
      });
    }

    var sortSelect = document.getElementById('fr-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function (e) {
        state.sortOrder = e.target.value;
        renderBench();
      });
    }

    var autofillBtn = document.getElementById('fr-btn-autofill');
    if (autofillBtn) {
      autofillBtn.addEventListener('click', autoDraftOptimal);
    }

    var copyBtn = document.getElementById('fr-btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', shareRoster);
    }

    var clearBtn = document.getElementById('fr-btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllSlots);
    }

    // Set salary cap label in header
    var capDisplay = document.getElementById('fr-cap-display');
    if (capDisplay) {
      capDisplay.textContent = formatMoney(CONFIG.SALARY_CAP);
    }

    renderFilterChips();

    // Restore saved state from localStorage
    var restored = loadRoster();
    render();

    var draftedCount = getDraftedPlayers().length;
    if (restored && draftedCount > 0) {
      showToast('Loaded saved fantasy roster (' + draftedCount + '/5 players drafted).');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ===== Player Comparator (Issue #72) =====
// Wrapped in its own IIFE so its names cannot collide with the roster builder above.
(function () {
  'use strict';

document.addEventListener('DOMContentLoaded', initComparator);

// Demo roster (made-up numbers).
const PLAYERS = [
  { id: 'nova',   name: 'NOVA',   team: 'Team Cyber',     aim: 94, reaction: 148, kd: 1.92, clutch: 58, win: 71 },
  { id: 'specter', name: 'SPECTER', team: 'Phantom Squad', aim: 89, reaction: 136, kd: 1.64, clutch: 49, win: 66 },
  { id: 'blaze',  name: 'BLAZE',  team: 'Neon Riders',    aim: 91, reaction: 162, kd: 1.78, clutch: 41, win: 62 },
  { id: 'titan',  name: 'TITAN',  team: 'Apex Titans',    aim: 82, reaction: 171, kd: 1.31, clutch: 63, win: 74 },
  { id: 'hex',    name: 'HEX',    team: 'Team Cyber',     aim: 86, reaction: 154, kd: 1.47, clutch: 37, win: 58 },
  { id: 'ryo',    name: 'RYO',    team: 'Phantom Squad',  aim: 97, reaction: 142, kd: 2.05, clutch: 44, win: 69 },
  { id: 'vex',    name: 'VEX',    team: 'Neon Riders',    aim: 78, reaction: 189, kd: 1.12, clutch: 52, win: 55 },
  { id: 'echo',   name: 'ECHO',   team: 'Apex Titans',    aim: 84, reaction: 158, kd: 1.38, clutch: 66, win: 72 }
];

// One entry per radar axis. `min`/`max` map the raw value onto 0..1 for the chart.
// Reaction time is inverted (lower ms is better), so its range runs from the slow end to the fast end.
const STATS = [
  { key: 'aim',      label: 'Aim Accuracy',  unit: '%',  decimals: 0, higherIsBetter: true,  min: 50,  max: 100 },
  { key: 'reaction', label: 'Reaction Time', unit: ' ms', decimals: 0, higherIsBetter: false, min: 220, max: 120 },
  { key: 'kd',       label: 'K/D Ratio',     unit: '',   decimals: 2, higherIsBetter: true,  min: 0.5, max: 2.5 },
  { key: 'clutch',   label: 'Clutch Rate',   unit: '%',  decimals: 0, higherIsBetter: true,  min: 0,   max: 80 },
  { key: 'win',      label: 'Win %',         unit: '%',  decimals: 0, higherIsBetter: true,  min: 30,  max: 90 }
];

// Raw value -> 0..1 (clamped). Works for inverted stats because min > max there.
function normalize(stat, value) {
  const t = (value - stat.min) / (stat.max - stat.min);
  return Math.min(Math.max(t, 0), 1);
}

// Vertex of the radar polygon for axis `i` of `n` at fraction `t` of the radius.
// Axis 0 points straight up, the rest go clockwise.
function radarPoint(i, n, t, cx, cy, radius) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: cx + radius * t * Math.cos(angle), y: cy + radius * t * Math.sin(angle) };
}

// Which side wins a stat: 'a', 'b' or 'tie'.
function betterSide(stat, a, b) {
  if (a === b) return 'tie';
  const aWins = stat.higherIsBetter ? a > b : a < b;
  return aWins ? 'a' : 'b';
}

function formatStat(stat, value) {
  return value.toFixed(stat.decimals) + stat.unit;
}

function svgNode(name, attrs, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
  if (text !== undefined) el.textContent = text;
  return el;
}

function initComparator() {
  const selA = document.getElementById('player-a');
  const selB = document.getElementById('player-b');
  if (!selA || !selB) return;

  const svg = document.getElementById('radar');
  const CX = 220;
  const CY = 200;
  const R = 118;
  const RINGS = 4;

  [selA, selB].forEach((sel) => {
    PLAYERS.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + ' (' + p.team + ')';
      sel.appendChild(opt);
    });
  });
  selA.value = 'nova';
  selB.value = 'titan';

  const byId = (id) => PLAYERS.find((p) => p.id === id);

  function drawStatic() {
    // Everything the chart needs besides the two polygons, drawn once.
    const frame = svgNode('g', { id: 'radar-frame' });
    for (let ring = 1; ring <= RINGS; ring++) {
      const pts = STATS.map((_, i) => {
        const p = radarPoint(i, STATS.length, ring / RINGS, CX, CY, R);
        return p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }).join(' ');
      frame.appendChild(svgNode('polygon', { points: pts, class: 'radar-ring' }));
    }
    STATS.forEach((stat, i) => {
      const end = radarPoint(i, STATS.length, 1, CX, CY, R);
      frame.appendChild(svgNode('line', { x1: CX, y1: CY, x2: end.x.toFixed(1), y2: end.y.toFixed(1), class: 'radar-axis' }));
      const lab = radarPoint(i, STATS.length, 1.2, CX, CY, R);
      const anchor = Math.abs(lab.x - CX) < 4 ? 'middle' : lab.x > CX ? 'start' : 'end';
      frame.appendChild(svgNode('text', { x: lab.x.toFixed(1), y: (lab.y + 4).toFixed(1), 'text-anchor': anchor, class: 'radar-label' }, stat.label));
    });
    svg.appendChild(frame);
    svg.appendChild(svgNode('g', { id: 'radar-data' }));
  }
  drawStatic();

  function drawPlayer(group, player, cls) {
    const pts = STATS.map((stat, i) => radarPoint(i, STATS.length, normalize(stat, player[stat.key]), CX, CY, R));
    group.appendChild(svgNode('polygon', {
      points: pts.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '),
      class: 'radar-shape ' + cls
    }));
    pts.forEach((p, i) => {
      const dot = svgNode('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4.5, class: 'radar-dot ' + cls });
      dot.appendChild(svgNode('title', {}, player.name + ' - ' + STATS[i].label + ': ' + formatStat(STATS[i], player[STATS[i].key])));
      group.appendChild(dot);
    });
  }

  function setText(id, text) { document.getElementById(id).textContent = text; }

  function render() {
    const a = byId(selA.value);
    const b = byId(selB.value);

    setText('team-a', a.team);
    setText('team-b', b.team);
    setText('legend-a', a.name);
    setText('legend-b', b.name);
    setText('th-a', a.name);
    setText('th-b', b.name);

    const data = document.getElementById('radar-data');
    data.textContent = '';
    drawPlayer(data, a, 'series-a');
    drawPlayer(data, b, 'series-b');

    const body = document.getElementById('compare-body');
    body.textContent = '';
    let winsA = 0;
    let winsB = 0;
    STATS.forEach((stat) => {
      const side = betterSide(stat, a[stat.key], b[stat.key]);
      if (side === 'a') winsA++;
      if (side === 'b') winsB++;

      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = stat.label + (stat.higherIsBetter ? '' : ' (lower is better)');
      tr.appendChild(th);

      [['a', a], ['b', b]].forEach(([key, player]) => {
        const td = document.createElement('td');
        td.textContent = formatStat(stat, player[stat.key]);
        if (side === key) {
          td.className = 'better better-' + key;
          const tag = document.createElement('span');
          tag.className = 'better-tag';
          tag.textContent = ' ✓';
          const sr = document.createElement('span');
          sr.className = 'sr-only';
          sr.textContent = ' (better)';
          td.append(tag, sr);
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    let summary;
    if (a.id === b.id) summary = 'Same player picked twice, so every stat is a tie. Pick someone else to compare.';
    else if (winsA === winsB) summary = a.name + ' and ' + b.name + ' are level: ' + winsA + ' stat wins each.';
    else summary = (winsA > winsB ? a.name : b.name) + ' leads, winning ' + Math.max(winsA, winsB) + ' of ' + STATS.length + ' stats.';
    setText('compare-summary', summary);

    setText('radar-desc', a.name + ' versus ' + b.name + ' across ' + STATS.map((s) => s.label).join(', ') + '. ' + summary);
  }

  selA.addEventListener('change', render);
  selB.addEventListener('change', render);
  render();
}

// ===== Tournament Match Status Filter Tabs (Issue #31) =====
function initMatchFilters() {
  var tabs = document.querySelectorAll('.match-filter-tab');
  var cards = document.querySelectorAll('.match-card');
  if (!tabs.length || !cards.length) return;

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var filter = tab.getAttribute('data-filter');

      tabs.forEach(function (t) {
        var isCurrent = (t === tab);
        t.classList.toggle('active', isCurrent);
        t.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });

      cards.forEach(function (card) {
        var status = card.getAttribute('data-status');
        if (filter === 'all' || status === filter) {
          card.classList.remove('is-hidden');
        } else {
          card.classList.add('is-hidden');
        }
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMatchFilters);
} else {
  initMatchFilters();
}
})();

/* ===== BEGIN issue #197: team leaderboard with win streaks and head-to-head ===== */
(function () {
  'use strict';

  var body = document.getElementById('lb-body');
  if (!body) return;

  // Made-up demo data. Every best-of-3 series between the 8 teams, in schedule order.
  // Each row is [round, teamA, teamB, mapsA, mapsB]. Everything on the board is computed from these rows.
  var TEAMS = {
    cyber:   { name: 'Team Cyber',    icon: '⚡', color: '#a855f7' },
    neon:    { name: 'Neon Riders',   icon: '💠', color: '#f43f5e' },
    phantom: { name: 'Phantom Squad', icon: '👻', color: '#06b6d4' },
    apex:    { name: 'Apex Titans',   icon: '🔱', color: '#f59e0b' },
    vortex:  { name: 'Vortex Prime',  icon: '🌀', color: '#60a5fa' },
    storm:   { name: 'Storm Reapers', icon: '🌩️', color: '#10b981' },
    iron:    { name: 'Iron Vanguard', icon: '🛡️', color: '#94a3b8' },
    lunar:   { name: 'Lunar Wolves',  icon: '🐺', color: '#e879f9' }
  };
  var SERIES = [
    [1, 'cyber', 'lunar', 2, 0], [1, 'neon', 'iron', 2, 1], [1, 'phantom', 'storm', 1, 2], [1, 'apex', 'vortex', 2, 0],
    [2, 'cyber', 'iron', 2, 0], [2, 'lunar', 'storm', 0, 2], [2, 'neon', 'vortex', 1, 2], [2, 'phantom', 'apex', 2, 0],
    [3, 'cyber', 'storm', 2, 0], [3, 'iron', 'vortex', 2, 0], [3, 'lunar', 'apex', 2, 0], [3, 'neon', 'phantom', 2, 0],
    [4, 'cyber', 'vortex', 2, 0], [4, 'storm', 'apex', 2, 1], [4, 'iron', 'phantom', 1, 2], [4, 'lunar', 'neon', 1, 2],
    [5, 'cyber', 'apex', 0, 2], [5, 'vortex', 'phantom', 1, 2], [5, 'storm', 'neon', 0, 2], [5, 'iron', 'lunar', 0, 2],
    [6, 'cyber', 'phantom', 0, 2], [6, 'apex', 'neon', 2, 0], [6, 'vortex', 'lunar', 2, 1], [6, 'storm', 'iron', 2, 1],
    [7, 'cyber', 'neon', 2, 1], [7, 'phantom', 'lunar', 2, 0], [7, 'apex', 'iron', 2, 1], [7, 'vortex', 'storm', 0, 2]
  ];

  var COLUMN_LABEL = { pts: 'Points', wins: 'Wins', diff: 'Map difference', streak: 'Win streak' };
  var HOT_STREAK = 3;

  function pointsFor(mine, theirs) {
    if (mine > theirs) return theirs === 0 ? 3 : 2;
    return mine === 0 ? 0 : 1;
  }

  function build() {
    var rows = {};
    Object.keys(TEAMS).forEach(function (id) {
      rows[id] = { id: id, wins: 0, losses: 0, pts: 0, mapsWon: 0, mapsLost: 0, games: [], h2h: {} };
    });
    SERIES.forEach(function (s) {
      [[s[1], s[2], s[3], s[4]], [s[2], s[1], s[4], s[3]]].forEach(function (g) {
        var r = rows[g[0]];
        var won = g[2] > g[3];
        r.wins += won ? 1 : 0;
        r.losses += won ? 0 : 1;
        r.pts += pointsFor(g[2], g[3]);
        r.mapsWon += g[2];
        r.mapsLost += g[3];
        var game = { round: s[0], opp: g[1], mine: g[2], theirs: g[3], won: won };
        r.games.push(game);
        r.h2h[g[1]] = game;
      });
    });
    return rows;
  }

  function streakOf(games) {
    var sorted = games.slice().sort(function (a, b) { return a.round - b.round; });
    var last = sorted[sorted.length - 1];
    var n = 0;
    for (var i = sorted.length - 1; i >= 0 && sorted[i].won === last.won; i--) n++;
    return last.won ? n : -n;
  }

  // Official order: points, then results between the teams tied on points, then map difference, then maps won.
  function officialOrder(rows) {
    var ids = Object.keys(rows);
    var tied = {};
    ids.forEach(function (id) { tied[rows[id].pts] = (tied[rows[id].pts] || []).concat(id); });
    ids.forEach(function (id) {
      var group = tied[rows[id].pts];
      rows[id].miniWins = group.reduce(function (n, other) {
        var g = other !== id && rows[id].h2h[other];
        return n + (g && g.won ? 1 : 0);
      }, 0);
      rows[id].tieBroken = group.length > 1;
    });
    ids.sort(function (a, b) {
      var x = rows[a], y = rows[b];
      return (y.pts - x.pts) || (y.miniWins - x.miniWins) ||
        ((y.mapsWon - y.mapsLost) - (x.mapsWon - x.mapsLost)) || (y.mapsWon - x.mapsWon) ||
        (TEAMS[a].name < TEAMS[b].name ? -1 : 1);
    });
    ids.forEach(function (id, i) {
      rows[id].rank = i + 1;
      rows[id].diff = rows[id].mapsWon - rows[id].mapsLost;
      rows[id].streak = streakOf(rows[id].games);
    });
    return ids;
  }

  var rows = build();
  var official = officialOrder(rows);
  var state = { key: 'pts', dir: 'desc', open: {} };

  function metric(r, key) {
    return key === 'wins' ? r.wins : key === 'diff' ? r.diff : key === 'streak' ? r.streak : -r.rank;
  }

  function sortedIds() {
    var ids = official.slice();
    ids.sort(function (a, b) {
      var d = metric(rows[b], state.key) - metric(rows[a], state.key);
      if (state.dir === 'asc') d = -d;
      return d || (rows[a].rank - rows[b].rank);
    });
    return ids;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  var FLAME_PATH = 'M12 2c1 3.5-1.5 5-3 7.5C7.6 11.7 8 13.5 9 14.5c-.1-1.6.7-2.6 1.7-3.4C11.4 13 14 14 14 17a2 2 0 0 1-4 0c-2.8-1-4-3.6-3.5-6C5.3 12.6 4 14.3 4 16.5 4 20 7.6 22 12 22s8-2.4 8-6.5c0-4.2-3.6-6-4.8-9.5-.5 1.2-1.2 2-2 2.6C13.7 7 14 4.5 12 2Z';
  function flame() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'lb-flame');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', FLAME_PATH);
    svg.appendChild(path);
    return svg;
  }

  function streakCell(r) {
    var td = el('td', 'lb-c-streak');
    var n = Math.abs(r.streak);
    var badge = el('span', 'lb-streak ' + (r.streak > 0 ? 'is-win' : 'is-loss'));
    if (r.streak >= HOT_STREAK) {
      badge.classList.add('is-hot');
      if (r.streak >= 5) badge.classList.add('is-blaze');
      badge.appendChild(flame());
    }
    badge.appendChild(el('span', '', (r.streak > 0 ? 'W' : 'L') + n));
    badge.appendChild(el('span', 'sr-only', ' (' + n + (r.streak > 0 ? (n === 1 ? ' win' : ' wins') : (n === 1 ? ' loss' : ' losses')) + ' in a row)'));
    td.appendChild(badge);
    return td;
  }

  function detailPanel(r) {
    var wrap = el('div', 'lb-detail-inner');
    var games = r.games.slice().sort(function (a, b) { return a.round - b.round; });

    var head = el('div', 'lb-detail-head');
    head.appendChild(el('h3', 'lb-detail-title', TEAMS[r.id].name.toUpperCase() + ' // HEAD-TO-HEAD'));
    var form = el('div', 'lb-form');
    form.setAttribute('role', 'img');
    form.setAttribute('aria-label', 'Form, oldest to newest: ' + games.map(function (g) { return g.won ? 'win' : 'loss'; }).join(', '));
    games.forEach(function (g) { form.appendChild(el('span', 'lb-dot ' + (g.won ? 'is-win' : 'is-loss'), g.won ? 'W' : 'L')); });
    head.appendChild(form);
    wrap.appendChild(head);

    var played = r.wins + r.losses;
    var stats = el('dl', 'lb-stats');
    [['Series', r.wins + '-' + r.losses], ['Win rate', Math.round(r.wins / played * 100) + '%'],
     ['Maps', r.mapsWon + '-' + r.mapsLost], ['Points', String(r.pts)]].forEach(function (s) {
      var d = el('div', 'lb-stat');
      d.appendChild(el('dt', '', s[0]));
      d.appendChild(el('dd', '', s[1]));
      stats.appendChild(d);
    });
    wrap.appendChild(stats);

    var list = el('ul', 'lb-h2h');
    list.setAttribute('aria-label', 'Series results against every other team');
    official.filter(function (id) { return id !== r.id; }).forEach(function (oid) {
      var g = r.h2h[oid];
      var li = el('li', 'lb-h2h-item ' + (g.won ? 'is-win' : 'is-loss'));
      li.appendChild(el('span', 'lb-h2h-res', g.won ? 'W' : 'L'));
      var mid = el('span', 'lb-h2h-mid');
      mid.appendChild(el('span', 'lb-h2h-opp', 'vs ' + TEAMS[oid].name));
      mid.appendChild(el('span', 'lb-h2h-meta', 'Round ' + g.round + ' • rank #' + rows[oid].rank));
      li.appendChild(mid);
      li.appendChild(el('span', 'lb-h2h-score', g.mine + '-' + g.theirs));
      li.appendChild(el('span', 'sr-only', g.won ? ' win' : ' loss'));
      list.appendChild(li);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function toggle(id, force) {
    var open = force === undefined ? !state.open[id] : force;
    state.open[id] = open;
    var row = body.querySelector('tr[data-team="' + id + '"]');
    var detail = document.getElementById('lb-detail-' + id);
    if (!row || !detail) return;
    row.classList.toggle('is-open', open);
    row.querySelector('.lb-team-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
    detail.hidden = !open;
  }

  function render(animate) {
    body.textContent = '';
    sortedIds().forEach(function (id) {
      var r = rows[id];
      var t = TEAMS[id];
      var tr = el('tr', 'lb-row' + (state.open[id] ? ' is-open' : ''));
      tr.setAttribute('data-team', id);
      tr.style.setProperty('--tc', t.color);

      var rank = el('td', 'lb-c-rank');
      var badge = el('span', 'lb-rank' + (r.rank <= 3 ? ' podium-' + r.rank : ''), String(r.rank));
      badge.setAttribute('title', 'Official rank ' + r.rank + (r.tieBroken ? ' (tied on points, decided by head-to-head or map difference)' : ''));
      rank.appendChild(badge);
      rank.appendChild(el('span', 'sr-only', 'Rank ' + r.rank));
      tr.appendChild(rank);

      var teamTd = el('td', 'lb-c-team');
      var btn = el('button', 'lb-team-btn');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', state.open[id] ? 'true' : 'false');
      btn.setAttribute('aria-controls', 'lb-detail-' + id);
      btn.appendChild(el('span', 'lb-avatar', t.icon)).setAttribute('aria-hidden', 'true');
      btn.appendChild(el('span', 'lb-name', t.name.toUpperCase()));
      var chev = el('span', 'lb-chev');
      chev.setAttribute('aria-hidden', 'true');
      btn.appendChild(chev);
      teamTd.appendChild(btn);
      tr.appendChild(teamTd);

      tr.appendChild(el('td', 'lb-c-wl', r.wins + '-' + r.losses));
      var diff = el('td', 'lb-c-diff ' + (r.diff > 0 ? 'is-pos' : r.diff < 0 ? 'is-neg' : ''), (r.diff > 0 ? '+' : '') + r.diff);
      tr.appendChild(diff);
      tr.appendChild(el('td', 'lb-c-pts', String(r.pts)));
      tr.appendChild(streakCell(r));
      body.appendChild(tr);

      var dtr = el('tr', 'lb-detail');
      dtr.id = 'lb-detail-' + id;
      dtr.hidden = !state.open[id];
      dtr.style.setProperty('--tc', t.color);
      var dtd = el('td');
      dtd.colSpan = 6;
      dtd.appendChild(detailPanel(r));
      dtr.appendChild(dtd);
      body.appendChild(dtr);
    });

    var ths = document.querySelectorAll('#lb-table thead th[data-sort]');
    Array.prototype.forEach.call(ths, function (th) {
      var active = th.getAttribute('data-sort') === state.key;
      if (active) th.setAttribute('aria-sort', state.dir === 'desc' ? 'descending' : 'ascending');
      else th.removeAttribute('aria-sort');
      th.classList.toggle('is-sorted', active);
      th.classList.toggle('is-asc', active && state.dir === 'asc');
    });
    if (animate) {
      body.classList.remove('lb-swap');
      void body.offsetWidth;
      body.classList.add('lb-swap');
    }
  }

  function setSort(key) {
    if (state.key === key) state.dir = state.dir === 'desc' ? 'asc' : 'desc';
    else { state.key = key; state.dir = 'desc'; }
    render(true);
    document.getElementById('lb-status').textContent =
      'Sorted by ' + COLUMN_LABEL[key] + ', ' + (state.dir === 'desc' ? 'highest first' : 'lowest first') + '.';
  }

  Array.prototype.forEach.call(document.querySelectorAll('#lb-table .lb-sort'), function (b) {
    b.addEventListener('click', function () { setSort(b.getAttribute('data-sort')); });
  });

  body.addEventListener('click', function (e) {
    var row = e.target.closest('tr.lb-row');
    if (!row) return;
    toggle(row.getAttribute('data-team'));
  });

  // Up and Down arrows move between the team buttons.
  body.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var btn = e.target.closest('.lb-team-btn');
    if (!btn) return;
    var all = Array.prototype.slice.call(body.querySelectorAll('.lb-team-btn'));
    var next = all[all.indexOf(btn) + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  });

  render(false);
})();
/* ===== END issue #197 ===== */
