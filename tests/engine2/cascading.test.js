/**
 * P4 — Cascading queue (engine2)
 *
 * Tests cover:
 *   - explode effect: place 5 pieces in 3×3, trigger explode at center,
 *     assert 8 captures happen (FIFO cascade queue drains fully)
 *   - on-death push: piece with onCapture effect enqueues push on attacker
 *     — assert attacker pushed 1 square
 *   - infinite-chain guard: two pieces whose on-death push each other;
 *     depth cap (64) fires, game does not hang
 *   - undo after cascade restores state bit-for-bit
 */
import { describe, test, expect } from 'vitest';

import { makeBoard, get, set, sqToRC, rcToSq, inBounds } from '../../js/engine2/board.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { GameState } from '../../js/engine2/state.js';
import { resolveAction } from '../../js/engine2/actions.js';
import { attachEffect } from '../../js/engine2/effects.js';
import { explodeEffect } from '../../js/engine2/effect_types/explode.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeGameState(placements, opts = {}) {
  const state = new GameState();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      state.board[r][c] = null;

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

/** Count all non-null pieces on the board. */
function pieceCount(board) {
  let n = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]) n++;
  return n;
}

// ─── explode: center piece explodes, all 8 neighbors captured ────────────────

describe('explode effect — 3×3 cluster', () => {
  test('exploding piece at center removes all 8 neighbors', () => {
    // Place a center piece with explode payload and 8 neighbors around it.
    // Use e4 as center; surround with enemy pieces at d3,d4,d5,e3,e5,f3,f4,f5.
    // Trigger a move action with payload.explode=true from f6→e4 (player captures center).
    // Actually: center piece IS the one we're moving onto.
    // Design: attaching explodeEffect to the PIECE at center; when it is captured
    // (onCapture on the center piece), enqueue capture of all neighbors.
    //
    // Simpler canonical test from spec:
    // "place 5 pieces in 3×3, trigger explode at center, assert 8 captures happen"
    // We'll put ALL 9 squares occupied, trigger an explode action at center (e4),
    // and verify all neighbors are gone afterward.
    //
    // explodeEffect is a global effect that fires onAction when payload.explode is true.
    // It enqueues {kind:'capture', targets:[neighborSq]} for each of 8 neighbors.

    const placements = [
      // center
      { sq: 'e4', type: 'rook', owner: 'enemy' },
      // 8 neighbors
      { sq: 'd3', type: 'pawn', owner: 'enemy' },
      { sq: 'd4', type: 'pawn', owner: 'enemy' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
      { sq: 'e3', type: 'pawn', owner: 'enemy' },
      { sq: 'e5', type: 'pawn', owner: 'enemy' },
      { sq: 'f3', type: 'pawn', owner: 'enemy' },
      { sq: 'f4', type: 'pawn', owner: 'enemy' },
      { sq: 'f5', type: 'pawn', owner: 'enemy' },
      // kings so state is valid-ish
      { sq: 'a1', type: 'king', owner: 'player' },
      { sq: 'h8', type: 'king', owner: 'enemy' },
    ];

    const state = makeGameState(placements);

    // Attach explode as a global effect
    attachEffect(state, 'global', explodeEffect);

    // Trigger: an action with kind='move' and payload.explode=true targeting e4.
    // The board mutation moves nothing real (source=a1 king to a2, but payload.explode means
    // the cascading system also fires capture on all 8 neighbors of targets[0]).
    // Per spec, explodeEffect fires onAction when payload.explode is set, using targets[0] as center.
    const action = {
      kind: 'move',
      source: 'a1',
      targets: ['e4'],   // center of explosion
      payload: { explode: true },
    };

    const log = [];
    resolveAction(state, action, log);

    // All 8 neighbors should be gone
    for (const sq of ['d3','d4','d5','e3','e5','f3','f4','f5']) {
      expect(get(state.board, sq), `expected ${sq} to be null after explode`).toBeNull();
    }
  });

  test('explode respects board edges (corner piece: only 3 neighbors exist)', () => {
    // Piece at a1 (corner) — only 3 neighbors: a2, b1, b2
    const placements = [
      { sq: 'a1', type: 'rook', owner: 'player' },
      { sq: 'a2', type: 'pawn', owner: 'enemy' },
      { sq: 'b1', type: 'pawn', owner: 'enemy' },
      { sq: 'b2', type: 'pawn', owner: 'enemy' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'e1', type: 'king', owner: 'player' },
    ];
    const state = makeGameState(placements);
    attachEffect(state, 'global', explodeEffect);

    // Move from elsewhere to a1 with explode flag
    const action = {
      kind: 'move',
      source: 'e1',
      targets: ['a1'],
      payload: { explode: true },
    };
    const log = [];
    resolveAction(state, action, log);

    // All in-bounds neighbors of a1 should be gone
    expect(get(state.board, 'a2')).toBeNull();
    expect(get(state.board, 'b1')).toBeNull();
    expect(get(state.board, 'b2')).toBeNull();
  });
});

// ─── on-death push ────────────────────────────────────────────────────────────

describe('on-death push: onCapture enqueues push on attacker', () => {
  test('attacker pushed 1 square away after capturing piece with death-push effect', () => {
    // Setup:
    //   player rook at d4, enemy pawn at d7
    //   enemy pawn has an effect: onCapture → enqueue push action on the attacker
    //   push moves attacker 1 square in a fixed direction (e.g. back toward d4→d3)
    //
    // After: player rook captures d7, pawn's onCapture fires and pushes rook from d7 to d6.

    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'pawn', owner: 'enemy' },
    ]);

    const enemyPawn = get(state.board, 'd7');

    // Attach death-push effect to the enemy pawn:
    // When captured, push the attacker (source of the capturing action) 1 square back.
    attachEffect(state, { piece: enemyPawn.id }, {
      id: 'death_push',
      hooks: {
        onCapture: (ctx) => {
          // Push attacker one rank back (away from enemy side = toward rank 1)
          const attackerSq = ctx.action.source;
          const destSq = ctx.action.targets[0]; // where attacker landed
          // Push the attacker one square toward lower rank (row+1 = rank-1)
          const [r, c] = sqToRC(destSq);
          const pushDest = inBounds(r + 1, c) ? rcToSq(r + 1, c) : null;
          if (pushDest) {
            ctx.enqueue({
              kind: 'move',
              source: destSq,
              targets: [pushDest],
              payload: null,
            });
          }
        },
      },
    });

    // Player rook captures the enemy pawn
    const captureAction = {
      kind: 'move',
      source: 'd4',
      targets: ['d7'],
      payload: null,
    };
    const log = [];
    resolveAction(state, captureAction, log);

    // Rook should have been pushed from d7 to d6 (rank 6 = row 2, rank 7 = row 1, push toward row+1 = rank-1)
    // d7 is rank 7, row=1; row+1=2 → rank=6 → d6
    expect(get(state.board, 'd7')).toBeNull();
    expect(get(state.board, 'd6')).not.toBeNull();
    expect(get(state.board, 'd6').type).toBe('rook');
    expect(get(state.board, 'd6').owner).toBe('player');
  });
});

