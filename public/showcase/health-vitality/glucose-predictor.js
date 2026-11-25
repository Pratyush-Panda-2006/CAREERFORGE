/**
 * Health Vitality - Glycemic Load & Blood Glucose Spike Predictor
 */

export class HealthVitalityGlucosePredictor {
  calculateGlycemicLoad(carbsGrams, glycemicIndex) {
    const carbs = Math.max(0, Number(carbsGrams) || 0);
    const gi = Math.max(0, Number(glycemicIndex) || 0);
    return Number(((carbs * gi) / 100).toFixed(1));
  }

  predictSpike(baselineMgDl, totalGL) {
    const baseline = Math.max(50, Number(baselineMgDl) || 90);
    const gl = Math.max(0, Number(totalGL) || 0);
    const spikeDelta = gl * 1.65;
    const peakGlucose = baseline + spikeDelta;
    return {
      baseline,
      spikeDelta: Number(spikeDelta.toFixed(1)),
      peakGlucose: Number(peakGlucose.toFixed(1)),
      timeToPeakMin: 45
    };
  }

  categorizeGL(gl) {
    const val = Number(gl) || 0;
    if (val < 10) return { category: 'Low', impact: 'Minimal blood sugar rise' };
    if (val < 20) return { category: 'Medium', impact: 'Moderate blood sugar rise' };
    return { category: 'High', impact: 'Significant blood sugar spike' };
  }
}
