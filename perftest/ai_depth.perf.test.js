/**
 * PP — AI depth performance harness
 *
 * 5 reference positions × depth-3 (gated < 1000 ms) + depth-4 (logged only).
 * Log format: [perf] pos=%d depth=%d ms=%d nodes=%d
 *
 * Positions:
 *   1. Standard opening  — all pieces on starting squares, player turn
 *   2. Open midgame      — queens off, a few pieces each side, 3 pawns each
 *   3. Endgame           — 2 pawns + king each side
 *   4. Tactical          — attacker can win a piece in 1 move (depth-2 finds it)
 *   5. King-hunt         — enemy king exposed, player has queen+rook
 */

import { describe, test, expect } from 'vitest';
import { GameState } from '../js/engine2/state.js';
import { makePiece } from '../js/engine2/pieces.js';
import { set } from '../js/engine2/board.js';
import { selectAction } from '../js/ai2/search.js';

// ─── helper ───────────────────────────────────────────────────────────────────

/**
 * Build a GameState from piece placements.
 * @param {Array<{sq, type, owner}>} placements
 * @param {object} opts - { turn?, castling? }
 */
function makeState(placements, opts = {}) {
  const state = new GameState();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      state.board[r][c] = null;

  for (const { sq, type, owner } of placements)
    set(state.board, sq, makePiece(type, owner));

  state.turn = opts.turn ?? 'player';
  state.castling = {
    wK: false, wQ: false, bK: false, bQ: false,
    ...(opts.castling ?? {}),
  };
  return state;
}

/**
 * Run selectAction at a given depth, return { action, ms }.
 * Passes timeMs=60000 so the time budget never cuts off the search.
 */
function timedSearch(state, owner, depth) {
  const start = Date.now();
  const action = selectAction(state, owner, { depth, timeMs: 60_000 });
  const ms = Date.now() - start;
  return { action, ms };
}

// ─── position definitions ─────────────────────────────────────────────────────

/** 1. Standard opening — all pieces on starting squares, enemy to move. */
const POS_1 = [
  { sq: 'a1', type: 'rook',   owner: 'player' },
  { sq: 'b1', type: 'knight', owner: 'player' },
  { sq: 'c1', type: 'bishop', owner: 'player' },
  { sq: 'd1', type: 'queen',  owner: 'player' },
  { sq: 'e1', type: 'king',   owner: 'player' },
  { sq: 'f1', type: 'bishop', owner: 'player' },
  { sq: 'g1', type: 'knight', owner: 'player' },
  { sq: 'h1', type: 'rook',   owner: 'player' },
  { sq: 'a2', type: 'pawn',   owner: 'player' },
  { sq: 'b2', type: 'pawn',   owner: 'player' },
  { sq: 'c2', type: 'pawn',   owner: 'player' },
  { sq: 'd2', type: 'pawn',   owner: 'player' },
  { sq: 'e2', type: 'pawn',   owner: 'player' },
  { sq: 'f2', type: 'pawn',   owner: 'player' },
  { sq: 'g2', type: 'pawn',   owner: 'player' },
  { sq: 'h2', type: 'pawn',   owner: 'player' },
  { sq: 'a8', type: 'rook',   owner: 'enemy' },
  { sq: 'b8', type: 'knight', owner: 'enemy' },
  { sq: 'c8', type: 'bishop', owner: 'enemy' },
  { sq: 'd8', type: 'queen',  owner: 'enemy' },
  { sq: 'e8', type: 'king',   owner: 'enemy' },
  { sq: 'f8', type: 'bishop', owner: 'enemy' },
  { sq: 'g8', type: 'knight', owner: 'enemy' },
  { sq: 'h8', type: 'rook',   owner: 'enemy' },
  { sq: 'a7', type: 'pawn',   owner: 'enemy' },
  { sq: 'b7', type: 'pawn',   owner: 'enemy' },
  { sq: 'c7', type: 'pawn',   owner: 'enemy' },
  { sq: 'd7', type: 'pawn',   owner: 'enemy' },
  { sq: 'e7', type: 'pawn',   owner: 'enemy' },
  { sq: 'f7', type: 'pawn',   owner: 'enemy' },
  { sq: 'g7', type: 'pawn',   owner: 'enemy' },
  { sq: 'h7', type: 'pawn',   owner: 'enemy' },
];

/**
 * 2. Open midgame — queens traded off, 3 pawns each side, a few minor pieces.
 *    Rooks still present, open files, active position.
 */
