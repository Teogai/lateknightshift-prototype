/**
 * tests/engine2/status.test.js
 * P5 — Tags + status effects: shielded, frozen
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { attachEffect } from '../../js/engine2/effects.js';
import { generateLegalActions } from '../../js/engine2/movegen.js';
import { makeShieldEffect } from '../../js/engine2/effect_types/shield.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function makePiece(type, owner, tags = []) {
  return { type, owner, tags: new Set(tags), data: {}, id: String(++_id) };
}

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

// ─── shielded tag ─────────────────────────────────────────────────────────────

describe('shielded tag', () => {
  let state;

  beforeEach(() => {
    _id = 0;
    state = new GameState();
  });

  it('shielded piece survives first capture — tag removed', () => {
    const attacker = makePiece('rook', 'player');
    const defender = makePiece('king', 'enemy', ['shielded']);
    place(state, 'a1', attacker);
    place(state, 'a8', defender);

    // Attach shield effect to defender
    const shieldFx = makeShieldEffect(defender.id);
    attachEffect(state, { piece: defender.id }, shieldFx);

    // Player rook moves up to capture the king
    const action = {
      kind: 'move',
      source: 'a1',
      targets: ['a8'],
      piece: attacker,
    };

    state.play(action);

    // Defender should still be on the board at a8
    const survivedPiece = pieceAt(state, 'a8');
    expect(survivedPiece).not.toBeNull();
    expect(survivedPiece.id).toBe(defender.id);

    // shielded tag should be removed
    expect(survivedPiece.tags.has('shielded')).toBe(false);

    // attacker should be back at a1 (move was cancelled, no piece moved)
    const attackerPos = pieceAt(state, 'a1');
    expect(attackerPos).not.toBeNull();
    expect(attackerPos.id).toBe(attacker.id);
  });

  it('undo restores shielded tag and board positions', () => {
    const attacker = makePiece('rook', 'player');
    const defender = makePiece('king', 'enemy', ['shielded']);
    place(state, 'a1', attacker);
    place(state, 'a8', defender);

    const shieldFx = makeShieldEffect(defender.id);
    attachEffect(state, { piece: defender.id }, shieldFx);

    const action = {
      kind: 'move',
      source: 'a1',
      targets: ['a8'],
      piece: attacker,
    };

    state.play(action);

    // After play: shield consumed, attacker still at a1, defender at a8 without tag
    expect(pieceAt(state, 'a8').tags.has('shielded')).toBe(false);

    state.undo();

    // After undo: defender back with shielded tag, attacker back at a1
    const defenderAfterUndo = pieceAt(state, 'a8');
    expect(defenderAfterUndo).not.toBeNull();
    expect(defenderAfterUndo.id).toBe(defender.id);
    expect(defenderAfterUndo.tags.has('shielded')).toBe(true);

    const attackerAfterUndo = pieceAt(state, 'a1');
    expect(attackerAfterUndo).not.toBeNull();
    expect(attackerAfterUndo.id).toBe(attacker.id);
  });

  it('second capture lands — defender removed after shield consumed', () => {
    const attacker = makePiece('rook', 'player');
    const defender = makePiece('king', 'enemy', ['shielded']);
    place(state, 'a1', attacker);
    place(state, 'a8', defender);

    const shieldFx = makeShieldEffect(defender.id);
    attachEffect(state, { piece: defender.id }, shieldFx);

    const action1 = {
      kind: 'move',
      source: 'a1',
      targets: ['a8'],
      piece: attacker,
    };
    state.play(action1);

    // First hit: shield absorbed, attacker back at a1
    expect(pieceAt(state, 'a1').id).toBe(attacker.id);
    expect(pieceAt(state, 'a8').id).toBe(defender.id);
    expect(pieceAt(state, 'a8').tags.has('shielded')).toBe(false);

    // Second capture attempt — no shield now
    const action2 = {
      kind: 'move',
      source: 'a1',
      targets: ['a8'],
      piece: attacker,
    };
    state.play(action2);

    // This time defender should be gone
    expect(pieceAt(state, 'a8')).not.toBeNull(); // attacker now occupies a8
    expect(pieceAt(state, 'a8').id).toBe(attacker.id);
    expect(pieceAt(state, 'a1')).toBeNull(); // attacker moved away
  });

  it('shield does not fire for non-capture move', () => {
    const mover = makePiece('rook', 'player');
    const bystander = makePiece('king', 'enemy', ['shielded']);
    place(state, 'a1', mover);
    place(state, 'h8', bystander); // on a different square

    const shieldFx = makeShieldEffect(bystander.id);
    attachEffect(state, { piece: bystander.id }, shieldFx);

    // Move rook to b1 — not capturing anyone
    const action = {
      kind: 'move',
      source: 'a1',
      targets: ['b1'],
      piece: mover,
    };
    state.play(action);

    // Bystander still has the shielded tag
    expect(pieceAt(state, 'h8').tags.has('shielded')).toBe(true);
    // Rook moved normally
    expect(pieceAt(state, 'b1').id).toBe(mover.id);
    expect(pieceAt(state, 'a1')).toBeNull();
  });
});

// ─── frozen tag ───────────────────────────────────────────────────────────────

describe('frozen tag', () => {
  let state;

  beforeEach(() => {
    _id = 0;
    state = new GameState();
  });

  it('frozen piece generates no legal actions', () => {
    // Place a player rook in the centre, frozen
    const frozen = makePiece('rook', 'player', ['frozen']);
    const enemyKing = makePiece('king', 'enemy');
    place(state, 'd4', frozen);
    place(state, 'h8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    // Only the frozen rook is player-owned; it should produce no actions
    const fromD4 = actions.filter(a => a.source === 'd4');
    expect(fromD4).toHaveLength(0);
  });

  it('non-frozen pieces generate actions normally alongside frozen pieces', () => {
    const frozen = makePiece('rook', 'player', ['frozen']);
    const normal = makePiece('bishop', 'player');
    const enemyKing = makePiece('king', 'enemy');
    place(state, 'd4', frozen);
    place(state, 'c1', normal);
    place(state, 'h8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    const fromD4 = actions.filter(a => a.source === 'd4');
    const fromC1 = actions.filter(a => a.source === 'c1');
    expect(fromD4).toHaveLength(0);
    expect(fromC1.length).toBeGreaterThan(0);
  });

  it('frozen piece can still be captured by opponent', () => {
    // Frozen does not grant immunity — only prevents moving
    const frozen = makePiece('rook', 'player', ['frozen']);
    const enemy = makePiece('rook', 'enemy');
    const playerKing = makePiece('king', 'player');
    place(state, 'd4', frozen);
    place(state, 'd8', enemy);
    place(state, 'e1', playerKing);
    state.turn = 'enemy';

    const actions = generateLegalActions(state, 'enemy');
    // Enemy should be able to capture the frozen rook at d4
    const captures = actions.filter(a => a.targets[0] === 'd4');
    expect(captures.length).toBeGreaterThan(0);
  });

  it('undo restores frozen tag', () => {
    const frozen = makePiece('rook', 'player', ['frozen']);
    const enemyRook = makePiece('rook', 'enemy');
    place(state, 'd4', frozen);
    place(state, 'd8', enemyRook);

    // Remove frozen tag manually via _setTag (simulate a thaw action)
    import('../../js/engine2/actions.js').then(({ _setTag }) => {
      const log = [];
      _setTag(frozen, 'frozen', 'delete', log);
      expect(frozen.tags.has('frozen')).toBe(false);
      // Replay inverse
      log[0]();
      expect(frozen.tags.has('frozen')).toBe(true);
    });
  });
});
