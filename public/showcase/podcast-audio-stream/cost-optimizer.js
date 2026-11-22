const RESOURCES = Object.freeze([
  { id: "compute", name: "Editing compute", limit: 1000, tiers: [[100, 45], [400, 32], [1000, 22]] },
  { id: "storage", name: "Archive storage", limit: 5000, tiers: [[250, 12], [1500, 8], [5000, 5]] },
  { id: "bandwidth", name: "Listener delivery", limit: 10000, tiers: [[500, 9], [2500, 6], [10000, 4]] },
]);
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (minor) => usd.format(minor / 100);

export class PodcastAudioStreamCostOptimizerEngine {
  #pricing;

  applyVolumeDiscount(monthlySubtotalCents) {
    if (!Number.isSafeInteger(monthlySubtotalCents) || monthlySubtotalCents < 0) {
      throw new RangeError("The monthly subtotal must be a nonnegative amount in cents.");
    }
    const percent = monthlySubtotalCents >= 18000 ? 10 : monthlySubtotalCents >= 9000 ? 5 : 0;
    return { percent, cents: Math.round(monthlySubtotalCents * percent / 100) };
  }

  calculatePricing(inputs) {
    const { billing = "monthly" } = inputs;
    if (billing !== "monthly" && billing !== "annual") throw new RangeError("Unknown billing period.");
    const months = billing === "annual" ? 12 : 1;
    const resources = RESOURCES.map(({ id, name, limit, tiers }) => {
      const units = inputs[id];
      if (!Number.isInteger(units) || units < 0 || units > limit) {
        throw new RangeError(name + " must be an integer from 0 to " + limit + ".");
      }

      let previousEnd = 0;
      const bands = tiers.map(([end, rateCents]) => {
        const billable = Math.max(0, Math.min(units, end) - previousEnd);
        const band = { through: end, units: billable, rateCents, cents: billable * rateCents };
        previousEnd = end;
        return band;
      });

      const cents = bands.reduce((sum, band) => sum + band.cents, 0);
      return { id, name, units, monthlyCents: cents, periodCents: cents * months, bands };
    });

    const monthlySubtotalCents = resources.reduce((sum, item) => sum + item.monthlyCents, 0);
    const volume = this.applyVolumeDiscount(monthlySubtotalCents);
    const subtotalCents = monthlySubtotalCents * months;
    const volumeDiscountCents = volume.cents * months;
    const annualDiscountCents = billing === "annual"
      ? Math.round((subtotalCents - volumeDiscountCents) * 15 / 100)
      : 0;

    this.#pricing = {
      currency: "USD",
      billing,
      months,
      resources,
      subtotalCents,
      volumePercent: volume.percent,
      volumeDiscountCents,
      annualDiscountCents,
      totalCents: subtotalCents - volumeDiscountCents - annualDiscountCents,
    };
    return this.generateQuote();
  }

  generateQuote() {
    if (!this.#pricing) throw new Error("Calculate pricing before generating a quote.");
    return structuredClone(this.#pricing);
  }
}

function start(form) {
  const engine = new PodcastAudioStreamCostOptimizerEngine();
  const colors = ["var(--compute)", "var(--storage)", "var(--bandwidth)"];
  const chart = document.querySelector("#chart");
  const period = document.querySelector("#period");
  const total = document.querySelector("#total");
  const subtotal = document.querySelector("#subtotal");
  const volume = document.querySelector("#volume");
  const annual = document.querySelector("#annual");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ticker;

  function render() {
    const data = new FormData(form);
    const quote = engine.calculatePricing({
      compute: Number(data.get("compute")),
      storage: Number(data.get("storage")),
      bandwidth: Number(data.get("bandwidth")),
      billing: data.get("billing"),
    });

    let end = 0;
    const segments = quote.resources.map((resource, index) => {
      document.querySelector("#" + resource.id + "-units").textContent = resource.units.toLocaleString("en-US");
      document.querySelector("#" + resource.id + "-cost").textContent = money(resource.periodCents);
      const activeBand = resource.bands.findLastIndex((band) => band.units > 0);
      document.querySelector("#" + resource.id + "-band").textContent = activeBand < 0
        ? "No usage"
        : "Tier " + (activeBand + 1) + " · " + money(resource.bands[activeBand].rateCents) + " per unit";
      const begin = end;
      end += quote.subtotalCents === 0 ? 0 : resource.periodCents / quote.subtotalCents * 100;
      return colors[index] + " " + begin + "% " + end + "%";
    });
    chart.style.background = quote.subtotalCents === 0
      ? "var(--line)"
      : "conic-gradient(" + segments.join(", ") + ")";
    period.textContent = quote.billing === "annual" ? "per year" : "per month";
    const amount = money(quote.totalCents);
    if (amount !== total.textContent) {
      ticker?.cancel();
      total.textContent = amount;
      if (!reducedMotion.matches && typeof total.animate === "function") {
        ticker = total.animate(
          [{ opacity: .65, transform: "translateY(2px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 160, easing: "ease-out" },
        );
      }
    }
    subtotal.textContent = money(quote.subtotalCents);
    volume.textContent = "−" + money(quote.volumeDiscountCents);
    annual.textContent = "−" + money(quote.annualDiscountCents);
  }

  form.addEventListener("input", render);
  render();
}

if (typeof document !== "undefined") {
  const form = document.querySelector("#resources");
  if (form) start(form);
}
