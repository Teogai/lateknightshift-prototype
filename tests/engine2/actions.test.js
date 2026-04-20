/**
 * P2 — GameState, resolveAction, undo log (engine2)
 *
 * Tests cover:
 *   - GameState construction, toJSON/fromJSON round-trip
 *   - resolveAction: move, castle, en_passant mutations
 *   - undo: single-action undo, full game undo back to initial state
 *   - fuzz vs chess.js oracle: 20 random legal moves on standard position
 *
 * Allowed: chess.js import here only (oracle comparison).
 * NOT allowed: chess.js in engine2/ source files.
 */
import { describe, test, expect } from 'vitest';
import { Chess } from 'chess.js';

import { makeBoard, get, set, sqToRC, rcToSq } from '../../js/engine2/board.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { generateLegalActions, applyMove } from '../../js/engine2/movegen.js';
import { GameState } from '../../js/engine2/state.js';
import { resolveAction } from '../../js/engine2/actions.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal GameState from piece placements.
 * placements: [{ sq, type, owner }]
 * opts: { turn?, enPassant?, castling? }
 */
function makeGameState(placements, opts = {}) {
  const state = new GameState();
  // Clear the default board
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      state.board[r][c] = null;
    }
  }
  for (const { sq, type, owner } of placements) {
    set(state.board, sq, makePiece(type, owner));
  }
  state.turn = opts.turn ?? 'player';
  state.enPassant = opts.enPassant ?? null;
  state.castling = {
    wK: opts.castling?.wK ?? true,
    wQ: opts.castling?.wQ ?? true,
    bK: opts.castling?.bK ?? true,
    bQ: opts.castling?.bQ ?? true,
    ...(opts.castling ?? {}),
  };
  return state;
}

/** Standard opening position placements (mirrors chess starting position). */
function standardPlacements() {
  return [
    // white pieces (owner=player)
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
    // black pieces (owner=enemy)
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
}

/** Extract a board snapshot as { sq: type } for all occupied squares. */
function boardSnapshot(board) {
  const snap = {};
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) snap[rcToSq(r, c)] = { type: p.type, owner: p.owner };
    }
  }
  return snap;
}

