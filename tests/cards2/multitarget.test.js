import { describe, test, expect } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { set, get, sqToRC, rcToSq } from '../../js/engine2/board.js';
import { attachEffect } from '../../js/engine2/effects.js';
import { explodeEffect } from '../../js/engine2/effect_types/explode.js';
import { aoeCard } from '../../js/cards2/aoe_card.js';
import { lineCard } from '../../js/cards2/line_card.js';

function clearBoard(state) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state.board[r][c] = null;
}

// ─── aoeCard tests ────────────────────────────────────────────────────────────

describe('aoeCard', () => {
  test('resolves all 8 neighbors around interior center', () => {
    const state = new GameState();
    clearBoard(state);
    attachEffect(state, 'global', explodeEffect);

    // Place a piece at center e4 (acts as the "source" that explodes)
    set(state.board, 'e4', makePiece('rook', 'player', { id: 'src' }));

    // Fill all 8 neighbors around e4 with enemy pieces
    const neighbors = ['d5','e5','f5','d4','f4','d3','e3','f3'];
    for (const sq of neighbors) {
      set(state.board, sq, makePiece('pawn', 'enemy', { id: sq }));
    }

    const card = aoeCard({ radius: 1 });
    const action = card.play(state, 'e4', 'e4');
    expect(action).not.toBeNull();
    state.play(action);

    // All 8 neighbors should be cleared
    for (const sq of neighbors) {
      expect(get(state.board, sq)).toBeNull();
    }
  });

  test('resolves fewer squares at board edge (corner e.g. a1)', () => {
    const state = new GameState();
    clearBoard(state);
    attachEffect(state, 'global', explodeEffect);

    set(state.board, 'a1', makePiece('rook', 'player', { id: 'src' }));
    // Fill the 3 in-bounds neighbors of a1: a2, b1, b2
    set(state.board, 'a2', makePiece('pawn', 'enemy', { id: 'a2' }));
    set(state.board, 'b1', makePiece('pawn', 'enemy', { id: 'b1' }));
    set(state.board, 'b2', makePiece('pawn', 'enemy', { id: 'b2' }));

    const card = aoeCard({ radius: 1 });
    const action = card.play(state, 'a1', 'a1');
    expect(action).not.toBeNull();
    state.play(action);

    expect(get(state.board, 'a2')).toBeNull();
    expect(get(state.board, 'b1')).toBeNull();
    expect(get(state.board, 'b2')).toBeNull();
  });

  test('targetGenerator yields every non-empty square', () => {
    const state = new GameState();
    clearBoard(state);
    set(state.board, 'c3', makePiece('pawn', 'player', { id: 'p1' }));
    set(state.board, 'f7', makePiece('pawn', 'enemy',  { id: 'p2' }));

    const card = aoeCard({ radius: 1 });
    const targets = [...card.targetGenerator(state, 'c3')];
    // Must include at least c3 and f7 (non-empty squares)
    expect(targets).toContain('c3');
    expect(targets).toContain('f7');
    // Total should equal number of occupied squares (2 in this case)
    expect(targets.length).toBe(2);
  });
});

// ─── lineCard tests ───────────────────────────────────────────────────────────

describe('lineCard', () => {
  test('hits 3 squares in a horizontal line to the right', () => {
    const state = new GameState();
    clearBoard(state);
    set(state.board, 'a4', makePiece('rook', 'player', { id: 'shooter' }));
    set(state.board, 'b4', makePiece('pawn', 'enemy', { id: 't1' }));
    set(state.board, 'c4', makePiece('pawn', 'enemy', { id: 't2' }));
    set(state.board, 'd4', makePiece('pawn', 'enemy', { id: 't3' }));

    const card = lineCard({ length: 3 });
    // targets: [b4, c4, d4] = start b4, direction right, length 3
    const action = card.play(state, 'a4', ['b4', 'c4', 'd4']);
    expect(action).not.toBeNull();
    expect(action.kind).toBe('capture');
    expect(action.targets).toEqual(['b4', 'c4', 'd4']);

    state.play(action);
    expect(get(state.board, 'b4')).toBeNull();
    expect(get(state.board, 'c4')).toBeNull();
    expect(get(state.board, 'd4')).toBeNull();
    // shooter stays
    expect(get(state.board, 'a4').id).toBe('shooter');
  });

  test('undo after line card restores all 3 captured pieces', () => {
    const state = new GameState();
    clearBoard(state);
    set(state.board, 'a4', makePiece('rook', 'player', { id: 'shooter' }));
    set(state.board, 'b4', makePiece('pawn', 'enemy', { id: 't1' }));
    set(state.board, 'c4', makePiece('pawn', 'enemy', { id: 't2' }));
    set(state.board, 'd4', makePiece('pawn', 'enemy', { id: 't3' }));

    const card = lineCard({ length: 3 });
    state.play(card.play(state, 'a4', ['b4', 'c4', 'd4']));

    state.undo();

    expect(get(state.board, 'b4').id).toBe('t1');
    expect(get(state.board, 'c4').id).toBe('t2');
    expect(get(state.board, 'd4').id).toBe('t3');
    expect(get(state.board, 'a4').id).toBe('shooter');
  });

  test('targetGenerator yields only valid 3-square line combos', () => {
    const state = new GameState();
    clearBoard(state);
    // Place a shooter at e4
    set(state.board, 'e4', makePiece('rook', 'player', { id: 'shooter' }));

    const card = lineCard({ length: 3 });
    const lines = [...card.targetGenerator(state, 'e4')];

    // Every line must be exactly `length` squares
    for (const line of lines) {
      expect(Array.isArray(line)).toBe(true);
      expect(line.length).toBe(3);
    }

    // Must NOT be C(64,3) — should be far fewer (8 directions × valid offsets)
    // From e4 with length 3 there are at most 8 directional lines that fit
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(lines.length).toBeGreaterThan(0);

    // A horizontal-right line from f4 should appear: [f4, g4, h4]
    const hasRight = lines.some(l => l[0] === 'f4' && l[1] === 'g4' && l[2] === 'h4');
    expect(hasRight).toBe(true);
  });
});
