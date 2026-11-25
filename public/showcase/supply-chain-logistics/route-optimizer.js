/**
 * SupplyChainRouteOptimizer
 * Autonomous client-side route optimization engine for Supply Chain Logistics.
 * Solves the Capacitated Vehicle Routing Problem (CVRP) with fleet capacity constraints
 * and 2-opt local search heuristic edge-swapping.
 */

class SupplyChainRouteOptimizer {
  constructor(options = {}) {
    this.vehicleCapacityKg = options.vehicleCapacityKg || 500; // kg
    this.fuelConsumptionPerKm = options.fuelConsumptionPerKm || 0.28; // Liters / km
    this.fuelCostPerLiter = options.fuelCostPerLiter || 1.45; // $ / Liter
    this.averageSpeedKmh = options.averageSpeedKmh || 45; // km/h
  }

  /**
   * Computes Euclidean distance between two 2D coordinates
   * @param {{x: number, y: number}} a
   * @param {{x: number, y: number}} b
   * @returns {number}
   */
  calculateDistance(a, b) {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Number(Math.sqrt(dx * dx + dy * dy).toFixed(2));
  }

  /**
   * Generates symmetric pairwise distance matrix for all locations
   * @param {Array<{id: string, x: number, y: number}>} locations
   * @returns {Map<string, Map<string, number>>}
   */
  calculateDistanceMatrix(locations) {
    const matrix = new Map();

    for (const locA of locations) {
      if (!matrix.has(locA.id)) {
        matrix.set(locA.id, new Map());
      }
      for (const locB of locations) {
        const dist = this.calculateDistance(locA, locB);
        matrix.get(locA.id).set(locB.id, dist);
      }
    }

    return matrix;
  }

  /**
   * Clusters customer waypoints into capacity-feasible vehicle routes using Greedy Nearest Neighbor
   * @param {{id: string, x: number, y: number}} depot
   * @param {Array<{id: string, x: number, y: number, demandKg: number}>} customers
   * @param {number} maxCapacityKg
   * @returns {Array<Array<{id: string, x: number, y: number, demandKg: number}>>}
   */
  generateInitialRoutes(depot, customers, maxCapacityKg = null) {
    const capacityLimit = maxCapacityKg || this.vehicleCapacityKg;
    const unvisited = [...customers];
    const routes = [];

    while (unvisited.length > 0) {
      const currentRoute = [depot];
      let currentLoad = 0;
      let currentNode = depot;

      while (unvisited.length > 0) {
        // Find nearest unvisited customer that fits remaining vehicle capacity
        let nearestIdx = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
          const cand = unvisited[i];
          const candDemand = cand.demandKg || 0;

          if (currentLoad + candDemand <= capacityLimit) {
            const dist = this.calculateDistance(currentNode, cand);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestIdx = i;
            }
          }
        }

        if (nearestIdx !== -1) {
          const chosen = unvisited.splice(nearestIdx, 1)[0];
          currentRoute.push(chosen);
          currentLoad += (chosen.demandKg || 0);
          currentNode = chosen;
        } else {
          // No more customers fit on this vehicle; return to depot
          break;
        }
      }

