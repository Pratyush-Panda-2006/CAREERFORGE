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

  // Currency Support Config ($ USD, € EUR, £ GBP)
  const CURRENCY_MAP = {
    USD: {
      symbol: '$',
      code: 'USD',
      name: 'US Dollar',
      rate: 1.0,
      initialMarks: ['$0', '$50k', '$150k', '$250k+'],
      monthlyMarks: ['$0', '$2,500', '$5,000', '$10,000+'],
      presets: [
        '$500/mo • 8.5% • 25 Yrs',
        '$1.2k/mo • 11.5% • 30 Yrs',
        '$2.5k/mo • 9.0% • 15 Yrs',
        '$250/mo • 5.2% • 10 Yrs'
      ]
    },
    EUR: {
      symbol: '€',
      code: 'EUR',
      name: 'Euro',
      rate: 0.92,
      initialMarks: ['€0', '€50k', '€150k', '€250k+'],
      monthlyMarks: ['€0', '€2,500', '€5,000', '€10,000+'],
      presets: [
        '€500/mo • 8.5% • 25 Yrs',
        '€1.2k/mo • 11.5% • 30 Yrs',
        '€2.5k/mo • 9.0% • 15 Yrs',
        '€250/mo • 5.2% • 10 Yrs'
      ]
    },
    GBP: {
      symbol: '£',
      code: 'GBP',
      name: 'British Pound',
      rate: 0.79,
      initialMarks: ['£0', '£50k', '£150k', '£250k+'],
      monthlyMarks: ['£0', '£2,500', '£5,000', '£10,000+'],
      presets: [
        '£500/mo • 8.5% • 25 Yrs',
        '£1.2k/mo • 11.5% • 30 Yrs',
        '£2.5k/mo • 9.0% • 15 Yrs',
        '£250/mo • 5.2% • 10 Yrs'
      ]
    }
  };
  let currentCurrencyKey = 'USD';

  // Currency Selector DOM References
  const currencyToggleButtons = document.querySelectorAll('.currency-toggle-btn');
  const currencyActiveTag = document.getElementById('currencyActiveTag');
  const currencyRateInfo = document.getElementById('currencyRateInfo');
  const initialDepositLabel = document.getElementById('initialDepositLabel');
  const monthlyContributionLabel = document.getElementById('monthlyContributionLabel');
  const dynamicCurrencySymbols = document.querySelectorAll('.currency-symbol-dynamic');
  const initialDepositMarks = document.getElementById('initialDepositMarks');
  const monthlyContributionMarks = document.getElementById('monthlyContributionMarks');
  const portfolioBalance = document.getElementById('portfolio-balance');

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

  // --- Dynamic Multi-Currency Formatters ---
  function formatCurrency(amount) {
    const sym = CURRENCY_MAP[currentCurrencyKey].symbol;
    return sym + Math.round(amount).toLocaleString('en-US');
  }

  function formatCompactCurrency(amount) {
    const sym = CURRENCY_MAP[currentCurrencyKey].symbol;
    if (amount >= 1_000_000) {
      return sym + (amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1) + 'M';
    }

    if (amount >= 1_000) {
      return sym + (amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 0) + 'k';
    }
    return sym + Math.round(amount);
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
      setCurrency('USD');
      presetChips.forEach((c, idx) => c.classList.toggle('active', idx === 0));

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

  // --- 3-Way Currency Selector Toggle Logic ---
  function setCurrency(currencyCode) {
    if (!CURRENCY_MAP[currencyCode]) return;
    currentCurrencyKey = currencyCode;
    const config = CURRENCY_MAP[currencyCode];

    // 1. Update Active Button States
    currencyToggleButtons.forEach(btn => {
      const isMatch = btn.dataset.currency === currencyCode;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-checked', String(isMatch));
    });

    // 2. Update Status Indicators
    if (currencyActiveTag) {
      currencyActiveTag.textContent = `${config.code} (${config.symbol})`;
    }
    if (currencyRateInfo) {
      currencyRateInfo.textContent = `Reference FX: 1 USD ≈ ${config.rate.toFixed(2)} ${config.code}`;
    }

    // 3. Update Input Parameter Labels
    if (initialDepositLabel) {
      initialDepositLabel.textContent = `Initial Investment (${config.symbol})`;
    }
    if (monthlyContributionLabel) {
      monthlyContributionLabel.textContent = `Monthly Contribution (${config.symbol})`;
    }

    // 4. Update Dynamic Input Prefix Spans
    dynamicCurrencySymbols.forEach(span => {
      span.textContent = config.symbol;
    });

    // 5. Update Slider Marks
    if (initialDepositMarks && config.initialMarks) {
      initialDepositMarks.innerHTML = config.initialMarks.map(m => `<span>${m}</span>`).join('');
    }
    if (monthlyContributionMarks && config.monthlyMarks) {
      monthlyContributionMarks.innerHTML = config.monthlyMarks.map(m => `<span>${m}</span>`).join('');
    }

    // 6. Update Strategy Preset Chip Subtitles
    const presetDescElements = document.querySelectorAll('.preset-chip .chip-desc');
    if (presetDescElements.length === config.presets.length) {
      presetDescElements.forEach((el, idx) => {
        el.textContent = config.presets[idx];
      });
    }

    // 7. Update Portfolio Balance in Navbar (if not masked)
    if (portfolioBalance && !portfolioBalance.textContent.includes('•')) {
      const basePortfolioUsd = 128450;
      const convertedPortfolio = basePortfolioUsd * config.rate;
      portfolioBalance.textContent = `${config.symbol}${Math.round(convertedPortfolio).toLocaleString('en-US')}.00`;
    }

    // 8. Re-execute Simulation Engine to recalculate interest & re-render SVG chart, summary cards, and tables
    updateSimulation();
  }

  currencyToggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.currency;
      if (code) setCurrency(code);
    });
  });

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
window.triggerDeposit = function triggerDeposit() {
  const modal = document.getElementById('depositModal');

  if (modal) {
    modal.style.display = 'flex';
  }

  document.body.style.overflow = 'hidden';
};

window.closeDepositModal = function closeDepositModal() {
  const modal = document.getElementById('depositModal');

  if (modal) {
    modal.style.display = 'none';
  }

  document.body.style.overflow = '';

  const notice = document.getElementById('depositSuccessNotice');
  if (notice) notice.style.display = 'none';
};

window.confirmDeposit = function confirmDeposit() {
  const amountInput = document.getElementById('depositAmount');
  const notice = document.getElementById('depositSuccessNotice');

  if (notice) {
    notice.style.display = 'block';
  }

  setTimeout(() => {
    window.closeDepositModal();
    alert(`Deposit of $${amountInput ? amountInput.value : '5,000'} USDC confirmed to Apex Prime Liquidity Vault.`);
  }, 1200);
};

// Presentation-only balance masking for this demo; no persistent storage.
(() => {
  const amount = document.getElementById('portfolio-balance');
  const button = document.getElementById('balance-visibility');
  if (!amount || !button) return;
  const original = amount.textContent;
  let hidden = false;
  button.addEventListener('click', () => {
    hidden = !hidden;
    amount.textContent = hidden ? '••••••••' : original;
    if (hidden) amount.setAttribute('aria-label', 'Balance hidden');
    else amount.removeAttribute('aria-label');
    button.setAttribute('aria-pressed', String(hidden));
    button.setAttribute('aria-label', hidden ? 'Show balance' : 'Hide balance');
    button.title = hidden ? 'Show balance' : 'Hide balance';
    button.firstElementChild.textContent = hidden ? '◎' : '◉';
  });
})();

