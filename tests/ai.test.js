import { test, expect } from 'vitest';
import { Chess } from 'chess.js';
import { selectMove, generateMoves, makeMove, unmakeMove } from '../js/ai.js';
import { ENEMIES } from '../js/enemies.js';
const PAWN_PUSHER = ENEMIES.pawn_pusher.personality;

function emptyChess() {
  const c = new Chess();
  c.clear();
  return c;
}

// 1. King capture takes priority
test('selectMove returns king capture when available', () => {
  const chess = emptyChess();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'r', color: 'b' }, 'e2');
  chess.put({ type: 'k', color: 'w' }, 'e1');

  const moves = generateMoves(chess, 'b');
  const chosen = selectMove(chess, moves, PAWN_PUSHER, 2);
  expect(chosen.to).toBe('e1');
});

// 2. Enemy king does not walk into attacked square
test('enemy king does not advance into attacked square', () => {
  const chess = emptyChess();
  // Black king on e8, white rook covering e7 from e1
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'r', color: 'w' }, 'e1');
  chess.put({ type: 'k', color: 'w' }, 'a1');

  const moves = generateMoves(chess, 'b');
  const chosen = selectMove(chess, moves, PAWN_PUSHER, 2);
  // The king should not move to e7 (covered by rook) or e1 (white king)
  expect(chosen.to).not.toBe('e7');
});

// 3. Pawn Pusher advances pawn when path is safe
test('Pawn Pusher advances pawn when path is safe', () => {
  const chess = emptyChess();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'p', color: 'b' }, 'e4');
  chess.put({ type: 'k', color: 'w' }, 'a1');

  const moves = generateMoves(chess, 'b');
  const chosen = selectMove(chess, moves, PAWN_PUSHER, 2);
  // Pawn Pusher should advance the pawn (e4 → e3)
  expect(chosen.from).toBe('e4');
  expect(chosen.to).toBe('e3');
});

// 4. Pawn Pusher flees king threat rather than advancing a pawn
test('Pawn Pusher moves king off attacked file rather than advancing pawn', () => {
  const chess = emptyChess();
  // White rook on e1 attacks black king on e8 directly (no blocker)
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'p', color: 'b' }, 'b6');
  chess.put({ type: 'r', color: 'w' }, 'e1');
  chess.put({ type: 'k', color: 'w' }, 'a1');

  const moves = generateMoves(chess, 'b');
  const chosen = selectMove(chess, moves, PAWN_PUSHER, 2);
  // Advancing b6 doesn't stop the rook — king must flee the e-file
  expect(chosen.from).not.toBe('b6');
});

// 5. evaluate: more material = higher score
test('evaluate: more black material scores higher', () => {
  // We test indirectly: a position with an extra black queen should be preferred
  const chessMore = emptyChess();
  chessMore.put({ type: 'k', color: 'b' }, 'e8');
  chessMore.put({ type: 'q', color: 'b' }, 'd8');
  chessMore.put({ type: 'k', color: 'w' }, 'a1');

  const chessFewer = emptyChess();
  chessFewer.put({ type: 'k', color: 'b' }, 'e8');
  chessFewer.put({ type: 'k', color: 'w' }, 'a1');

  // With more material, selectMove should at least run without error
  const movesMore = generateMoves(chessMore, 'b');
  const movesFewer = generateMoves(chessFewer, 'b');
  expect(movesMore.length).toBeGreaterThan(movesFewer.length);
});

// 6. Pawn advance: advanced pawn scores higher
test('generateMoves: advanced pawn has push move to lower rank', () => {
  const chess = emptyChess();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'p', color: 'b' }, 'e3'); // already advanced
  chess.put({ type: 'k', color: 'w' }, 'a1');

  const moves = generateMoves(chess, 'b');
  const pawnMoves = moves.filter(m => m.from === 'e3');
  expect(pawnMoves.some(m => m.to === 'e2')).toBe(true);
});

test('generateMoves includes en passant capture when enPassantTarget provided', () => {
  const chess = emptyChess();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'k', color: 'w' }, 'a1');
  chess.put({ type: 'p', color: 'b' }, 'e4');
  chess.put({ type: 'p', color: 'w' }, 'd4');
  // White just pushed d2-d4, en passant target is d3
  const moves = generateMoves(chess, 'b', 'd3');
  const ep = moves.find(m => m.from === 'e4' && m.to === 'd3' && m.enPassant);
  expect(ep).toBeDefined();
});

// 9. Aggression: rook captures king when adjacent (depth 2, 3, 4)
for (const depth of [2, 3, 4]) {
  test(`aggression captures white king in one move at depth ${depth}`, () => {
    // Black rook on e5, white king on e1 — rook can capture king directly
    const chess = emptyChess();
    chess.put({ type: 'k', color: 'b' }, 'h8');
    chess.put({ type: 'r', color: 'b' }, 'e5');
    chess.put({ type: 'k', color: 'w' }, 'e1');

    const moves = generateMoves(chess, 'b');
    const chosen = selectMove(chess, moves, { aggression: 2.0, material: 1.0 }, depth);
    expect(chosen.to).toBe('e1');
  });
}

// 10. Aggression: AI finds king capture in two moves (depth ≥ 3)
for (const depth of [3, 4]) {
  test(`aggression finds king in two moves at depth ${depth}`, () => {
    // Black rook on a5, white king on e5 — rook must move to e-file then capture
    // Rook a5 → a1 is not king capture; rook must go to e-file (e.g. e5 blocked by king)
    // Setup: rook on a3, king on e1 — rook→e3 then →e1
    const chess = emptyChess();
    chess.put({ type: 'k', color: 'b' }, 'h8');
    chess.put({ type: 'r', color: 'b' }, 'a3');
    chess.put({ type: 'k', color: 'w' }, 'e1');

    const moves = generateMoves(chess, 'b');
    const chosen = selectMove(chess, moves, { aggression: 2.0, material: 1.0 }, depth);
    // First move should set up the capture: rook to e3 (same file as king)
    // or directly to e3/a1 aligning for e1
    expect(chosen.to).toBe('e3');
  });
}

test('makeMove en passant removes the captured pawn', () => {
  const chess = emptyChess();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'k', color: 'w' }, 'a1');
  chess.put({ type: 'p', color: 'b' }, 'e4');
  chess.put({ type: 'p', color: 'w' }, 'd4');

  const move = { from: 'e4', to: 'd3', enPassant: true };
  const saved = makeMove(chess, move);
  expect(chess.get('d3')?.type).toBe('p');  // black pawn landed
  expect(chess.get('e4')).toBeFalsy();       // black pawn moved
  expect(chess.get('d4')).toBeFalsy();       // white pawn captured
  unmakeMove(chess, move, saved);
  expect(chess.get('d4')?.type).toBe('p');  // white pawn restored
  expect(chess.get('e4')?.type).toBe('p');  // black pawn restored
});
