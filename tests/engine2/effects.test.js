/**
 * P3 — Effect lifecycle skeleton (engine2)
 *
 * Tests cover:
 *   - attachEffect / runHook API
 *   - hook firing order: global → source piece → target piece → source tile → target tile
 *   - all lifecycle hooks fire around resolveAction: onBeforeAction, onAction, onCapture, onAfterAction
 *   - effect detaches (not fired) when the piece it's attached to dies (captured)
 *   - effect survives and still fires when its piece moves
 *   - P1/P2 tests unaffected (no regressions)
 */
import { describe, test, expect, beforeEach } from 'vitest';

import { makeBoard, get, set, sqToRC } from '../../js/engine2/board.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { generateLegalActions } from '../../js/engine2/movegen.js';
import { GameState } from '../../js/engine2/state.js';
import { resolveAction } from '../../js/engine2/actions.js';
import { attachEffect, runHook } from '../../js/engine2/effects.js';

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

// ─── attachEffect / runHook basic ─────────────────────────────────────────────

describe('attachEffect and runHook', () => {
  test('attachEffect returns the effect', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const piece = get(state.board, 'e1');
    const effect = { id: 'fx1', hooks: {} };
    const returned = attachEffect(state, { piece: piece.id }, effect);
    expect(returned).toBe(effect);
  });

  test('runHook with no effects does not throw', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const action = { kind: 'move', source: 'e1', targets: ['e2'], payload: null };
    expect(() => runHook(state, 'onBeforeAction', { action })).not.toThrow();
  });

  test('runHook calls global effect hook', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const calls = [];
    const effect = { id: 'global1', hooks: { onBeforeAction: (ctx) => calls.push('global1') } };
    attachEffect(state, 'global', effect);
    const action = { kind: 'move', source: 'e1', targets: ['e2'], payload: null };
    runHook(state, 'onBeforeAction', { action });
    expect(calls).toEqual(['global1']);
  });

  test('runHook calls piece-scoped effect hook', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const piece = get(state.board, 'e1');
    const calls = [];
    const effect = { id: 'pie1', hooks: { onAction: () => calls.push('pie1') } };
    attachEffect(state, { piece: piece.id }, effect);
    const action = { kind: 'move', source: 'e1', targets: ['e2'], payload: null };
    runHook(state, 'onAction', { action });
    expect(calls).toEqual(['pie1']);
  });

  test('runHook calls tile-scoped effect hook', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const calls = [];
    const effect = { id: 'tile1', hooks: { onAction: () => calls.push('tile1') } };
    attachEffect(state, { tile: 'e1' }, effect);
    const action = { kind: 'move', source: 'e1', targets: ['e2'], payload: null };
    runHook(state, 'onAction', { action });
    expect(calls).toEqual(['tile1']);
  });
});

// ─── hook firing order ────────────────────────────────────────────────────────

describe('hook firing order: global → src piece → tgt piece → src tile → tgt tile', () => {
  test('all five scopes fire in correct order', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'rook', owner: 'enemy' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);

    const srcPiece = get(state.board, 'd4');
    const tgtPiece = get(state.board, 'd7');
    const order = [];

    attachEffect(state, 'global',              { id: 'g',    hooks: { onAction: () => order.push('global') } });
    attachEffect(state, { piece: srcPiece.id }, { id: 'sp',   hooks: { onAction: () => order.push('src_piece') } });
    attachEffect(state, { piece: tgtPiece.id }, { id: 'tp',   hooks: { onAction: () => order.push('tgt_piece') } });
    attachEffect(state, { tile: 'd4' },         { id: 'st',   hooks: { onAction: () => order.push('src_tile') } });
    attachEffect(state, { tile: 'd7' },         { id: 'tt',   hooks: { onAction: () => order.push('tgt_tile') } });

    const action = { kind: 'move', source: 'd4', targets: ['d7'], payload: null };
    runHook(state, 'onAction', { action });

    expect(order).toEqual(['global', 'src_piece', 'tgt_piece', 'src_tile', 'tgt_tile']);
  });

  test('missing scopes are silently skipped in order', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);

    const order = [];
    attachEffect(state, 'global', { id: 'g', hooks: { onAction: () => order.push('global') } });
    // no piece/tile effects attached

    const action = { kind: 'move', source: 'e1', targets: ['e2'], payload: null };
    runHook(state, 'onAction', { action });
    expect(order).toEqual(['global']);
  });
});

// ─── lifecycle hooks wired into resolveAction ─────────────────────────────────