const POS_2 = [
  { sq: 'e1', type: 'king',   owner: 'player' },
  { sq: 'a1', type: 'rook',   owner: 'player' },
  { sq: 'h1', type: 'rook',   owner: 'player' },
  { sq: 'c3', type: 'knight', owner: 'player' },
  { sq: 'f3', type: 'knight', owner: 'player' },
  { sq: 'e4', type: 'pawn',   owner: 'player' },
  { sq: 'c4', type: 'pawn',   owner: 'player' },
  { sq: 'g2', type: 'pawn',   owner: 'player' },

  { sq: 'e8', type: 'king',   owner: 'enemy' },
  { sq: 'a8', type: 'rook',   owner: 'enemy' },
  { sq: 'h8', type: 'rook',   owner: 'enemy' },
  { sq: 'c6', type: 'knight', owner: 'enemy' },
  { sq: 'f6', type: 'knight', owner: 'enemy' },
  { sq: 'e5', type: 'pawn',   owner: 'enemy' },
  { sq: 'c5', type: 'pawn',   owner: 'enemy' },
  { sq: 'g7', type: 'pawn',   owner: 'enemy' },
];

/**
 * 3. Endgame — 2 pawns + king each side.
 *    Adaptive depth kicks in (≤7 pieces → depth+1, ≤4 → depth+2).
 */
const POS_3 = [
  { sq: 'e1', type: 'king',   owner: 'player' },
  { sq: 'd4', type: 'pawn',   owner: 'player' },
  { sq: 'f4', type: 'pawn',   owner: 'player' },

  { sq: 'e8', type: 'king',   owner: 'enemy' },
  { sq: 'd5', type: 'pawn',   owner: 'enemy' },
  { sq: 'f5', type: 'pawn',   owner: 'enemy' },
];

/**
 * 4. Tactical — attacker (enemy) can win player's undefended rook in 1 move.
 *    Depth-2 must find it.
 */
const POS_4 = [
  { sq: 'e1', type: 'king',   owner: 'player' },
  { sq: 'h4', type: 'rook',   owner: 'player' },
  { sq: 'd3', type: 'pawn',   owner: 'player' },

  { sq: 'e8', type: 'king',   owner: 'enemy' },
  { sq: 'h8', type: 'rook',   owner: 'enemy' }, // can capture h4 rook
  { sq: 'b6', type: 'bishop', owner: 'enemy' },
];

/**
 * 5. King-hunt — enemy king is exposed, player has queen+rook for a mating attack.
 */
const POS_5 = [
  { sq: 'e1', type: 'king',   owner: 'player' },
  { sq: 'd1', type: 'queen',  owner: 'player' },
  { sq: 'a1', type: 'rook',   owner: 'player' },
  { sq: 'e4', type: 'pawn',   owner: 'player' },

  { sq: 'e6', type: 'king',   owner: 'enemy' }, // exposed king in centre
  { sq: 'f8', type: 'rook',   owner: 'enemy' },
  { sq: 'b5', type: 'pawn',   owner: 'enemy' },
];

// ─── tests ────────────────────────────────────────────────────────────────────

const GATE_MS = 1000;

const POSITIONS = [
  { id: 1, label: 'standard opening',   placements: POS_1, owner: 'enemy',  castling: { wK: true, wQ: true, bK: true, bQ: true } },
  { id: 2, label: 'open midgame',       placements: POS_2, owner: 'enemy' },
  { id: 3, label: 'endgame',            placements: POS_3, owner: 'enemy' },
  { id: 4, label: 'tactical',           placements: POS_4, owner: 'enemy' },
  { id: 5, label: 'king-hunt',          placements: POS_5, owner: 'player' },
];

describe('AI depth performance', () => {
  for (const pos of POSITIONS) {
    test(`pos ${pos.id} (${pos.label}) depth-3 < ${GATE_MS} ms`, () => {
      const state = makeState(pos.placements, { castling: pos.castling });
      const { action, ms } = timedSearch(state, pos.owner, 3);

      console.log('[perf] pos=%d depth=%d ms=%d', pos.id, 3, ms);
      expect(action, `pos ${pos.id}: selectAction returned null`).not.toBeNull();
      expect(ms, `pos ${pos.id}: depth-3 exceeded ${GATE_MS} ms (got ${ms} ms)`).toBeLessThan(GATE_MS);
    });
  }

  // Depth-4: run and log, no gate (informational only)
  for (const pos of POSITIONS) {
    test(`pos ${pos.id} (${pos.label}) depth-4 (log only)`, { timeout: 60_000 }, () => {
      const state = makeState(pos.placements, { castling: pos.castling });
      const { action, ms } = timedSearch(state, pos.owner, 4);

      console.log('[perf] pos=%d depth=%d ms=%d', pos.id, 4, ms);
      expect(action, `pos ${pos.id}: selectAction returned null at depth-4`).not.toBeNull();
    });
  }
});
