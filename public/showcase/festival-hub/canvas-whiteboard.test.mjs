import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubWhiteboardCanvas } from './canvas-whiteboard.js';

test('FestivalHubWhiteboardCanvas - point distance interpolation calculates steps correctly', () => {
  const whiteboard = new FestivalHubWhiteboardCanvas(null, { width: 500, height: 500 });
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 10, y: 0 };

  const interpolated = whiteboard.interpolatePoints(p1, p2, 2.5);
  assert.equal(interpolated.length, 5);
  assert.deepEqual(interpolated[0], { x: 0, y: 0 });
  assert.deepEqual(interpolated[interpolated.length - 1], { x: 10, y: 0 });

  // Test when distance <= maxDistance
  const closePoints = whiteboard.interpolatePoints(p1, { x: 2, y: 0 }, 5);
  assert.equal(closePoints.length, 2);
});

test('FestivalHubWhiteboardCanvas - stroke history and undo/redo stacks observe boundary limits', () => {
  const whiteboard = new FestivalHubWhiteboardCanvas(null, { width: 800, height: 600 });

  // Start with empty history
  assert.equal(whiteboard.strokes.length, 0);
  assert.equal(whiteboard.undo(), null);
  assert.equal(whiteboard.redo(), null);

  // Add first stroke (pen)
  whiteboard.setTool('pen');
  whiteboard.setColor('#ff4081');
  whiteboard.startStroke(10, 10);
  whiteboard.addPoint(20, 20);
  whiteboard.addPoint(30, 30);
  whiteboard.endStroke();

  assert.equal(whiteboard.strokes.length, 1);
  assert.equal(whiteboard.redoStack.length, 0);

  // Add second stroke (line)
  whiteboard.setTool('line');
  whiteboard.startStroke(50, 50);
  whiteboard.addPoint(100, 100);
  whiteboard.endStroke();

  assert.equal(whiteboard.strokes.length, 2);

  // Undo second stroke
  const undone = whiteboard.undo();
  assert.equal(undone.tool, 'line');
  assert.equal(whiteboard.strokes.length, 1);
  assert.equal(whiteboard.redoStack.length, 1);

  // Undo first stroke
  whiteboard.undo();
  assert.equal(whiteboard.strokes.length, 0);
  assert.equal(whiteboard.redoStack.length, 2);

  // Cannot undo past limit
  assert.equal(whiteboard.undo(), null);

  // Redo stroke
  whiteboard.redo();
  assert.equal(whiteboard.strokes.length, 1);
  assert.equal(whiteboard.strokes[0].tool, 'pen');

  // Clear resets both
  whiteboard.clear();
  assert.equal(whiteboard.strokes.length, 0);
  assert.equal(whiteboard.redoStack.length, 0);
});

test('FestivalHubWhiteboardCanvas - SVG path serialization outputs valid vector markup', () => {
  const whiteboard = new FestivalHubWhiteboardCanvas(null, { width: 400, height: 300 });

  // Line stroke
  const lineStroke = {
    tool: 'line',
    color: '#00e5ff',
    width: 3,
    points: [{ x: 10, y: 10 }, { x: 50, y: 50 }]
  };
  const lineSVG = whiteboard.strokeToSVGElement(lineStroke);
  assert.match(lineSVG, /<line x1="10" y1="10" x2="50" y2="50"/);
  assert.match(lineSVG, /stroke="#00e5ff"/);
  assert.match(lineSVG, /stroke-width="3"/);

  // Rectangle stroke
  const rectStroke = {
    tool: 'rectangle',
    color: '#ffea00',
    width: 2,
    points: [{ x: 20, y: 20 }, { x: 80, y: 70 }]
  };
  const rectSVG = whiteboard.strokeToSVGElement(rectStroke);
  assert.match(rectSVG, /<rect x="20" y="20" width="60" height="50"/);
  assert.match(rectSVG, /stroke="#ffea00"/);

  // Freehand path stroke
  const penStroke = {
    tool: 'pen',
    color: '#ff4081',
    width: 4,
    points: [{ x: 5, y: 5 }, { x: 15, y: 25 }, { x: 30, y: 40 }]
  };
  const pathSVG = whiteboard.strokeToSVGElement(penStroke);
  assert.match(pathSVG, /<path d="M 5 5 Q 15 25, 22.5 32.5 L 30 40"/);
  assert.match(pathSVG, /stroke="#ff4081"/);

  // Full SVG export
  whiteboard.strokes = [lineStroke, rectStroke, penStroke];
  const fullExport = whiteboard.exportSVG();

  assert.match(fullExport, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 400 300"/);
  assert.match(fullExport, /<line/);
  assert.match(fullExport, /<rect/);
  assert.match(fullExport, /<path/);
  assert.match(fullExport, /<\/svg>/);
});