// ==========================================================
// Issue #194: Quick Export Transaction Report (CSV & PDF)
// ==========================================================
(() => {
  // Expose convenient global utility for programmatic transaction CSV exports
  window.triggerTransactionCSVDownload = function (transactions) {
    var list = transactions || (typeof Ledger !== 'undefined' ? Ledger.TRANSACTIONS : []);
    if (typeof Ledger !== 'undefined' && Ledger.toCSV) {
      var csvData = Ledger.toCSV(list);
      var blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `ApexVault_Transactions_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }
  };
})();

// ==========================================================
// Issue #345: Automated Budget Allocation Engine (50/30/20 Rule)
// ==========================================================
(() => {
  'use strict';

  function initBudgetAllocation() {
    const incomeInput = document.getElementById('budgetIncomeInput');
    const incomeDisplay = document.getElementById('budgetIncomeDisplay');
    const donutCenterAmount = document.getElementById('donutCenterAmount');

    const sliderNeeds = document.getElementById('sliderNeeds');
    const sliderWants = document.getElementById('sliderWants');
    const sliderSavings = document.getElementById('sliderSavings');

    const pctNeedsDisplay = document.getElementById('pctNeedsDisplay');
    const pctWantsDisplay = document.getElementById('pctWantsDisplay');
    const pctSavingsDisplay = document.getElementById('pctSavingsDisplay');

    const amountNeedsDisplay = document.getElementById('amountNeedsDisplay');
    const amountWantsDisplay = document.getElementById('amountWantsDisplay');
    const amountSavingsDisplay = document.getElementById('amountSavingsDisplay');

    const cardNeedsAmount = document.getElementById('cardNeedsAmount');
    const cardWantsAmount = document.getElementById('cardWantsAmount');
    const cardSavingsAmount = document.getElementById('cardSavingsAmount');

    const cardNeedsPct = document.getElementById('cardNeedsPct');
    const cardWantsPct = document.getElementById('cardWantsPct');
    const cardSavingsPct = document.getElementById('cardSavingsPct');

    const balanceTag = document.getElementById('allocationBalanceTag');
    const balanceDot = document.getElementById('balanceStatusDot');
    const btnReset = document.getElementById('btnResetRule');
    const advisoryText = document.getElementById('budgetAdvisoryText');
    const donutGroup = document.getElementById('donutSegmentsGroup');
    const presetButtons = document.querySelectorAll('.budget-presets .preset-chip');

    if (!incomeInput || !donutGroup) return;

    const usdFmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });

    const usdDetailed = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    function getDonutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
      if (endAngle - startAngle >= 2 * Math.PI - 0.0001) {
        endAngle = startAngle + 2 * Math.PI - 0.0001;
      }
      const x1 = cx + rOuter * Math.cos(startAngle);
      const y1 = cy + rOuter * Math.sin(startAngle);
      const x2 = cx + rOuter * Math.cos(endAngle);
      const y2 = cy + rOuter * Math.sin(endAngle);
      const x3 = cx + rInner * Math.cos(endAngle);
      const y3 = cy + rInner * Math.sin(endAngle);
      const x4 = cx + rInner * Math.cos(startAngle);
      const y4 = cy + rInner * Math.sin(startAngle);

      const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

      return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    function renderBudget() {
      const income = Math.max(100, parseFloat(incomeInput.value) || 0);
      const pNeeds = parseInt(sliderNeeds.value, 10);
      const pWants = parseInt(sliderWants.value, 10);
      const pSavings = parseInt(sliderSavings.value, 10);
      const totalPct = pNeeds + pWants + pSavings;

      // Dollar allocations
      const amtNeeds = (income * pNeeds) / 100;
      const amtWants = (income * pWants) / 100;
      const amtSavings = (income * pSavings) / 100;

      // Update text displays
      incomeDisplay.textContent = usdFmt.format(income);
      donutCenterAmount.textContent = usdFmt.format(income);

      pctNeedsDisplay.textContent = `${pNeeds}%`;
      pctWantsDisplay.textContent = `${pWants}%`;
      pctSavingsDisplay.textContent = `${pSavings}%`;

      amountNeedsDisplay.textContent = `${usdDetailed.format(amtNeeds)} / mo`;
      amountWantsDisplay.textContent = `${usdDetailed.format(amtWants)} / mo`;
      amountSavingsDisplay.textContent = `${usdDetailed.format(amtSavings)} / mo`;

      cardNeedsAmount.textContent = usdFmt.format(amtNeeds);
      cardWantsAmount.textContent = usdFmt.format(amtWants);
      cardSavingsAmount.textContent = usdFmt.format(amtSavings);

      cardNeedsPct.textContent = `${pNeeds}% of budget`;
      cardWantsPct.textContent = `${pWants}% of budget`;
      cardSavingsPct.textContent = `${pSavings}% of budget`;

      // Status indicator
      if (totalPct === 100) {
        balanceTag.textContent = 'TOTAL ALLOCATED: 100% (BALANCED)';
        balanceTag.className = 'balance-tag';
        balanceDot.className = 'balance-status-dot balanced';
      } else if (totalPct > 100) {
        balanceTag.textContent = `TOTAL ALLOCATED: ${totalPct}% (+${totalPct - 100}% OVER-BUDGET)`;
        balanceTag.className = 'balance-tag danger';
        balanceDot.className = 'balance-status-dot';
      } else {
        balanceTag.textContent = `TOTAL ALLOCATED: ${totalPct}% (${100 - totalPct}% UNALLOCATED)`;
        balanceTag.className = 'balance-tag warning';
        balanceDot.className = 'balance-status-dot';
      }

      // Dynamic Strategic Advisory Advice
      if (pNeeds <= 50 && pSavings >= 20) {
        const tenYrWealth = (amtSavings * 12 * 14.78); // Compound interest factor for 7% over 10y
        advisoryText.textContent = `Optimal wealth allocation! By directing ${pSavings}% ($${Math.round(amtSavings)}/mo) into savings and high-yield vault investments, your projected wealth reaches approximately ${usdFmt.format(tenYrWealth)} over 10 years at a 7% average net yield.`;
      } else if (pNeeds > 50) {
        advisoryText.textContent = `Essential needs currently absorb ${pNeeds}% of your income. Look into optimizing fixed housing, recurring utility commitments, or transportation to bring fixed costs back toward the 50% target.`;
      } else if (pWants > 35) {
        advisoryText.textContent = `Discretionary lifestyle spending is at ${pWants}%. Transferring 5-10% into automated high-yield custody or debt reduction will drastically compound your capital reserves.`;
      } else {
        advisoryText.textContent = `Your allocation is close to the 50/30/20 target. Keep your emergency reserves funded while channeling surplus into institutional compound growth engines.`;
      }

      // Render SVG Donut Chart Arcs
      donutGroup.innerHTML = '';
      const cx = 160;
      const cy = 160;
      const rOuter = 138;
      const rInner = 94;

      const normTotal = totalPct > 0 ? totalPct : 100;
      let currentAngle = -Math.PI / 2;

      const slices = [
        { label: 'Needs', pct: pNeeds, grad: 'url(#gradNeeds)' },
        { label: 'Wants', pct: pWants, grad: 'url(#gradWants)' },
        { label: 'Savings', pct: pSavings, grad: 'url(#gradSavings)' }
      ];

      slices.forEach((slice) => {
        if (slice.pct <= 0) return;
        const sliceAngle = (slice.pct / normTotal) * (2 * Math.PI);
        const endAngle = currentAngle + sliceAngle;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', getDonutArcPath(cx, cy, rOuter, rInner, currentAngle, endAngle));
        path.setAttribute('fill', slice.grad);
        path.setAttribute('class', 'donut-slice');
        path.setAttribute('data-label', slice.label);

        donutGroup.appendChild(path);
        currentAngle = endAngle;
      });
    }

    incomeInput.addEventListener('input', renderBudget);
    sliderNeeds.addEventListener('input', renderBudget);
    sliderWants.addEventListener('input', renderBudget);
    sliderSavings.addEventListener('input', renderBudget);

    btnReset.addEventListener('click', () => {
      sliderNeeds.value = '50';
      sliderWants.value = '30';
      sliderSavings.value = '20';
      renderBudget();
    });

    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        incomeInput.value = btn.getAttribute('data-income');
        renderBudget();
      });
    });

    renderBudget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBudgetAllocation);
  } else {
    initBudgetAllocation();
  }
})();

/* ==========================================================
   Savings Goals Stash & Compound Wealth Projector (Issue #449)
   ========================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'apexvault_savings_stashes_v1';

  const DEFAULT_STASHES = [
    {
      id: 'stash-1',
      name: 'Emergency Safety Stash',
      category: 'Security',
      icon: '🛡️',
      target: 25000,
      current: 14500,
      weekly: 250,
      apy: 5.2
    },
    {
      id: 'stash-2',
      name: 'Prime Real Estate Down Payment',
      category: 'Real Estate',
      icon: '🏙️',
      target: 120000,
      current: 42000,
      weekly: 500,
      apy: 7.8
    },
    {
      id: 'stash-3',
      name: 'Tech Angel Investment Seed',
      category: 'Growth',
      icon: '🚀',
      target: 50000,
      current: 18000,
      weekly: 350,
      apy: 9.4
    }
  ];

  let stashes = [];
  let selectedYears = 5;

  function loadStashes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          stashes = parsed;
          return;
        }
      }
    } catch {
      // Fallback to default
    }
    stashes = JSON.parse(JSON.stringify(DEFAULT_STASHES));
  }

  function saveStashes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stashes));
    } catch {
      // Storage unavailable
    }
  }

  function formatCurrency(num) {
    return '$' + Math.round(num).toLocaleString('en-US');
  }

  function calculateCompoundGrowth(initialPrincipal, weeklyDeposit, annualRatePercent, years) {
    const rMonthly = (annualRatePercent / 100) / 12;
    const monthlyDeposit = (weeklyDeposit * 52) / 12;
    const months = years * 12;

    const fvInitial = initialPrincipal * Math.pow(1 + rMonthly, months);
    const fvDeposits = rMonthly > 0
      ? monthlyDeposit * ((Math.pow(1 + rMonthly, months) - 1) / rMonthly)
      : monthlyDeposit * months;

    const totalWealth = fvInitial + fvDeposits;
    const totalPrincipal = initialPrincipal + (monthlyDeposit * months);
    const compoundInterest = Math.max(0, totalWealth - totalPrincipal);
    const multiplier = totalPrincipal > 0 ? (totalWealth / totalPrincipal).toFixed(2) : '1.00';

    return {
      totalWealth,
      totalPrincipal,
      compoundInterest,
      multiplier
    };
  }

  function renderStashCards() {
    const grid = document.getElementById('stashCardsGrid');
    if (!grid) return;

    grid.innerHTML = stashes.map(stash => {
      const pct = Math.min(100, Math.round((stash.current / stash.target) * 100));
      const milestone = pct >= 100 ? 'Funded' : `${pct}% Complete`;

      return `
        <div class="stash-card" data-id="${stash.id}">
          <div class="stash-card-header">
            <div class="stash-card-title-wrap">
              <span class="stash-icon">${stash.icon}</span>
              <div>
                <div class="stash-name">${stash.name}</div>
                <span class="stash-cat-badge">${stash.category}</span>
              </div>
            </div>
            <span class="stash-milestone">${milestone}</span>
          </div>

          <div class="stash-progress-wrap">
            <div class="stash-progress-labels">
              <span class="stash-curr-val">${formatCurrency(stash.current)}</span>
              <span class="stash-target-val">Target: ${formatCurrency(stash.target)}</span>
            </div>
            <div class="stash-progress-track">
              <div class="stash-progress-fill" style="width: ${pct}%;"></div>
            </div>
          </div>

          <div class="stash-card-metrics">
            <div class="stash-metric-col">
              <span>Auto-Deploy</span>
              <strong>${formatCurrency(stash.weekly)} / wk</strong>
            </div>
            <div class="stash-metric-col">
              <span>Expected APY</span>
              <strong style="color: #34d399;">${stash.apy}%</strong>
            </div>
          </div>

          <div class="stash-card-actions">
            <button type="button" class="btn-quick-deposit" data-action="deposit" data-id="${stash.id}">+ Quick Deposit $250</button>
            <button type="button" class="btn-delete-stash" data-action="delete" data-id="${stash.id}" aria-label="Delete stash">&times;</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    grid.querySelectorAll('button[data-action="deposit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const stash = stashes.find(s => s.id === id);
        if (stash) {
          stash.current += 250;
          saveStashes();
          updateAll();
        }
      });
    });

    grid.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        stashes = stashes.filter(s => s.id !== id);
        saveStashes();
        updateAll();
      });
    });
  }

  function updateToolbarSummary() {
    let totalAssets = 0;
    let totalWeekly = 0;
    stashes.forEach(s => {
      totalAssets += s.current;
      totalWeekly += s.weekly;
    });

    const assetsEl = document.getElementById('totalVaultAssets');
    const weeklyEl = document.getElementById('totalWeeklyAuto');
    const countEl = document.getElementById('activeStashCount');

    if (assetsEl) assetsEl.textContent = formatCurrency(totalAssets);
    if (weeklyEl) weeklyEl.textContent = `${formatCurrency(totalWeekly)} / wk`;
    if (countEl) countEl.textContent = `${stashes.length} Goal${stashes.length !== 1 ? 's' : ''}`;
  }

  function updateProjector() {
    const sliderPrincipal = document.getElementById('projectorInitialBalance');
    const sliderWeekly = document.getElementById('projectorWeeklyDeposit');
    const sliderApy = document.getElementById('projectorApy');

    if (!sliderPrincipal || !sliderWeekly || !sliderApy) return;

    const initial = parseFloat(sliderPrincipal.value) || 0;
    const weekly = parseFloat(sliderWeekly.value) || 0;
    const apy = parseFloat(sliderApy.value) || 0;

    const valPrincipal = document.getElementById('valInitialBalance');
    const valWeekly = document.getElementById('valWeeklyDeposit');
    const valApy = document.getElementById('valApy');

    if (valPrincipal) valPrincipal.textContent = formatCurrency(initial);
    if (valWeekly) valWeekly.textContent = `${formatCurrency(weekly)} / wk`;
    if (valApy) valApy.textContent = `${apy.toFixed(1)}%`;

    const results = calculateCompoundGrowth(initial, weekly, apy, selectedYears);

    const totalWealthEl = document.getElementById('projectedTotalWealth');
    const totalPrincipalEl = document.getElementById('projectedTotalPrincipal');
    const totalInterestEl = document.getElementById('projectedTotalInterest');
    const chipEl = document.getElementById('yieldMultiplierChip');

    if (totalWealthEl) totalWealthEl.textContent = formatCurrency(results.totalWealth);
    if (totalPrincipalEl) totalPrincipalEl.textContent = formatCurrency(results.totalPrincipal);
    if (totalInterestEl) totalInterestEl.textContent = `+${formatCurrency(results.compoundInterest)}`;
    if (chipEl) chipEl.innerHTML = `<span>⚡ ${results.multiplier}x Wealth Multiplier over ${selectedYears} Year${selectedYears > 1 ? 's' : ''}</span>`;
  }

  function syncProjectorSlidersToVault() {
    let totalAssets = 0;
    let totalWeekly = 0;
    let totalWeightedApy = 0;

    stashes.forEach(s => {
      totalAssets += s.current;
      totalWeekly += s.weekly;
      totalWeightedApy += (s.apy * s.current);
    });

    const avgApy = totalAssets > 0 ? (totalWeightedApy / totalAssets) : 7.5;

    const sliderPrincipal = document.getElementById('projectorInitialBalance');
    const sliderWeekly = document.getElementById('projectorWeeklyDeposit');
    const sliderApy = document.getElementById('projectorApy');

    if (sliderPrincipal) sliderPrincipal.value = Math.min(250000, totalAssets);
    if (sliderWeekly) sliderWeekly.value = Math.min(3000, Math.max(25, totalWeekly));
    if (sliderApy) sliderApy.value = Math.min(15, Math.max(1, avgApy.toFixed(1)));
  }

  function updateAll() {
    renderStashCards();
    updateToolbarSummary();
    updateProjector();
  }

  function initSavingsVault() {
    loadStashes();
    syncProjectorSlidersToVault();
    updateAll();

    // Slider inputs
    const sliderPrincipal = document.getElementById('projectorInitialBalance');
    const sliderWeekly = document.getElementById('projectorWeeklyDeposit');
    const sliderApy = document.getElementById('projectorApy');

    if (sliderPrincipal) sliderPrincipal.addEventListener('input', updateProjector);
    if (sliderWeekly) sliderWeekly.addEventListener('input', updateProjector);
    if (sliderApy) sliderApy.addEventListener('input', updateProjector);

    // Timeline chips
    const timelineChips = document.querySelectorAll('.timeline-chip');
    timelineChips.forEach(chip => {
      chip.addEventListener('click', () => {
        timelineChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedYears = parseInt(chip.getAttribute('data-years'), 10) || 5;
        updateProjector();
      });
    });

    // Modal wiring
    const modalBackdrop = document.getElementById('stashModalBackdrop');
    const btnOpenModal = document.getElementById('btnOpenNewStashModal');
    const btnCloseModal = document.getElementById('btnCloseStashModal');
    const btnCancel = document.getElementById('btnCancelStash');
    const stashForm = document.getElementById('newStashForm');

    function openModal() {
      if (modalBackdrop) modalBackdrop.hidden = false;
      const nameInput = document.getElementById('stashName');
      if (nameInput) nameInput.focus();
    }

    function closeModal() {
      if (modalBackdrop) modalBackdrop.hidden = true;
      if (stashForm) stashForm.reset();
    }

    if (btnOpenModal) btnOpenModal.addEventListener('click', openModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    if (stashForm) {
      stashForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('stashName').value.trim();
        const category = document.getElementById('stashCategory').value;
        const apy = parseFloat(document.getElementById('stashApy').value) || 6.5;
        const target = parseFloat(document.getElementById('stashTarget').value) || 10000;
        const initial = parseFloat(document.getElementById('stashInitial').value) || 0;
        const weekly = parseFloat(document.getElementById('stashWeekly').value) || 100;

        const iconMap = {
          'Real Estate': '🏙️',
          'Security': '🛡️',
          'Growth': '🚀',
          'Vehicle': '🏎️',
          'Travel': '✈️'
        };

        const newStash = {
          id: 'stash-' + Date.now(),
          name: name || 'Custom Goal',
          category,
          icon: iconMap[category] || '💰',
          target,
          current: initial,
          weekly,
          apy
        };

        stashes.push(newStash);
        saveStashes();
        syncProjectorSlidersToVault();
        updateAll();
        closeModal();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSavingsVault);
  } else {
    initSavingsVault();
  }
})();


