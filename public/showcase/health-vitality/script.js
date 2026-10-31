// VitalityAI Longevity Assessment & Biological Age Wizard Engine
const TOTAL_STEPS = 6;
let currentStep = 1;

const STEP_CATEGORIES = [
  'Biographical Baseline',
  'Circadian & Sleep Architecture',
  'Aerobic Capacity & Conditioning',
  'Cardiovascular Autonomic Tone',
  'Cortisol & Stress Resilience',
  'Metabolic & Dietary Protocols'
];

const CIRCUMFERENCE = 2 * Math.PI * 62; // ~389.557 for r=62

function updateWizardStep(step) {
  currentStep = Math.min(Math.max(step, 1), TOTAL_STEPS);

  // Update step indicator & category
  const stepLabel = document.getElementById('step-label');
  if (stepLabel) stepLabel.textContent = `Question ${currentStep} of ${TOTAL_STEPS}`;

  const stepCat = document.getElementById('step-category');
  if (stepCat) stepCat.textContent = STEP_CATEGORIES[currentStep - 1];

  // Update progress bar
  const progressBar = document.getElementById('wizard-progress-bar');
  if (progressBar) {
    const pct = (currentStep / TOTAL_STEPS) * 100;
    progressBar.style.width = `${pct}%`;
  }

  // Toggle active step slide
  document.querySelectorAll('.wizard-step').forEach(slide => {
    const sNum = parseInt(slide.dataset.step, 10);
    slide.classList.toggle('active', sNum === currentStep);
  });

  // Toggle Previous button
  const prevBtn = document.getElementById('btn-prev');
  if (prevBtn) prevBtn.disabled = currentStep === 1;

  // Next / Submit button text
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) {
    nextBtn.textContent = currentStep === TOTAL_STEPS ? 'Calculate Bio Age ✨' : 'Next Step →';
  }
}

function calculateBiologicalAge() {
  const ageSlider = document.getElementById('chronological-age-slider');
  const chronoAge = parseInt(ageSlider ? ageSlider.value : 35, 10);

  // Get selected values from radio groups
  const sleepVal = parseFloat(getSelectedRadio('sleep') || -2.2);
  const exerciseVal = parseFloat(getSelectedRadio('exercise') || -1.8);
  const rhrVal = parseFloat(getSelectedRadio('rhr') || -1.2);
  const stressVal = parseFloat(getSelectedRadio('stress') || 0.0);
  const nutritionVal = parseFloat(getSelectedRadio('nutrition') || -2.5);

  const totalOffset = sleepVal + exerciseVal + rhrVal + stressVal + nutritionVal;
  const rawBioAge = chronoAge + totalOffset;
  const bioAge = parseFloat(Math.max(rawBioAge, 18).toFixed(1));
  const diff = parseFloat((bioAge - chronoAge).toFixed(1));

  renderResults(chronoAge, bioAge, diff, {
    sleepVal,
    exerciseVal,
    rhrVal,
    stressVal,
    nutritionVal
  });
}

function getSelectedRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

