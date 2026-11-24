/**
 * Fitness CrossFit Pro ROI and cost-savings forecaster.
 * Savings are based on weekly hours recovered across the team.
 */
export class FitnessCrossfitProRoiEngine {
  constructor() {
    this.lastCalculation = null;
    this.currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }

  normalizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : fallback;
  }

  calculateAnnualSavings(inputs = {}) {
    const teamSize = this.normalizeNumber(inputs.teamSize);
    const hoursSaved = this.normalizeNumber(inputs.hoursSaved);
    const hourlyCost = this.normalizeNumber(inputs.hourlyCost);
    const weeklySavings = teamSize * hoursSaved * hourlyCost;
    const monthlySavings = weeklySavings * 52 / 12;
    const annualSavings = weeklySavings * 52;

    this.lastCalculation = {
      teamSize,
      hoursSaved,
      hourlyCost,
      weeklySavings,
      monthlySavings,
      annualSavings
    };

    return { ...this.lastCalculation };
  }

  computeBreakEvenMonths(investment) {
    const initialInvestment = this.normalizeNumber(investment);
    const monthlySavings = this.lastCalculation?.monthlySavings ?? 0;

    if (initialInvestment === 0) return 0;
    if (monthlySavings <= 0) return null;

    return Number((initialInvestment / monthlySavings).toFixed(1));
  }

  formatCurrency(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return this.currencyFormatter.format(0);
    return this.currencyFormatter.format(value);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new FitnessCrossfitProRoiEngine();
    const controls = {
      teamSize: document.getElementById('teamSize'),
      hoursSaved: document.getElementById('hoursSaved'),
      hourlyCost: document.getElementById('hourlyCost'),
      investment: document.getElementById('investment')
    };

    const outputs = {
      teamSize: document.getElementById('teamSizeValue'),
      hoursSaved: document.getElementById('hoursSavedValue'),
      hourlyCost: document.getElementById('hourlyCostValue'),
      investment: document.getElementById('investmentValue')
    };

    const elements = {
      annualSavings: document.getElementById('annualSavings'),
      bannerMonthlySavings: document.getElementById('bannerMonthlySavings'),
      weeklySavings: document.getElementById('weeklySavings'),
      monthlySavings: document.getElementById('monthlySavings'),
      annualBreakdown: document.getElementById('annualBreakdown'),
      breakEvenMonths: document.getElementById('breakEvenMonths'),
      breakEvenMessage: document.getElementById('breakEvenMessage'),
      recoveryProgress: document.getElementById('recoveryProgress'),
      recoveryProgressFill: document.getElementById('recoveryProgressFill'),
      recoveryProgressLabel: document.getElementById('recoveryProgressLabel')
    };

    if (Object.values(controls).some(control => !control) ||
        Object.values(elements).some(element => !element)) return;

    const currency = value => engine.formatCurrency(value);
    const readInputs = () => ({
      teamSize: Number(controls.teamSize.value),
      hoursSaved: Number(controls.hoursSaved.value),
      hourlyCost: Number(controls.hourlyCost.value)
    });

    function updateCalculator() {
      const inputs = readInputs();
      const investment = Number(controls.investment.value);
      const savings = engine.calculateAnnualSavings(inputs);
      const breakEvenMonths = engine.computeBreakEvenMonths(investment);

      outputs.teamSize.textContent = `${inputs.teamSize} ${inputs.teamSize === 1 ? 'person' : 'people'}`;
      outputs.hoursSaved.textContent = `${inputs.hoursSaved} ${inputs.hoursSaved === 1 ? 'hour' : 'hours'}`;
      outputs.hourlyCost.textContent = `${currency(inputs.hourlyCost)} / hr`;
      outputs.investment.textContent = currency(investment);

      elements.annualSavings.textContent = currency(savings.annualSavings);
      elements.bannerMonthlySavings.textContent = currency(savings.monthlySavings);
      elements.weeklySavings.textContent = currency(savings.weeklySavings);
      elements.monthlySavings.textContent = currency(savings.monthlySavings);
      elements.annualBreakdown.textContent = currency(savings.annualSavings);

      if (breakEvenMonths === null) {
        elements.breakEvenMonths.textContent = 'Not reached';
        elements.breakEvenMessage.textContent = 'With no time savings in this scenario, the initial investment is not recovered.';
      } else if (breakEvenMonths === 0) {
        elements.breakEvenMonths.textContent = 'Immediate';
        elements.breakEvenMessage.textContent = 'There is no initial investment to recover in this scenario.';
      } else {
        elements.breakEvenMonths.textContent = `${breakEvenMonths.toFixed(1)} ${breakEvenMonths === 1 ? 'month' : 'months'}`;
        elements.breakEvenMessage.textContent = breakEvenMonths <= 12
          ? `Your projected savings can recover the initial investment in about ${breakEvenMonths.toFixed(1)} months.`
          : `At this savings rate, it will take about ${breakEvenMonths.toFixed(1)} months to recover the initial investment.`;
      }

      const recoveryPercent = investment === 0 ? 100 : Math.min(100, savings.annualSavings / investment * 100);
      const progressValue = Number(recoveryPercent.toFixed(1));
      elements.recoveryProgress.setAttribute('aria-valuenow', String(Math.round(progressValue)));
      elements.recoveryProgressFill.style.width = `${progressValue}%`;
      elements.recoveryProgressLabel.textContent = breakEvenMonths === null
        ? 'Not recovered'
        : `${Math.round(progressValue)}% in 12 months`;
    }

    Object.values(controls).forEach(control => {
      control.addEventListener('input', updateCalculator);
    });

    updateCalculator();
  });
}
