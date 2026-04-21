/**
 * P1 — Board + pieces + standard move generation (engine2)
 *
 * Tests cover: coord helpers, piece factory, standard move generation,
 * castling, en passant, promotion legality.
 * King-capture mode: no check/pin restrictions (king may move into danger).
 *
 * Allowed: chess.js import here only (oracle comparison).
 * NOT allowed: chess.js import in engine2/ source files.
 */
import { describe, test, expect } from 'vitest';

// engine2 public API
import { makePiece } from '../../js/engine2/pieces.js';
import { makeBoard, get, set, sqToRC, rcToSq, inBounds } from '../../js/engine2/board.js';
import { generateLegalActions } from '../../js/engine2/movegen.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal State stub from a piece placement map.
 *  placements: [{ sq, type, owner }]
 *  opts: { turn?, enPassant?, castling? }
 *  castling: { wK, wQ, bK, bQ } booleans (default all true)
 */
function makeState(placements, opts = {}) {
  const board = makeBoard();
  const tiles = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (const { sq, type, owner } of placements) {
    set(board, sq, makePiece(type, owner));
  }

  return {
    board,
    tiles,
    turn: opts.turn ?? 'player',
    enPassant: opts.enPassant ?? null,
    castling: {
      wK: opts.castling?.wK ?? true,
      wQ: opts.castling?.wQ ?? true,
      bK: opts.castling?.bK ?? true,
      bQ: opts.castling?.bQ ?? true,
      ...(opts.castling ?? {}),
    },
  };
}

/** All target squares for actions from a given source. */
function targetsFrom(actions, src) {
  return actions
    .filter(a => a.source === src)
    .map(a => a.targets[0]);
}

// ─── coord helpers ────────────────────────────────────────────────────────────

describe('coord helpers', () => {
  test('sqToRC converts algebraic to [row, col]', () => {
    expect(sqToRC('a1')).toEqual([7, 0]);
    expect(sqToRC('h8')).toEqual([0, 7]);
    expect(sqToRC('e4')).toEqual([4, 4]);
  });

  test('rcToSq converts [row, col] to algebraic', () => {
    expect(rcToSq(7, 0)).toBe('a1');
    expect(rcToSq(0, 7)).toBe('h8');
    expect(rcToSq(4, 4)).toBe('e4');
  });

  test('sqToRC / rcToSq round-trip for all squares', () => {
    const files = 'abcdefgh';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = files[c] + (8 - r);
        expect(rcToSq(...sqToRC(sq))).toBe(sq);
      }
    }
  });

  test('inBounds returns true for valid squares', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(7, 7)).toBe(true);
    expect(inBounds(3, 5)).toBe(true);
  });

  test('inBounds returns false for out-of-range', () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, 8)).toBe(false);
    expect(inBounds(8, 8)).toBe(false);
  });
});

// ─── board helpers ────────────────────────────────────────────────────────────

describe('board helpers', () => {
  test('makeBoard returns 8x8 array of nulls', () => {
    const b = makeBoard();
    expect(b).toHaveLength(8);
    expect(b[0]).toHaveLength(8);
    expect(b[0][0]).toBeNull();
  });

  test('set/get round-trip', () => {
    const b = makeBoard();
    const p = makePiece('queen', 'player');
    set(b, 'd4', p);
    expect(get(b, 'd4')).toBe(p);
    expect(get(b, 'e4')).toBeNull();
  });
});

// ─── makePiece ────────────────────────────────────────────────────────────────

describe('makePiece', () => {
  test('creates piece with correct type and owner', () => {
    const p = makePiece('knight', 'player');
    expect(p.type).toBe('knight');
    expect(p.owner).toBe('player');
  });

  test('tags is a Set', () => {
    const p = makePiece('pawn', 'enemy');
    expect(p.tags).toBeInstanceOf(Set);
  });

  test('data is an empty object', () => {
    const p = makePiece('rook', 'enemy');
    expect(typeof p.data).toBe('object');
  });

  test('id is unique per piece', () => {
    const a = makePiece('bishop', 'player');
    const b = makePiece('bishop', 'player');
    expect(a.id).not.toBe(b.id);
  });

  test('overrides merge into piece', () => {
    const p = makePiece('king', 'player', { data: { hp: 5 } });
    expect(p.data.hp).toBe(5);
  });
});

// ─── pawn moves ───────────────────────────────────────────────────────────────

