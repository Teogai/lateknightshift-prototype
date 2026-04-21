/**
 * tests/engine2/tiles.test.js
 * P8: Tiles + tile effects
 *
 * Tests:
 * - makeTile factory produces correct shape
 * - TILE_DEFS has entries for normal, void, damage, heal
 * - movegen excludes void squares from legal destinations
 * - piece entering damage tile gets 'wounded' tag
 * - piece entering heal tile loses 'wounded' tag (if present)
 * - undo restores tag and tile side effects
 */

import { test, expect } from 'vitest';
import { makeTile, TILE_DEFS } from '../../js/engine2/tiles.js';
import { GameState } from '../../js/engine2/state.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { generateLegalActions } from '../../js/engine2/movegen.js';
import { resolveAction } from '../../js/engine2/actions.js';
import { sqToRC } from '../../js/engine2/board.js';

// ─── helper ───────────────────────────────────────────────────────────────────

function makeState() {
  return new GameState();
}

function placePiece(state, sq, piece) {
  const [r, c] = sqToRC(sq);
  state.board[r][c] = piece;
}

function setTile(state, sq, tile) {
  const [r, c] = sqToRC(sq);
  state.tiles[r][c] = tile;
}

function getTile(state, sq) {
  const [r, c] = sqToRC(sq);
  return state.tiles[r][c];
}

function getPiece(state, sq) {
  const [r, c] = sqToRC(sq);
  return state.board[r][c];
}

// ─── makeTile factory ────────────────────────────────────────────────────────

test('makeTile returns object with correct type', () => {
  const t = makeTile('void');
  expect(t).toBeDefined();
  expect(t.type).toBe('void');
});

test('makeTile normal has type=normal', () => {
  const t = makeTile('normal');
  expect(t.type).toBe('normal');
});

test('makeTile damage has type=damage', () => {
  const t = makeTile('damage');
  expect(t.type).toBe('damage');
});

test('makeTile heal has type=heal', () => {
  const t = makeTile('heal');
  expect(t.type).toBe('heal');
});

// ─── TILE_DEFS registry ───────────────────────────────────────────────────────

test('TILE_DEFS has normal entry', () => {
  expect(TILE_DEFS.normal).toBeDefined();
});

test('TILE_DEFS has void entry', () => {
  expect(TILE_DEFS.void).toBeDefined();
});

test('TILE_DEFS has damage entry', () => {
  expect(TILE_DEFS.damage).toBeDefined();
});

test('TILE_DEFS has heal entry', () => {
  expect(TILE_DEFS.heal).toBeDefined();
});

test('TILE_DEFS damage has onTileEnter hook', () => {
  expect(typeof TILE_DEFS.damage.onTileEnter).toBe('function');
});

test('TILE_DEFS heal has onTileEnter hook', () => {
  expect(typeof TILE_DEFS.heal.onTileEnter).toBe('function');
});

// ─── movegen: void squares excluded ─────────────────────────────────────────

test('movegen excludes void square from rook destinations', () => {
  const state = makeState();
  // Rook on a1 — normally can reach a2..a8, b1..h1
  const rook = makePiece('rook', 'player');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'a1', rook);
  placePiece(state, 'h8', king);   // keep kings alive for legal-move filter
  placePiece(state, 'a8', eking);

  // Mark a3 as void — rook cannot land there or pass through
  setTile(state, 'a3', makeTile('void'));

  const actions = generateLegalActions(state, 'player');
  const rookDests = actions
    .filter(a => a.source === 'a1')
    .map(a => a.targets[0]);

  // a3 is void — rook cannot land there
  expect(rookDests).not.toContain('a3');
  // a4..a8 also blocked by void at a3 (piece cannot slide through)
  expect(rookDests).not.toContain('a4');
  expect(rookDests).not.toContain('a5');
  // a2 is fine (before the void)
  expect(rookDests).toContain('a2');
});

test('movegen excludes void square as knight destination', () => {
  const state = makeState();
  const knight = makePiece('knight', 'player');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'd4', knight);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);

  // knight on d4 can normally jump to c6, e6, b5, f5, b3, f3, c2, e2
  setTile(state, 'c6', makeTile('void'));

  const actions = generateLegalActions(state, 'player');
  const knightDests = actions
    .filter(a => a.source === 'd4')
    .map(a => a.targets[0]);

  expect(knightDests).not.toContain('c6');
  expect(knightDests).toContain('e6');
});

