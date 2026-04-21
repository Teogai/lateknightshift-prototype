/**
 * tests/engine2/status.test.js
 * P5 — Tags + status effects: shielded, frozen
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { attachEffect } from '../../js/engine2/effects.js';
import { generateLegalActions } from '../../js/engine2/movegen.js';
import { makeShieldEffect } from '../../js/engine2/effect_types/shield.js';
import { GameState as BattleState } from '../../js/battle_state.js';
import { unblockCard } from '../../js/cards2/move_cards.js';
import { set as setSq } from '../../js/engine2/board.js';

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

// ─── stunned tag ──────────────────────────────────────────────────────────────

describe('stunned tag', () => {
  let state;

  beforeEach(() => {
    _id = 0;
    state = new GameState();
  });

  it('stunned piece generates no legal actions', () => {
    const stunned = makePiece('rook', 'player', ['stunned']);
    const enemyKing = makePiece('king', 'enemy');
    place(state, 'd4', stunned);
    place(state, 'h8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    const fromD4 = actions.filter(a => a.source === 'd4');
    expect(fromD4).toHaveLength(0);
  });

  it('non-stunned pieces generate actions normally alongside stunned pieces', () => {
    const stunned = makePiece('rook', 'player', ['stunned']);
    const normal = makePiece('bishop', 'player');
    const enemyKing = makePiece('king', 'enemy');
    place(state, 'd4', stunned);
    place(state, 'c1', normal);
    place(state, 'h8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    const fromD4 = actions.filter(a => a.source === 'd4');
    const fromC1 = actions.filter(a => a.source === 'c1');
    expect(fromD4).toHaveLength(0);
    expect(fromC1.length).toBeGreaterThan(0);
  });

  it('stunned piece can still be captured by opponent', () => {
    const stunned = makePiece('rook', 'player', ['stunned']);
    const enemy = makePiece('rook', 'enemy');
    const playerKing = makePiece('king', 'player');
    place(state, 'd4', stunned);
    place(state, 'd8', enemy);
    place(state, 'e1', playerKing);
    state.turn = 'enemy';

    const actions = generateLegalActions(state, 'enemy');
    const captures = actions.filter(a => a.targets[0] === 'd4');
    expect(captures.length).toBeGreaterThan(0);
  });
});

// ─── ghost tag ────────────────────────────────────────────────────────────────

describe('ghost tag', () => {
  let state;

  beforeEach(() => {
    _id = 0;
    state = new GameState();
  });

  it('ghost piece does not block sliding moves', () => {
    const rook = makePiece('rook', 'player');
    const ghostPawn = makePiece('pawn', 'enemy', ['ghost']);
    const enemyKing = makePiece('king', 'enemy');
    place(state, 'a1', rook);
    place(state, 'a4', ghostPawn);
    place(state, 'a8', enemyKing);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    const fromA1 = actions.filter(a => a.source === 'a1');
    const targets = fromA1.map(a => a.targets[0]);
    expect(targets).toContain('a5');
    expect(targets).toContain('a6');
    expect(targets).toContain('a7');
    expect(targets).toContain('a8');
  });

  it('ghost piece can still be captured', () => {
    const rook = makePiece('rook', 'player');
    const ghostPawn = makePiece('pawn', 'enemy', ['ghost']);
    place(state, 'a1', rook);
    place(state, 'a4', ghostPawn);
    state.turn = 'player';

    const actions = generateLegalActions(state, 'player');
    const fromA1 = actions.filter(a => a.source === 'a1');
    const targets = fromA1.map(a => a.targets[0]);
    expect(targets).toContain('a4');
  });

  it('unblock card applies ghost tag and ghostTurns=5', () => {
    const bs = new BattleState('knight', 'pawn_pusher');
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) bs._state.board[r][c] = null;
    const pawn = makePiece('pawn', 'player');
    setSq(bs._state.board, 'e4', pawn);
    bs._state.hand = [unblockCard()];
    bs._state.deck = [];
    bs._state.discard = [];

    const result = bs.playUnblockCard(0, 'e4');
    expect(result.error).toBeUndefined();
    expect(pawn.tags.has('ghost')).toBe(true);
    expect(pawn.data.ghostTurns).toBe(5);
  });

  it('_decayGhostStatuses decrements counter and removes ghost when expired', () => {
    const bs = new BattleState('knight', 'pawn_pusher');
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) bs._state.board[r][c] = null;
    const pawn = makePiece('pawn', 'enemy');
    pawn.tags.add('ghost');
    pawn.data.ghostTurns = 2;
    setSq(bs._state.board, 'e4', pawn);

    bs._decayGhostStatuses('enemy');
    expect(pawn.tags.has('ghost')).toBe(true);
    expect(pawn.data.ghostTurns).toBe(1);

    bs._decayGhostStatuses('enemy');
    expect(pawn.tags.has('ghost')).toBe(false);
    expect(pawn.data.ghostTurns).toBeUndefined();
  });
});
