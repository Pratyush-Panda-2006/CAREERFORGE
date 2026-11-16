const FESTIVAL_ZONES = [
  { id: 'main-stage', name: 'Main Stage', x: 400, y: 128, color: '#ec4899', capacity: 6500, baseAttendance: 4450, swing: 620, spread: 78, bpm: 126, decibels: 112 },
  { id: 'neon-arena', name: 'Neon Arena', x: 150, y: 250, color: '#06b6d4', capacity: 3200, baseAttendance: 2380, swing: 430, spread: 70, bpm: 134, decibels: 106 },
  { id: 'bass-vault', name: 'Bass Vault', x: 650, y: 250, color: '#10b981', capacity: 3400, baseAttendance: 2610, swing: 510, spread: 76, bpm: 140, decibels: 110 },
  { id: 'chill-oasis', name: 'Chill Oasis', x: 640, y: 392, color: '#a855f7', capacity: 1900, baseAttendance: 980, swing: 240, spread: 62, bpm: 92, decibels: 88 }
];

const WALKWAY_NODES = [
  { id: 'gate', x: 400, y: 455 },
  { id: 'gate-walkway', x: 400, y: 440 },
  { id: 'south-walkway', x: 400, y: 405 },
  { id: 'south-junction', x: 400, y: 360 },
  { id: 'lower-junction', x: 400, y: 330 },
  { id: 'info-south', x: 400, y: 290 },
  { id: 'info', x: 400, y: 250 },
  { id: 'info-north', x: 400, y: 210 },
  { id: 'main-approach', x: 400, y: 150 },
  { id: 'main-stage', x: 400, y: 90 },
  { id: 'west-junction', x: 355, y: 250 },
  { id: 'west-walkway', x: 215, y: 250 },
  { id: 'west-perimeter-north', x: 85, y: 250 },
  { id: 'west-perimeter-south', x: 85, y: 440 },
  { id: 'neon-arena', x: 150, y: 250 },
  { id: 'east-junction', x: 445, y: 250 },
  { id: 'east-walkway', x: 585, y: 250 },
  { id: 'east-perimeter-north', x: 715, y: 250 },
  { id: 'east-perimeter-south', x: 715, y: 440 },
  { id: 'bass-vault', x: 650, y: 250 },
  { id: 'food-junction', x: 262, y: 392 },
  { id: 'food-court', x: 206, y: 395 },
  { id: 'chill-junction', x: 540, y: 392 },
  { id: 'chill-oasis', x: 640, y: 392 }
];

const WALKWAY_EDGES = [
  ['gate', 'gate-walkway'],
  ['gate-walkway', 'south-walkway'],
  ['south-walkway', 'south-junction'],
  ['south-junction', 'lower-junction'],
  ['lower-junction', 'info-south'],
  ['info-south', 'info'],
  ['info', 'info-north'],
  ['info-north', 'main-approach'],
  ['main-approach', 'main-stage'],
  ['info', 'west-junction'],
  ['west-junction', 'west-walkway'],
  ['west-walkway', 'neon-arena'],
  ['west-walkway', 'west-perimeter-north'],
  ['west-perimeter-north', 'west-perimeter-south'],
  ['west-perimeter-south', 'gate-walkway'],
  ['info', 'east-junction'],
  ['east-junction', 'east-walkway'],
  ['east-walkway', 'bass-vault'],
  ['east-walkway', 'east-perimeter-north'],
  ['east-perimeter-north', 'east-perimeter-south'],
  ['east-perimeter-south', 'gate-walkway'],
  ['lower-junction', 'food-junction'],
  ['food-junction', 'food-court'],
  ['info-south', 'chill-junction'],
  ['chill-junction', 'chill-oasis']
];

const DESTINATIONS = { exit: 'gate', medical: 'info' };
const NODE_BY_ID = new Map(WALKWAY_NODES.map((node) => [node.id, node]));
const BASE_GRAPH = new Map(WALKWAY_NODES.map((node) => [node.id, { ...node, neighbors: [] }]));