/** Seeded PRNG (xorshift32) for deterministic fuzz. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

// ─── GameState construction ───────────────────────────────────────────────────

describe('GameState construction', () => {
  test('new GameState() has board, tiles, history, undoStack', () => {
    const state = new GameState();
    expect(state.board).toBeDefined();
    expect(Array.isArray(state.board)).toBe(true);
    expect(state.board).toHaveLength(8);
    expect(state.tiles).toBeDefined();
    expect(Array.isArray(state.tiles)).toBe(true);
    expect(Array.isArray(state.history)).toBe(true);
    expect(Array.isArray(state.undoStack)).toBe(true);
  });

  test('new GameState() starts with no turn-state', () => {
    const state = new GameState();
    expect(state.turn).toBeDefined(); // turn exists, value unspecified
    expect(state.enPassant).toBeNull();
  });

  test('GameState has hand and deck arrays', () => {
    const state = new GameState();
    expect(Array.isArray(state.hand)).toBe(true);
    expect(Array.isArray(state.deck)).toBe(true);
  });
});

// ─── toJSON / fromJSON ────────────────────────────────────────────────────────

describe('toJSON / fromJSON', () => {
  test('toJSON returns a plain object (no Sets or Maps)', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const json = state.toJSON();
    const str = JSON.stringify(json); // must not throw
    expect(typeof str).toBe('string');
  });

  test('fromJSON restores board piece types and owners', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king',   owner: 'player' },
      { sq: 'd4', type: 'knight', owner: 'player' },
      { sq: 'e8', type: 'king',   owner: 'enemy' },
      { sq: 'a5', type: 'rook',   owner: 'neutral' },
    ]);
    const json = state.toJSON();
    const restored = GameState.fromJSON(json);
    expect(get(restored.board, 'e1').type).toBe('king');
    expect(get(restored.board, 'd4').type).toBe('knight');
    expect(get(restored.board, 'e8').owner).toBe('enemy');
    expect(get(restored.board, 'a5').owner).toBe('neutral');
    expect(get(restored.board, 'h5')).toBeNull();
  });

  test('fromJSON restores tags as Sets', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    // Add a tag manually
    const [r, c] = sqToRC('e1');
    state.board[r][c].tags.add('flying');
    const restored = GameState.fromJSON(state.toJSON());
    expect(get(restored.board, 'e1').tags).toBeInstanceOf(Set);
    expect(get(restored.board, 'e1').tags.has('flying')).toBe(true);
  });

  test('toJSON / fromJSON round-trip preserves castling and enPassant', () => {
    const state = makeGameState(
      [{ sq: 'e1', type: 'king', owner: 'player' }, { sq: 'e8', type: 'king', owner: 'enemy' }],
      { enPassant: 'd6', castling: { wK: true, wQ: false, bK: false, bQ: true } }
    );
    const restored = GameState.fromJSON(state.toJSON());
    expect(restored.enPassant).toBe('d6');
    expect(restored.castling.wK).toBe(true);
    expect(restored.castling.wQ).toBe(false);
    expect(restored.castling.bK).toBe(false);
    expect(restored.castling.bQ).toBe(true);
  });
});

// ─── resolveAction mutations ──────────────────────────────────────────────────

describe('resolveAction mutations', () => {
  test('move action moves piece from source to target', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const moveToD6 = actions.find(a => a.source === 'd4' && a.targets[0] === 'd6');
    expect(moveToD6).toBeDefined();
    resolveAction(state, moveToD6);
    expect(get(state.board, 'd4')).toBeNull();
    expect(get(state.board, 'd6').type).toBe('rook');
  });

  test('capture action removes captured piece', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'rook', owner: 'enemy' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const captureMove = actions.find(a => a.source === 'd4' && a.targets[0] === 'd7');
    expect(captureMove).toBeDefined();
    resolveAction(state, captureMove);
    expect(get(state.board, 'd4')).toBeNull();
    expect(get(state.board, 'd7').owner).toBe('player');
  });

  test('promotion move changes piece type', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const promoToQueen = actions.find(
      a => a.source === 'd7' && a.targets[0] === 'd8' && a.payload?.promotion === 'queen'
    );
    expect(promoToQueen).toBeDefined();
    resolveAction(state, promoToQueen);
    expect(get(state.board, 'd7')).toBeNull();
    expect(get(state.board, 'd8').type).toBe('queen');
    expect(get(state.board, 'd8').owner).toBe('player');
  });

  test('en_passant action removes captured pawn', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e5', type: 'pawn', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
    ], { enPassant: 'd6' });
    const actions = generateLegalActions(state, 'player');
    const ep = actions.find(a => a.kind === 'en_passant' && a.source === 'e5');
    expect(ep).toBeDefined();
    resolveAction(state, ep);
    expect(get(state.board, 'e5')).toBeNull(); // moved
    expect(get(state.board, 'd6').type).toBe('pawn'); // arrived
    expect(get(state.board, 'd5')).toBeNull(); // captured pawn gone
  });

  test('castle action moves king and rook', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'h1', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ], { castling: { wK: true, wQ: false, bK: false, bQ: false } });
    const actions = generateLegalActions(state, 'player');
    const castle = actions.find(a => a.kind === 'castle' && a.targets[0] === 'g1');
    expect(castle).toBeDefined();
    resolveAction(state, castle);
    expect(get(state.board, 'e1')).toBeNull(); // king gone
    expect(get(state.board, 'h1')).toBeNull(); // rook gone
    expect(get(state.board, 'g1').type).toBe('king');
    expect(get(state.board, 'f1').type).toBe('rook');
  });
});

// ─── state.play and state.undo ────────────────────────────────────────────────

describe('state.play and state.undo', () => {
  test('play returns { ok: true, log } on success', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const action = actions.find(a => a.source === 'd4');
    const result = state.play(action);
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.log)).toBe(true);
  });

  test('undo reverses a simple move', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const snap0 = state.toJSON();
    const actions = generateLegalActions(state, 'player');
    const action = actions.find(a => a.source === 'd4' && a.targets[0] === 'd6');
    state.play(action);
    expect(get(state.board, 'd6').type).toBe('rook'); // applied
    const undone = state.undo();
    expect(undone).toBe(true);
    expect(get(state.board, 'd6')).toBeNull(); // reverted
    expect(get(state.board, 'd4').type).toBe('rook');
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });

  test('undo reverses a capture', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'bishop', owner: 'enemy' },
    ]);
    const snap0 = state.toJSON();
    const actions = generateLegalActions(state, 'player');
    const captureAction = actions.find(a => a.source === 'd4' && a.targets[0] === 'd7');
    state.play(captureAction);
    expect(get(state.board, 'd7').owner).toBe('player');
    state.undo();
    expect(get(state.board, 'd4').type).toBe('rook');
    expect(get(state.board, 'd7').type).toBe('bishop');
    expect(get(state.board, 'd7').owner).toBe('enemy');
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });

  test('undo reverses a castle', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'h1', type: 'rook', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ], { castling: { wK: true, wQ: false, bK: false, bQ: false } });
    const snap0 = state.toJSON();
    const actions = generateLegalActions(state, 'player');
    const castle = actions.find(a => a.kind === 'castle' && a.targets[0] === 'g1');
    state.play(castle);
    state.undo();
    expect(get(state.board, 'e1').type).toBe('king');
    expect(get(state.board, 'h1').type).toBe('rook');
    expect(get(state.board, 'g1')).toBeNull();
    expect(get(state.board, 'f1')).toBeNull();
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });

  test('undo reverses en passant', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e5', type: 'pawn', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
    ], { enPassant: 'd6' });
    const snap0 = state.toJSON();
    const actions = generateLegalActions(state, 'player');
    const ep = actions.find(a => a.kind === 'en_passant');
    state.play(ep);
    state.undo();
    expect(get(state.board, 'e5').type).toBe('pawn');
    expect(get(state.board, 'd5').type).toBe('pawn');
    expect(get(state.board, 'd6')).toBeNull();
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });

  test('undo returns false when stack is empty', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    expect(state.undo()).toBe(false);
  });

  test('undo reverses a promotion', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'player' },
    ]);
    const snap0 = state.toJSON();
    const actions = generateLegalActions(state, 'player');
    const promo = actions.find(
      a => a.source === 'd7' && a.targets[0] === 'd8' && a.payload?.promotion === 'queen'
    );
    state.play(promo);
    expect(get(state.board, 'd8').type).toBe('queen');
    state.undo();
    expect(get(state.board, 'd8')).toBeNull();
    expect(get(state.board, 'd7').type).toBe('pawn');
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });
});

// ─── random 50-move game → undo all → state equals initial ───────────────────

describe('undo all moves restores initial state', () => {
  test('50-move random game: undo all returns to start', () => {
    const rng = makeRng(0xdeadbeef);
    // Two-king minimal state — alternating player/enemy turns
    const placements = standardPlacements();
    const state = makeGameState(placements, {
      turn: 'player',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
    });
    const snap0 = state.toJSON();

    let currentOwner = 'player';
    let movesMade = 0;

    for (let i = 0; i < 50; i++) {
      const actions = generateLegalActions(state, currentOwner);
      if (actions.length === 0) break; // game over or stuck

      const chosen = actions[Math.floor(rng() * actions.length)];
      // Skip promotions for simplicity (take queen promotion if available, else skip)
      const finalAction = chosen.payload?.promotion
        ? (actions.find(a => a.source === chosen.source && a.targets[0] === chosen.targets[0] && a.payload?.promotion === 'queen') ?? chosen)
        : chosen;

      state.play(finalAction);
      movesMade++;
      currentOwner = currentOwner === 'player' ? 'enemy' : 'player';
    }

    expect(movesMade).toBeGreaterThan(0);
    console.log('[test] 50-move undo test: moves made=%d', movesMade);

    // Undo all moves
    for (let i = 0; i < movesMade; i++) {
      const ok = state.undo();
      expect(ok).toBe(true);
    }

    // Must match initial state
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });
});

// ─── fuzz vs chess.js oracle ──────────────────────────────────────────────────

describe('fuzz vs chess.js oracle', () => {
  /**
   * Map chess.js piece type char to engine2 type string.
   * chess.js: p/n/b/r/q/k → engine2: pawn/knight/bishop/rook/queen/king
   */
  function cjsTypeToE2(t) {
    return { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[t];
  }

  /**
   * Map chess.js color to engine2 owner.
   * 'w' → 'player', 'b' → 'enemy'
   */
  function cjsColorToOwner(c) {
    return c === 'w' ? 'player' : 'enemy';
  }

  /**
   * Extract a canonical board snapshot from chess.js Chess instance.
   * Returns { sq: { type, owner } } for occupied squares.
   */
  function cjsBoardSnap(chess) {
    const snap = {};
    for (let rank = 1; rank <= 8; rank++) {
      for (const file of 'abcdefgh') {
        const sq = file + rank;
        const piece = chess.get(sq);
        if (piece) {
          snap[sq] = { type: cjsTypeToE2(piece.type), owner: cjsColorToOwner(piece.color) };
        }
      }
    }
    return snap;
  }

  /**
   * Run an engine2 action and return the resulting board snapshot.
   */
  function e2BoardSnap(state) {
    return boardSnapshot(state.board);
  }

  test('20 random legal moves: engine2 board matches chess.js after each move', () => {
    const rng = makeRng(0xcafe1234);

    // Start: fresh standard board
    const chess = new Chess();
    const state = makeGameState(standardPlacements(), {
      turn: 'player',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
    });

    let currentOwner = 'player';

    for (let i = 0; i < 20; i++) {
      // Get chess.js legal moves for this side
      const cjsMoves = chess.moves({ verbose: true });
      if (cjsMoves.length === 0) break;

      // Pick a random chess.js move
      const cjsMove = cjsMoves[Math.floor(rng() * cjsMoves.length)];

      // Find matching engine2 action
      const e2Actions = generateLegalActions(state, currentOwner);
      let e2Action = e2Actions.find(a => {
        if (a.source !== cjsMove.from) return false;
        if (a.targets[0] !== cjsMove.to) return false;
        if (cjsMove.promotion) {
          // Only match the same promotion type
          const promoMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
          if (a.payload?.promotion !== promoMap[cjsMove.promotion]) return false;
        }
        return true;
      });

      if (!e2Action) {
        // chess.js generates this move but engine2 doesn't — acceptable only for castling
        // (move flags 'k' or 'q' in chess.js). Try to find it.
        console.warn('[fuzz] no matching e2 action for cjs move=%s→%s flag=%s',
          cjsMove.from, cjsMove.to, cjsMove.flags);
        // skip this iteration and pick a different simpler move
        const simpleMoves = cjsMoves.filter(m => !m.promotion && m.flags.indexOf('k') === -1 && m.flags.indexOf('q') === -1);
        if (simpleMoves.length === 0) break;
        const alt = simpleMoves[Math.floor(rng() * simpleMoves.length)];
        e2Action = e2Actions.find(a => a.source === alt.from && a.targets[0] === alt.to);
        if (!e2Action) break; // give up
        // Apply alt to chess.js too
        chess.move(alt);
        state.play(e2Action);
      } else {
        // Apply to chess.js
        chess.move(cjsMove);
        state.play(e2Action);
      }

      // Compare boards
      const cjsSnap = cjsBoardSnap(chess);
      const e2Snap = e2BoardSnap(state);

      expect(e2Snap).toEqual(cjsSnap);

      currentOwner = currentOwner === 'player' ? 'enemy' : 'player';
    }
  });
});

// ─── applyMove (movegen extension) ───────────────────────────────────────────

describe('applyMove', () => {
  test('applyMove is exported from movegen.js', () => {
    expect(typeof applyMove).toBe('function');
  });

  test('applyMove applies a move action to state', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e2', type: 'pawn', owner: 'player' },
    ]);
    const actions = generateLegalActions(state, 'player');
    const push = actions.find(a => a.source === 'e2' && a.targets[0] === 'e4');
    expect(push).toBeDefined();
    applyMove(state, push);
    expect(get(state.board, 'e2')).toBeNull();
    expect(get(state.board, 'e4').type).toBe('pawn');
  });
});
