export const DEFAULT_RATES = [
  { name: 'AWS scenario', monthlyCluster: 150, egress: 0.09, hours: 8, setupCluster: 0 },
  { name: 'Self-hosted scenario', monthlyCluster: 95, egress: 0.02, hours: 16, setupCluster: 3000 },
  { name: 'Launchpad scenario', monthlyCluster: 180, egress: 0.04, hours: 2, setupCluster: 0 }
];
function number(value, min, max, label, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`Enter a valid ${label} (${min}–${max}).`);
  return value;
}
export function compareTco(input, rates) {
  const clusters = number(input.clusters, 0, 1000, 'cluster count', true);
  const egress = number(input.egress, 0, 10000000, 'monthly egress in GB');
  const hourly = number(input.hourly, 0, 1000, 'engineering hourly cost');
  if (!Array.isArray(rates) || rates.length !== 3) throw new Error('Provide all three scenario assumptions.');
  const scenarios = rates.map((rate, index) => {
    const monthlyCluster = number(rate.monthlyCluster, 0, 100000, 'monthly cost per cluster');
    const unitEgress = number(rate.egress, 0, 100, 'egress cost per GB');
    const hours = number(rate.hours, 0, 744, 'total engineering hours per month');
    const setupCluster = number(rate.setupCluster, 0, 1000000, 'setup cost per cluster');
    const cents = dollars => Math.round(dollars * 100);
    const infrastructure = cents(clusters * monthlyCluster) * 36;
    const transfer = cents(egress * unitEgress) * 36;
    const engineering = cents(hours * hourly) * 36;
    const setup = cents(clusters * setupCluster);
    return { name: DEFAULT_RATES[index].name, assumptions: { monthlyCluster, egress: unitEgress, hours, setupCluster },
      infrastructure, transfer, engineering, setup, total: infrastructure + transfer + engineering + setup };
  });
  return { months: 36, input: { clusters, egress, hourly }, scenarios,
    annualDifference: scenarios.slice(0, 2).map(row => ({ name: row.name, cents: Math.round((row.total - scenarios[2].total) / 3) })) };
}
export function estimateText(result) {
  return ['ILLUSTRATIVE 36-MONTH CLOUD COST COMPARISON — NOT A VENDOR QUOTE',
    'USD. Flat usage/prices. Excludes taxes, discounts, financing, inflation, storage, redundancy and workload differences.',
    'Defaults are invented demo assumptions, not current AWS pricing or a commercial Launchpad offer.',
    JSON.stringify(result, null, 2), 'All monetary output fields are integer USD cents; assumptions are USD. Annual differences spread setup cost over three years.'].join('\n\n');
}
