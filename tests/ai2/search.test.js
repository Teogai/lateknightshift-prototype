/**
 * P9 — AI2 search tests (TDD)
 *
 * Tests:
 *   1. AI selects capture move when one wins material (attacker vs undefended piece)
 *   2. AI selects explode action when it wins ≥ 2 pieces
 *   3. Capture king: AI picks king-capture move at depth 2 when available
 *   4. AI avoids moving into damage tile when a safer equal-value move exists
 *
 * No chess.js. Uses engine2 state + movegen directly.
 */
import { describe, test, expect, beforeEach } from 'vitest';

import { GameState } from '../../js/engine2/state.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { set, get } from '../../js/engine2/board.js';
import { makeTile } from '../../js/engine2/tiles.js';
import { selectAction } from '../../js/ai2/search.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal GameState from placement list.
 * placements: [{ sq, type, owner, tags? }]
 */
function makeState(placements, opts = {}) {
  const state = new GameState();
  // Clear board
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state.board[r][c] = null;

  for (const { sq, type, owner, tags, id } of placements) {
    const piece = makePiece(type, owner, id ? { id } : {});
    if (tags) tags.forEach(t => piece.tags.add(t));
    set(state.board, sq, piece);
  }

  state.turn = opts.turn ?? 'enemy';
  state.enPassant = opts.enPassant ?? null;
  state.castling = {
    wK: false, wQ: false, bK: false, bQ: false,
    ...(opts.castling ?? {}),
  };
  return state;
}

// ─── test 1: capture wins material ───────────────────────────────────────────

