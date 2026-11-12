const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function seededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Seed must be an integer from 0 to 4294967295.');
  let value = seed;
  return () => { value = (value + 0x6D2B79F5) >>> 0; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function buyPlan(credits) {
  if (!Number.isInteger(credits) || credits < 0 || credits > 16000) throw new Error('Invalid credits.');
  return credits >= 4200 ? { name: 'Full buy', cost: 4200, power: 1 } : credits >= 2200 ? { name: 'Force buy', cost: 2200, power: .65 } : { name: 'Eco', cost: Math.min(500, credits), power: .3 };
}
export function simulateMatch({ seed, ratingA, ratingB, firstTo = 7 }) {
  if (![ratingA, ratingB].every(n => Number.isInteger(n) && n >= 800 && n <= 2400)) throw new Error('Ratings must be integers from 800 to 2400.');
  if (![7, 13].includes(firstTo)) throw new Error('Choose first to 7 or 13.');
  const random = seededRandom(seed); const names = ['Aurora', 'Umbra'];
  const teams = [ratingA, ratingB].map((rating, team) => ({ name: names[team], rating, credits: 800, score: 0, losses: 0,
    players: Array.from({ length: 5 }, (_, index) => ({ name: `${team ? 'U' : 'A'}${index + 1}`, momentum: 0, kills: 0, deaths: 0 })) }));
  const events = []; const rounds = [];
  const pick = values => values[Math.floor(random() * values.length)];
  for (let round = 1; round < firstTo * 2 && Math.max(...teams.map(t => t.score)) < firstTo; round++) {
    const attacker = (round - 1) % 2; const plans = teams.map(team => buyPlan(team.credits));
    const startCredits = teams.map(team => team.credits); const alive = [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]];
    const kills = [0, 0]; let time = 20;
    const planted = random() < .45;
    events.push({ round, at: 0, type: 'buy', text: `Aurora: ${plans[0].name} (${plans[0].cost}) · Umbra: ${plans[1].name} (${plans[1].cost})` });
    if (planted) events.push({ round, at: 12, type: 'objective', text: `${names[attacker]} plants the demo bomb objective.` });
    while (alive[0].length && alive[1].length) {
      const players = alive.map((list, team) => teams[team].players[pick(list)]);
      const eloChance = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
      const probabilityA = clamp(eloChance + (plans[0].power - plans[1].power) * .15
        + players[0].momentum - players[1].momentum + (planted ? (attacker ? -.04 : .04) : 0), .08, .92);
      for (let team = 0; team < 2; team++) if (alive[team].length === 1 && alive[1 - team].length > 1) {
        events.push({ round, at: time - .1, type: 'clutch', probability: team ? 1 - probabilityA : probabilityA,
          text: `${names[team]} ${players[team].name} 1v${alive[1 - team].length}: ${Math.round((team ? 1 - probabilityA : probabilityA) * 100)}% estimated duel chance.` });
      }
      const winner = random() < probabilityA ? 0 : 1; const loser = 1 - winner;
      players[winner].kills++; players[loser].deaths++; kills[winner]++;
      players[winner].momentum = clamp(players[winner].momentum + .02, -.12, .12);
      players[loser].momentum = clamp(players[loser].momentum - .025, -.12, .12);
      alive[loser].splice(alive[loser].findIndex(index => teams[loser].players[index] === players[loser]), 1);
      events.push({ round, at: time, type: 'kill', text: `${names[winner]} ${players[winner].name} eliminates ${names[loser]} ${players[loser].name}.` });
      time += 8 + Math.floor(random() * 5);
    }
    const winner = alive[0].length ? 0 : 1; teams[winner].score++;
    if (planted && winner !== attacker) events.push({ round, at: time, type: 'objective', text: `${names[winner]} defuses the demo objective.` });
    teams.forEach((team, index) => {
      team.losses = winner === index ? 0 : team.losses + 1;
      const income = winner === index ? 3250 : Math.min(3400, 1400 + (team.losses - 1) * 500);
      const bonus = kills[index] * 60 + (planted && attacker === index ? 300 : 0);
      team.credits = Math.min(16000, startCredits[index] - plans[index].cost + income + bonus);
    });
    const summary = { round, winner, scores: teams.map(t => t.score), startCredits, plans, kills,
      credits: teams.map(t => t.credits), planted };
    rounds.push(summary);
    events.push({ round, at: time + 1, type: 'round_end', summary, text: `Round ${round}: ${names[winner]} wins · ${teams[0].score}–${teams[1].score}` });
  }
  return { seed, firstTo, teams, rounds, events, winner: teams[0].score === firstTo ? 0 : 1 };
}
