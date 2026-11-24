const svgNamespace = "http://www.w3.org/2000/svg";
const metrics = [
  { label: "Vegetation", input: 77, baseline: 61 },
  { label: "Soil moisture", input: 56, baseline: 64 },
  { label: "Irrigation", input: 81, baseline: 68 },
  { label: "Nutrients", input: 62, baseline: 66 },
];

export class AgritechPrecisionFarmingRadarChart {
  constructor(center = { x: 180, y: 165 }, radius = 116) {
    this.center = center;
    this.radius = radius;
  }

  polarToCartesian(radius, angleRad) {
    return {
      x: this.center.x + radius * Math.cos(angleRad),
      y: this.center.y + radius * Math.sin(angleRad),
    };
  }

  coordinates(values) {
    return values.map((value, index) => {
      const score = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
      const angle = -Math.PI / 2 + index * (2 * Math.PI / values.length);
      return this.polarToCartesian(this.radius * score / 100, angle);
    });
  }

  generatePolygonPoints(values) {
    return this.coordinates(values).map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  }

  computeEnclosedArea(values) {
    if (values.length < 3) return 0;
    const points = this.coordinates(values);
    const total = points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0);
    return Math.abs(total) / 2;
  }
}

function mount(doc) {
  const byId = (id) => doc.getElementById(id);
  const chart = new AgritechPrecisionFarmingRadarChart();
  const values = metrics.map(({ input }) => input);
  const baseline = metrics.map(({ baseline }) => baseline);
  const full = metrics.map(() => 100);
  const areaAtFullScale = chart.computeEnclosedArea(full);
  const grid = byId("grid");
  const detail = byId("detail");
  const detailPrompt = detail.textContent;
  const overlay = byId("baseline");

  function svg(tag, attrs) {
    const node = doc.createElementNS(svgNamespace, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  for (const score of [25, 50, 75, 100]) {
    grid.append(svg("polygon", { class: "grid-ring", points: chart.generatePolygonPoints(full.map(() => score)) }));
  }
  chart.coordinates(full).forEach(({ x, y }, i) => {
    grid.append(svg("line", { class: "axis", x1: chart.center.x, y1: chart.center.y, x2: x, y2: y }));
    const label = svg("text", {
      class: "axis-label",
      x: x + (i === 1 ? 10 : i === 3 ? -10 : 0),
      y: y + (i === 2 ? 20 : -12),
      "text-anchor": "middle",
    });
    label.textContent = metrics[i].label;
    grid.append(label);
  });
  overlay.setAttribute("points", chart.generatePolygonPoints(baseline));
  byId("show-baseline").addEventListener("change", (event) => {
    overlay.style.display = event.currentTarget.checked ? "" : "none";
  });

  const controls = metrics.map(({ label, baseline: prior }, index) => {
    const row = doc.createElement("tr");
    const name = doc.createElement("th");
    name.scope = "row";
    name.textContent = label;
    const sample = doc.createElement("td");
    const baselineCell = doc.createElement("td");
    baselineCell.textContent = String(prior);
    row.append(name, sample, baselineCell);
    byId("scores").append(row);

    const wrapper = doc.createElement("div");
    wrapper.className = "slider";
    const fieldLabel = doc.createElement("label");
    const input = doc.createElement("input");
    const output = doc.createElement("output");
    input.type = "range";
    input.id = `metric-${index}`;
    input.min = "0";
    input.max = "100";
    input.value = String(values[index]);
    fieldLabel.htmlFor = input.id;
    fieldLabel.textContent = label;
    output.setAttribute("for", input.id);
    wrapper.append(fieldLabel, output, input);
    byId("sliders").append(wrapper);
    input.addEventListener("input", () => {
      values[index] = input.valueAsNumber;
      render();
    });

    const point = svg("circle", { class: "vertex", r: 6, tabindex: 0, role: "img" });
    const showDetail = () => { detail.textContent = `${label}: sample ${values[index]}, baseline ${prior}.`; };
    const hideDetail = () => { detail.textContent = detailPrompt; };
    point.addEventListener("pointerenter", showDetail);
    point.addEventListener("pointerleave", hideDetail);
    point.addEventListener("focus", showDetail);
    point.addEventListener("blur", hideDetail);
    byId("vertices").append(point);
    return { sample, output, point, showDetail };
  });

  function render() {
    byId("sample").setAttribute("points", chart.generatePolygonPoints(values));
    byId("area").textContent = `${(100 * chart.computeEnclosedArea(values) / areaAtFullScale).toFixed(1)}%`;
    chart.coordinates(values).forEach(({ x, y }, i) => {
      const { sample, output, point, showDetail } = controls[i];
      sample.textContent = String(values[i]);
      output.value = String(values[i]);
      point.setAttribute("cx", x);
      point.setAttribute("cy", y);
      point.setAttribute("aria-label", `${metrics[i].label} sample score ${values[i]}`);
      if (doc.activeElement === point) showDetail();
    });
  }
  render();
}

if (typeof document !== "undefined") mount(document);
