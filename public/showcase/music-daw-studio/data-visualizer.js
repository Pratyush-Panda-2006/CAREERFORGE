const axes = ['Kick', 'Bass', 'Snare', 'Lead', 'Effects', 'Width'];
const reference = [75, 68, 64, 58, 36, 65];
const startingMix = [68, 80, 55, 72, 49, 50];
const svgNamespace = 'http://www.w3.org/2000/svg';
const readingHint = 'Focus or hover over a point to read its value.';

export class MusicDawStudioRadarChart {
  constructor(centerX = 210, centerY = 175, radius = 113) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
  }

  polarToCartesian(radius, angleRad) {
    return {
      x: this.centerX + radius * Math.cos(angleRad),
      y: this.centerY + radius * Math.sin(angleRad),
    };
  }

  vertexPoints(metrics) {
    return metrics.map((value, index) => {
      const bounded = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
      const angle = index * 2 * Math.PI / metrics.length - Math.PI / 2;
      return this.polarToCartesian(this.radius * bounded / 100, angle);
    });
  }

  generatePolygonPoints(metrics) {
    return this.vertexPoints(metrics)
      .map(({ x, y }) => `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`)
      .join(' ');
  }

  computeEnclosedArea(metrics) {
    const points = this.vertexPoints(metrics);
    if (points.length < 3) return 0;
    const twiceArea = points.reduce((area, a, index) => {
      const b = points[(index + 1) % points.length];
      return area + (a.x - this.centerX) * (b.y - this.centerY)
        - (a.y - this.centerY) * (b.x - this.centerX);
    }, 0);
    return Math.abs(twiceArea) / 2;
  }
}

function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

function renderGrid(chart, grid) {
  for (const rating of [25, 50, 75, 100]) {
    grid.append(svgElement('polygon', {
      points: chart.generatePolygonPoints(axes.map(() => rating)),
      class: 'grid-ring',
    }));
  }
  chart.vertexPoints(axes.map(() => 100)).forEach(({ x, y }, index) => {
    grid.append(svgElement('line', {
      x1: chart.centerX, y1: chart.centerY, x2: x, y2: y, class: 'axis-line',
    }));
    const scale = 1.23;
    const label = svgElement('text', {
      x: chart.centerX + (x - chart.centerX) * scale,
      y: chart.centerY + (y - chart.centerY) * scale,
      class: 'axis-label',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
    label.textContent = axes[index];
    grid.append(label);
  });
}

function renderProfile(chart, data, series, result) {
  const { ratings, title, name } = data;
  const group = svgElement('g', { 'data-profile': name });
  group.append(svgElement('polygon', {
    points: chart.generatePolygonPoints(ratings), class: 'series series-' + name,
  }));
  chart.vertexPoints(ratings).forEach(({ x, y }, index) => {
    const summary = `${title} · ${axes[index]}: ${ratings[index]} out of 100`;
    const dot = svgElement('circle', {
      cx: x, cy: y, r: 6, tabindex: 0, role: 'img', 'aria-label': summary,
      class: 'vertex series-' + name,
    });
    const label = svgElement('title', {});
    label.textContent = summary;
    dot.append(label);
    dot.addEventListener('focus', () => { result.textContent = summary; });
    dot.addEventListener('pointerenter', () => { result.textContent = summary; });
    dot.addEventListener('blur', () => { result.textContent = readingHint; });
    dot.addEventListener('pointerleave', () => {
      if (document.activeElement !== dot) result.textContent = readingHint;
    });
    group.append(dot);
  });
  series.append(group);
}

if (typeof document !== 'undefined') {
  const chart = new MusicDawStudioRadarChart();
  const mix = [...startingMix];
  const controlList = document.getElementById('mix-controls');
  const series = document.getElementById('chart-series');
  const result = document.getElementById('vertex-value');
  const showMix = document.getElementById('show-mix');
  const showReference = document.getElementById('show-reference');
  const maxArea = chart.computeEnclosedArea(axes.map(() => 100));

  function render() {
    series.replaceChildren();
    result.textContent = readingHint;
    for (const profile of [
      { name: 'reference', title: 'Reference', ratings: reference, enabled: showReference.checked },
      { name: 'mix', title: 'Your mix', ratings: mix, enabled: showMix.checked },
    ]) {
      if (profile.enabled) renderProfile(chart, profile, series, result);
      document.getElementById(profile.name + '-coverage').textContent =
        profile.enabled ? (chart.computeEnclosedArea(profile.ratings) / maxArea * 100).toFixed(1) + '%' : 'Hidden';
    }
  }

  axes.forEach((axis, index) => {
    const row = document.createElement('div');
    row.className = 'metric';
    const id = 'rating-' + axis.toLowerCase();
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = axis;
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = '0';
    input.max = '100';
    input.value = mix[index];
    const output = document.createElement('output');
    output.setAttribute('for', id);
    output.value = input.value;
    input.addEventListener('input', () => {
      mix[index] = input.valueAsNumber;
      output.value = input.value;
      render();
    });
    row.append(label, input, output);
    controlList.append(row);
  });

  renderGrid(chart, document.getElementById('chart-grid'));
  showMix.addEventListener('change', render);
  showReference.addEventListener('change', render);
  render();
}