describe('pawn moves', () => {
  test('white pawn on rank 2 can push one or two squares', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e2', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e2');
    expect(dests).toContain('e3');
    expect(dests).toContain('e4');
  });

  test('white pawn on rank 3+ can only push one square', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e3', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e3');
    expect(dests).toContain('e4');
    expect(dests).not.toContain('e5');
  });

  test('white pawn is blocked by piece in front', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e2', type: 'pawn', owner: 'player' },
      { sq: 'e3', type: 'pawn', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e2');
    expect(dests).not.toContain('e3');
    expect(dests).not.toContain('e4');
  });

  test('white pawn double push blocked if intermediate square occupied', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e2', type: 'pawn', owner: 'player' },
      { sq: 'e3', type: 'pawn', owner: 'player' },  // blocker on e3
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e2');
    expect(dests).not.toContain('e4');
  });

  test('white pawn captures diagonally', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e4', type: 'pawn', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
      { sq: 'f5', type: 'pawn', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    expect(dests).toContain('d5');
    expect(dests).toContain('f5');
  });

  test('pawn does not capture empty diagonal', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e4', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    expect(dests).not.toContain('d5');
    expect(dests).not.toContain('f5');
  });

  test('black pawn moves toward rank 1', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e7', type: 'pawn', owner: 'enemy' },
    ], { turn: 'enemy' });
    const actions = generateLegalActions(state, 'enemy');
    const dests = targetsFrom(actions, 'e7');
    expect(dests).toContain('e6');
    expect(dests).toContain('e5');
  });

  test('pawn promotion: white pawn on rank 7 reaching rank 8 generates promotion actions', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const promos = actions.filter(a => a.source === 'd7' && a.targets[0] === 'd8');
    // Should generate 4 promotion actions (q, r, b, n)
    expect(promos.length).toBe(4);
    const kinds = promos.map(a => a.payload?.promotion).sort();
    expect(kinds).toEqual(['bishop', 'knight', 'queen', 'rook']);
  });

  test('pawn promotion via capture also generates 4 actions', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'player' },
      { sq: 'c8', type: 'rook', owner: 'enemy' },  // capturable piece on promo rank
    ]);
    const actions = generateLegalActions(state, 'player');
    const promos = actions.filter(a => a.source === 'd7' && a.targets[0] === 'c8');
    expect(promos.length).toBe(4);
  });
});

// ─── knight moves ─────────────────────────────────────────────────────────────

describe('knight moves', () => {
  test('knight from e4 has up to 8 destinations', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e4', type: 'knight', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    // All 8 knight hops from e4 are in bounds
    expect(dests.sort()).toEqual(['c3', 'c5', 'd2', 'd6', 'f2', 'f6', 'g3', 'g5'].sort());
  });

  test('knight cannot land on own piece', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e4', type: 'knight', owner: 'player' },
      { sq: 'f6', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    expect(dests).not.toContain('f6');
  });

  test('knight can capture enemy', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e4', type: 'knight', owner: 'player' },
      { sq: 'f6', type: 'pawn', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    expect(dests).toContain('f6');
  });
});

// ─── bishop moves ─────────────────────────────────────────────────────────────

describe('bishop moves', () => {
  test('bishop slides diagonally', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'c1', type: 'bishop', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'c1');
    expect(dests).toContain('d2');
    expect(dests).toContain('e3');
    expect(dests).toContain('f4');
    expect(dests).toContain('b2');
    expect(dests).toContain('a3');
  });

  test('bishop is blocked by own piece', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'c1', type: 'bishop', owner: 'player' },
      { sq: 'd2', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'c1');
    expect(dests).not.toContain('d2');
    expect(dests).not.toContain('e3');
  });

  test('bishop captures and stops', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'c1', type: 'bishop', owner: 'player' },
      { sq: 'd2', type: 'pawn', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'c1');
    expect(dests).toContain('d2');
    expect(dests).not.toContain('e3');
  });
});

// ─── rook moves ───────────────────────────────────────────────────────────────

describe('rook moves', () => {
  test('rook slides along rank and file', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a4', type: 'rook', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'a4');
    expect(dests).toContain('a1');
    expect(dests).toContain('a8');
    expect(dests).toContain('h4');
    expect(dests).not.toContain('b5'); // diagonal
  });

  test('rook is blocked by own piece in the same rank', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a4', type: 'rook', owner: 'player' },
      { sq: 'd4', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'a4');
    expect(dests).toContain('b4');
    expect(dests).toContain('c4');
    expect(dests).not.toContain('d4'); // own piece
    expect(dests).not.toContain('e4'); // behind blocker
  });
});

// ─── queen moves ──────────────────────────────────────────────────────────────

describe('queen moves', () => {
  test('queen combines rook and bishop moves', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'queen', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'd4');
    expect(dests).toContain('d8'); // file
    expect(dests).toContain('h4'); // rank
    expect(dests).toContain('a7'); // diagonal
    expect(dests).toContain('g1'); // diagonal
  });
});

// ─── king moves ───────────────────────────────────────────────────────────────