// ─── damage tile: entering adds 'wounded' tag ─────────────────────────────────

test('piece entering damage tile gets wounded tag', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'a1', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  setTile(state, 'a5', makeTile('damage'));

  const action = { kind: 'move', source: 'a1', targets: ['a5'], piece: rook };
  const log = [];
  resolveAction(state, action, log);

  const movedPiece = getPiece(state, 'a5');
  expect(movedPiece).not.toBeNull();
  expect(movedPiece.tags.has('wounded')).toBe(true);
});

test('piece entering damage tile gets wounded tag (via state.play)', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'b2', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  setTile(state, 'b7', makeTile('damage'));

  state.play({ kind: 'move', source: 'b2', targets: ['b7'], piece: rook });

  const movedPiece = getPiece(state, 'b7');
  expect(movedPiece.tags.has('wounded')).toBe(true);
});

// ─── heal tile: removes 'wounded' tag ────────────────────────────────────────

test('piece entering heal tile loses wounded tag', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  rook.tags.add('wounded');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'c1', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  setTile(state, 'c5', makeTile('heal'));

  const action = { kind: 'move', source: 'c1', targets: ['c5'], piece: rook };
  const log = [];
  resolveAction(state, action, log);

  const movedPiece = getPiece(state, 'c5');
  expect(movedPiece.tags.has('wounded')).toBe(false);
});

test('heal tile on non-wounded piece does nothing harmful', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  // rook has NO wounded tag
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'c1', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  setTile(state, 'c5', makeTile('heal'));

  const action = { kind: 'move', source: 'c1', targets: ['c5'], piece: rook };
  const log = [];
  resolveAction(state, action, log);

  const movedPiece = getPiece(state, 'c5');
  expect(movedPiece.tags.has('wounded')).toBe(false);
  expect(movedPiece.tags.size).toBe(0);
});

// ─── undo restores tags and tile effects ─────────────────────────────────────

test('undo after damage tile entry removes wounded tag', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'a1', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  setTile(state, 'a5', makeTile('damage'));

  state.play({ kind: 'move', source: 'a1', targets: ['a5'], piece: rook });

  // After play, rook at a5 should be wounded
  expect(getPiece(state, 'a5')?.tags.has('wounded')).toBe(true);

  state.undo();

  // After undo, rook back at a1, NOT wounded
  const restored = getPiece(state, 'a1');
  expect(restored).not.toBeNull();
  expect(restored.tags.has('wounded')).toBe(false);
  expect(getPiece(state, 'a5')).toBeNull();
});

test('undo after heal tile entry restores wounded tag', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  rook.tags.add('wounded');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'd1', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  setTile(state, 'd5', makeTile('heal'));

  state.play({ kind: 'move', source: 'd1', targets: ['d5'], piece: rook });

  // After play, rook at d5 should NOT be wounded
  expect(getPiece(state, 'd5')?.tags.has('wounded')).toBe(false);

  state.undo();

  // After undo, rook back at d1, still wounded
  const restored = getPiece(state, 'd1');
  expect(restored).not.toBeNull();
  expect(restored.tags.has('wounded')).toBe(true);
  expect(getPiece(state, 'd5')).toBeNull();
});

test('normal tile does not add wounded tag', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'e1', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  setTile(state, 'e5', makeTile('normal'));

  state.play({ kind: 'move', source: 'e1', targets: ['e5'], piece: rook });

  const movedPiece = getPiece(state, 'e5');
  expect(movedPiece.tags.has('wounded')).toBe(false);
});

test('null tile (default) does not add wounded tag', () => {
  const state = makeState();
  const rook = makePiece('rook', 'player');
  const king = makePiece('king', 'player');
  const eking = makePiece('king', 'enemy');
  placePiece(state, 'f1', rook);
  placePiece(state, 'h1', king);
  placePiece(state, 'a8', eking);
  // No tile set at f5 — defaults to null

  state.play({ kind: 'move', source: 'f1', targets: ['f5'], piece: rook });

  const movedPiece = getPiece(state, 'f5');
  expect(movedPiece.tags.has('wounded')).toBe(false);
});