for (const [fromId, toId] of WALKWAY_EDGES) {
  const from = NODE_BY_ID.get(fromId);
  const to = NODE_BY_ID.get(toId);
  BASE_GRAPH.get(fromId).neighbors.push({ id: toId, distance: distance(from, to) });
  BASE_GRAPH.get(toId).neighbors.push({ id: fromId, distance: distance(from, to) });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function simulateCrowdZones(timeMs = 0) {
  const seconds = Number.isFinite(timeMs) ? timeMs / 1000 : 0;
  return FESTIVAL_ZONES.map((zone, index) => ({
    ...zone,
    attendance: Math.round(zone.baseAttendance + Math.sin(seconds * 0.12 + index * 1.6) * zone.swing)
  }));
}

export function gaussianCrowdIntensity(point, zone) {
  if (!point || !zone || zone.capacity <= 0 || zone.spread <= 0) return 0;
  const attendance = Number.isFinite(zone.attendance) ? zone.attendance : 0;
  const density = clamp(attendance / zone.capacity, 0, 1);
  const dx = point.x - zone.x;
  const dy = point.y - zone.y;
  return density * Math.exp(-((dx * dx + dy * dy) / (2 * zone.spread * zone.spread)));
}

function projectOntoSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return { x: start.x + t * dx, y: start.y + t * dy };
}

function findNearestWalkwayPoint(point) {
  let nearest = null;
  for (const [startId, endId] of WALKWAY_EDGES) {
    const start = NODE_BY_ID.get(startId);
    const end = NODE_BY_ID.get(endId);
    const projection = projectOntoSegment(point, start, end);
    const gap = distance(point, projection);
    if (!nearest || gap < nearest.gap) {
      nearest = { projection, gap, startId, endId };
    }
  }
  return nearest;
}

function crowdPenalty(a, b, zones) {
  if (!zones.length) return 1;
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const density = zones.reduce((max, zone) => Math.max(max, gaussianCrowdIntensity(midpoint, zone)), 0);
  return 1 + density * 1.8;
}

function aStar(graph, startId, goalId, zones) {
  const open = new Set([startId]);
  const cameFrom = new Map();
  const costs = new Map([[startId, 0]]);
  const estimatedTotal = new Map([[startId, distance(graph.get(startId), graph.get(goalId))]]);

  while (open.size) {
    let currentId = null;
    for (const candidate of open) {
      if (currentId === null || estimatedTotal.get(candidate) < estimatedTotal.get(currentId)) {
        currentId = candidate;
      }
    }
    if (currentId === goalId) {
      const path = [currentId];
      while (cameFrom.has(path[0])) path.unshift(cameFrom.get(path[0]));
      return path;
    }

    open.delete(currentId);
    const current = graph.get(currentId);
    for (const edge of current.neighbors) {
      const neighbor = graph.get(edge.id);
      const nextCost = costs.get(currentId) + edge.distance * crowdPenalty(current, neighbor, zones);
      if (nextCost >= (costs.get(edge.id) ?? Infinity)) continue;
      cameFrom.set(edge.id, currentId);
      costs.set(edge.id, nextCost);
      estimatedTotal.set(edge.id, nextCost + distance(neighbor, graph.get(goalId)));
      open.add(edge.id);
    }
  }
  return [];
}

export function findFestivalRoute(location, destination, zones = []) {
  const destinationId = DESTINATIONS[destination];
  if (!location || !destinationId || !NODE_BY_ID.has(destinationId)) return null;

  const start = {
    x: clamp(Number(location.x), 0, 800),
    y: clamp(Number(location.y), 0, 480)
  };
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) return null;

  const nearest = findNearestWalkwayPoint(start);
  const graph = new Map([...BASE_GRAPH].map(([id, node]) => [
    id,
    { ...node, neighbors: node.neighbors.slice() }
  ]));
  const startNode = {
    id: 'route-start',
    x: nearest.projection.x,
    y: nearest.projection.y,
    neighbors: []
  };
  graph.set(startNode.id, startNode);

  for (const nodeId of [nearest.startId, nearest.endId]) {
    const node = graph.get(nodeId);
    const edgeDistance = distance(startNode, node);
    startNode.neighbors.push({ id: nodeId, distance: edgeDistance });
    node.neighbors.push({ id: startNode.id, distance: edgeDistance });
  }

  const path = aStar(graph, startNode.id, destinationId, zones);
  if (!path.length) return null;

  return [
    start,
    ...path.map((nodeId) => {
      const { x, y } = graph.get(nodeId);
      return { x, y };
    })
  ];
}