describe('king moves', () => {
  test('king moves one square in any direction', () => {
    const state = makeState([
      { sq: 'e4', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    expect(dests.sort()).toEqual(['d3', 'd4', 'd5', 'e3', 'e5', 'f3', 'f4', 'f5'].sort());
  });

  test('king CAN move into check — king-capture rule, no checkmate', () => {
    // Enemy rook on e8 covers e-file; player king on e4 CAN move to e3/e5
    // because the win condition is king capture, not checkmate
    const state = makeState([
      { sq: 'e4', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a5', type: 'rook', owner: 'enemy' },  // covers rank 5
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    expect(dests).toContain('e5');
    expect(dests).toContain('d5');
    expect(dests).toContain('f5');
  });
});

// ─── castling ─────────────────────────────────────────────────────────────────

describe('castling', () => {
  test('white kingside castling allowed when path clear and rights set', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'h1', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ], { castling: { wK: true, wQ: false, bK: false, bQ: false } });
    const actions = generateLegalActions(state, 'player');
    const castleAction = actions.find(a => a.kind === 'castle' && a.source === 'e1' && a.targets[0] === 'g1');
    expect(castleAction).toBeDefined();
  });

  test('white queenside castling allowed when path clear', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'a1', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ], { castling: { wK: false, wQ: true, bK: false, bQ: false } });
    const actions = generateLegalActions(state, 'player');
    const castleAction = actions.find(a => a.kind === 'castle' && a.source === 'e1' && a.targets[0] === 'c1');
    expect(castleAction).toBeDefined();
  });

  test('castling blocked if piece in between', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'h1', type: 'rook', owner: 'player' },
      { sq: 'f1', type: 'bishop', owner: 'player' },  // blocks kingside
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ], { castling: { wK: true, wQ: false, bK: false, bQ: false } });
    const actions = generateLegalActions(state, 'player');
    const castleAction = actions.find(a => a.kind === 'castle' && a.targets[0] === 'g1');
    expect(castleAction).toBeUndefined();
  });

  test('castling ALLOWED even if king in check — king-capture mode', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'h1', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e5', type: 'rook', owner: 'enemy' },  // attacks white king on e-file
    ], { castling: { wK: true, wQ: false, bK: false, bQ: false } });
    const actions = generateLegalActions(state, 'player');
    const castleAction = actions.find(a => a.kind === 'castle' && a.targets[0] === 'g1');
    expect(castleAction).toBeDefined();
  });

  test('castling ALLOWED even if king passes through attacked square — king-capture mode', () => {
    // f1 is attacked by enemy rook, but king CAN pass through it (kingside)
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'h1', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'f8', type: 'rook', owner: 'enemy' },  // attacks f1
    ], { castling: { wK: true, wQ: false, bK: false, bQ: false } });
    const actions = generateLegalActions(state, 'player');
    const castleAction = actions.find(a => a.kind === 'castle' && a.targets[0] === 'g1');
    expect(castleAction).toBeDefined();
  });

  test('castling rights false: no castling generated', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'h1', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ], { castling: { wK: false, wQ: false, bK: false, bQ: false } });
    const actions = generateLegalActions(state, 'player');
    const castles = actions.filter(a => a.kind === 'castle');
    expect(castles).toHaveLength(0);
  });

  test('black kingside castling', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'h8', type: 'rook', owner: 'enemy' },
    ], { turn: 'enemy', castling: { wK: false, wQ: false, bK: true, bQ: false } });
    const actions = generateLegalActions(state, 'enemy');
    const castleAction = actions.find(a => a.kind === 'castle' && a.source === 'e8' && a.targets[0] === 'g8');
    expect(castleAction).toBeDefined();
  });
});

// ─── en passant ───────────────────────────────────────────────────────────────

describe('en passant', () => {
  test('white pawn captures en passant to the left', () => {
    // Black pawn just pushed d7→d5; ep square is d6
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e5', type: 'pawn', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
    ], { enPassant: 'd6' });
    const actions = generateLegalActions(state, 'player');
    const ep = actions.find(a => a.kind === 'en_passant' && a.source === 'e5' && a.targets[0] === 'd6');
    expect(ep).toBeDefined();
  });

  test('white pawn captures en passant to the right', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd5', type: 'pawn', owner: 'player' },
      { sq: 'e5', type: 'pawn', owner: 'enemy' },
    ], { enPassant: 'e6' });
    const actions = generateLegalActions(state, 'player');
    const ep = actions.find(a => a.kind === 'en_passant' && a.source === 'd5' && a.targets[0] === 'e6');
    expect(ep).toBeDefined();
  });

  test('black pawn captures en passant', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'pawn', owner: 'enemy' },
      { sq: 'e4', type: 'pawn', owner: 'player' },
    ], { turn: 'enemy', enPassant: 'e3' });
    const actions = generateLegalActions(state, 'enemy');
    const ep = actions.find(a => a.kind === 'en_passant' && a.source === 'd4' && a.targets[0] === 'e3');
    expect(ep).toBeDefined();
  });

  test('en passant action has correct payload with captured pawn square', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e5', type: 'pawn', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
    ], { enPassant: 'd6' });
    const actions = generateLegalActions(state, 'player');
    const ep = actions.find(a => a.kind === 'en_passant');
    expect(ep).toBeDefined();
    expect(ep.payload?.captured).toBe('d5');
  });
});