/* ==========================================================
   Fraud Inspection Engine (Issue #450)
   Pure rule functions and scoring first; the UI wiring follows below.
   ========================================================== */
var FraudDetector = (function () {
  'use strict';

  var DEFAULT_CONFIG = {
    velocityWindowMinutes: 60,
    velocityMaxTransactions: 3,
    geoMaxSpeedKmh: 900,
    geoMinDistanceKm: 500,
    spikeMultiplier: 4,
    spikeMinSamples: 2,
    blacklistedCategories: ['Gambling', 'Crypto Mixer', 'Prepaid Cards'],
    offHoursStart: 0,
    offHoursEnd: 5,
    offHoursMinAmount: 1000,
    weights: { velocity: 30, geo: 35, spike: 30, blacklist: 45, offHours: 25 }
  };

  var BANDS = [
    { id: 'green', label: 'Green', min: 0, max: 29 },
    { id: 'yellow', label: 'Yellow', min: 30, max: 69 },
    { id: 'red', label: 'Red', min: 70, max: 100 }
  ];

  var HOME = { city: 'New York', lat: 40.7128, lon: -74.006 };
  var LONDON = { city: 'London', lat: 51.5074, lon: -0.1278 };
  var VALLETTA = { city: 'Valletta', lat: 35.8997, lon: 14.5146 };
  var LAGOS = { city: 'Lagos', lat: 6.5244, lon: 3.3792 };

  // Time of day for each ledger.js record. The fraud-only fields live here
  // so ledger.js and its exports stay exactly as they were.
  var LEDGER_TIMES = {
    1: '15:20', 2: '09:00', 3: '13:45', 4: '08:10', 5: '16:30', 6: '09:00',
    7: '07:30', 8: '08:05', 9: '14:15', 10: '11:40', 11: '08:10', 12: '09:00'
  };

  // Synthetic high-risk demo records (illustrative only, not real accounts).
  var SYNTHETIC = [
    { id: 101, ts: '2026-10-27T16:10:00Z', merchant: 'Aurora Gift Cards', category: 'Transfers', amount: -2300, loc: LONDON },
    { id: 102, ts: '2026-10-28T10:02:00Z', merchant: 'QuickPay Wallet', category: 'Transfers', amount: -250, loc: HOME },
    { id: 103, ts: '2026-10-28T10:09:00Z', merchant: 'QuickPay Wallet', category: 'Transfers', amount: -250, loc: HOME },
    { id: 104, ts: '2026-10-28T10:14:00Z', merchant: 'QuickPay Wallet', category: 'Transfers', amount: -250, loc: HOME },
    { id: 105, ts: '2026-10-28T10:21:00Z', merchant: 'QuickPay Wallet', category: 'Transfers', amount: -250, loc: HOME },
    { id: 106, ts: '2026-10-29T12:30:00Z', merchant: 'Ledgerly Pro', category: 'Subscriptions', amount: -480, loc: HOME },
    { id: 107, ts: '2026-10-30T02:40:00Z', merchant: 'Lucky Orbit Casino', category: 'Gambling', amount: -3800, loc: VALLETTA },
    { id: 108, ts: '2026-10-30T03:15:00Z', merchant: 'Nimbus Mixer', category: 'Crypto Mixer', amount: -6200, loc: LAGOS }
  ];

  function num(v, fallback, min, max) {
    var n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /** Merges user input over the defaults, coercing and clamping every value. */
  function normalizeConfig(input) {
    var c = input || {};
    var d = DEFAULT_CONFIG;
    var list = c.blacklistedCategories;
    if (typeof list === 'string') list = list.split(',');
    if (!Array.isArray(list)) list = d.blacklistedCategories;
    var weights = {};
    Object.keys(d.weights).forEach(function (k) {
      weights[k] = num(c.weights && c.weights[k], d.weights[k], 0, 100);
    });
    return {
      velocityWindowMinutes: num(c.velocityWindowMinutes, d.velocityWindowMinutes, 1, 1440),
      velocityMaxTransactions: Math.round(num(c.velocityMaxTransactions, d.velocityMaxTransactions, 1, 50)),
      geoMaxSpeedKmh: num(c.geoMaxSpeedKmh, d.geoMaxSpeedKmh, 1, 20000),
      geoMinDistanceKm: num(c.geoMinDistanceKm, d.geoMinDistanceKm, 0, 20000),
      spikeMultiplier: num(c.spikeMultiplier, d.spikeMultiplier, 1.1, 1000),
      spikeMinSamples: Math.round(num(c.spikeMinSamples, d.spikeMinSamples, 1, 50)),
      blacklistedCategories: list.map(function (s) { return String(s).trim(); }).filter(Boolean),
      offHoursStart: Math.round(num(c.offHoursStart, d.offHoursStart, 0, 23)),
      offHoursEnd: Math.round(num(c.offHoursEnd, d.offHoursEnd, 0, 24)),
      offHoursMinAmount: num(c.offHoursMinAmount, d.offHoursMinAmount, 0, 100000000),
      weights: weights
    };
  }

  function time(tx) {
    return new Date(tx.ts).getTime();
  }

  function haversineKm(a, b) {
    var rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad;
    var dLon = (b.lon - a.lon) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function trigger(rule, label, weight, explanation) {
    return { rule: rule, label: label, weight: weight, explanation: explanation };
  }

  function usd(n) {
    return '$' + Math.round(Math.abs(n) * 100) / 100;
  }

  /**
   * Every rule is (tx, history, config) -> null | { rule, label, weight, explanation }.
   * history holds the transactions strictly before tx, oldest first.
   */
  function ruleVelocity(tx, history, config) {
    var windowMs = config.velocityWindowMinutes * 60000;
    var end = time(tx);
    var inWindow = history.filter(function (h) {
      return end - time(h) <= windowMs;
    }).length + 1;
    if (inWindow <= config.velocityMaxTransactions) return null;
    return trigger('velocity', 'Velocity', config.weights.velocity,
      inWindow + ' transactions within ' + config.velocityWindowMinutes + ' min (limit ' + config.velocityMaxTransactions + ').');
  }

  function ruleGeoJump(tx, history, config) {
    if (!history.length || !tx.loc) return null;
    var prev = history[history.length - 1];
    if (!prev.loc) return null;
    var km = haversineKm(prev.loc, tx.loc);
    if (km < config.geoMinDistanceKm) return null;
    // Anything under a minute apart counts as one minute, so we never divide by zero.
    var hours = Math.max(time(tx) - time(prev), 60000) / 3600000;
    var speed = km / hours;
    if (speed <= config.geoMaxSpeedKmh) return null;
    return trigger('geo', 'Geo jump', config.weights.geo,
      Math.round(km) + ' km from ' + prev.loc.city + ' to ' + tx.loc.city + ' in ' + (Math.round(hours * 10) / 10) +
      ' h implies ' + Math.round(speed) + ' km/h (limit ' + config.geoMaxSpeedKmh + ').');
  }

  function ruleAmountSpike(tx, history, config) {
    function mean(list) {
      return list.reduce(function (s, h) { return s + Math.abs(h.amount); }, 0) / list.length;
    }
    // Compare like with like: money out against money out, money in against money in.
    var sameWay = history.filter(function (h) { return (h.amount < 0) === (tx.amount < 0); });
    var sameMerchant = sameWay.filter(function (h) { return h.merchant === tx.merchant; });
    var sameCategory = sameWay.filter(function (h) { return h.category === tx.category; });
    var basis = null;
    var label = '';
    if (sameMerchant.length >= config.spikeMinSamples) { basis = sameMerchant; label = tx.merchant; }
    else if (sameCategory.length >= config.spikeMinSamples) { basis = sameCategory; label = tx.category; }
    if (!basis) return null;
    var baseline = mean(basis);
    if (baseline <= 0 || Math.abs(tx.amount) < baseline * config.spikeMultiplier) return null;
    return trigger('spike', 'Amount spike', config.weights.spike,
      usd(tx.amount) + ' is ' + (Math.round(Math.abs(tx.amount) / baseline * 10) / 10) + 'x the ' + label +
      ' baseline of ' + usd(baseline) + ' (limit ' + config.spikeMultiplier + 'x).');
  }

  function ruleBlacklist(tx, history, config) {
    var hit = config.blacklistedCategories.some(function (c) {
      return c.toLowerCase() === String(tx.category).toLowerCase();
    });
    if (!hit) return null;
    return trigger('blacklist', 'Blacklisted category', config.weights.blacklist,
      tx.category + ' is on the blacklisted merchant category list.');
  }

  function ruleOffHours(tx, history, config) {
    if (tx.amount >= 0) return null;
    var d = new Date(tx.ts);
    var hour = d.getUTCHours();
    var inside = config.offHoursStart <= config.offHoursEnd
      ? hour >= config.offHoursStart && hour < config.offHoursEnd
      : hour >= config.offHoursStart || hour < config.offHoursEnd;
    if (!inside || Math.abs(tx.amount) < config.offHoursMinAmount) return null;
    return trigger('offHours', 'Off-hours transfer', config.weights.offHours,
      usd(tx.amount) + ' sent at ' + String(hour).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' UTC, inside the ' +
      config.offHoursStart + ':00-' + config.offHoursEnd + ':00 window and above ' + usd(config.offHoursMinAmount) + '.');
  }

  var RULES = [ruleVelocity, ruleGeoJump, ruleAmountSpike, ruleBlacklist, ruleOffHours];

  function band(score) {
    var s = Math.min(100, Math.max(0, Math.round(score)));
    for (var i = 0; i < BANDS.length; i++) {
      if (s >= BANDS[i].min && s <= BANDS[i].max) return BANDS[i];
    }
    return BANDS[0];
  }

  function scoreTransaction(tx, history, config) {
    var cfg = normalizeConfig(config);
    var triggers = RULES.map(function (rule) { return rule(tx, history, cfg); }).filter(Boolean);
    var raw = triggers.reduce(function (s, t) { return s + t.weight; }, 0);
    var score = Math.min(100, Math.max(0, Math.round(raw)));
    var b = band(score);
    return { tx: tx, triggers: triggers, rawScore: raw, score: score, band: b.id, bandLabel: b.label };
  }

  /** Scores a whole list; each transaction only sees earlier ones. Returns results oldest first. */
  function scoreAll(list, config) {
    var cfg = normalizeConfig(config);
    var sorted = list.slice().sort(function (a, b) { return time(a) - time(b) || a.id - b.id; });
    return sorted.map(function (tx, i) { return scoreTransaction(tx, sorted.slice(0, i), cfg); });
  }

  /** Ledger records plus the synthetic ones, with timestamp and location added. Does not mutate the input. */
  function buildDataset(ledgerTransactions) {
    var base = (ledgerTransactions || []).map(function (t) {
      return {
        id: t.id,
        ts: t.date + 'T' + (LEDGER_TIMES[t.id] || '12:00') + ':00Z',
        merchant: t.merchant,
        category: t.category,
        amount: t.amount,
        loc: HOME
      };
    });
    return base.concat(SYNTHETIC.map(function (t) { return Object.assign({}, t); }));
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    BANDS: BANDS,
    RULES: RULES,
    normalizeConfig: normalizeConfig,
    haversineKm: haversineKm,
    ruleVelocity: ruleVelocity,
    ruleGeoJump: ruleGeoJump,
    ruleAmountSpike: ruleAmountSpike,
    ruleBlacklist: ruleBlacklist,
    ruleOffHours: ruleOffHours,
    band: band,
    scoreTransaction: scoreTransaction,
    scoreAll: scoreAll,
    buildDataset: buildDataset
  };
})();
/* END FraudDetector */

(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof Ledger === 'undefined') return;

  const MAX_ATTEMPTS = 3;
  const AUDIT_LIMIT = 40;

  function initFraudInspection() {
    const body = document.getElementById('fraudBody');
    if (!body) return;

    const inputs = {
      window: document.getElementById('fraudWindow'),
      maxTx: document.getElementById('fraudMaxTx'),
      speed: document.getElementById('fraudSpeed'),
      spike: document.getElementById('fraudSpike'),
      offAmount: document.getElementById('fraudOffAmount'),
      blacklist: document.getElementById('fraudBlacklist')
    };
    const resetBtn = document.getElementById('fraudReset');
    const summary = document.getElementById('fraudSummary');
    const detail = document.getElementById('fraudDetail');
    const auditList = document.getElementById('fraudAudit');

    const modal = document.getElementById('fraudOtpModal');
    const otpDesc = document.getElementById('fraudOtpDesc');
    const otpReasons = document.getElementById('fraudOtpReasons');
    const otpHint = document.getElementById('fraudOtpHint');
    const otpForm = document.getElementById('fraudOtpForm');
    const otpInput = document.getElementById('fraudOtpInput');
    const otpError = document.getElementById('fraudOtpError');
    const otpCancel = document.getElementById('fraudOtpCancel');

    const dataset = FraudDetector.buildDataset(Ledger.TRANSACTIONS);
    const verified = new Set();
    const audit = [];
    let results = [];
    let selectedId = null;
    let otp = null; // { id, code, attempts }

    function el(tag, cls, text) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function readConfig() {
      return {
        velocityWindowMinutes: inputs.window.value,
        velocityMaxTransactions: inputs.maxTx.value,
        geoMaxSpeedKmh: inputs.speed.value,
        spikeMultiplier: inputs.spike.value,
        offHoursMinAmount: inputs.offAmount.value,
        blacklistedCategories: inputs.blacklist.value
      };
    }

    function logAudit(type, message) {
      audit.unshift({ time: new Date().toISOString().slice(11, 19) + ' UTC', type: type, message: message });
      if (audit.length > AUDIT_LIMIT) audit.length = AUDIT_LIMIT;
      auditList.textContent = '';
      audit.forEach((a) => {
        const li = el('li', 'fraud-audit-item fraud-audit-' + a.type);
        li.appendChild(el('span', 'fraud-audit-time', a.time));
        li.appendChild(el('span', 'fraud-audit-msg', a.message));
        auditList.appendChild(li);
      });
    }

    function findResult(id) {
      return results.find((r) => r.tx.id === id) || null;
    }

    function scoreBadge(r) {
      const b = el('span', 'fraud-score fraud-score-' + r.band);
      b.appendChild(el('strong', null, String(r.score)));
      b.appendChild(el('span', null, r.bandLabel));
      return b;
    }

    function renderTable() {
      body.textContent = '';
      results.slice().reverse().forEach((r) => {
        const t = r.tx;
        const tr = document.createElement('tr');
        tr.className = 'fraud-row fraud-row-' + r.band + (t.id === selectedId ? ' is-selected' : '');
        tr.appendChild(el('td', 'ledger-date', t.ts.slice(0, 16).replace('T', ' ')));
        const tdM = document.createElement('td');
        tdM.appendChild(el('div', 'fraud-merchant', t.merchant));
        tdM.appendChild(el('span', 'ledger-badge', t.category));
        tr.appendChild(tdM);
        tr.appendChild(el('td', null, t.loc.city));
        tr.appendChild(el('td', 'ledger-amount ' + (t.amount >= 0 ? 'ledger-in' : 'ledger-out'), Ledger.formatAmount(t.amount)));

        const tdS = document.createElement('td');
        tdS.appendChild(scoreBadge(r));
        tr.appendChild(tdS);

        const tdT = document.createElement('td');
        const chips = el('div', 'fraud-chips');
        if (!r.triggers.length) chips.appendChild(el('span', 'fraud-muted', 'None'));
        r.triggers.forEach((trg) => {
          const chip = el('span', 'fraud-chip fraud-chip-' + trg.rule, trg.label + ' +' + trg.weight);
          chip.title = trg.explanation;
          chips.appendChild(chip);
        });
        if (verified.has(t.id)) chips.appendChild(el('span', 'fraud-chip fraud-chip-ok', 'OTP verified'));
        tdT.appendChild(chips);
        tr.appendChild(tdT);

        const tdA = document.createElement('td');
        const needsStepUp = r.band === 'red' && !verified.has(t.id);
        const btn = el('button', 'fraud-inspect' + (needsStepUp ? ' is-stepup' : ''), needsStepUp ? 'Step-up' : 'Inspect');
        btn.type = 'button';
        btn.setAttribute('data-id', String(t.id));
        btn.setAttribute('aria-label', (needsStepUp ? 'Step-up verify ' : 'Inspect ') + t.merchant + ' ' + Ledger.formatAmount(t.amount));
        if (t.id === selectedId) btn.setAttribute('aria-current', 'true');
        tdA.appendChild(btn);
        tr.appendChild(tdA);

        body.appendChild(tr);
      });
    }

    function renderSummary() {
      const counts = { green: 0, yellow: 0, red: 0 };
      results.forEach((r) => { counts[r.band] += 1; });
      summary.textContent = results.length + ' transactions scored: ' + counts.green + ' Green (0-29), ' +
        counts.yellow + ' Yellow (30-69), ' + counts.red + ' Red (70-100).';
    }

    function renderDetail() {
      detail.textContent = '';
      const r = selectedId == null ? null : findResult(selectedId);
      if (!r) {
        detail.appendChild(el('p', 'fraud-muted', 'Select a transaction to see why it was scored this way.'));
        return;
      }
      const head = el('div', 'fraud-detail-head');
      head.appendChild(el('strong', null, r.tx.merchant + ' ' + Ledger.formatAmount(r.tx.amount)));
      head.appendChild(scoreBadge(r));
      detail.appendChild(head);
      if (!r.triggers.length) {
        detail.appendChild(el('p', 'fraud-muted', 'No rule fired. This transaction looks normal.'));
      } else {
        const ul = el('ul', 'fraud-reasons');
        r.triggers.forEach((trg) => {
          const li = document.createElement('li');
          li.appendChild(el('strong', null, trg.label + ' (+' + trg.weight + '): '));
          li.appendChild(document.createTextNode(trg.explanation));
          ul.appendChild(li);
        });
        detail.appendChild(ul);
        if (r.rawScore > 100) detail.appendChild(el('p', 'fraud-muted', 'Raw total ' + r.rawScore + ' is capped at 100.'));
      }
      if (r.band === 'red') {
        detail.appendChild(el('p', 'fraud-muted', verified.has(r.tx.id)
          ? 'Step-up verification completed for this transaction.'
          : 'Red band: step-up verification is required.'));
      }
    }

    function render() {
      results = FraudDetector.scoreAll(dataset, readConfig());
      renderTable();
      renderSummary();
      renderDetail();
    }

    // --- OTP step-up modal ---
    function demoCode(id) {
      return String(100000 + ((id * 7919 + 4217) % 900000));
    }

    function focusables() {
      return Array.prototype.slice.call(modal.querySelectorAll('input, button')).filter((n) => !n.disabled);
    }

    function openModal(r) {
      otp = { id: r.tx.id, code: demoCode(r.tx.id), attempts: 0 };
      otpDesc.textContent = r.tx.merchant + ', ' + Ledger.formatAmount(r.tx.amount) + ', risk score ' + r.score + ' (Red). Enter the one-time code to release it.';
      otpReasons.textContent = '';
      r.triggers.forEach((trg) => {
        const li = document.createElement('li');
        li.appendChild(el('strong', null, trg.label + ': '));
        li.appendChild(document.createTextNode(trg.explanation));
        otpReasons.appendChild(li);
      });
      otpHint.textContent = otp.code;
      otpInput.value = '';
      otpInput.disabled = false;
      otpError.hidden = true;
      otpError.textContent = '';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      otpInput.focus();
      logAudit('stepup', 'OTP step-up issued for transaction #' + r.tx.id + ' (' + r.tx.merchant + ', score ' + r.score + ').');
    }

    function closeModal(reason) {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.style.overflow = '';
      const id = otp ? otp.id : null;
      if (reason && otp) logAudit('cancel', 'Step-up for #' + otp.id + ' ' + reason + '.');
      otp = null;
      const back = id == null ? null : body.querySelector('[data-id="' + id + '"]');
      if (back) back.focus();
    }

    function showOtpError(msg) {
      otpError.textContent = msg;
      otpError.hidden = false;
    }

    otpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!otp) return;
      const entered = otpInput.value.trim();
      if (entered === otp.code) {
        const id = otp.id;
        verified.add(id);
        logAudit('verified', 'Transaction #' + id + ' verified with OTP after ' + (otp.attempts + 1) + ' attempt(s).');
        otp = null;
        modal.hidden = true;
        document.body.style.overflow = '';
        render();
        const back = body.querySelector('[data-id="' + id + '"]');
        if (back) back.focus();
        return;
      }
      otp.attempts += 1;
      const left = MAX_ATTEMPTS - otp.attempts;
      logAudit('failed', 'Wrong OTP for #' + otp.id + ' (attempt ' + otp.attempts + ' of ' + MAX_ATTEMPTS + ').');
      if (left <= 0) {
        showOtpError('Too many wrong codes. This transaction stays blocked.');
        logAudit('blocked', 'Transaction #' + otp.id + ' blocked after ' + MAX_ATTEMPTS + ' failed OTP attempts.');
        otpInput.disabled = true;
        otpInput.value = '';
        return;
      }
      showOtpError('That code is not correct. ' + left + (left === 1 ? ' attempt' : ' attempts') + ' left.');
      otpInput.select();
    });

    otpCancel.addEventListener('click', () => closeModal('cancelled'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal('dismissed');
    });
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') {
        closeModal('dismissed with Escape');
      } else if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });

    function select(id) {
      const r = findResult(id);
      if (!r) return;
      selectedId = id;
      render();
      if (r.band === 'red' && !verified.has(id)) {
        openModal(r);
      } else {
        logAudit('inspect', 'Inspected #' + id + ' (' + r.tx.merchant + '): score ' + r.score + ' ' + r.bandLabel +
          (r.triggers.length ? ', ' + r.triggers.length + ' rule(s) fired.' : ', no rules fired.'));
        const back = body.querySelector('[data-id="' + id + '"]');
        if (back) back.focus();
      }
    }

    body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-id]');
      const row = e.target.closest('tr');
      const id = btn ? Number(btn.getAttribute('data-id')) : null;
      if (id != null) { select(id); return; }
      if (row) {
        const b = row.querySelector('[data-id]');
        if (b) select(Number(b.getAttribute('data-id')));
      }
    });

    const labels = {
      window: 'Velocity window', maxTx: 'Max transactions', speed: 'Max travel speed',
      spike: 'Amount spike multiplier', offAmount: 'Off-hours minimum', blacklist: 'Blacklisted categories'
    };
    Object.keys(inputs).forEach((key) => {
      inputs[key].addEventListener('input', render);
      inputs[key].addEventListener('change', () => {
        logAudit('config', labels[key] + ' set to ' + inputs[key].value + '. Scores recalculated.');
      });
    });

    resetBtn.addEventListener('click', () => {
      const d = FraudDetector.DEFAULT_CONFIG;
      inputs.window.value = d.velocityWindowMinutes;
      inputs.maxTx.value = d.velocityMaxTransactions;
      inputs.speed.value = d.geoMaxSpeedKmh;
      inputs.spike.value = d.spikeMultiplier;
      inputs.offAmount.value = d.offHoursMinAmount;
      inputs.blacklist.value = d.blacklistedCategories.join(', ');
      render();
      logAudit('config', 'Thresholds reset to defaults.');
    });

    render();
    logAudit('system', 'Engine ready: ' + results.length + ' transactions scored with default thresholds.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFraudInspection);
  } else {
    initFraudInspection();
  }
})();

