/**
 * Neurotech Interface - Metric ROI & Cost-Savings Forecaster Engine
 */

export class NeurotechInterfaceRoiEngine {
  constructor(options = {}) {
    this.currencySymbol = options.currencySymbol || '$';
    this.defaultHourlyRate = options.defaultHourlyRate || 65;
  }

  calculateAnnualSavings(inputs = {}) {
    const teamSize = Math.max(1, Number(inputs.teamSize) || 10);
    const hoursSavedPerWeek = Math.max(0, Number(inputs.hoursSavedPerWeek) || 4);
    const hourlyRate = Math.max(1, Number(inputs.hourlyRate) || this.defaultHourlyRate);
    const annualWeeks = 52;

    const weeklyHoursTotal = teamSize * hoursSavedPerWeek;
    const annualHoursTotal = weeklyHoursTotal * annualWeeks;
    const grossAnnualSavings = annualHoursTotal * hourlyRate;
    const efficiencyGainPercent = Math.min(100, Number(((hoursSavedPerWeek / 40) * 100).toFixed(1)));

    return {
      teamSize,
      hoursSavedPerWeek,
      hourlyRate,
      annualHoursSaved: annualHoursTotal,
      grossAnnualSavings: Number(grossAnnualSavings.toFixed(2)),
      efficiencyGainPercent
    };
  }

  computeBreakEvenMonths(investmentCost = 5000, monthlySavings = 1000) {
    const cost = Math.max(0, Number(investmentCost) || 0);
    const savings = Math.max(1, Number(monthlySavings) || 1);
    const months = cost / savings;
    return Number(months.toFixed(1));
  }

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `${this.currencySymbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