// ─── pinned pieces (king-capture mode: no pin restrictions) ───────────────────

describe('pinned pieces — king-capture mode', () => {
  test('absolutely pinned piece CAN move off pin ray', () => {
    // White king e1, white rook e4, enemy rook e8.
    // In king-capture mode, the rook can move anywhere (king may be captured)
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e4', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e7', type: 'rook', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    // Rook can move to non-e-file squares (e.g., a4, h4)
    expect(dests.some(d => d[0] !== 'e')).toBe(true);
  });

  test('diagonally pinned piece CAN move off diagonal', () => {
    // King a1, bishop c3, enemy bishop f6.
    // In king-capture mode, bishop can leave the diagonal
    const state = makeState([
      { sq: 'a1', type: 'king', owner: 'player' },
      { sq: 'c3', type: 'bishop', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'f6', type: 'bishop', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'c3');
    // Bishop can move to squares off the a1-h8 diagonal
    const offDiagonal = dests.some(d => {
      const [r, c] = sqToRC(d);
      const [kr, kc] = sqToRC('a1');
      return Math.abs(r - kr) !== Math.abs(c - kc);
    });
    expect(offDiagonal).toBe(true);
  });

  test('pinned knight CAN move', () => {
    // In king-capture mode, even a "pinned" knight can move
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e4', type: 'knight', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e6', type: 'rook', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const dests = targetsFrom(actions, 'e4');
    expect(dests.length).toBeGreaterThan(0);
  });
});

// ─── check escape (king-capture mode: no check restriction) ───────────────────

describe('king-capture mode — no check restriction', () => {
  test('king CAN move into apparent check', () => {
    // Enemy rook on e5 covers e-file; player king on e1 CAN move to e2
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e5', type: 'rook', owner: 'enemy' },
      { sq: 'h8', type: 'king', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const kingDests = targetsFrom(actions, 'e1');
    expect(kingDests).toContain('e2');
  });

  test('other pieces CAN move even if king is threatened', () => {
    // Enemy rook on e8 checks player king on e1;
    // player rook on d5 can still move anywhere, not just block
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'd5', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'rook', owner: 'enemy' },
      { sq: 'h8', type: 'king', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const blockDests = targetsFrom(actions, 'd5');
    // d5 rook can still move to non-blocking squares (e.g., d1, d8)
    expect(blockDests).toContain('e5');
    expect(blockDests.some(d => d[0] !== 'e' && d[1] !== '5')).toBe(true);
  });

  test('double threat: all pieces can still move', () => {
    // Two attackers — in king-capture mode, all pieces can still move
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'a2', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'rook', owner: 'enemy' },
      { sq: 'b4', type: 'bishop', owner: 'enemy' },
      { sq: 'h8', type: 'king', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    // Player rook can still move
    expect(actions.some(a => a.piece.type === 'rook')).toBe(true);
  });
});

// ─── action structure ─────────────────────────────────────────────────────────

describe('action structure', () => {
  test('move action has correct fields', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'b1', type: 'knight', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const knightMove = actions.find(a => a.source === 'b1');
    expect(knightMove).toBeDefined();
    expect(knightMove.kind).toBe('move');
    expect(Array.isArray(knightMove.targets)).toBe(true);
    expect(knightMove.targets.length).toBeGreaterThan(0);
    expect(knightMove.piece).toBeDefined();
    expect(knightMove.piece.type).toBe('knight');
  });

  test('capture action includes capture field', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e4', type: 'rook', owner: 'player' },
      { sq: 'e7', type: 'rook', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const capture = actions.find(a => a.source === 'e4' && a.targets[0] === 'e7');
    expect(capture).toBeDefined();
    expect(capture.capture).toBeDefined();
    expect(capture.capture.type).toBe('rook');
  });

  test('generateLegalActions returns only actions for the given owner', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a8', type: 'rook', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    for (const a of actions) {
      expect(a.piece.owner).toBe('player');
    }
  });

  test('neutral owner pieces do not appear in player or enemy actions', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'neutral' },
    ]);
    const playerActions = generateLegalActions(state, 'player');
    const enemyActions = generateLegalActions(state, 'enemy');
    for (const a of [...playerActions, ...enemyActions]) {
      expect(a.piece.owner).not.toBe('neutral');
    }
  });
});
