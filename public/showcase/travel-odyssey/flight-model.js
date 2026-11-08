export function parseFlightTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) throw new Error('Use YYYY-MM-DDTHH:mm with Z or a UTC offset, e.g. +05:30.');
  const [, y, m, d, h, min, zone, sign, oh = '0', om = '0'] = match;
  const local = Date.UTC(+y, +m - 1, +d, +h, +min);
  if (+y < 2000 || +y > 2100 || +m < 1 || +m > 12 || +d < 1 || +h > 23 || +min > 59
    || new Date(local).getUTCDate() !== +d || +oh > 14 || +om > 59 || (+oh === 14 && +om !== 0)) throw new Error('Enter a valid calendar date, time and UTC offset (up to ±14:00).');
  return local - (zone === 'Z' ? 0 : (sign === '+' ? 1 : -1) * (+oh * 60 + +om) * 60000);
}
export function planFlights(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 8) throw new Error('Add between one and eight flight legs.');
  const legs = input.map((row, index) => {
    const from = String(row.from).trim().toUpperCase(); const to = String(row.to).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to) throw new Error(`Leg ${index + 1}: use distinct three-letter airport codes.`);
    const departure = parseFlightTime(row.departure); const arrival = parseFlightTime(row.arrival);
    const minutes = (arrival - departure) / 60000;
    if (minutes <= 0 || minutes > 2880) throw new Error(`Leg ${index + 1}: arrival must follow departure, within 48 hours.`);
    return { from, to, departure: row.departure, arrival: row.arrival, departureMs: departure, arrivalMs: arrival, minutes };
  });
  const connections = legs.slice(1).map((leg, index) => {
    const previous = legs[index]; const minutes = (leg.departureMs - previous.arrivalMs) / 60000;
    if (leg.from !== previous.to) throw new Error(`Connection ${index + 1}: arrival and next departure airports must match.`);
    if (minutes < 0) throw new Error(`Connection ${index + 1}: the next flight departs before arrival.`);
    const overnight = previous.arrival.slice(0, 10) !== leg.departure.slice(0, 10);
    const risk = minutes < 90 ? 'Tight connection' : minutes >= 360 ? 'Long layover' : 'Standard connection';
    return { airport: leg.from, minutes, overnight, risk,
      tip: minutes < 90 ? 'Check airline minimum connection time, terminal transfers and baggage arrangements.'
        : minutes >= 360 ? 'Check lounge access, opening hours and entry requirements before planning a rest.' : 'Allow for terminal transfers, security and boarding time.' };
  });
  const total = (legs.at(-1).arrivalMs - legs[0].departureMs) / 60000;
  if (total > 20160) throw new Error('This planner supports itineraries up to 14 days.');
  return { legs, connections, total, flightMinutes: legs.reduce((sum, leg) => sum + leg.minutes, 0), layoverMinutes: connections.reduce((sum, leg) => sum + leg.minutes, 0) };
}
export const duration = minutes => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