describe('lifecycle hooks wired into resolveAction', () => {
  test('onBeforeAction fires before mutation, onAfterAction fires after', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);

    const timeline = [];
    attachEffect(state, 'global', {
      id: 'order_test',
      hooks: {
        onBeforeAction: () => {
          // piece should still be at d4 (mutation not yet applied)
          const p = get(state.board, 'd4');
          timeline.push(p ? 'rook_at_d4_before' : 'no_rook_before');
        },
        onAfterAction: () => {
          // piece should be at d6 (mutation already applied)
          const p = get(state.board, 'd6');
          timeline.push(p ? 'rook_at_d6_after' : 'no_rook_after');
        },
      },
    });

    const action = { kind: 'move', source: 'd4', targets: ['d6'], payload: null };
    const log = [];
    resolveAction(state, action, log);

    expect(timeline).toEqual(['rook_at_d4_before', 'rook_at_d6_after']);
  });

  test('onAction fires after mutation', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);

    const timeline = [];
    attachEffect(state, 'global', {
      id: 'on_action_test',
      hooks: {
        onAction: () => {
          const p = get(state.board, 'd6');
          timeline.push(p ? 'rook_at_d6' : 'no_rook');
        },
      },
    });

    const action = { kind: 'move', source: 'd4', targets: ['d6'], payload: null };
    resolveAction(state, action, []);
    expect(timeline).toEqual(['rook_at_d6']);
  });

  test('onCapture fires on capture move but not plain move', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'rook', owner: 'enemy' },
    ]);

    const captures = [];
    attachEffect(state, 'global', {
      id: 'cap_test',
      hooks: { onCapture: (ctx) => captures.push(ctx.action.targets[0]) },
    });

    // plain move - no capture
    const moveAction = { kind: 'move', source: 'd4', targets: ['d5'], payload: null };
    resolveAction(state, moveAction, []);
    expect(captures).toHaveLength(0);

    // capture
    const captureAction = { kind: 'move', source: 'd5', targets: ['d7'], payload: null };
    resolveAction(state, captureAction, []);
    expect(captures).toEqual(['d7']);
  });

  test('all four hooks fire in correct order on a capture', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'rook', owner: 'enemy' },
    ]);

    const order = [];
    attachEffect(state, 'global', {
      id: 'lifecycle_order',
      hooks: {
        onBeforeAction: () => order.push('before'),
        onAction:       () => order.push('action'),
        onCapture:      () => order.push('capture'),
        onAfterAction:  () => order.push('after'),
      },
    });

    const action = { kind: 'move', source: 'd4', targets: ['d7'], payload: null };
    resolveAction(state, action, []);

    // onCapture fires between onAction and onAfterAction
    expect(order).toEqual(['before', 'action', 'capture', 'after']);
  });
});

// ─── effect detachment when piece dies ────────────────────────────────────────

describe('effect detachment and persistence', () => {
  test('effect does not fire after its piece is captured', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'rook', owner: 'enemy' },
    ]);

    // Attach effect to the enemy rook at d7
    const enemyRook = get(state.board, 'd7');
    const calls = [];
    attachEffect(state, { piece: enemyRook.id }, {
      id: 'doomed_rook_fx',
      hooks: { onAction: () => calls.push('fired') },
    });

    // Player rook captures enemy rook → enemy rook dies
    const captureAction = { kind: 'move', source: 'd4', targets: ['d7'], payload: null };
    resolveAction(state, captureAction, []);

    // Fire a subsequent hook — the dead piece's effect should NOT fire
    const nextAction = { kind: 'move', source: 'd7', targets: ['d6'], payload: null };
    runHook(state, 'onAction', { action: nextAction });

    expect(calls).toHaveLength(0);
  });

  test('effect on a piece still fires after that piece moves', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);

    const rook = get(state.board, 'd4');
    const calls = [];
    attachEffect(state, { piece: rook.id }, {
      id: 'moving_rook_fx',
      hooks: { onAction: () => calls.push('fired') },
    });

    // Move the rook
    const moveAction = { kind: 'move', source: 'd4', targets: ['d6'], payload: null };
    resolveAction(state, moveAction, []);

    // The rook's effect should have fired once (for the move action itself)
    expect(calls).toHaveLength(1);

    // Now fire another runHook — the rook still exists at d6, so effect fires again
    const nextAction = { kind: 'move', source: 'd6', targets: ['d5'], payload: null };
    runHook(state, 'onAction', { action: nextAction });
    expect(calls).toHaveLength(2);
  });

  test('effect on a dead piece does not fire even via runHook', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd7', type: 'rook', owner: 'enemy' },
    ]);

    const enemyRook = get(state.board, 'd7');
    const calls = [];
    attachEffect(state, { piece: enemyRook.id }, {
      id: 'dead_fx',
      hooks: { onBeforeAction: () => calls.push('fired') },
    });

    // Capture kills enemyRook. The effect may fire during the resolveAction
    // itself (onBeforeAction fires while the piece is still alive — that is
    // correct behaviour). Clear the call log after the capture so we can
    // isolate subsequent dispatches.
    const captureAction = { kind: 'move', source: 'd4', targets: ['d7'], payload: null };
    resolveAction(state, captureAction, []);
    calls.length = 0; // reset: we only care about calls AFTER the piece dies

    // Direct runHook call with an unrelated action — dead piece should NOT fire
    const postAction = { kind: 'move', source: 'e1', targets: ['e2'], payload: null };
    runHook(state, 'onBeforeAction', { action: postAction });
    expect(calls).toHaveLength(0);
  });
});

// ─── P1/P2 regression guard ───────────────────────────────────────────────────

describe('P1/P2 regression: resolveAction still works with effects wired in', () => {
  test('move still applies correctly', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const action = { kind: 'move', source: 'd4', targets: ['d6'], payload: null };
    resolveAction(state, action, []);
    expect(get(state.board, 'd4')).toBeNull();
    expect(get(state.board, 'd6').type).toBe('rook');
  });

  test('undo still works after effects are attached', () => {
    const state = makeGameState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);

    attachEffect(state, 'global', { id: 'noop', hooks: { onAction: () => {} } });

    const snap0 = state.toJSON();
    const action = { kind: 'move', source: 'd4', targets: ['d6'], payload: null };
    state.play(action);
    expect(get(state.board, 'd6').type).toBe('rook');
    state.undo();
    expect(get(state.board, 'd4').type).toBe('rook');
    expect(get(state.board, 'd6')).toBeNull();
    expect(JSON.stringify(state.toJSON())).toBe(JSON.stringify(snap0));
  });
});