describe('selectAction — material capture', () => {
  test('AI (enemy) captures undefended player queen', () => {
    // Enemy rook on a8, player queen on a4 (undefended), player king on e1, enemy king on e8
    const state = makeState([
      { sq: 'e8', type: 'king',  owner: 'enemy'  },
      { sq: 'a8', type: 'rook',  owner: 'enemy'  },
      { sq: 'e1', type: 'king',  owner: 'player' },
      { sq: 'a4', type: 'queen', owner: 'player' },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
    // The rook captures the queen at a4
    expect(action.source).toBe('a8');
    expect(action.targets[0]).toBe('a4');
  });

  test('AI prefers capturing higher-value piece over lower-value', () => {
    // Enemy rook on a8 can capture either: player rook on a4 or player pawn on a5
    // (rook value=5 > pawn value=1) — capture the rook
    const state = makeState([
      { sq: 'e8', type: 'king',  owner: 'enemy'  },
      { sq: 'a8', type: 'rook',  owner: 'enemy'  },
      { sq: 'e1', type: 'king',  owner: 'player' },
      { sq: 'a4', type: 'rook',  owner: 'player' },
      { sq: 'h4', type: 'pawn',  owner: 'player' },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
    // Should capture the rook, not the pawn
    expect(action.targets[0]).toBe('a4');
  });
});

// ─── test 2: explode wins ≥ 2 pieces ─────────────────────────────────────────

describe('selectAction — explode action', () => {
  test('AI prefers explode that eliminates 2 player pieces over quiet move', () => {
    // Set up: enemy king on e8, enemy piece on d5 with explode effect that will
    // remove pieces adjacent to target. We simulate an explode action by placing
    // a custom action in the action pool via a piece that generates explode actions.
    //
    // Simplest approach: directly call selectAction with a state that has an explode
    // action available. We can't directly test "explode card" here (that's cards2),
    // but we CAN test that selectAction picks the explode action when it wins more
    // material than a quiet move.
    //
    // The explode action: kind='capture', source='e5', targets=['e4']
    // This removes enemy piece at e5... Actually, let's test it differently.
    //
    // We test that given two possible actions (provided via a custom action list),
    // selectAction scores the explode (kills 2) higher. We use the overrides param.
    //
    // Since selectAction works on a real state and real movegen, we set up a board
    // where the AI can do a capture that clears a key piece, plus the cascaded
    // explode removes a neighbour.
    //
    // Actually the simplest approach: place enemy rook where capturing a player piece
    // also results in a position where the enemy is clearly ahead in material.
    // For explode specifically: test that if an explode action exists in a custom
    // actions list it scores higher. We inject via the {actions} override.
    //
    // We test explode via the public selectAction API by providing a pre-built list
    // of actions that includes an explode action (kind='capture' targeting 2 squares).
    // selectAction must accept an optional `actions` override for this.

    // Board: enemy rook on a1, player has rook on a5 AND pawn on a6
    // Enemy rook captures a5 (player rook), then explode fires and also removes a6 pawn.
    // But this depends on effects, which are hard to set up in a pure unit test.
    // Instead: verify selectAction with a state where explode action was pre-built.

    // We'll directly inject a fake action list by passing { overrideActions } to selectAction.
    // The spec says selectAction(state, owner, opts) so we add overrideActions to opts.

    const state = makeState([
      { sq: 'e8', type: 'king', owner: 'enemy'  },
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'd3', type: 'pawn', owner: 'player' },
      { sq: 'e3', type: 'pawn', owner: 'player' },
      { sq: 'f3', type: 'pawn', owner: 'player' },
    ]);

    // An explode action that will remove e3 and its neighbours (d3, f3)
    // The AI should prefer this over a quiet move.
    const explodeAction = {
      kind: 'explode',
      source: 'e8', // enemy king "uses ability" — treated as special
      targets: ['e3'],
      piece: get(state.board, 'e8'),
      payload: { radius: 1 },
    };

    const quietAction = {
      kind: 'move',
      source: 'e8',
      targets: ['d8'],
      piece: get(state.board, 'e8'),
    };

    const action = selectAction(state, 'enemy', {
      depth: 1,
      overrideActions: [explodeAction, quietAction],
    });
    expect(action).not.toBeNull();
    // The explode action should win (kills 3 pawns = material advantage)
    expect(action.kind).toBe('explode');
  });
});

// ─── test 3: capture king at depth 2 ─────────────────────────────────────────

describe('selectAction — king capture', () => {
  test('AI captures player king directly when adjacent', () => {
    // Enemy king on e5, player king on e4 — direct king capture
    const state = makeState([
      { sq: 'e5', type: 'king', owner: 'enemy'  },
      { sq: 'e4', type: 'king', owner: 'player' },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
    expect(action.targets[0]).toBe('e4');
  });

  test('AI finds king capture in 1 move via rook', () => {
    // Enemy rook on a1, player king on a5, enemy king on e8 — rook captures king
    const state = makeState([
      { sq: 'e8', type: 'king', owner: 'enemy'  },
      { sq: 'a1', type: 'rook', owner: 'enemy'  },
      { sq: 'a5', type: 'king', owner: 'player' },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
    // The rook captures the king at a5
    expect(action.source).toBe('a1');
    expect(action.targets[0]).toBe('a5');
  });

  test('AI finds king capture at depth 2 via fork', () => {
    // Enemy queen on e5, player king on e2, enemy king on h8
    // Queen can directly reach e2 (file) — AI should find it at depth 2
    const state = makeState([
      { sq: 'h8', type: 'king',  owner: 'enemy'  },
      { sq: 'e5', type: 'queen', owner: 'enemy'  },
      { sq: 'e2', type: 'king',  owner: 'player' },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
    // Queen captures the king at e2
    expect(action.source).toBe('e5');
    expect(action.targets[0]).toBe('e2');
  });
});

// ─── test 4: avoid damage tile ────────────────────────────────────────────────

describe('selectAction — avoid damage tile', () => {
  test('AI avoids landing on damage tile when safe equal-value move exists', () => {
    // Enemy rook on a8, can go to a5 (damage tile) or b8 (safe).
    // Both are quiet moves. AI should prefer b8.
    const state = makeState([
      { sq: 'e8', type: 'king', owner: 'enemy'  },
      { sq: 'a8', type: 'rook', owner: 'enemy'  },
      { sq: 'e1', type: 'king', owner: 'player' },
    ]);

    // Place damage tile at a5
    const [r, c] = [3, 0]; // a5 → row=3, col=0
    state.tiles[r][c] = makeTile('damage');

    const action = selectAction(state, 'enemy', { depth: 1 });
    expect(action).not.toBeNull();
    // Should not move to the damage tile
    expect(action.targets[0]).not.toBe('a5');
  });

  test('wounded tag reduces piece value in eval', () => {
    // AI should prefer capturing a healthy queen over a wounded pawn.
    // Rook on a8 can go to a4 (healthy queen) or b8 (wounded pawn).
    // Queen is worth 9, wounded pawn is worth max(0, 1 - WOUNDED_PENALTY) = 0.
    // Rook should take the queen.
    const state = makeState([
      { sq: 'e8', type: 'king',  owner: 'enemy'  },
      { sq: 'a8', type: 'rook',  owner: 'enemy'  },
      { sq: 'e1', type: 'king',  owner: 'player' },
      { sq: 'a4', type: 'queen', owner: 'player' },
      { sq: 'b8', type: 'pawn',  owner: 'player', tags: ['wounded'] },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
    // Rook should take the queen (a4), not the wounded pawn (b8)
    expect(action.targets[0]).toBe('a4');
  });
});

// ─── test 5: personality weights affect decisions ─────────────────────────────

describe('selectAction — personality', () => {
  test('pawnAdvance personality pushes pawns forward', () => {
    // Enemy: king on e8, pawn on d7 (can push to d6 or d5)
    // Player: king on e1
    // With high pawnAdvance, AI should push pawn forward
    const state = makeState([
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'enemy' },
      { sq: 'e1', type: 'king', owner: 'player' },
    ]);

    const personality = { material: 0, pawnAdvance: 5, mobility: 0, aggression: 0, kingSafety: 0 };
    const action = selectAction(state, 'enemy', { depth: 1, personality });
    expect(action).not.toBeNull();
    // Should move the pawn forward (d7 → d6 or d5), not the king
    expect(action.source).toBe('d7');
  });
});

// ─── test 6: king-capture mode — AI must move even with no "safe" squares ─────

describe('selectAction — king-capture mode', () => {
  test('AI still moves when king has no safe squares', () => {
    // Enemy king on e8, enemy rook on a8.
    // Player rook on e1 attacks e-file; player rook on a1 attacks rank 8.
    // In chess this would be checkmate; in king-capture mode AI must still move.
    const state = makeState([
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a8', type: 'rook', owner: 'enemy' },
      { sq: 'e1', type: 'rook', owner: 'player' },
      { sq: 'a1', type: 'rook', owner: 'player' },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
  });

  test('AI captures player king when adjacent even if in danger', () => {
    // Enemy king on e5, player king on e4 — direct capture available
    // Enemy king is also attacked by player rook on e1, but capture is still best
    const state = makeState([
      { sq: 'e5', type: 'king', owner: 'enemy' },
      { sq: 'e4', type: 'king', owner: 'player' },
      { sq: 'e1', type: 'rook', owner: 'player' },
    ]);

    const action = selectAction(state, 'enemy', { depth: 2 });
    expect(action).not.toBeNull();
    expect(action.targets[0]).toBe('e4');
  });
});