function renderResults(chronoAge, bioAge, diff, answers) {
  const formEl = document.getElementById('wizard-form');
  const resultsEl = document.getElementById('results-dashboard');
  const progressWrap = document.querySelector('.wizard-progress-wrap');

  if (formEl) formEl.style.display = 'none';
  if (progressWrap) progressWrap.style.display = 'none';
  if (resultsEl) resultsEl.style.display = 'block';

  // Update numbers
  const bioAgeNum = document.getElementById('bio-age-num');
  if (bioAgeNum) bioAgeNum.textContent = bioAge.toFixed(1);

  const resChrono = document.getElementById('res-chrono-age');
  if (resChrono) resChrono.textContent = `${chronoAge} Years`;

  const resBio = document.getElementById('res-bio-age');
  if (resBio) resBio.textContent = `${bioAge.toFixed(1)} Years`;

  // Update Difference Badge & Tier Text
  const diffBadge = document.getElementById('diff-badge');
  const tierText = document.getElementById('bio-tier-text');
  const dialFill = document.getElementById('dial-fill');

  let strokeOffset = 0;

  if (diff < 0) {
    const absDiff = Math.abs(diff).toFixed(1);
    if (diffBadge) {
      diffBadge.textContent = `-${absDiff} Years Younger 🌟`;
      diffBadge.className = 'diff-badge badge-younger';
    }
    if (tierText) {
      tierText.textContent = `Exceptional! Your cellular repair pathways and metabolic fitness indicate a biological age ${absDiff} years younger than your calendar age.`;
    }
    if (dialFill) {
      dialFill.style.stroke = '#10b981';
      strokeOffset = CIRCUMFERENCE * 0.25; // 75% full
    }
  } else if (diff > 0) {
    if (diffBadge) {
      diffBadge.textContent = `+${diff.toFixed(1)} Years Older ⚠️`;
      diffBadge.className = 'diff-badge badge-older';
    }
    if (tierText) {
      tierText.textContent = `Attention needed: Elevated biomarker wear suggests accelerated cellular aging. Targeted protocols below can rapidly reverse this gap.`;
    }
    if (dialFill) {
      dialFill.style.stroke = '#f59e0b';
      strokeOffset = CIRCUMFERENCE * 0.55; // 45% full
    }
  } else {
    if (diffBadge) {
      diffBadge.textContent = 'Aligned with Chronological Baseline ✨';
      diffBadge.className = 'diff-badge badge-neutral';
    }
    if (tierText) {
      tierText.textContent = 'Your biological aging rate is closely matched to your chronological baseline with strong optimization potential.';
    }
    if (dialFill) {
      dialFill.style.stroke = '#14b8a6';
      strokeOffset = CIRCUMFERENCE * 0.4;
    }
  }

  // Animate dial circle
  if (dialFill) {
    dialFill.style.strokeDasharray = CIRCUMFERENCE;
    dialFill.style.strokeDashoffset = CIRCUMFERENCE;
    setTimeout(() => {
      dialFill.style.strokeDashoffset = strokeOffset;
    }, 100);
  }

  // Populate Recommendations
  renderRecommendations(answers);

  // Smooth scroll results into view
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderRecommendations(answers) {
  const container = document.getElementById('recs-grid');
  if (!container) return;

  const recs = [];

  // Sleep
  if (answers.sleepVal > 0) {
    recs.push({
      icon: '🌙',
      title: 'Circadian Sleep Optimization',
      tag: 'High Priority',
      desc: 'Extend slow-wave deep sleep with 400mg Magnesium Glycinate, zero screen exposure 60 mins before bed, and strict 10 PM circadian timing.'
    });
  } else {
    recs.push({
      icon: '🌙',
      title: 'Sleep Architecture Maintenance',
      tag: 'Optimized',
      desc: 'Maintain consistent sleep-wake cycles and morning outdoor sunlight exposure (10 mins) to lock in natural melatonin suppression.'
    });
  }

  // Exercise
  if (answers.exerciseVal > 0) {
    recs.push({
      icon: '🏃',
      title: 'Zone 2 Mitochondrial Biogenesis',
      tag: 'High Priority',
      desc: 'Introduce 150 minutes of conversational-pace Zone 2 aerobic cardio weekly to expand cellular mitochondrial density and boost VO2 max.'
    });
  } else {
    recs.push({
      icon: '🏃',
      title: 'Strength & Power Maintenance',
      tag: 'Optimized',
      desc: 'Incorporate eccentric resistance training twice a week to maintain bone mineral density and myofibrillar protein synthesis.'
    });
  }

  // Autonomic / RHR
  if (answers.rhrVal > 0) {
    recs.push({
      icon: '❤️',
      title: 'Vagal Tone & Resting Heart Rate',
      tag: 'Cardio Focus',
      desc: 'Incorporate 2-minute cold water immersion post-workout and daily resonance frequency breathwork (6 breaths/min) to elevate HRV.'
    });
  } else {
    recs.push({
      icon: '❤️',
      title: 'Cardiovascular Autonomic Conditioning',
      tag: 'Optimized',
      desc: 'Excellent stroke volume. Sustain high HRV with periodic high-intensity sprint intervals (HIIT) once every 10 days.'
    });
  }

  // Stress
  if (answers.stressVal > 0) {
    recs.push({
      icon: '⚡',
      title: 'Cortisol Modulation Protocol',
      tag: 'Stress Resilience',
      desc: 'Mitigate systemic inflammation with Ashwagandha KSM-66 (600mg) and midday non-sleep deep rest (NSDR) audio protocols.'
    });
  } else {
    recs.push({
      icon: '⚡',
      title: 'Epigenetic Stress Buffering',
      tag: 'Optimized',
      desc: 'Your autonomic balance shields telomeres from oxidative stress. Continue routine sauna thermogenesis (20 mins at 80°C).'
    });
  }

  // Nutrition
  if (answers.nutritionVal > 0) {
    recs.push({
      icon: '🥗',
      title: 'Anti-Inflammatory Autophagy Protocol',
      tag: 'Nutrition Focus',
      desc: 'Transition to 16:8 time-restricted feeding and eliminate refined seed oils in favor of extra-virgin olive oil and wild-caught omega-3s.'
    });
  } else {
    recs.push({
      icon: '🥗',
      title: 'Metabolic Flexibility Protocol',
      tag: 'Optimized',
      desc: 'Outstanding nutritional biomarkers. Support cellular sirtuin activation with dark berries, resveratrol, and green tea polyphenols.'
    });
  }

  container.innerHTML = recs.map(r => `
    <div class="rec-card">
      <div class="rec-top">
        <span class="rec-icon">${r.icon}</span>
        <span class="rec-tag">${escapeHtml(r.tag)}</span>
      </div>
      <h4>${escapeHtml(r.title)}</h4>
      <p>${escapeHtml(r.desc)}</p>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

window.startAssessment = function() {
  const section = document.getElementById('assessment-section');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
};

window.retakeAssessment = function() {
  currentStep = 1;
  const formEl = document.getElementById('wizard-form');
  const resultsEl = document.getElementById('results-dashboard');
  const progressWrap = document.querySelector('.wizard-progress-wrap');

  if (formEl) formEl.style.display = 'block';
  if (progressWrap) progressWrap.style.display = 'block';
  if (resultsEl) resultsEl.style.display = 'none';

  updateWizardStep(1);
  const card = document.getElementById('wizard-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

document.addEventListener('DOMContentLoaded', () => {
  // Chronological Age Slider
  const ageSlider = document.getElementById('chronological-age-slider');
  const ageDisplay = document.getElementById('age-display');
  if (ageSlider && ageDisplay) {
    ageSlider.addEventListener('input', (e) => {
      ageDisplay.textContent = `${e.target.value} Years Old`;
    });
  }

  // Next / Previous buttons
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentStep < TOTAL_STEPS) {
        updateWizardStep(currentStep + 1);
      } else {
        calculateBiologicalAge();
      }
    });
  }

  const prevBtn = document.getElementById('btn-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        updateWizardStep(currentStep - 1);
      }
    });
  }

  // Auto-advance on option card click (optional friendly UX)
  document.querySelectorAll('.wizard-step').forEach(stepSlide => {
    stepSlide.addEventListener('change', (e) => {
      if (e.target.type === 'radio') {
        // highlight selected card
        stepSlide.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        const card = e.target.closest('.option-card');
        if (card) card.classList.add('selected');
      }
    });
  });

  updateWizardStep(1);
  console.log('VitalityAI Biological Age Assessment Wizard ready');
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("nutrition-form");

  if (!form) return;

  const errorMessage = document.getElementById("nutrition-error");

  const output = {
    calories: document.getElementById("nutrition-calories"),
    protein: document.getElementById("nutrition-protein"),
    carbs: document.getElementById("nutrition-carbs"),
    fats: document.getElementById("nutrition-fats"),
    bmr: document.getElementById("nutrition-bmr"),
    maintenance: document.getElementById("nutrition-maintenance"),
    proteinCalories: document.getElementById("protein-calories"),
    carbsCalories: document.getElementById("carbs-calories"),
    fatsCalories: document.getElementById("fats-calories"),
    proteinProgress: document.getElementById("protein-progress"),
    carbsProgress: document.getElementById("carbs-progress"),
    fatsProgress: document.getElementById("fats-progress"),
  };

  const formatNumber = (number) =>
    Math.round(number).toLocaleString("en-US");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    errorMessage.textContent = "";

    const age = Number(document.getElementById("nutrition-age").value);
    const weight = Number(
      document.getElementById("nutrition-weight").value
    );
    const height = Number(
      document.getElementById("nutrition-height").value
    );
    const sex = document.getElementById("nutrition-sex").value;
    const activity = Number(
      document.getElementById("nutrition-activity").value
    );
    const goal = form.querySelector(
      'input[name="nutrition-goal"]:checked'
    )?.value;

    if (
      !Number.isFinite(age) ||
      !Number.isFinite(weight) ||
      !Number.isFinite(height) ||
      age < 18 ||
      age > 100 ||
      weight < 20 ||
      weight > 350 ||
      height < 100 ||
      height > 250 ||
      !Number.isFinite(activity) ||
      !goal
    ) {
      errorMessage.textContent =
        "Please enter valid profile details and select a goal.";
      errorMessage.hidden = false;
      return;
    }

    // Mifflin-St Jeor equation
    const bmr =
      10 * weight +
      6.25 * height -
      5 * age +
      (sex === "male" ? 5 : -161);

    const maintenance = bmr * activity;

    const goalAdjustments = {
      loss: -300,
      maintain: 0,
      gain: 250,
    };

    const calories = Math.max(
      1200,
      Math.round(maintenance + goalAdjustments[goal])
    );

    const macroRatios = {
      loss: { protein: 0.30, carbs: 0.40, fats: 0.30 },
      maintain: { protein: 0.25, carbs: 0.45, fats: 0.30 },
      gain: { protein: 0.25, carbs: 0.50, fats: 0.25 },
    };

    const ratios = macroRatios[goal];

    const proteinCalories = calories * ratios.protein;
    const carbsCalories = calories * ratios.carbs;
    const fatsCalories = calories * ratios.fats;

    const protein = proteinCalories / 4;
    const carbs = carbsCalories / 4;
    const fats = fatsCalories / 9;

    output.calories.textContent = formatNumber(calories);
    output.protein.textContent = formatNumber(protein);
    output.carbs.textContent = formatNumber(carbs);
    output.fats.textContent = formatNumber(fats);

    output.bmr.textContent = `${formatNumber(bmr)} kcal`;
    output.maintenance.textContent = `${formatNumber(maintenance)} kcal`;

    output.proteinCalories.textContent =
      `${formatNumber(proteinCalories)} kcal`;
    output.carbsCalories.textContent =
      `${formatNumber(carbsCalories)} kcal`;
    output.fatsCalories.textContent =
      `${formatNumber(fatsCalories)} kcal`;

    output.proteinProgress.style.width = `${ratios.protein * 100}%`;
    output.carbsProgress.style.width = `${ratios.carbs * 100}%`;
    output.fatsProgress.style.width = `${ratios.fats * 100}%`;

    document.querySelector(
      ".nutrition-results-heading p"
    ).textContent = "Your estimated daily targets are ready.";
  });
});

//Hydration Tracker
document.addEventListener("DOMContentLoaded", () => {
  const waterCount = document.getElementById("water-count");
  const waterProgress = document.getElementById("water-progress");
  const progressTrack = document.getElementById("water-progress-track");
  const waterStatus = document.getElementById("water-status");
  const waterMessage = document.getElementById("water-message");
  const decreaseButton = document.getElementById("water-decrease");
  const increaseButton = document.getElementById("water-increase");
  const glasses = document.querySelectorAll(".water-glass");

  // Stop safely if the tracker is not present on the page.
  if (
    !waterCount ||
    !waterProgress ||
    !progressTrack ||
    !waterStatus ||
    !waterMessage ||
    !decreaseButton ||
    !increaseButton ||
    glasses.length === 0
  ) {
    return;
  }

  const DAILY_GOAL = glasses.length;
  let count = 0;

  function updateWaterTracker() {
    const percentage = (count / DAILY_GOAL) * 100;

    waterCount.textContent = count;
    waterProgress.style.width = `${percentage}%`;

    progressTrack.setAttribute("aria-valuenow", count);

    decreaseButton.disabled = count === 0;
    increaseButton.disabled = count === DAILY_GOAL;

    glasses.forEach((glass, index) => {
      glass.classList.toggle("filled", index < count);
    });

    if (count === 0) {
      waterStatus.textContent = "Let's get started!";
      waterMessage.textContent = "Every glass counts. 💚";
    } else if (count === DAILY_GOAL) {
      waterStatus.textContent = "Daily goal reached! 🎉";
      waterMessage.textContent =
        "Great job! You've reached your daily glass goal.";
    } else {
      waterStatus.textContent = `${Math.round(percentage)}% completed`;
      waterMessage.textContent =
        `${DAILY_GOAL - count} more ${
          DAILY_GOAL - count === 1 ? "glass" : "glasses"
        } to reach your goal.`;
    }
  }

  increaseButton.addEventListener("click", () => {
    if (count < DAILY_GOAL) {
      count++;
      updateWaterTracker();
    }
  });

  decreaseButton.addEventListener("click", () => {
    if (count > 0) {
      count--;
      updateWaterTracker();
    }
  });

  updateWaterTracker();
});

// ==========================================================
// Interactive Meal Planner & Macro Distribution Engine (Issue #199)
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  const mealSection = document.getElementById('meal-planner-section');
  if (!mealSection) return;

  const DONUT_RADIUS = 70;
  const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS; // ~439.82297

  const SAMPLE_MEALS = {
    breakfast: [
      { id: 'b1', name: 'Avocado Toast & Pasture-Raised Poached Eggs', calories: 380, protein: 18, carbs: 28, fats: 22 },
      { id: 'b2', name: 'Organic Steel-Cut Oats with Wild Berries & Chia', calories: 320, protein: 12, carbs: 54, fats: 6 }
    ],
    lunch: [
      { id: 'l1', name: 'Wild Alaskan Salmon & Quinoa Longevity Bowl', calories: 580, protein: 44, carbs: 48, fats: 22 }
    ],
    dinner: [
      { id: 'd1', name: 'Mediterranean Lentil & Tuscan Kale Herbal Stew', calories: 410, protein: 22, carbs: 62, fats: 8 },
      { id: 'd2', name: 'Grilled Tempeh with Roasted Root Vegetables', calories: 290, protein: 22, carbs: 18, fats: 14 }
    ],
    snacks: [
      { id: 's1', name: 'A2 Greek Yogurt with Raw Walnuts & Blueberries', calories: 240, protein: 20, carbs: 14, fats: 12 }
    ]
  };

  const plannerState = {
    targetCalories: 2200,
    targetProtein: 138,
    targetCarbs: 248,
    targetFats: 73,
    meals: JSON.parse(JSON.stringify(SAMPLE_MEALS))
  };

  // DOM Elements
  const totalCalEl = document.getElementById('mp-total-calories');
  const targetCalValEl = document.getElementById('mp-target-calories-val');
  const deltaChipEl = document.getElementById('mp-delta-chip');
  const deltaTextEl = document.getElementById('mp-delta-text');

  const segmentProtein = document.getElementById('donut-segment-protein');
  const segmentCarbs = document.getElementById('donut-segment-carbs');
  const segmentFats = document.getElementById('donut-segment-fats');

  const legendProteinPct = document.getElementById('legend-protein-pct');
  const legendCarbsPct = document.getElementById('legend-carbs-pct');
  const legendFatsPct = document.getElementById('legend-fats-pct');

  const curProteinEl = document.getElementById('mp-cur-protein');
  const tgtProteinEl = document.getElementById('mp-tgt-protein');
  const barProteinEl = document.getElementById('mp-bar-protein');
  const calProteinEl = document.getElementById('mp-cal-protein');
  const pctProteinEl = document.getElementById('mp-pct-protein');

  const curCarbsEl = document.getElementById('mp-cur-carbs');
  const tgtCarbsEl = document.getElementById('mp-tgt-carbs');
  const barCarbsEl = document.getElementById('mp-bar-carbs');
  const calCarbsEl = document.getElementById('mp-cal-carbs');
  const pctCarbsEl = document.getElementById('mp-pct-carbs');

  const curFatsEl = document.getElementById('mp-cur-fats');
  const tgtFatsEl = document.getElementById('mp-tgt-fats');
  const barFatsEl = document.getElementById('mp-bar-fats');
  const calFatsEl = document.getElementById('mp-cal-fats');
  const pctFatsEl = document.getElementById('mp-pct-fats');

  const insightTextEl = document.getElementById('mp-insight-text');

  const foodModal = document.getElementById('food-modal');
  const foodModalClose = document.getElementById('food-modal-close');
  const foodModalCancel = document.getElementById('food-modal-cancel');
  const foodForm = document.getElementById('food-form');
  const foodInputName = document.getElementById('food-input-name');
  const foodInputSlot = document.getElementById('food-input-slot');
  const foodInputCal = document.getElementById('food-input-cal');
  const foodInputProtein = document.getElementById('food-input-protein');
  const foodInputCarbs = document.getElementById('food-input-carbs');
  const foodInputFats = document.getElementById('food-input-fats');

  const btnSampleDay = document.getElementById('mp-btn-sample-day');
  const btnOpenLog = document.getElementById('mp-btn-open-log');
  const btnResetPlan = document.getElementById('mp-btn-reset-plan');

  const SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'];

  function calculateTotals() {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    const slotTotals = {
      breakfast: { cal: 0, p: 0, c: 0, f: 0 },
      lunch: { cal: 0, p: 0, c: 0, f: 0 },
      dinner: { cal: 0, p: 0, c: 0, f: 0 },
      snacks: { cal: 0, p: 0, c: 0, f: 0 }
    };

    SLOTS.forEach(slot => {
      const items = plannerState.meals[slot] || [];
      items.forEach(item => {
        const cal = Number(item.calories) || 0;
        const p = Number(item.protein) || 0;
        const c = Number(item.carbs) || 0;
        const f = Number(item.fats) || 0;

        totalCalories += cal;
        totalProtein += p;
        totalCarbs += c;
        totalFats += f;

        slotTotals[slot].cal += cal;
        slotTotals[slot].p += p;
        slotTotals[slot].c += c;
        slotTotals[slot].f += f;
      });
    });

    return { totalCalories, totalProtein, totalCarbs, totalFats, slotTotals };
  }

  function renderMealPlanner() {
    const { totalCalories, totalProtein, totalCarbs, totalFats, slotTotals } = calculateTotals();

    // 1. Render Each Slot's Items
    SLOTS.forEach(slot => {
      const listEl = document.getElementById(`slot-items-${slot}`);
      const calBadgeEl = document.getElementById(`slot-cal-${slot}`);
      const macrosEl = document.getElementById(`slot-macros-${slot}`);

      if (calBadgeEl) calBadgeEl.textContent = `${slotTotals[slot].cal.toLocaleString()} kcal`;
      if (macrosEl) {
        macrosEl.textContent = `${slotTotals[slot].p}g P • ${slotTotals[slot].c}g C • ${slotTotals[slot].f}g F`;
      }

      if (!listEl) return;
      listEl.innerHTML = '';

      const items = plannerState.meals[slot] || [];
      if (items.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'meal-item-empty';
        emptyLi.textContent = `No ${slot} foods logged yet. Click + Add to log.`;
        listEl.appendChild(emptyLi);
      } else {
        items.forEach(item => {
          const li = document.createElement('li');
          li.className = 'meal-item-row';
          li.innerHTML = `
            <div class="meal-item-meta">
              <span class="meal-item-name">${escapeHtml(item.name)}</span>
              <div class="meal-item-chips">
                <span class="macro-chip chip-cal">${item.calories} kcal</span>
                <span class="macro-chip chip-p">${item.protein}g Protein</span>
                <span class="macro-chip chip-c">${item.carbs}g Carbs</span>
                <span class="macro-chip chip-f">${item.fats}g Fats</span>
              </div>
            </div>
            <button type="button" class="meal-item-delete" data-slot="${slot}" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">✕</button>
          `;
          listEl.appendChild(li);
        });
      }
    });

    // 2. Render Macro Energy Donut Chart
    const proteinKcal = totalProtein * 4;
    const carbsKcal = totalCarbs * 4;
    const fatsKcal = totalFats * 9;
    const macroEnergyTotal = proteinKcal + carbsKcal + fatsKcal;

    let pPct = 0;
    let cPct = 0;
    let fPct = 0;

    if (macroEnergyTotal > 0) {
      pPct = Math.round((proteinKcal / macroEnergyTotal) * 100);
      cPct = Math.round((carbsKcal / macroEnergyTotal) * 100);
      fPct = Math.max(0, 100 - pPct - cPct);

      const lenProtein = (proteinKcal / macroEnergyTotal) * DONUT_CIRCUMFERENCE;
      const lenCarbs = (carbsKcal / macroEnergyTotal) * DONUT_CIRCUMFERENCE;
      const lenFats = (fatsKcal / macroEnergyTotal) * DONUT_CIRCUMFERENCE;

      if (segmentProtein) {
        segmentProtein.style.strokeDasharray = `${lenProtein} ${DONUT_CIRCUMFERENCE - lenProtein}`;
        segmentProtein.style.strokeDashoffset = '0';
      }
      if (segmentCarbs) {
        segmentCarbs.style.strokeDasharray = `${lenCarbs} ${DONUT_CIRCUMFERENCE - lenCarbs}`;
        segmentCarbs.style.strokeDashoffset = `${-lenProtein}`;
      }
      if (segmentFats) {
        segmentFats.style.strokeDasharray = `${lenFats} ${DONUT_CIRCUMFERENCE - lenFats}`;
        segmentFats.style.strokeDashoffset = `${-(lenProtein + lenCarbs)}`;
      }
    } else {
      if (segmentProtein) segmentProtein.style.strokeDasharray = `0 ${DONUT_CIRCUMFERENCE}`;
      if (segmentCarbs) segmentCarbs.style.strokeDasharray = `0 ${DONUT_CIRCUMFERENCE}`;
      if (segmentFats) segmentFats.style.strokeDasharray = `0 ${DONUT_CIRCUMFERENCE}`;
    }

    if (legendProteinPct) legendProteinPct.textContent = `${pPct}%`;
    if (legendCarbsPct) legendCarbsPct.textContent = `${cPct}%`;
    if (legendFatsPct) legendFatsPct.textContent = `${fPct}%`;

    // 3. Render Center Metrics
    if (totalCalEl) totalCalEl.textContent = totalCalories.toLocaleString();
    if (targetCalValEl) targetCalValEl.textContent = plannerState.targetCalories.toLocaleString();

    const delta = plannerState.targetCalories - totalCalories;
    if (deltaChipEl && deltaTextEl) {
      deltaChipEl.classList.remove('delta-on-track', 'delta-balanced', 'delta-over');
      if (delta > 80) {
        deltaChipEl.classList.add('delta-on-track');
        deltaTextEl.textContent = `${delta.toLocaleString()} kcal remaining`;
      } else if (delta >= -80 && delta <= 80) {
        deltaChipEl.classList.add('delta-balanced');
        deltaTextEl.textContent = `✨ Perfect Target Balance (±${Math.abs(delta)} kcal)`;
      } else {
        deltaChipEl.classList.add('delta-over');
        deltaTextEl.textContent = `+${Math.abs(delta).toLocaleString()} kcal over target`;
      }
    }

    // 4. Progress Bars vs Targets
    updateProgressBar(curProteinEl, tgtProteinEl, barProteinEl, calProteinEl, pctProteinEl, totalProtein, plannerState.targetProtein, 4);
    updateProgressBar(curCarbsEl, tgtCarbsEl, barCarbsEl, calCarbsEl, pctCarbsEl, totalCarbs, plannerState.targetCarbs, 4);
    updateProgressBar(curFatsEl, tgtFatsEl, barFatsEl, calFatsEl, pctFatsEl, totalFats, plannerState.targetFats, 9);

    // 5. Vitality Insights Message
    if (insightTextEl) {
      if (totalCalories === 0) {
        insightTextEl.textContent = 'Log your breakfast and meals to visualize your daily energy ratio and metabolic balance.';
      } else if (pPct >= 28) {
        insightTextEl.textContent = '💪 Optimal Protein Density: Supports cellular repair, muscle protein synthesis, and metabolic thermogenesis.';
      } else if (fPct >= 35) {
        insightTextEl.textContent = '🥑 High-Vitality Lipid Density: Excellent cellular membrane support and satiety from monounsaturated & polyunsaturated fats.';
      } else if (cPct >= 55) {
        insightTextEl.textContent = '⚡ Sustained Glycogen Density: Great for aerobic endurance; emphasize complex legumes and whole grains for low glycemic load.';
      } else {
        insightTextEl.textContent = '⚖️ Harmonious Longevity Balance: Well-proportioned macronutrient distribution optimizing metabolic flexibility.';
      }
    }
  }

  function updateProgressBar(curEl, tgtEl, barEl, calEl, pctEl, currentVal, targetVal, kcalPerGram) {
    if (curEl) curEl.textContent = currentVal;
    if (tgtEl) tgtEl.textContent = targetVal;
    const pct = targetVal > 0 ? Math.min(Math.round((currentVal / targetVal) * 100), 100) : 0;
    if (barEl) barEl.style.width = `${pct}%`;
    if (calEl) calEl.textContent = `${(currentVal * kcalPerGram).toLocaleString()} kcal`;
    if (pctEl) pctEl.textContent = `${pct}% of target`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Event Listeners for Slot Items Delete
  document.querySelectorAll('.slot-items-list').forEach(list => {
    list.addEventListener('click', e => {
      const btn = e.target.closest('.meal-item-delete');
      if (!btn) return;
      const slot = btn.dataset.slot;
      const id = btn.dataset.id;
      if (slot && id && plannerState.meals[slot]) {
        plannerState.meals[slot] = plannerState.meals[slot].filter(item => item.id !== id);
        renderMealPlanner();
      }
    });
  });

  // Slot Add Buttons (+ Add in headers)
  document.querySelectorAll('.slot-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.dataset.slot || 'lunch';
      if (foodInputSlot) foodInputSlot.value = slot;
      openFoodModal();
    });
  });

  function openFoodModal() {
    if (foodModal && typeof foodModal.showModal === 'function') {
      foodModal.showModal();
      if (foodInputName) foodInputName.focus();
    }
  }

  function closeFoodModal() {
    if (foodModal && typeof foodModal.close === 'function') {
      foodModal.close();
      if (foodForm) foodForm.reset();
    }
  }

  if (foodModalClose) foodModalClose.addEventListener('click', closeFoodModal);
  if (foodModalCancel) foodModalCancel.addEventListener('click', closeFoodModal);

  // Close modal when clicking backdrop
  if (foodModal) {
    foodModal.addEventListener('click', e => {
      const rect = foodModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) closeFoodModal();
    });
  }

  // Quick Preset Chips click
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (foodInputName) foodInputName.value = chip.dataset.name || '';
      if (foodInputSlot) foodInputSlot.value = chip.dataset.slot || 'lunch';
      if (foodInputCal) foodInputCal.value = chip.dataset.cal || 0;
      if (foodInputProtein) foodInputProtein.value = chip.dataset.p || 0;
      if (foodInputCarbs) foodInputCarbs.value = chip.dataset.c || 0;
      if (foodInputFats) foodInputFats.value = chip.dataset.f || 0;
    });
  });

  // Food Form Submit
  if (foodForm) {
    foodForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = foodInputName ? foodInputName.value.trim() : 'Custom Food';
      const slot = foodInputSlot ? foodInputSlot.value : 'lunch';
      const calories = parseInt(foodInputCal ? foodInputCal.value : 0, 10) || 0;
      const protein = parseInt(foodInputProtein ? foodInputProtein.value : 0, 10) || 0;
      const carbs = parseInt(foodInputCarbs ? foodInputCarbs.value : 0, 10) || 0;
      const fats = parseInt(foodInputFats ? foodInputFats.value : 0, 10) || 0;

      if (!plannerState.meals[slot]) plannerState.meals[slot] = [];
      plannerState.meals[slot].push({
        id: 'food_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name,
        calories,
        protein,
        carbs,
        fats
      });

      renderMealPlanner();
      closeFoodModal();
    });
  }

  // Action Bar Buttons
  if (btnOpenLog) {
    btnOpenLog.addEventListener('click', () => {
      if (foodInputSlot) foodInputSlot.value = 'lunch';
      openFoodModal();
    });
  }

  if (btnSampleDay) {
    btnSampleDay.addEventListener('click', () => {
      plannerState.meals = JSON.parse(JSON.stringify(SAMPLE_MEALS));
      renderMealPlanner();
    });
  }

  if (btnResetPlan) {
    btnResetPlan.addEventListener('click', () => {
      SLOTS.forEach(slot => {
        plannerState.meals[slot] = [];
      });
      renderMealPlanner();
    });
  }

  // Initialize display
  renderMealPlanner();
});