// ─── depth cap ────────────────────────────────────────────────────────────────

describe('infinite-chain depth cap', () => {
  test('mutual-push loop terminates at depth 64 and does not hang', () => {
    // Two pieces A and B whose onCapture effects push each other indefinitely.
    // Neither is ever actually captured (push moves them), so we set up:
    //   piece A at e4, piece B at e5
    //   effect on A: onCapture → enqueue move B one step (infinite)
    //   effect on B: onCapture → enqueue move A one step (infinite)
    // Instead, we simulate the scenario via a custom effect that enqueues another
    // action that would trigger it again — this tests the depth cap.

    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd5', type: 'rook', owner: 'enemy' },
    ]);

    let callCount = 0;

    // Attach a global effect that, on every capture, enqueues another capture
    // of the same target — this would loop forever without the depth cap.
    attachEffect(state, 'global', {
      id: 'infinite_loop_test',
      hooks: {
        onCapture: (ctx) => {
          callCount++;
          // Re-enqueue the same action to create an infinite loop
          ctx.enqueue({
            kind: 'move',
            source: ctx.action.targets[0],
            targets: [ctx.action.source], // bounce back
            payload: null,
          });
        },
      },
    });

    const initialAction = {
      kind: 'move',
      source: 'd4',
      targets: ['d5'],   // capture enemy rook
      payload: null,
    };

    // Must not hang; depth cap should stop the cascade
    const log = [];
    expect(() => resolveAction(state, initialAction, log)).not.toThrow();

    // callCount should be > 0 (effect did fire) but not infinite
    // With depth cap 64, cascade stops well short of infinite
    expect(callCount).toBeGreaterThan(0);
    expect(callCount).toBeLessThanOrEqual(64);
  });
});

// ─── undo after cascade ───────────────────────────────────────────────────────

describe('undo after cascade restores state bit-for-bit', () => {
  test('undo after explode cascade reverses all captures', () => {
    const placements = [
      { sq: 'e4', type: 'rook',  owner: 'enemy' },
      { sq: 'd3', type: 'pawn',  owner: 'enemy' },
      { sq: 'd4', type: 'pawn',  owner: 'enemy' },
      { sq: 'd5', type: 'pawn',  owner: 'enemy' },
      { sq: 'e3', type: 'pawn',  owner: 'enemy' },
      { sq: 'e5', type: 'pawn',  owner: 'enemy' },
      { sq: 'f3', type: 'pawn',  owner: 'enemy' },
      { sq: 'f4', type: 'pawn',  owner: 'enemy' },
      { sq: 'f5', type: 'pawn',  owner: 'enemy' },
      { sq: 'a1', type: 'king',  owner: 'player' },
      { sq: 'h8', type: 'king',  owner: 'enemy' },
    ];

    const state = makeGameState(placements);
    attachEffect(state, 'global', explodeEffect);

    const snap0 = state.toJSON();

    const action = {
      kind: 'move',
      source: 'a1',
      targets: ['e4'],
      payload: { explode: true },
    };

    // Use state.play so the log is pushed onto undoStack
    state.play(action);

    // After explode: neighbors gone
    for (const sq of ['d3','d4','d5','e3','e5','f3','f4','f5']) {
      expect(get(state.board, sq)).toBeNull();
    }

    // Undo
    const undone = state.undo();
    expect(undone).toBe(true);

    // All pieces must be back
    for (const sq of ['d3','d4','d5','e3','e5','f3','f4','f5']) {
      expect(get(state.board, sq)).not.toBeNull();
    }

    // Full JSON equality
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });
});
