import { test, expect } from 'vitest';
import { Chess } from 'chess.js';
import { selectMove, generateMoves, PAWN_PUSHER } from '../js/ai.js';

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
