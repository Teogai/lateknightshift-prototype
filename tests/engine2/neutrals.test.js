/**
 * tests/engine2/neutrals.test.js
 * P6 — Neutral pieces + duck
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { generateLegalActions, canCapture } from '../../js/engine2/movegen.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function place(state, sq, piece) {
  const [r, c] = sqRC(sq);
  state.board[r][c] = piece;
}

function sqRC(sq) {
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1]);
  return [row, col];
}

function pieceAt(state, sq) {
  const [r, c] = sqRC(sq);
  return state.board[r][c];
}

// ─── duck piece type ───────────────────────────────────────────────────────────

describe('duck piece type', () => {
  it('makePiece accepts owner neutral', () => {
    const duck = makePiece('duck', 'neutral');
    expect(duck.owner).toBe('neutral');
    expect(duck.type).toBe('duck');
    expect(duck.tags).toBeInstanceOf(Set);
  });

  it('duck has uncapturable tag by default', () => {
    const duck = makePiece('duck', 'neutral');
    expect(duck.tags.has('uncapturable')).toBe(true);
  });

  it('duck generates no moves', () => {
    const state = new GameState();
    const duck = makePiece('duck', 'neutral');
    place(state, 'd4', duck);
    state.turn = 'neutral';

    const actions = generateLegalActions(state, 'neutral');
    expect(actions).toHaveLength(0);
  });
});

// ─── duck blocks king movement ─────────────────────────────────────────────────

describe('duck blocks king movement', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  it("king cannot move onto duck's square", () => {
    const king = makePiece('king', 'player');
    const duck = makePiece('duck', 'neutral');
    const enemyKing = makePiece('king', 'enemy');

    place(state, 'e1', king);
    place(state, 'e2', duck);     // duck directly in front of king
    place(state, 'e8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    const toE2 = actions.filter(a => a.targets[0] === 'e2');
    expect(toE2).toHaveLength(0);
  });

  it("king can move to adjacent squares not occupied by duck", () => {
    const king = makePiece('king', 'player');
    const duck = makePiece('duck', 'neutral');
    const enemyKing = makePiece('king', 'enemy');

    place(state, 'e1', king);
    place(state, 'e2', duck);
    place(state, 'e8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    // King at e1 can move to d1, d2, f1, f2 (e2 blocked by duck)
    const toD1 = actions.filter(a => a.targets[0] === 'd1');
    const toF1 = actions.filter(a => a.targets[0] === 'f1');
    expect(toD1.length + toF1.length).toBeGreaterThan(0);
  });
});

// ─── duck blocks bishop line of sight ─────────────────────────────────────────

describe('duck blocks bishop line of sight', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  it("bishop's diagonal is blocked by duck", () => {
    const bishop = makePiece('bishop', 'player');
    const duck = makePiece('duck', 'neutral');
    const enemyKing = makePiece('king', 'enemy');

    // bishop at c1, duck at e3, target at g5
    // duck blocks the diagonal so bishop cannot reach g5 or beyond
    place(state, 'c1', bishop);
    place(state, 'e3', duck);
    place(state, 'h8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    const toG5 = actions.filter(a => a.source === 'c1' && a.targets[0] === 'g5');
    expect(toG5).toHaveLength(0);

    // Bishop also cannot capture duck (uncapturable)
    const toE3 = actions.filter(a => a.source === 'c1' && a.targets[0] === 'e3');
    expect(toE3).toHaveLength(0);
  });

  it("bishop can still move up to but not past duck", () => {
    const bishop = makePiece('bishop', 'player');
    const duck = makePiece('duck', 'neutral');
    const enemyKing = makePiece('king', 'enemy');

    place(state, 'c1', bishop);
    place(state, 'e3', duck);
    place(state, 'h8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    // d2 is between c1 and e3 — should be reachable
    const toD2 = actions.filter(a => a.source === 'c1' && a.targets[0] === 'd2');
    expect(toD2).toHaveLength(1);
  });
});

// ─── attempt to capture duck fails ────────────────────────────────────────────

describe('attempt to capture duck fails', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  it('capturing duck leaves board unchanged', () => {
    const attacker = makePiece('rook', 'player');
    const duck = makePiece('duck', 'neutral');
    const enemyKing = makePiece('king', 'enemy');

    place(state, 'a1', attacker);
    place(state, 'a5', duck);
    place(state, 'h8', enemyKing);

    // Force a capture action directly (bypassing movegen since duck is uncapturable)
    const action = {
      kind: 'move',
      source: 'a1',
      targets: ['a5'],
      piece: attacker,
      capture: duck,
    };

    state.play(action);

    // duck should still be at a5
    const duckAfter = pieceAt(state, 'a5');
    expect(duckAfter).not.toBeNull();
    expect(duckAfter.id).toBe(duck.id);

    // attacker should still be at a1 (action cancelled)
    const attackerAfter = pieceAt(state, 'a1');
    expect(attackerAfter).not.toBeNull();
    expect(attackerAfter.id).toBe(attacker.id);
  });
});

// ─── owner filter: actions targeting opponent don't include neutrals ───────────

describe('owner filter: neutrals not targeted as opponents', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  it('player actions do not include moves that target neutral pieces (movegen excludes them)', () => {
    const rook = makePiece('rook', 'player');
    const duck = makePiece('duck', 'neutral');
    const enemyKing = makePiece('king', 'enemy');

    place(state, 'a1', rook);
    place(state, 'a5', duck);
    place(state, 'h8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    // No action should target a5 (the duck's square)
    const toA5 = actions.filter(a => a.source === 'a1' && a.targets[0] === 'a5');
    expect(toA5).toHaveLength(0);
  });

  it('enemy actions do not include moves that target neutral pieces', () => {
    const duck = makePiece('duck', 'neutral');
    const enemyRook = makePiece('rook', 'enemy');
    const playerKing = makePiece('king', 'player');

    place(state, 'h8', enemyRook);
    place(state, 'h4', duck);
    place(state, 'a1', playerKing);
    state.turn = 'enemy';

    const actions = generateLegalActions(state, 'enemy');
    const toH4 = actions.filter(a => a.source === 'h8' && a.targets[0] === 'h4');
    expect(toH4).toHaveLength(0);
  });
});

// ─── canCapture helper ────────────────────────────────────────────────────────

describe('canCapture', () => {
  it('returns false for uncapturable target', () => {
    const attacker = makePiece('rook', 'player');
    const duck = makePiece('duck', 'neutral');
    expect(canCapture(attacker, duck)).toBe(false);
  });

  it('returns false for same-owner target', () => {
    const rook = makePiece('rook', 'player');
    const pawn = makePiece('pawn', 'player');
    expect(canCapture(rook, pawn)).toBe(false);
  });

  it('returns true for enemy target without uncapturable tag', () => {
    const attacker = makePiece('rook', 'player');
    const target = makePiece('king', 'enemy');
    expect(canCapture(attacker, target)).toBe(true);
  });

  it('returns true for neutral target without uncapturable tag', () => {
    const attacker = makePiece('rook', 'player');
    const neutralPawn = makePiece('pawn', 'neutral'); // neutral but not uncapturable
    expect(canCapture(attacker, neutralPawn)).toBe(true);
  });
});