      currentRoute.push(depot);
      routes.push(currentRoute);
    }

    return routes;
  }

  /**
   * Calculates total round-trip distance of a single route sequence
   * @param {Array<{id: string, x: number, y: number}>} route
   * @returns {number}
   */
  calculateRouteDistance(route) {
    if (!route || route.length <= 1) return 0;
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += this.calculateDistance(route[i], route[i + 1]);
    }
    return Number(total.toFixed(2));
  }

  /**
   * Applies iterative 2-opt edge-swapping local search optimization to eliminate crossing paths
   * @param {Array<{id: string, x: number, y: number}>} route - Sequence starting & ending with depot
   * @returns {{
   *   optimizedRoute: Array<Object>,
   *   initialDistance: number,
   *   optimizedDistance: number,
   *   distanceReduction: number,
   *   swapCount: number
   * }}
   */
  optimize2Opt(route) {
    if (!route || route.length <= 3) {
      const d = this.calculateRouteDistance(route);
      return {
        optimizedRoute: route ? [...route] : [],
        initialDistance: d,
        optimizedDistance: d,
        distanceReduction: 0,
        swapCount: 0
      };
    }

    let current = [...route];
    const initialDistance = this.calculateRouteDistance(current);
    let bestDistance = initialDistance;
    let swapCount = 0;
    let improved = true;
    let maxIterations = 500;

    // Depot is fixed at current[0] and current[current.length - 1]
    while (improved && maxIterations-- > 0) {
      improved = false;

      for (let i = 1; i < current.length - 2; i++) {
        for (let j = i + 1; j < current.length - 1; j++) {
          const dA = this.calculateDistance(current[i - 1], current[i]);
          const dB = this.calculateDistance(current[j], current[j + 1]);
          const currentEdgeSum = dA + dB;

          const dNewA = this.calculateDistance(current[i - 1], current[j]);
          const dNewB = this.calculateDistance(current[i], current[j + 1]);
          const newEdgeSum = dNewA + dNewB;

          // If new connections reduce route length
          if (newEdgeSum < currentEdgeSum - 0.001) {
            // Reverse segment between i and j
            const segment = current.slice(i, j + 1).reverse();
            current.splice(i, segment.length, ...segment);

            bestDistance = this.calculateRouteDistance(current);
            swapCount++;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    const distanceReduction = Number(Math.max(0, initialDistance - bestDistance).toFixed(2));

    return {
      optimizedRoute: current,
      initialDistance,
      optimizedDistance: bestDistance,
      distanceReduction,
      swapCount
    };
  }

  /**
   * Runs end-to-end Fleet Capacitated Vehicle Routing Optimization
   * @param {{id: string, x: number, y: number}} depot
   * @param {Array<{id: string, x: number, y: number, demandKg: number}>} customers
   * @param {number} maxCapacityKg
   * @returns {{
   *   routes: Array<Object>,
   *   totalFleetDistanceKm: number,
   *   initialFleetDistanceKm: number,
   *   totalDistanceSavedKm: number,
   *   totalFuelUsedLiters: number,
   *   fuelCostDollars: number,
   *   totalFleetDemandKg: number,
   *   vehicleCount: number,
   *   efficiencyGainPct: number
   * }}
   */
  optimizeFleetRoutes(depot, customers, maxCapacityKg = null) {
    if (!depot || !customers || customers.length === 0) {
      return {
        routes: [],
        totalFleetDistanceKm: 0,
        initialFleetDistanceKm: 0,
        totalDistanceSavedKm: 0,
        totalFuelUsedLiters: 0,
        fuelCostDollars: 0,
        totalFleetDemandKg: 0,
        vehicleCount: 0,
        efficiencyGainPct: 0
      };
    }

    const initialTours = this.generateInitialRoutes(depot, customers, maxCapacityKg);
    const optimizedTours = [];
    let initialFleetDist = 0;
    let optimizedFleetDist = 0;
    let totalDemand = 0;

    for (let idx = 0; idx < initialTours.length; idx++) {
      const tour = initialTours[idx];
      const opt = this.optimize2Opt(tour);

      let tourLoad = 0;
      for (const node of opt.optimizedRoute) {
        if (node.id !== depot.id) {
          tourLoad += (node.demandKg || 0);
        }
      }
      totalDemand += tourLoad;

      initialFleetDist += opt.initialDistance;
      optimizedFleetDist += opt.optimizedDistance;

      optimizedTours.push({
        vehicleId: `Vehicle-${idx + 1}`,
        color: this.getVehicleColor(idx),
        route: opt.optimizedRoute,
        loadKg: tourLoad,
        initialDistanceKm: opt.initialDistance,
        optimizedDistanceKm: opt.optimizedDistance,
        distanceSavedKm: opt.distanceReduction,
        swapCount: opt.swapCount
      });
    }

    const totalDistanceSavedKm = Number(Math.max(0, initialFleetDist - optimizedFleetDist).toFixed(2));
    const efficiencyGainPct = initialFleetDist > 0
      ? Number(((totalDistanceSavedKm / initialFleetDist) * 100).toFixed(2))
      : 0;

    const totalFuelUsedLiters = Number((optimizedFleetDist * this.fuelConsumptionPerKm).toFixed(2));
    const fuelCostDollars = Number((totalFuelUsedLiters * this.fuelCostPerLiter).toFixed(2));

    return {
      routes: optimizedTours,
      totalFleetDistanceKm: Number(optimizedFleetDist.toFixed(2)),
      initialFleetDistanceKm: Number(initialFleetDist.toFixed(2)),
      totalDistanceSavedKm,
      totalFuelUsedLiters,
      fuelCostDollars,
      totalFleetDemandKg: totalDemand,
      vehicleCount: optimizedTours.length,
      efficiencyGainPct
    };
  }

  getVehicleColor(index) {
    const palette = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    return palette[index % palette.length];
  }

  /**
   * Generates sample scenario datasets
   */
  generatePresetNetwork(scenario = 'metro') {
    const depot = { id: 'DEPOT-01', name: 'Logistics Distribution Central', x: 280, y: 160 };
    let customers = [];

    if (scenario === 'metro') {
      // 12 stores clustered in 3 distinct city quadrants
      customers = [
        { id: 'C-01', name: 'Downtown Retailer', x: 140, y: 80, demandKg: 120 },
        { id: 'C-02', name: 'Financial Hub Mart', x: 180, y: 60, demandKg: 140 },
        { id: 'C-03', name: 'Harbor Market', x: 110, y: 120, demandKg: 90 },
        { id: 'C-04', name: 'Midtown Express', x: 190, y: 110, demandKg: 110 },
        { id: 'C-05', name: 'Eastside Superstore', x: 420, y: 70, demandKg: 160 },
        { id: 'C-06', name: 'Industrial Depot East', x: 480, y: 90, demandKg: 200 },
        { id: 'C-07', name: 'Riverside Distribution', x: 430, y: 130, demandKg: 80 },
        { id: 'C-08', name: 'Suburban Mall South', x: 340, y: 260, demandKg: 170 },
        { id: 'C-09', name: 'South Gate Center', x: 290, y: 280, demandKg: 130 },
        { id: 'C-10', name: 'Metro Airport Cargo', x: 220, y: 270, demandKg: 150 },
        { id: 'C-11', name: 'West Valley Outlet', x: 150, y: 220, demandKg: 110 },
        { id: 'C-12', name: 'Tech Park Plaza', x: 380, y: 210, demandKg: 140 }
      ];
    } else if (scenario === 'regional') {
      customers = [
        { id: 'R-01', name: 'North County Hub', x: 260, y: 40, demandKg: 220 },
        { id: 'R-02', name: 'Mountain View Store', x: 100, y: 50, demandKg: 190 },
        { id: 'R-03', name: 'Coastal Terminal', x: 60, y: 180, demandKg: 240 },
        { id: 'R-04', name: 'Southern Border Depot', x: 270, y: 290, demandKg: 210 },
        { id: 'R-05', name: 'Valley Logistics', x: 490, y: 240, demandKg: 180 },
        { id: 'R-06', name: 'Eastern Gateway', x: 500, y: 110, demandKg: 230 }
      ];
    } else {
      // Clustered Suburbs
      customers = [
        { id: 'S-01', name: 'North Cluster A', x: 200, y: 70, demandKg: 80 },
        { id: 'S-02', name: 'North Cluster B', x: 240, y: 60, demandKg: 90 },
        { id: 'S-03', name: 'North Cluster C', x: 210, y: 100, demandKg: 70 },
        { id: 'S-04', name: 'South Cluster A', x: 320, y: 240, demandKg: 85 },
        { id: 'S-05', name: 'South Cluster B', x: 350, y: 260, demandKg: 115 },
        { id: 'S-06', name: 'South Cluster C', x: 300, y: 250, demandKg: 95 }
      ];
    }

    return { depot, customers };
  }

  /**
   * UI Workbench DOM Initializer
   */
  initUI(containerId = 'logistics-optimizer-container') {
    const root = document.getElementById(containerId);
    if (!root) return;

    let activeScenario = 'metro';

    const render = () => {
      const net = this.generatePresetNetwork(activeScenario);
      const res = this.optimizeFleetRoutes(net.depot, net.customers);

      // Render KPIs
      const distEl = document.getElementById('metric-total-dist');
      if (distEl) distEl.textContent = `${res.totalFleetDistanceKm} km`;

      const savedEl = document.getElementById('metric-dist-saved');
      if (savedEl) savedEl.textContent = `${res.totalDistanceSavedKm} km (${res.efficiencyGainPct}%)`;

      const vehEl = document.getElementById('metric-vehicle-count');
      if (vehEl) vehEl.textContent = `${res.vehicleCount} Vehicles`;

      const fuelEl = document.getElementById('metric-fuel-cost');
      if (fuelEl) fuelEl.textContent = `$${res.fuelCostDollars} (${res.totalFuelUsedLiters} L)`;

      // Render Map Canvas
      const canvas = document.getElementById('route-map-canvas');
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // Draw Route Paths
        res.routes.forEach(r => {
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          r.route.forEach((loc, i) => {
            if (i === 0) ctx.moveTo(loc.x, loc.y);
            else ctx.lineTo(loc.x, loc.y);
          });
          ctx.stroke();
        });

        // Draw Customer Nodes
        net.customers.forEach(c => {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText(c.id, c.x + 8, c.y + 3);
        });

        // Draw Central Depot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(net.depot.x, net.depot.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('DEPOT', net.depot.x - 18, net.depot.y - 14);
      }

      // Render Routes List
      const listEl = document.getElementById('vehicle-routes-list');
      if (listEl) {
        listEl.innerHTML = res.routes.map(r => `
          <div class="vehicle-card" style="border-left: 4px solid ${r.color};">
            <div class="veh-header">
              <strong style="color: ${r.color};">${r.vehicleId}</strong>
              <span class="veh-load">${r.loadKg} / ${this.vehicleCapacityKg} kg</span>
              <span class="veh-dist">${r.optimizedDistanceKm} km</span>
            </div>
            <div class="veh-path">
              Path: ${r.route.map(n => n.id).join(' &rarr; ')}
            </div>
            <div class="veh-saving">
              2-Opt Improvement: -${r.distanceSavedKm} km (${r.swapCount} edge swaps)
            </div>
          </div>
        `).join('');
      }
    };

    const sel = document.getElementById('scenario-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        activeScenario = e.target.value;
        render();
      });
    }

    const retestBtn = document.getElementById('reoptimize-btn');
    if (retestBtn) {
      retestBtn.addEventListener('click', () => {
        render();
      });
    }

    render();
  }
}

// Support dual export: ES Module and Browser Global
if (typeof window !== 'undefined') {
  window.SupplyChainRouteOptimizer = SupplyChainRouteOptimizer;
  window.addEventListener('DOMContentLoaded', () => {
    const autoRoot = document.getElementById('logistics-optimizer-container');
    if (autoRoot) {
      const optimizer = new SupplyChainRouteOptimizer();
      optimizer.initUI();
    }
  });
}

export { SupplyChainRouteOptimizer };