/**
 * ============================================================================
 * Issue #407: Interactive Crypto vs Stock DCA Investment Simulator
 * Compares recurring Dollar-Cost Averaging against lump-sum upfront investing
 * across Bitcoin, S&P 500, and Ethereum over 1 to 5 years.
 * ============================================================================
 */
(() => {
  const ASSETS = {
    btc: {
      id: 'btc',
      name: 'Bitcoin (BTC)',
      symbol: '₿',
      color: '#f59e0b',
      gradStop0: 'rgba(245, 158, 11, 0.4)',
      gradStop1: 'rgba(245, 158, 11, 0.08)',
      annualCagr: 0.452,
      basePrice: 65000,
      badgeText: '+45.2% Hist. CAGR • High Volatility',
      alphaTitle: 'DCA Volatility Smoothing Advantage (Bitcoin)',
      alphaDesc: 'Weekly recurring purchases smoothed entry across Bitcoin market corrections, reducing peak drawdown risk by 28.4% compared to an all-in lump sum.',
      alphaBadge: '+28.4% Volatility Smoothing',
      priceFactor: (m) => {
        const trend = Math.exp((0.452 / 12) * m);
        const wave = 1 + 0.32 * Math.sin((m / 12) * Math.PI * 1.5) - 0.18 * Math.cos((m / 8) * Math.PI);
        return trend * wave;
      }
    },
    sp500: {
      id: 'sp500',
      name: 'S&P 500 Index (SPY)',
      symbol: '📈',
      color: '#10b981',
      gradStop0: 'rgba(16, 185, 129, 0.4)',
      gradStop1: 'rgba(16, 185, 129, 0.08)',
      annualCagr: 0.124,
      basePrice: 520,
      badgeText: '+12.4% Hist. CAGR • Steady Compound',
      alphaTitle: 'Steady Dollar-Cost Accumulation (S&P 500)',
      alphaDesc: 'Consistent recurring index investing captures long-term corporate earnings growth while eliminating emotional market-timing stress.',
      alphaBadge: '+12.4% Compound Pace',
      priceFactor: (m) => {
        const trend = Math.exp((0.124 / 12) * m);
        const wave = 1 + 0.06 * Math.sin((m / 10) * Math.PI) - 0.04 * Math.cos((m / 6) * Math.PI);
        return trend * wave;
      }
    },
    eth: {
      id: 'eth',
      name: 'Ethereum (ETH)',
      symbol: 'Ξ',
      color: '#8b5cf6',
      gradStop0: 'rgba(139, 92, 246, 0.4)',
      gradStop1: 'rgba(139, 92, 246, 0.08)',
      annualCagr: 0.386,
      basePrice: 3400,
      badgeText: '+38.6% Hist. CAGR • High Beta',
      alphaTitle: 'Smart-Contract Ecosystem Compounding (Ethereum)',
      alphaDesc: 'High-beta recurring accumulation captures decentralized protocol growth cycles with resilient cost-basis averaging.',
      alphaBadge: '+24.1% Cost-Basis Edge',
      priceFactor: (m) => {
        const trend = Math.exp((0.386 / 12) * m);
        const wave = 1 + 0.36 * Math.sin((m / 11) * Math.PI * 1.6) - 0.22 * Math.cos((m / 7) * Math.PI);
        return trend * wave;
      }
    }
  };

  const FREQUENCIES = {
    weekly: { name: 'Weekly', perYear: 52, label: '/ wk' },
    biweekly: { name: 'Bi-Weekly', perYear: 26, label: '/ 2wk' },
    monthly: { name: 'Monthly', perYear: 12, label: '/ mo' }
  };

  function initDcaSimulator() {
    const dcaSection = document.getElementById('dca-simulator');
    if (!dcaSection) return;

    // Element references
    const assetChips = dcaSection.querySelectorAll('.dca-asset-chip');
    const stratBtns = dcaSection.querySelectorAll('.dca-strat-btn');
    const depositInput = document.getElementById('dcaDepositInput');
    const depositSlider = document.getElementById('dcaDepositSlider');
    const depositDisplay = document.getElementById('dcaDepositDisplay');
    const freqSelect = document.getElementById('dcaFrequencySelect');
    const horizonSlider = document.getElementById('dcaHorizonSlider');
    const horizonDisplay = document.getElementById('dcaHorizonDisplay');
    const resetBtn = document.getElementById('dcaResetDefaultsBtn');

    // Display elements
    const portfolioValEl = document.getElementById('dcaPortfolioValue');
    const roiSubEl = document.getElementById('dcaRoiSub');
    const totalDepositedValEl = document.getElementById('dcaTotalDepositedValue');
    const purchasesCountSubEl = document.getElementById('dcaPurchasesCountSub');
    const lumpSumValEl = document.getElementById('dcaLumpSumValue');
    const lumpRoiSubEl = document.getElementById('dcaLumpRoiSub');
    const cashSavingsValEl = document.getElementById('dcaCashSavingsValue');
    const cashProfitSubEl = document.getElementById('dcaCashProfitSub');

    // Alpha banner
    const alphaTitleEl = document.getElementById('dcaAlphaTitle');
    const alphaDescEl = document.getElementById('dcaAlphaDesc');
    const alphaBadgeEl = document.getElementById('dcaAlphaBadge');

    // SVG elements
    const svgWrapper = document.getElementById('dcaSvgWrapper');
    const svgChart = document.getElementById('dcaSvgChart');
    const gridGroup = document.getElementById('dcaGridGroup');
    const principalLine = document.getElementById('dcaPrincipalLine');
    const cashLine = document.getElementById('dcaCashLine');
    const lumpLine = document.getElementById('dcaLumpLine');
    const areaPath = document.getElementById('dcaAreaPath');
    const linePath = document.getElementById('dcaLinePath');
    const gradStop0 = document.getElementById('dcaGradStop0');
    const gradStop1 = document.getElementById('dcaGradStop1');
    const glowFilterColor = document.getElementById('dcaGlowColor');
    const legendDot = document.getElementById('dcaLegendCurveDot');
    const crosshairLine = document.getElementById('dcaCrosshairLine');
    const focusDot = document.getElementById('dcaFocusDot');
    const lumpDot = document.getElementById('dcaLumpDot');
    const cashDot = document.getElementById('dcaCashDot');

    // Tooltip elements
    const tooltip = document.getElementById('dcaChartTooltip');
    const ttMonth = document.getElementById('dcaTooltipMonth');
    const ttDot = document.getElementById('dcaTooltipDot');
    const ttVal = document.getElementById('dcaTooltipVal');
    const ttLump = document.getElementById('dcaTooltipLump');
    const ttCash = document.getElementById('dcaTooltipCash');
    const ttContributed = document.getElementById('dcaTooltipContributed');

    // Milestone table elements
    const toggleTableBtn = document.getElementById('toggleDcaTableBtn');
    const tableContainer = document.getElementById('dcaTableContainer');
    const tableBody = document.getElementById('dcaTableBody');
    const toggleArrow = document.getElementById('dcaToggleArrow');

    // State
    let selectedAsset = 'btc';
    let selectedStrategy = 'dca';
    let depositAmount = 250;
    let frequencyKey = 'weekly';
    let horizonYears = 3;
    const cashApy = 0.045;
    let cachedTrajectory = [];

    function formatCurrency(val) {
      return '$' + Math.round(val).toLocaleString('en-US');
    }

    function calculateData() {
      const asset = ASSETS[selectedAsset];
      const freq = FREQUENCIES[frequencyKey];
      const totalMonths = horizonYears * 12;
      const totalPeriods = horizonYears * freq.perYear;
      const totalCapital = totalPeriods * depositAmount;
      const periodsPerMonth = freq.perYear / 12;

      const monthlyCashRate = Math.pow(1 + cashApy, 1 / 12) - 1;
      const trajectory = [];

      let dcaUnitsAccum = 0;
      let dcaDepositedAccum = 0;
      let cashSavingsAccum = 0;
      const lumpUnits = totalCapital / asset.basePrice;

      for (let m = 0; m <= totalMonths; m++) {
        const factor = asset.priceFactor(m);
        const currentPrice = asset.basePrice * factor;

        if (m === 0) {
          trajectory.push({
            month: 0,
            price: currentPrice,
            deposited: 0,
            dcaValue: 0,
            lumpValue: totalCapital,
            cashValue: selectedStrategy === 'lump' ? totalCapital : 0
          });
          continue;
        }

        // New deposits in this month
        const periodsThisMonth = periodsPerMonth;
        const depositThisMonth = periodsThisMonth * depositAmount;
        dcaDepositedAccum += depositThisMonth;

        // Buy units at average monthly price
        const unitsBought = depositThisMonth / currentPrice;
        dcaUnitsAccum += unitsBought;

        const dcaVal = dcaUnitsAccum * currentPrice;
        const lumpVal = lumpUnits * currentPrice;

        // Cash compounding
        if (selectedStrategy === 'lump') {
          cashSavingsAccum = totalCapital * Math.pow(1 + monthlyCashRate, m);
        } else {
          cashSavingsAccum = (cashSavingsAccum + depositThisMonth) * (1 + monthlyCashRate);
        }

        trajectory.push({
          month: m,
          price: currentPrice,
          deposited: Math.min(dcaDepositedAccum, totalCapital),
          dcaValue: dcaVal,
          lumpValue: lumpVal,
          cashValue: cashSavingsAccum
        });
      }

      cachedTrajectory = trajectory;
      return {
        asset,
        freq,
        totalMonths,
        totalPeriods,
        totalCapital,
        trajectory,
        finalDca: trajectory[totalMonths].dcaValue,
        finalLump: trajectory[totalMonths].lumpValue,
        finalCash: trajectory[totalMonths].cashValue
      };
    }

    function updateMetrics(data) {
      const { asset, freq, totalCapital, totalPeriods, finalDca, finalLump, finalCash } = data;

      // Update color styling
      gradStop0.setAttribute('stop-color', asset.color);
      gradStop1.setAttribute('stop-color', asset.color);
      glowFilterColor.setAttribute('flood-color', asset.color);
      linePath.setAttribute('stroke', asset.color);
      legendDot.style.background = asset.color;
      focusDot.setAttribute('fill', asset.color);
      if (ttDot) ttDot.style.background = asset.color;

      // Update Summary Cards
      portfolioValEl.textContent = formatCurrency(finalDca);
      const dcaRoi = ((finalDca - totalCapital) / totalCapital) * 100;
      roiSubEl.textContent = (dcaRoi >= 0 ? '+' : '') + dcaRoi.toFixed(1) + '% ROI';
      roiSubEl.className = 'card-sub ' + (dcaRoi >= 0 ? 'text-emerald' : 'text-danger');

      totalDepositedValEl.textContent = formatCurrency(totalCapital);
      purchasesCountSubEl.textContent = totalPeriods + ' ' + freq.name.toLowerCase() + ' purchases';

      lumpSumValEl.textContent = formatCurrency(finalLump);
      const lumpRoi = ((finalLump - totalCapital) / totalCapital) * 100;
      lumpRoiSubEl.textContent = (lumpRoi >= 0 ? '+' : '') + lumpRoi.toFixed(1) + '% Lump ROI';

      cashSavingsValEl.textContent = formatCurrency(finalCash);
      const cashProfit = finalCash - totalCapital;
      cashProfitSubEl.textContent = (cashProfit >= 0 ? '+$' : '-$') + Math.abs(Math.round(cashProfit)).toLocaleString('en-US') + ' interest';

      // Update Alpha Banner
      alphaTitleEl.textContent = asset.alphaTitle;
      alphaDescEl.textContent = asset.alphaDesc;
      alphaBadgeEl.textContent = asset.alphaBadge;

      // Update displays
      depositDisplay.textContent = '$' + depositAmount + ' ' + freq.label;
      horizonDisplay.textContent = horizonYears + (horizonYears === 1 ? ' Year' : ' Years') + ' (' + (horizonYears * 12) + ' Mos)';
    }

    function renderChart(data) {
      const { trajectory, totalMonths } = data;
      const width = 800;
      const height = 360;
      const padLeft = 70;
      const padRight = 30;
      const padTop = 25;
      const padBottom = 40;

      const chartW = width - padLeft - padRight;
      const chartH = height - padTop - padBottom;

      // Compute Y max
      let maxY = 0;
      trajectory.forEach((pt) => {
        if (pt.dcaValue > maxY) maxY = pt.dcaValue;
        if (pt.lumpValue > maxY) maxY = pt.lumpValue;
        if (pt.cashValue > maxY) maxY = pt.cashValue;
        if (pt.deposited > maxY) maxY = pt.deposited;
      });
      maxY = Math.max(maxY * 1.15, 1000);

      const getX = (m) => padLeft + (m / totalMonths) * chartW;
      const getY = (val) => padTop + chartH - (val / maxY) * chartH;

      // Render Grid Lines safely
      while (gridGroup.firstChild) {
        gridGroup.removeChild(gridGroup.firstChild);
      }

      // 4 horizontal grid lines
      const yTicks = 4;
      for (let i = 0; i <= yTicks; i++) {
        const val = (maxY / yTicks) * i;
        const y = getY(val);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(padLeft));
        line.setAttribute('x2', String(width - padRight));
        line.setAttribute('y1', String(y));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', 'rgba(255, 255, 255, 0.07)');
        line.setAttribute('stroke-width', '1');
        gridGroup.appendChild(line);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(padLeft - 10));
        text.setAttribute('y', String(y + 4));
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', '#9ca3af');
        text.setAttribute('font-family', 'JetBrains Mono, monospace');
        text.setAttribute('font-size', '10');
        text.textContent = '$' + (val >= 1000 ? Math.round(val / 1000) + 'k' : Math.round(val));
        gridGroup.appendChild(text);
      }

      // X-axis month ticks
      const stepMonths = horizonYears <= 2 ? 6 : 12;
      for (let m = 0; m <= totalMonths; m += stepMonths) {
        const x = getX(m);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(height - 12));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#9ca3af');
        text.setAttribute('font-family', 'JetBrains Mono, monospace');
        text.setAttribute('font-size', '10');
        text.textContent = m === 0 ? 'Start' : 'M' + m;
        gridGroup.appendChild(text);
      }

      // Build path strings
      let dcaPathD = '';
      let lumpPathD = '';
      let cashPathD = '';
      let principalPathD = '';

      trajectory.forEach((pt, idx) => {
        const x = getX(pt.month);
        const yDca = getY(pt.dcaValue);
        const yLump = getY(pt.lumpValue);
        const yCash = getY(pt.cashValue);
        const yPrinc = getY(pt.deposited);

        const cmd = idx === 0 ? 'M ' : 'L ';
        dcaPathD += cmd + x.toFixed(1) + ' ' + yDca.toFixed(1) + ' ';
        lumpPathD += cmd + x.toFixed(1) + ' ' + yLump.toFixed(1) + ' ';
        cashPathD += cmd + x.toFixed(1) + ' ' + yCash.toFixed(1) + ' ';
        principalPathD += cmd + x.toFixed(1) + ' ' + yPrinc.toFixed(1) + ' ';
      });

      // Area path closes at bottom of chart
      const areaPathD = dcaPathD +
        'L ' + getX(totalMonths).toFixed(1) + ' ' + (padTop + chartH).toFixed(1) + ' ' +
        'L ' + getX(0).toFixed(1) + ' ' + (padTop + chartH).toFixed(1) + ' Z';

      areaPath.setAttribute('d', areaPathD);
      linePath.setAttribute('d', dcaPathD);
      lumpLine.setAttribute('d', lumpPathD);
      cashLine.setAttribute('d', cashPathD);
      principalLine.setAttribute('d', principalPathD);
    }

    function renderTable(data) {
      const { trajectory, totalMonths } = data;
      tableBody.replaceChildren();

      const step = 12;
      for (let m = step; m <= totalMonths; m += step) {
        const pt = trajectory[m];
        const yr = m / 12;
        const tr = document.createElement('tr');

        // Milestone
        const tdMilestone = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = 'Year ' + yr + ' (' + m + 'm)';
        tdMilestone.appendChild(strong);
        tr.appendChild(tdMilestone);

        // Contributed
        const tdContributed = document.createElement('td');
        tdContributed.textContent = formatCurrency(pt.deposited);
        tr.appendChild(tdContributed);

        // DCA Value
        const tdDca = document.createElement('td');
        const strongDca = document.createElement('strong');
        strongDca.className = 'text-emerald';
        strongDca.textContent = formatCurrency(pt.dcaValue);
        tdDca.appendChild(strongDca);
        tr.appendChild(tdDca);

        // Lump Sum
        const tdLump = document.createElement('td');
        tdLump.textContent = formatCurrency(pt.lumpValue);
        tr.appendChild(tdLump);

        // Cash Savings
        const tdCash = document.createElement('td');
        tdCash.textContent = formatCurrency(pt.cashValue);
        tr.appendChild(tdCash);

        // DCA ROI
        const tdRoi = document.createElement('td');
        const roiVal = ((pt.dcaValue - pt.deposited) / (pt.deposited || 1)) * 100;
        tdRoi.className = roiVal >= 0 ? 'text-emerald' : 'text-danger';
        tdRoi.textContent = (roiVal >= 0 ? '+' : '') + roiVal.toFixed(1) + '%';
        tr.appendChild(tdRoi);

        // Strategy Edge
        const tdEdge = document.createElement('td');
        const spanEdge = document.createElement('span');
        const diffVsCash = pt.dcaValue - pt.cashValue;
        spanEdge.className = 'alpha-badge';
        spanEdge.textContent = (diffVsCash >= 0 ? '+$' : '-$') + Math.abs(Math.round(diffVsCash)).toLocaleString('en-US') + ' vs Cash';
        tdEdge.appendChild(spanEdge);
        tr.appendChild(tdEdge);

        tableBody.appendChild(tr);
      }
    }

    function updateAll() {
      const data = calculateData();
      updateMetrics(data);
      renderChart(data);
      renderTable(data);
    }

    // Chart interactivity
    svgWrapper.addEventListener('mousemove', (e) => {
      if (!cachedTrajectory.length) return;
      const rect = svgChart.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartFrac = (mouseX - 70) / (rect.width - 100);
      const clampedFrac = Math.max(0, Math.min(1, chartFrac));
      const targetMonth = Math.round(clampedFrac * (horizonYears * 12));

      const pt = cachedTrajectory[targetMonth];
      if (!pt) return;

      const totalMonths = horizonYears * 12;
      const chartW = 800 - 70 - 30;
      const chartH = 360 - 25 - 40;

      let maxY = 0;
      cachedTrajectory.forEach((p) => {
        if (p.dcaValue > maxY) maxY = p.dcaValue;
        if (p.lumpValue > maxY) maxY = p.lumpValue;
        if (p.cashValue > maxY) maxY = p.cashValue;
      });
      maxY = Math.max(maxY * 1.15, 1000);

      const getX = (m) => 70 + (m / totalMonths) * chartW;
      const getY = (val) => 25 + chartH - (val / maxY) * chartH;

      const posX = getX(targetMonth);
      const yDca = getY(pt.dcaValue);
      const yLump = getY(pt.lumpValue);
      const yCash = getY(pt.cashValue);

      // Position crosshair & focus dots
      crosshairLine.setAttribute('x1', String(posX));
      crosshairLine.setAttribute('x2', String(posX));
      crosshairLine.style.display = 'block';

      focusDot.setAttribute('cx', String(posX));
      focusDot.setAttribute('cy', String(yDca));
      focusDot.style.display = 'block';

      lumpDot.setAttribute('cx', String(posX));
      lumpDot.setAttribute('cy', String(yLump));
      lumpDot.style.display = 'block';

      cashDot.setAttribute('cx', String(posX));
      cashDot.setAttribute('cy', String(yCash));
      cashDot.style.display = 'block';

      // Update Tooltip
      ttMonth.textContent = targetMonth === 0 ? 'Inception (Month 0)' : 'Month ' + targetMonth + ' (' + (targetMonth / 12).toFixed(1) + ' Yrs)';
      ttVal.textContent = formatCurrency(pt.dcaValue);
      ttLump.textContent = formatCurrency(pt.lumpValue);
      ttCash.textContent = formatCurrency(pt.cashValue);
      ttContributed.textContent = formatCurrency(pt.deposited);

      // Tooltip position
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      tooltip.style.left = (clientX > rect.width - 240 ? clientX - 230 : clientX + 20) + 'px';
      tooltip.style.top = Math.max(10, clientY - 80) + 'px';
      tooltip.style.display = 'flex';
    });

    svgWrapper.addEventListener('mouseleave', () => {
      crosshairLine.style.display = 'none';
      focusDot.style.display = 'none';
      lumpDot.style.display = 'none';
      cashDot.style.display = 'none';
      tooltip.style.display = 'none';
    });

    // Event Listeners for controls
    assetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        assetChips.forEach((c) => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-checked', 'true');
        selectedAsset = chip.getAttribute('data-asset');
        updateAll();
      });
    });

    stratBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        stratBtns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        selectedStrategy = btn.getAttribute('data-strategy');
        updateAll();
      });
    });

    depositInput.addEventListener('input', () => {
      let val = Number(depositInput.value) || 25;
      val = Math.max(25, Math.min(5000, val));
      depositAmount = val;
      depositSlider.value = String(Math.min(2500, val));
      updateAll();
    });

    depositSlider.addEventListener('input', () => {
      depositAmount = Number(depositSlider.value);
      depositInput.value = String(depositAmount);
      updateAll();
    });

    freqSelect.addEventListener('change', () => {
      frequencyKey = freqSelect.value;
      updateAll();
    });

    horizonSlider.addEventListener('input', () => {
      horizonYears = Number(horizonSlider.value);
      updateAll();
    });

    resetBtn.addEventListener('click', () => {
      selectedAsset = 'btc';
      selectedStrategy = 'dca';
      depositAmount = 250;
      frequencyKey = 'weekly';
      horizonYears = 3;

      assetChips.forEach((c) => {
        const isBtc = c.getAttribute('data-asset') === 'btc';
        c.classList.toggle('active', isBtc);
        c.setAttribute('aria-checked', String(isBtc));
      });

      stratBtns.forEach((b) => {
        const isDca = b.getAttribute('data-strategy') === 'dca';
        b.classList.toggle('active', isDca);
        b.setAttribute('aria-checked', String(isDca));
      });

      depositInput.value = '250';
      depositSlider.value = '250';
      freqSelect.value = 'weekly';
      horizonSlider.value = '3';

      updateAll();
    });

    toggleTableBtn.addEventListener('click', () => {
      const isHidden = tableContainer.style.display === 'none';
      tableContainer.style.display = isHidden ? 'block' : 'none';
      toggleArrow.textContent = isHidden ? '▲' : '▼';
    });

    // Initial render
    updateAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDcaSimulator);
  } else {
    initDcaSimulator();
  }
})();

