import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainRouteOptimizer } from './route-optimizer.js';

describe('SupplyChainRouteOptimizer', () => {
  it('instantiates correctly with default fleet parameters', () => {
    const optimizer = new SupplyChainRouteOptimizer();
    assert.equal(optimizer.vehicleCapacityKg, 500);
    assert.equal(optimizer.fuelConsumptionPerKm, 0.28);
    assert.equal(optimizer.fuelCostPerLiter, 1.45);
  });

  it('computes symmetric Euclidean distances accurately', () => {
    const optimizer = new SupplyChainRouteOptimizer();
    const locA = { id: 'A', x: 0, y: 0 };
    const locB = { id: 'B', x: 30, y: 40 };

    const distAB = optimizer.calculateDistance(locA, locB);
    const distBA = optimizer.calculateDistance(locB, locA);
    // 3-4-5 triangle -> distance = 50.0
    assert.equal(distAB, 50.0);
    assert.equal(distBA, 50.0);
  });

  it('generates symmetric pairwise distance matrix for all locations', () => {
    const optimizer = new SupplyChainRouteOptimizer();
    const locs = [
      { id: 'D', x: 0, y: 0 },
      { id: 'C1', x: 10, y: 0 },
      { id: 'C2', x: 0, y: 10 }
    ];

    const matrix = optimizer.calculateDistanceMatrix(locs);
    assert.equal(matrix.get('D').get('C1'), 10.0);
    assert.equal(matrix.get('C1').get('D'), 10.0);
    assert.equal(matrix.get('D').get('D'), 0.0);
  });

  it('enforces vehicle capacity constraint across all generated routes', () => {
    const optimizer = new SupplyChainRouteOptimizer({ vehicleCapacityKg: 300 });
    const depot = { id: 'DEPOT', x: 100, y: 100 };
    const customers = [
      { id: 'C1', x: 120, y: 110, demandKg: 150 },
      { id: 'C2', x: 130, y: 120, demandKg: 200 },
      { id: 'C3', x: 140, y: 130, demandKg: 100 },
      { id: 'C4', x: 150, y: 140, demandKg: 120 }
    ];

    const tours = optimizer.generateInitialRoutes(depot, customers, 300);
    // Total demand is 570 kg -> requires at least 2 vehicles for 300 kg limit
    assert.ok(tours.length >= 2);

    for (const tour of tours) {
      assert.equal(tour[0].id, 'DEPOT');
      assert.equal(tour[tour.length - 1].id, 'DEPOT');

      const totalLoad = tour.reduce((sum, node) => sum + (node.demandKg || 0), 0);
      assert.ok(totalLoad <= 300, `Tour load ${totalLoad} exceeded vehicle capacity 300`);
    }
  });

  it('reduces route distance monotonically via 2-opt edge-swapping heuristic', () => {
    const optimizer = new SupplyChainRouteOptimizer();
    const depot = { id: 'D', x: 0, y: 0 };

    // Intentionally crossed / sub-optimal route: D -> (10, 0) -> (0, 10) -> (10, 10) -> D
    // (10,0) to (0,10) crosses with (10,10)
    const crossedRoute = [
      depot,
      { id: 'P1', x: 10, y: 0 },
      { id: 'P2', x: 0, y: 10 },
      { id: 'P3', x: 10, y: 10 },
      depot
    ];

    const res = optimizer.optimize2Opt(crossedRoute);
    assert.ok(res.optimizedDistance <= res.initialDistance);
    assert.ok(res.distanceReduction >= 0);
  });

  it('runs complete fleet vehicle optimization returning valid economic metrics', () => {
    const optimizer = new SupplyChainRouteOptimizer({ vehicleCapacityKg: 400 });
    const net = optimizer.generatePresetNetwork('metro');

    const result = optimizer.optimizeFleetRoutes(net.depot, net.customers, 400);
    assert.ok(result.routes.length >= 2);
    assert.ok(result.totalFleetDistanceKm > 0);
    assert.ok(result.totalFuelUsedLiters > 0);
    assert.ok(result.fuelCostDollars > 0);
    assert.ok(result.totalDistanceSavedKm >= 0);
  });

  it('handles empty inputs, single customer, and edge cases gracefully', () => {
    const optimizer = new SupplyChainRouteOptimizer();
    const emptyRes = optimizer.optimizeFleetRoutes(null, []);
    assert.equal(emptyRes.routes.length, 0);
    assert.equal(emptyRes.totalFleetDistanceKm, 0);

    const depot = { id: 'D', x: 50, y: 50 };
    const singleCustomer = [{ id: 'C1', x: 100, y: 50, demandKg: 50 }];
    const singleRes = optimizer.optimizeFleetRoutes(depot, singleCustomer, 500);
    assert.equal(singleRes.routes.length, 1);
    // Round trip: D(50,50) -> C1(100,50) = 50km + return 50km = 100km
    assert.equal(singleRes.totalFleetDistanceKm, 100.0);
  });
});
