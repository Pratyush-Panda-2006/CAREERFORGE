/**
 * ApexVault — Compound Interest Retirement Growth Projection Engine
 * Interactive SVG Chart, Dynamic Path Generation, & Milestone Calculations
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element References ---
  const initialDepositInput = document.getElementById('initialDepositInput');
  const initialDepositSlider = document.getElementById('initialDepositSlider');
  const initialDepositDisplay = document.getElementById('initialDepositDisplay');

  const monthlyContributionInput = document.getElementById('monthlyContributionInput');
  const monthlyContributionSlider = document.getElementById('monthlyContributionSlider');
  const monthlyContributionDisplay = document.getElementById('monthlyContributionDisplay');

  const annualRateInput = document.getElementById('annualRateInput');
  const annualRateSlider = document.getElementById('annualRateSlider');
  const annualRateDisplay = document.getElementById('annualRateDisplay');

  const horizonYearsInput = document.getElementById('horizonYearsInput');
  const horizonYearsSlider = document.getElementById('horizonYearsSlider');
  const horizonYearsDisplay = document.getElementById('horizonYearsDisplay');

  const freqButtons = document.querySelectorAll('.freq-btn');
  const presetChips = document.querySelectorAll('.preset-chip');
  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');

  // Summary Displays
  const finalWealthValue = document.getElementById('finalWealthValue');
  const finalWealthSub = document.getElementById('finalWealthSub');
  const totalPrincipalValue = document.getElementById('totalPrincipalValue');
  const principalShareSub = document.getElementById('principalShareSub');
  const totalInterestValue = document.getElementById('totalInterestValue');
  const interestShareSub = document.getElementById('interestShareSub');
  const wealthMultiplierValue = document.getElementById('wealthMultiplierValue');

  // SVG Chart Elements
  const svgWrapper = document.getElementById('svgChartWrapper');
  const chartSvg = document.getElementById('growthSvgChart');
  const chartGridGroup = document.getElementById('chartGridGroup');
  const principalAreaPath = document.getElementById('principalAreaPath');
  const principalLinePath = document.getElementById('principalLinePath');
  const wealthAreaPath = document.getElementById('wealthAreaPath');
  const wealthLinePath = document.getElementById('wealthLinePath');
  const crosshairLine = document.getElementById('crosshairLine');
  const wealthDot = document.getElementById('wealthDot');
  const principalDot = document.getElementById('principalDot');
  const chartTooltip = document.getElementById('chartTooltip');
  const tooltipYear = document.getElementById('tooltipYear');
  const tooltipWealth = document.getElementById('tooltipWealth');
  const tooltipPrincipal = document.getElementById('tooltipPrincipal');
  const tooltipInterest = document.getElementById('tooltipInterest');

  // Milestone Table Elements
  const toggleBreakdownBtn = document.getElementById('toggleBreakdownBtn');
  const toggleArrow = document.getElementById('toggleArrow');
  const milestoneTableContainer = document.getElementById('milestoneTableContainer');
  const milestoneTableBody = document.getElementById('milestoneTableBody');

  // Current Calculation Cache
  let currentProjection = null;
  let compoundingFrequency = 12;

  // Chart Dimensions within SVG viewBox 0 0 800 380
  const CHART_LAYOUT = {
    viewW: 800,
    viewH: 380,
    marginLeft: 85,
    marginRight: 25,
    marginTop: 30,
    marginBottom: 50,
    get plotW() {
      return this.viewW - this.marginLeft - this.marginRight;
    },
    get plotH() {
      return this.viewH - this.marginTop - this.marginBottom;
    },
    get baselineY() {
      return this.marginTop + this.plotH;
    }
  };

  // --- Formatters ---
  function formatCurrency(amount) {
    return '$' + Math.round(amount).toLocaleString('en-US');
  }

  function formatCompactCurrency(amount) {
    if (amount >= 1_000_000) {
      return '$' + (amount / 1_000_000).toFixed(
        amount % 1_000_000 === 0 ? 0 : 1
      ) + 'M';
    }

    if (amount >= 1_000) {
      return '$' + (amount / 1_000).toFixed(
        amount % 1_000 === 0 ? 0 : 0
      ) + 'k';
    }

    return '$' + Math.round(amount);
  }

  // --- Compound Interest Calculation Engine ---
  function calculateGrowth(principal, monthlyContrib, annualRatePct, years, freq) {
    const rateDecimal = annualRatePct / 100;
    const periodsPerYear = freq;
    const periodicRate = rateDecimal / periodsPerYear;
    const points = [];

    let currentBalance = principal;
    let totalContributed = principal;

    // Year 0
    points.push({
      year: 0,
      principal: totalContributed,
      wealth: currentBalance,
      interest: 0
    });

    for (let yr = 1; yr <= years; yr++) {
      for (let p = 1; p <= periodsPerYear; p++) {
        const contrib = periodsPerYear === 12
          ? monthlyContrib
          : monthlyContrib * 12;

        currentBalance = (currentBalance + contrib) * (1 + periodicRate);
        totalContributed += contrib;
      }

      const interest = Math.max(0, currentBalance - totalContributed);

      points.push({
        year: yr,
        principal: Math.round(totalContributed),
        wealth: Math.round(currentBalance),
        interest: Math.round(interest)
      });
    }

    const finalPoint = points[points.length - 1];

    const multiplier = totalContributed > 0
      ? (finalPoint.wealth / totalContributed).toFixed(2)
      : '1.00';

    const interestShare = finalPoint.wealth > 0
      ? ((finalPoint.interest / finalPoint.wealth) * 100).toFixed(1)
      : 0;

    const principalShare = finalPoint.wealth > 0
      ? ((finalPoint.principal / finalPoint.wealth) * 100).toFixed(1)
      : 100;

    return {
      points,
      finalWealth: finalPoint.wealth,
      totalPrincipal: finalPoint.principal,
      totalInterest: finalPoint.interest,
      multiplier,
      interestShare,
      principalShare,
      years,
      annualRatePct,
      monthlyContrib,
      initialPrincipal: principal
    };
  }

  // Calculate clean maximum scale for Y-axis
  function calculateNiceMax(maxValue) {
    if (maxValue <= 0) return 10000;

    const rawTarget = maxValue * 1.12;
    const exponent = Math.floor(Math.log10(rawTarget));
    const fraction = rawTarget / Math.pow(10, exponent);

    let niceFraction;

    if (fraction <= 1.2) niceFraction = 1.2;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 2.5) niceFraction = 2.5;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * Math.pow(10, exponent);
  }

  // --- SVG Chart Render Engine ---
  function renderSvgChart(projection) {
    const { points, years } = projection;
    const maxVal = calculateNiceMax(projection.finalWealth);

    const {
      marginLeft,
      marginTop,
      plotW,
      plotH,
      baselineY
    } = CHART_LAYOUT;

    function getX(yr) {
      return marginLeft + (yr / years) * plotW;
    }

    function getY(val) {
      const normalized = Math.min(Math.max(val / maxVal, 0), 1);
      return baselineY - normalized * plotH;
    }

    // --- 1. Render Grid and Reference Labels ---
    chartGridGroup.innerHTML = '';

    const numYIntervals = 5;

    for (let i = 0; i <= numYIntervals; i++) {
      const gridVal = (maxVal / numYIntervals) * i;
      const yPos = getY(gridVal);

      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      );

      line.setAttribute('x1', marginLeft);
      line.setAttribute('y1', yPos);
      line.setAttribute('x2', marginLeft + plotW);
      line.setAttribute('y2', yPos);
      line.setAttribute(
        'stroke',
        i === 0
          ? 'rgba(255, 255, 255, 0.2)'
          : 'rgba(255, 255, 255, 0.08)'
      );
      line.setAttribute(
        'stroke-dasharray',
        i === 0 ? 'none' : '4 4'
      );
      line.setAttribute('stroke-width', i === 0 ? '1.5' : '1');

      chartGridGroup.appendChild(line);

      const text = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );

      text.setAttribute('x', marginLeft - 12);
      text.setAttribute('y', yPos + 4);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('fill', '#9ca3af');
      text.setAttribute('font-size', '11');
      text.setAttribute(
        'font-family',
        "'JetBrains Mono', monospace"
      );

      text.textContent = formatCompactCurrency(gridVal);
      chartGridGroup.appendChild(text);
    }

    // Vertical Year Gridlines
    const yearStep = years <= 10 ? 2 : (years <= 20 ? 5 : 10);

    for (let yr = 0; yr <= years; yr += yearStep) {
      const xPos = getX(yr);

      if (yr > 0 && yr < years) {
        const vLine = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line'
        );

        vLine.setAttribute('x1', xPos);
        vLine.setAttribute('y1', marginTop);
        vLine.setAttribute('x2', xPos);
        vLine.setAttribute('y2', baselineY);
        vLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.05)');
        vLine.setAttribute('stroke-dasharray', '3 3');

        chartGridGroup.appendChild(vLine);
      }

      const yearText = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );

      yearText.setAttribute('x', xPos);
      yearText.setAttribute('y', baselineY + 22);
      yearText.setAttribute('text-anchor', 'middle');
      yearText.setAttribute('fill', '#9ca3af');
      yearText.setAttribute('font-size', '11');
      yearText.setAttribute(
        'font-family',
        "'JetBrains Mono', monospace"
      );

      yearText.textContent = yr === 0 ? 'Start' : `Yr ${yr}`;
      chartGridGroup.appendChild(yearText);
    }

    // --- 2. Construct Path Strings ---
    let principalLineD = '';
    let wealthLineD = '';

    points.forEach((pt, idx) => {
      const x = getX(pt.year);
      const yPrin = getY(pt.principal);
      const yWealth = getY(pt.wealth);

      if (idx === 0) {
        principalLineD += `M ${x.toFixed(1)} ${yPrin.toFixed(1)}`;
        wealthLineD += `M ${x.toFixed(1)} ${yWealth.toFixed(1)}`;
      } else {
        principalLineD += ` L ${x.toFixed(1)} ${yPrin.toFixed(1)}`;
        wealthLineD += ` L ${x.toFixed(1)} ${yWealth.toFixed(1)}`;
      }
    });

    const lastX = getX(years).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const bottomY = baselineY.toFixed(1);

    const principalAreaD =
      `${principalLineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    const wealthAreaD =
      `${wealthLineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    principalLinePath.setAttribute('d', principalLineD);
    principalAreaPath.setAttribute('d', principalAreaD);

    wealthLinePath.setAttribute('d', wealthLineD);
    wealthAreaPath.setAttribute('d', wealthAreaD);
  }

  // --- Update UI & Analytics ---
  function updateSimulation() {
    const principal = Math.max(
      0,
      parseFloat(initialDepositInput.value) || 0
    );

    const monthlyContrib = Math.max(
      0,
      parseFloat(monthlyContributionInput.value) || 0
    );

    const annualRate = Math.max(
      0.1,
      parseFloat(annualRateInput.value) || 0.1
    );

    const years = Math.max(
      1,
      parseInt(horizonYearsInput.value, 10) || 1
    );

    initialDepositDisplay.textContent = formatCurrency(principal);
    monthlyContributionDisplay.textContent =
      `${formatCurrency(monthlyContrib)} / mo`;

    annualRateDisplay.textContent = `${annualRate.toFixed(1)}% APY`;
    horizonYearsDisplay.textContent =
      `${years} Year${years > 1 ? 's' : ''}`;

    currentProjection = calculateGrowth(
      principal,
      monthlyContrib,
      annualRate,
      years,
      compoundingFrequency
    );

    finalWealthValue.textContent =
      formatCurrency(currentProjection.finalWealth);

    finalWealthSub.textContent =
      `At Year ${years} • Compounded ${
        compoundingFrequency === 12 ? 'Monthly' : 'Annually'
      }`;

    totalPrincipalValue.textContent =
      formatCurrency(currentProjection.totalPrincipal);

    principalShareSub.textContent =
      `${currentProjection.principalShare}% of portfolio`;

    totalInterestValue.textContent =
      formatCurrency(currentProjection.totalInterest);

    interestShareSub.textContent =
      `${currentProjection.interestShare}% pure growth`;

    wealthMultiplierValue.textContent =
      `${currentProjection.multiplier}x`;

    renderSvgChart(currentProjection);
    renderMilestoneTable(currentProjection);
  }

  // --- Render Milestone Table ---
  function renderMilestoneTable(projection) {
    if (!milestoneTableBody) return;

    milestoneTableBody.innerHTML = '';

    const { points, years } = projection;
    const intervals = [];

    for (let y = 1; y <= years; y++) {
      if (y === 1 || y % 5 === 0 || y === years) {
        if (!intervals.includes(y)) {
          intervals.push(y);
        }
      }
    }

    intervals.forEach(y => {
      const pt = points.find(p => p.year === y);
      if (!pt) return;

      const row = document.createElement('tr');

      const returnPct = pt.principal > 0
        ? ((pt.interest / pt.principal) * 100).toFixed(0)
        : '0';

      row.innerHTML = `
        <td><span class="milestone-badge">Year ${pt.year}</span></td>
        <td>${formatCurrency(pt.principal)}</td>
        <td class="text-emerald">+${formatCurrency(pt.interest)}</td>
        <td><strong>${formatCurrency(pt.wealth)}</strong></td>
        <td><span class="return-chip">+${returnPct}%</span></td>
      `;

      milestoneTableBody.appendChild(row);
    });
  }

  // --- Slider and Number Input Syncing ---
  function bindSync(slider, input, callback) {
    slider.addEventListener('input', () => {
      input.value = slider.value;
      callback();
    });

    input.addEventListener('input', () => {
      slider.value = input.value;
      callback();
    });
  }

  bindSync(initialDepositSlider, initialDepositInput, updateSimulation);
  bindSync(
    monthlyContributionSlider,
    monthlyContributionInput,
    updateSimulation
  );
  bindSync(annualRateSlider, annualRateInput, updateSimulation);
  bindSync(horizonYearsSlider, horizonYearsInput, updateSimulation);

  // --- Frequency Selector Buttons ---
  freqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      freqButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      compoundingFrequency = parseInt(btn.dataset.freq, 10) || 12;
      updateSimulation();
    });
  });

  // --- Strategy Preset Chips ---
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const initial = chip.dataset.initial;
      const monthly = chip.dataset.monthly;
      const rate = chip.dataset.rate;
      const years = chip.dataset.years;

      initialDepositInput.value = initial;
      initialDepositSlider.value = initial;

      monthlyContributionInput.value = monthly;
      monthlyContributionSlider.value = monthly;

      annualRateInput.value = rate;
      annualRateSlider.value = rate;

      horizonYearsInput.value = years;
      horizonYearsSlider.value = years;

      updateSimulation();
    });
  });

  // --- Reset to Defaults ---
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', () => {
      presetChips.forEach((c, idx) => {
        c.classList.toggle('active', idx === 0);
      });

      initialDepositInput.value = 10000;
      initialDepositSlider.value = 10000;

      monthlyContributionInput.value = 500;
      monthlyContributionSlider.value = 500;

      annualRateInput.value = 8.5;
      annualRateSlider.value = 8.5;

      horizonYearsInput.value = 25;
      horizonYearsSlider.value = 25;

      compoundingFrequency = 12;

      freqButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.freq === '12');
      });

      updateSimulation();
    });
  }

  // --- Toggle Milestone Table ---
  if (toggleBreakdownBtn && milestoneTableContainer) {
    toggleBreakdownBtn.addEventListener('click', () => {
      const isHidden =
        milestoneTableContainer.style.display === 'none';

      milestoneTableContainer.style.display =
        isHidden ? 'block' : 'none';

      if (toggleArrow) {
        toggleArrow.textContent = isHidden ? '▲' : '▼';
      }

      toggleBreakdownBtn.classList.toggle('expanded', isHidden);
    });
  }

  // --- Interactive Hover Cursor & Tooltip Tracking ---
  if (svgWrapper && chartSvg) {
    function handlePointerMove(e) {
      if (!currentProjection) return;

      const rect = chartSvg.getBoundingClientRect();

      const clientX = e.touches
        ? e.touches[0].clientX
        : e.clientX;

      const clientY = e.touches
        ? e.touches[0].clientY
        : e.clientY;

      const relX = clientX - rect.left;
      const scaleX = CHART_LAYOUT.viewW / rect.width;
      const svgX = relX * scaleX;

      const {
        marginLeft,
        plotW,
        marginTop,
        baselineY,
        plotH
      } = CHART_LAYOUT;

      if (svgX < marginLeft || svgX > marginLeft + plotW) {
        hideTooltip();
        return;
      }

      const yearRatio = (svgX - marginLeft) / plotW;

      const targetYear = Math.round(
        yearRatio * currentProjection.years
      );

      const clampedYear = Math.max(
        0,
        Math.min(targetYear, currentProjection.years)
      );

      const pt = currentProjection.points.find(
        p => p.year === clampedYear
      );

      if (!pt) {
        hideTooltip();
        return;
      }

      const xPos =
        marginLeft +
        (pt.year / currentProjection.years) * plotW;

      const maxVal = calculateNiceMax(
        currentProjection.finalWealth
      );

      const yWealth =
        baselineY - (pt.wealth / maxVal) * plotH;

      const yPrin =
        baselineY - (pt.principal / maxVal) * plotH;

      // Update Crosshair Guide Line
      crosshairLine.setAttribute('x1', xPos);
      crosshairLine.setAttribute('y1', marginTop);
      crosshairLine.setAttribute('x2', xPos);
      crosshairLine.setAttribute('y2', baselineY);
      crosshairLine.style.display = 'block';

      // Update Focus Dots
      wealthDot.setAttribute('cx', xPos);
      wealthDot.setAttribute('cy', yWealth);
      wealthDot.style.display = 'block';

      principalDot.setAttribute('cx', xPos);
      principalDot.setAttribute('cy', yPrin);
      principalDot.style.display = 'block';

      // Update Tooltip Content
      tooltipYear.textContent =
        pt.year === 0
          ? 'Starting Point (Year 0)'
          : `Projection Milestone — Year ${pt.year}`;

      tooltipWealth.textContent = formatCurrency(pt.wealth);
      tooltipPrincipal.textContent = formatCurrency(pt.principal);
      tooltipInterest.textContent =
        `+${formatCurrency(pt.interest)}`;

      // Position Tooltip
      chartTooltip.style.display = 'block';

      const wrapperRect = svgWrapper.getBoundingClientRect();

      let tipX = clientX - wrapperRect.left + 15;
      let tipY = clientY - wrapperRect.top - 50;

      if (tipX + 220 > wrapperRect.width) {
        tipX = clientX - wrapperRect.left - 230;
      }

      if (tipY < 10) {
        tipY = 10;
      }

      chartTooltip.style.left =
        `${Math.max(10, tipX)}px`;

      chartTooltip.style.top = `${tipY}px`;
    }

    function hideTooltip() {
      crosshairLine.style.display = 'none';
      wealthDot.style.display = 'none';
      principalDot.style.display = 'none';
      chartTooltip.style.display = 'none';
    }

    svgWrapper.addEventListener('mousemove', handlePointerMove);
    svgWrapper.addEventListener('mouseleave', hideTooltip);

    svgWrapper.addEventListener(
      'touchstart',
      handlePointerMove,
      { passive: true }
    );

    svgWrapper.addEventListener(
      'touchmove',
      handlePointerMove,
      { passive: true }
    );

    svgWrapper.addEventListener('touchend', hideTooltip);
  }

  // --- Foreign Exchange Converter (mock rates for showcase use) ---
  const fxRates = {
    USD: {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.50,
      CAD: 1.36
    },
    EUR: {
      USD: 1.0870,
      EUR: 1,
      GBP: 0.8587,
      JPY: 162.50,
      CAD: 1.4783
    },
    GBP: {
      USD: 1.2658,
      EUR: 1.1645,
      GBP: 1,
      JPY: 189.24,
      CAD: 1.7215
    },
    JPY: {
      USD: 0.006689,
      EUR: 0.006154,
      GBP: 0.005284,
      JPY: 1,
      CAD: 0.009097
    },
    CAD: {
      USD: 0.7353,
      EUR: 0.6764,
      GBP: 0.5809,
      JPY: 109.93,
      CAD: 1
    }
  };

  const fxCurrencyMeta = {
    USD: { flag: '🇺🇸', locale: 'en-US' },
    EUR: { flag: '🇪🇺', locale: 'de-DE' },
    GBP: { flag: '🇬🇧', locale: 'en-GB' },
    JPY: { flag: '🇯🇵', locale: 'ja-JP' },
    CAD: { flag: '🇨🇦', locale: 'en-CA' }
  };

  const fxFeeRate = 0.005;
  const fxRateSpread = 0.0025;

  const fxAmountInput = document.getElementById('fxAmount');
  const fxFromSelect = document.getElementById('fxFromCurrency');
  const fxToSelect = document.getElementById('fxToCurrency');
  const fxReceiveAmount = document.getElementById('fxReceiveAmount');
  const fxError = document.getElementById('fxError');

  function formatFxCurrency(amount, currency) {
    return new Intl.NumberFormat(
      fxCurrencyMeta[currency].locale,
      {
        style: 'currency',
        currency,
        minimumFractionDigits: currency === 'JPY' ? 0 : 2,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2
      }
    ).format(amount);
  }

  function formatFxRate(rate) {
    return new Intl.NumberFormat('en-US', {
      maximumSignificantDigits: 7
    }).format(rate);
  }

  function updateFxConverter() {
    if (!fxAmountInput || !fxFromSelect || !fxToSelect) {
      return;
    }

    const amount = Number(fxAmountInput.value);
    const from = fxFromSelect.value;
    const to = fxToSelect.value;

    const midRate = fxRates[from][to];
    const guaranteedRate = midRate * (1 - fxRateSpread);

    const validAmount =
      Number.isFinite(amount) && amount > 0;

    document.getElementById('fxFromFlag').textContent =
      fxCurrencyMeta[from].flag;

    document.getElementById('fxToFlag').textContent =
      fxCurrencyMeta[to].flag;

    document.getElementById('fxRateLine').textContent =
      `1 ${from} = ${formatFxRate(midRate)} ${to} · indicative mid-market rate`;

    if (!validAmount) {
      fxError.hidden = false;
      fxReceiveAmount.textContent = '—';

      [
        'fxMidRate',
        'fxGuaranteedRate',
        'fxGrossAmount',
        'fxBankFee',
        'fxNetAmount'
      ].forEach(id => {
        document.getElementById(id).textContent = '—';
      });

      return;
    }

    fxError.hidden = true;

    const grossAmount = amount * guaranteedRate;
    const bankFee = grossAmount * fxFeeRate;
    const netAmount = grossAmount - bankFee;

    fxReceiveAmount.textContent =
      formatFxCurrency(netAmount, to);

    document.getElementById('fxMidRate').textContent =
      `1 ${from} = ${formatFxRate(midRate)} ${to}`;

    document.getElementById('fxGuaranteedRate').textContent =
      `1 ${from} = ${formatFxRate(guaranteedRate)} ${to}`;

    document.getElementById('fxGrossAmount').textContent =
      formatFxCurrency(grossAmount, to);

    document.getElementById('fxBankFee').textContent =
      `− ${formatFxCurrency(bankFee, to)}`;

    document.getElementById('fxNetAmount').textContent =
      formatFxCurrency(netAmount, to);
  }

  if (fxAmountInput && fxFromSelect && fxToSelect) {
    [fxAmountInput, fxFromSelect, fxToSelect].forEach(control => {
      control.addEventListener('input', updateFxConverter);
      control.addEventListener('change', updateFxConverter);
    });

    document.getElementById('fxSwapBtn').addEventListener(
      'click',
      () => {
        const previousFrom = fxFromSelect.value;

        fxFromSelect.value = fxToSelect.value;
        fxToSelect.value = previousFrom;

        updateFxConverter();
      }
    );

    const tickerPairs = [
      ['USD', 'EUR'],
      ['GBP', 'USD'],
      ['USD', 'JPY'],
      ['EUR', 'CAD']
    ];

    document.getElementById('fxTickerRates').innerHTML =
      tickerPairs.map(([from, to]) => `
        <span class="fx-ticker-item">
          ${from}/${to}
          <strong>${formatFxRate(fxRates[from][to])}</strong>
        </span>
      `).join('');

    const updatedAt = new Date();

    document.getElementById('fxUpdatedAt').textContent =
      `Mock rates refreshed ${
        updatedAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      }`;

    updateFxConverter();
  }

  // --- Initial Render ---
  updateSimulation();

  console.log('ApexVault Growth Simulator initialized');
});

// --- ApexVault Global Deposit Modal Functions ---
function triggerDeposit() {
  const modal = document.getElementById('depositModal');

  if (modal) {
    modal.style.display = 'flex';
  }

  document.body.style.overflow = 'hidden';
}

function closeDepositModal() {
  const modal = document.getElementById('depositModal');

  if (modal) {
    modal.style.display = 'none';
  }

  document.body.style.overflow = '';

  const notice = document.getElementById('depositSuccessNotice');

  if (notice) {
    notice.style.display = 'none';
  }
}

function confirmDeposit() {
  const amountInput = document.getElementById('depositAmount');
  const notice = document.getElementById('depositSuccessNotice');

  if (notice) {
    notice.style.display = 'block';
  }

  setTimeout(() => {
    closeDepositModal();

    alert(
      `Deposit of $${
        amountInput ? amountInput.value : '5,000'
      } USDC confirmed to Apex Prime Liquidity Vault.`
    );
  }, 1200);
}
