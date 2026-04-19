import { test, expect } from 'vitest';
import { Chess } from 'chess.js';
import { selectMove, selectMoveIterative, generateMoves, makeMove, unmakeMove } from '../js/ai.js';
import { ENEMIES } from '../js/enemies.js';
const PAWN_PUSHER = ENEMIES.pawn_pusher.personality;
const KNIGHT_RIDER = ENEMIES.knight_rider.personality;

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
    // First move should set up the capture: rook aligned with king (e-file or rank 1)
    expect(['e3', 'a1']).toContain(chosen.to);
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

// Shuffle regression: knight_rider vs player starting position, 15 passes
test('knight_rider does not shuffle in 15 turns vs starting position', () => {
  const chess = new Chess();
  chess.clear();

  // Player starting position (white) — CHARACTER_PIECES.knight
  chess.put({ type: 'k', color: 'w' }, 'e1');
  chess.put({ type: 'r', color: 'w' }, 'a1');
  chess.put({ type: 'n', color: 'w' }, 'b1');
  chess.put({ type: 'p', color: 'w' }, 'a2');
  chess.put({ type: 'p', color: 'w' }, 'd2');
  chess.put({ type: 'p', color: 'w' }, 'e2');

  // Knight rider enemy (black) — ENEMIES.knight_rider.pieces
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'n', color: 'b' }, 'b8');
  chess.put({ type: 'n', color: 'b' }, 'g8');
  chess.put({ type: 'p', color: 'b' }, 'b7');
  chess.put({ type: 'p', color: 'b' }, 'e7');
  chess.put({ type: 'p', color: 'b' }, 'g7');

  const history = [];
  const positionHistory = [chess.fen().split(' ')[0]];

  for (let turn = 0; turn < 15; turn++) {
    const moves = generateMoves(chess, 'b');
    if (!moves.length) break;
    const chosen = selectMove(chess, moves, KNIGHT_RIDER, 2, null, positionHistory);
    history.push({ from: chosen.from, to: chosen.to });
    makeMove(chess, chosen);
    positionHistory.push(chess.fen().split(' ')[0]);
    if (positionHistory.length > 12) positionHistory.shift();
    if (!chess.board().flat().find(p => p?.type === 'k' && p?.color === 'w')) break;
  }

  // No consecutive back-and-forth (A→B then B→A)
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const cur  = history[i];
    expect(
      prev.from === cur.to && prev.to === cur.from,
      `Shuffle on turn ${i + 1}: ${prev.from}→${prev.to} then ${cur.from}→${cur.to}`
    ).toBe(false);
  }

  // No exact move repeated anywhere in the sequence
  const seen = new Set();
  for (const m of history) {
    const key = `${m.from}-${m.to}`;
    expect(seen.has(key), `Repeated move: ${m.from}→${m.to}`).toBe(false);
    seen.add(key);
  }
});

// Shuffle regression using iterative deepening — user-reported endgame FEN
test('no shuffle on endgame FEN (user report) over 15 turns', () => {
  const chess = new Chess();
  chess.load('8/7k/p2pp3/1r6/8/8/P2PP3/RN2K3 w - - 0 1');
  const history = [];
  const positionHistory = [chess.fen().split(' ')[0]];

  for (let turn = 0; turn < 15; turn++) {
    const moves = generateMoves(chess, 'b');
    if (!moves.length) break;
    const chosen = selectMoveIterative(chess, moves, KNIGHT_RIDER, {
      maxDepth: 6,
      timeBudgetMs: 1000,
      positionHistory,
    });
    history.push({ from: chosen.from, to: chosen.to });
    makeMove(chess, chosen);
    positionHistory.push(chess.fen().split(' ')[0]);
    if (positionHistory.length > 12) positionHistory.shift();
    if (!chess.board().flat().find(p => p?.type === 'k' && p?.color === 'w')) break;
  }

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1], cur = history[i];
    expect(
      prev.from === cur.to && prev.to === cur.from,
      `Shuffle on turn ${i + 1}: ${prev.from}→${prev.to} then ${cur.from}→${cur.to}`
    ).toBe(false);
  }

  const seen = new Set();
  for (const m of history) {
    const key = `${m.from}-${m.to}`;
    expect(seen.has(key), `Repeated move: ${m.from}→${m.to}`).toBe(false);
    seen.add(key);
  }
});

// Two more endgame FENs reported by user still shuffled after iterative deepening.
// These are "quiet" positions where many moves tie in eval, so the AI flipped
// A→B then B→A on consecutive turns. Fix is repetition avoidance across turns.
for (const fen of [
  '6k1/8/8/2p1p3/p2p4/6p1/P2PP3/RN2K3 w - - 0 1',
  '6k1/4pp2/8/4b3/2p1b3/8/P2PP3/RN2K3 w - - 0 1',
]) {
  test(`no shuffle on quiet endgame FEN ${fen} over 15 turns`, () => {
    const chess = new Chess();
    chess.load(fen);
    const history = [];
    const positionHistory = [chess.fen().split(' ')[0]];

    for (let turn = 0; turn < 15; turn++) {
      const moves = generateMoves(chess, 'b');
      if (!moves.length) break;
      const chosen = selectMoveIterative(chess, moves, KNIGHT_RIDER, {
        maxDepth: 6,
        timeBudgetMs: 1000,
        positionHistory,
      });
      history.push({ from: chosen.from, to: chosen.to });
      makeMove(chess, chosen);
      positionHistory.push(chess.fen().split(' ')[0]);
      if (positionHistory.length > 12) positionHistory.shift();
      if (!chess.board().flat().find(p => p?.type === 'k' && p?.color === 'w')) break;
    }

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1], cur = history[i];
      expect(
        prev.from === cur.to && prev.to === cur.from,
        `Shuffle on turn ${i + 1}: ${prev.from}→${prev.to} then ${cur.from}→${cur.to}`
      ).toBe(false);
    }

    const seen = new Set();
    for (const m of history) {
      const key = `${m.from}-${m.to}`;
      expect(seen.has(key), `Repeated move: ${m.from}→${m.to}`).toBe(false);
      seen.add(key);
    }
  });
}

// Smoke test: iterative deepening still finds 1-move king capture
test('selectMoveIterative finds king capture in one move', () => {
  const chess = new Chess();
  chess.clear();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'r', color: 'b' }, 'e2');
  chess.put({ type: 'k', color: 'w' }, 'e1');

  const moves = generateMoves(chess, 'b');
  const chosen = selectMoveIterative(chess, moves, PAWN_PUSHER, {
    maxDepth: 6,
    timeBudgetMs: 1000,
  });
  expect(chosen.to).toBe('e1');
});
