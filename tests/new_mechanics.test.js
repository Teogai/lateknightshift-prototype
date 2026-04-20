import { test, expect, describe } from 'vitest';
import { GameState } from '../js/engine.js';
import { STARTER_DECKS } from '../js/cards.js';
import { FIXED_PATH, generateNodes } from '../js/map.js';
import { ENEMIES, REGULAR_ENEMIES, ELITE_2_ENEMY } from '../js/enemies.js';

function freshGame() {
  return new GameState('knight');
}

// --- Deck composition ---

test('starter deck: 8 move (7 basic + 1 knight), 2 summon pawn, total 10', () => {
  const deck = STARTER_DECKS['knight'];
  expect(deck.filter(c => c.type === 'move')).toHaveLength(8);
  expect(deck.filter(c => c.type === 'summon' && c.piece === 'pawn')).toHaveLength(2);
  expect(deck.filter(c => c.type === 'move' && c.moveVariant === 'knight')).toHaveLength(1);
  expect(deck).toHaveLength(10);
});

test('bishop character does not exist', () => {
  expect(() => new GameState('bishop')).toThrow();
});

// --- No-repeat-piece rule ---

test('moved piece can move again next turn', () => {
  // Wildfrost: 1 card/turn; auto-turn runs after move, so movedThisTurn is cleared before player's next turn
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.playMoveCard(0, 'b1', 'a3');
  // Manually trigger enemy turn sequence to clear movedThisTurn
  const seq = state.executeEnemyTurnSequence();
  for (const move of seq.remainingMoves) {
    state.executeNextEnemyMove(move);
  }
  state.finishEnemyTurnSequence(seq.warnNext);
  // Now it's a new player turn with movedThisTurn cleared
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  const result = state.playMoveCard(0, 'a3', 'b5');
  expect(result.ok).toBe(true);
});

test('moved_this_turn is empty at start of player turn', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.playMoveCard(0, 'b1', 'a3');
  // Before enemy turn, movedThisTurn still has the moved piece
  expect(state.toDict().moved_this_turn).toEqual(['a3']);
  // Manually trigger enemy turn sequence to clear movedThisTurn
  const seq = state.executeEnemyTurnSequence();
  for (const move of seq.remainingMoves) {
    state.executeNextEnemyMove(move);
  }
  state.finishEnemyTurnSequence(seq.warnNext);
  // After enemy turn finishes, movedThisTurn is cleared
  expect(state.toDict().moved_this_turn).toEqual([]);
});

test('moved_this_turn resets after end turn', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  state.playMoveCard(0, 'b1', 'a3');
  state.endTurn();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  const result = state.playMoveCard(0, 'a3', 'b5');
  expect(result.ok).toBe(true);
});


// --- Knight Move card ---

test('knight move card moves piece to valid L-shape destination', () => {
  const state = freshGame();
  state.hand = [{ name: 'Knight Move', type: 'move', moveVariant: 'knight', cost: 2 }];
  const result = state.playKnightMoveCard(0, 'a1', 'b3');
  expect(result.ok).toBe(true);
  expect(state.toDict().board['b3'].type).toBe('rook');
});

test('knight move card rejects non-L-shape destination', () => {
  const state = freshGame();
  state.hand = [{ name: 'Knight Move', type: 'move', moveVariant: 'knight', cost: 2 }];
  state.mana = 3;
  const result = state.playKnightMoveCard(0, 'a1', 'a3');
  expect(result.error).toBeDefined();
});

test('knight-moved piece can move again next turn', () => {
  // Wildfrost: auto-turn clears movedThisTurn; knight-moved piece can be moved next turn
  const state = freshGame();
  state.hand = [{ name: 'Knight Move', type: 'move', moveVariant: 'knight', cost: 2 }];
  state.playKnightMoveCard(0, 'b1', 'a3');
  // Manually trigger enemy turn sequence to clear movedThisTurn
  const seq = state.executeEnemyTurnSequence();
  for (const move of seq.remainingMoves) {
    state.executeNextEnemyMove(move);
  }
  state.finishEnemyTurnSequence(seq.warnNext);
  // movedThisTurn cleared; can move again
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  const result = state.playMoveCard(0, 'a3', 'b5');
  expect(result.ok).toBe(true);
});

test('knight move card rejects friendly piece at destination', () => {
  const state = freshGame();
  state.hand = [{ name: 'Knight Move', type: 'move', moveVariant: 'knight', cost: 2 }];
  state.mana = 3;
  // a1 rook → b2 is L-shape but b2 has a pawn (friendly)
  const result = state.playKnightMoveCard(0, 'a1', 'b2');
  expect(result.error).toBeDefined();
});

// --- Knight move pawn promotion ---

function setupKnightPromo() {
  const state = new GameState('knight');
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'a8');
  state._chess.put({ type: 'p', color: 'w' }, 'b7');
  state.hand = [{ name: 'Knight Move', type: 'move', moveVariant: 'knight', cost: 2 }];
  state.mana = 3;
  state.movedThisTurn = new Set();
  return state;
}

test('knight move pawn to rank 8 returns needs_promotion', () => {
  const state = setupKnightPromo();
  // b7 → d8 is a valid L-shape (+2 file, +1 rank)
  const result = state.playKnightMoveCard(0, 'b7', 'd8');
  expect(result.ok).toBe(true);
  expect(result.needs_promotion).toEqual(['d8']);
});

test('pawn stays as pawn on rank 8 before applyPromotion', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  expect(state._chess.get('d8').type).toBe('p');
});

test('applyPromotion promotes pawn to queen', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  const result = state.applyPromotion('d8', 'q');
  expect(result.ok).toBe(true);
  expect(state._chess.get('d8').type).toBe('q');
});

test('applyPromotion promotes pawn to rook', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  const result = state.applyPromotion('d8', 'r');
  expect(result.ok).toBe(true);
  expect(state._chess.get('d8').type).toBe('r');
});

test('applyPromotion rejects invalid piece', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  const result = state.applyPromotion('d8', 'x');
  expect(result.error).toMatch(/invalid/);
});

test('applyPromotion rejects non-pawn square', () => {
  const state = setupKnightPromo();
  const result = state.applyPromotion('e1', 'q');
  expect(result.error).toBeDefined();
});

// --- Normal move card pawn promotion ---

function setupNormalMovePromo() {
  const state = new GameState('knight');
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'a8');
  state._chess.put({ type: 'p', color: 'w' }, 'd7');
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 1;
  state.movedThisTurn = new Set();
  return state;
}

test('normal move pawn to rank 8 without promotion returns needs_promotion', () => {
  const state = setupNormalMovePromo();
  const result = state.playMoveCard(0, 'd7', 'd8');
  expect(result.ok).toBe(true);
  expect(result.needs_promotion).toEqual(['d8']);
});

test('normal move pawn stays as pawn on rank 8 before promotion chosen', () => {
  const state = setupNormalMovePromo();
  state.playMoveCard(0, 'd7', 'd8');
  expect(state._chess.get('d8').type).toBe('p');
});

test('normal move pawn to rank 8 with promotion piece promotes immediately', () => {
  const state = setupNormalMovePromo();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  const result = state.playMoveCard(0, 'd7', 'd8', 'q');
  expect(result.ok).toBe(true);
  expect(result.needs_promotion).toBeUndefined();
  expect(state._chess.get('d8').type).toBe('q');
});

test('normal move pawn promotion with applyPromotion after move', () => {
  const state = setupNormalMovePromo();
  state.playMoveCard(0, 'd7', 'd8');
  expect(state._chess.get('d8').type).toBe('p');
  const promoResult = state.applyPromotion('d8', 'q');
  expect(promoResult.ok).toBe(true);
  expect(state._chess.get('d8').type).toBe('q');
});

// --- Pattern-based AI ---

test('AI advances most-forward black pawn', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  state._chess.put({ type: 'p', color: 'b' }, 'a5'); // rank 5, more forward
  state._chess.put({ type: 'p', color: 'b' }, 'c7'); // rank 7, less forward
  state.endTurn();
  // a5 → a4 (most forward pawn advances)
  expect(state._chess.get('a4')).toBeTruthy();
  expect(state._chess.get('a4').type).toBe('p');
  expect(state._chess.get('a5')).toBeFalsy();
});

test('AI prefers capture over pawn advance', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  state._chess.put({ type: 'p', color: 'b' }, 'a7');
  state._chess.put({ type: 'r', color: 'w' }, 'b6'); // capturable by a7 pawn
  state.endTurn();
  expect(state._chess.get('b6')).toBeTruthy();
  expect(state._chess.get('b6').color).toBe('b');
  expect(state._chess.get('a7')).toBeFalsy();
});

// --- Enemy pawn promotion ---

test('enemy pawn reaching rank 1 promotes to queen', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  state._chess.put({ type: 'p', color: 'b' }, 'a2'); // one step from promotion
  state.endTurn();
  expect(state._chess.get('a1')).toBeTruthy();
  expect(state._chess.get('a1').type).toBe('q');
  expect(state._chess.get('a2')).toBeFalsy();
});

// --- Fixed path ---

describe('fixed path', () => {
  test('FIXED_PATH has exactly 16 entries', () => {
    expect(FIXED_PATH).toHaveLength(16);
  });

  test('floor 1 is pawn_pusher monster', () => {
    expect(FIXED_PATH[0]).toMatchObject({ type: 'monster', enemyKey: 'pawn_pusher' });
  });

  test('floor 2 is knight_rider monster', () => {
    expect(FIXED_PATH[1]).toMatchObject({ type: 'monster', enemyKey: 'knight_rider' });
  });

  test('floor 3 is event', () => {
    expect(FIXED_PATH[2]).toMatchObject({ type: 'event' });
  });

  test('floor 6 is duelist elite', () => {
    expect(FIXED_PATH[5]).toMatchObject({ type: 'elite', enemyKey: 'duelist' });
  });

  test('floor 12 is duelist_2 elite', () => {
    expect(FIXED_PATH[11]).toMatchObject({ type: 'elite', enemyKey: 'duelist_2' });
  });

  test('floor 16 is boss', () => {
    expect(FIXED_PATH[15]).toMatchObject({ type: 'boss', enemyKey: 'boss_duelist' });
  });

  test('generateNodes returns single-element array matching FIXED_PATH', () => {
    for (let f = 1; f <= 16; f++) {
      const nodes = generateNodes(f);
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject(FIXED_PATH[f - 1]);
    }
  });
});

// --- New enemies ---

describe('new enemies', () => {
  test('lone_rook is removed from ENEMIES', () => {
    expect(ENEMIES['lone_rook']).toBeUndefined();
  });

  test('lone_rook not in REGULAR_ENEMIES', () => {
    expect(REGULAR_ENEMIES).not.toContain('lone_rook');
  });

  test('phalanx exists with 8 pieces', () => {
    expect(ENEMIES['phalanx']).toBeDefined();
    expect(ENEMIES['phalanx'].pieces).toHaveLength(8);
  });

  test('iron_line exists with 10 pieces', () => {
    expect(ENEMIES['iron_line']).toBeDefined();
    expect(ENEMIES['iron_line'].pieces).toHaveLength(10);
  });

  test('cavalry_charge exists with 13 pieces', () => {
    expect(ENEMIES['cavalry_charge']).toBeDefined();
    expect(ENEMIES['cavalry_charge'].pieces).toHaveLength(13);
  });

  test('high_command exists with 13 pieces', () => {
    expect(ENEMIES['high_command']).toBeDefined();
    expect(ENEMIES['high_command'].pieces).toHaveLength(13);
  });

  test('duelist_2 exists with 12 pieces', () => {
    expect(ENEMIES['duelist_2']).toBeDefined();
    expect(ENEMIES['duelist_2'].pieces).toHaveLength(12);
  });

  test('ELITE_2_ENEMY is duelist_2', () => {
    expect(ELITE_2_ENEMY).toBe('duelist_2');
  });

  test('duelist_2 uses doubleMoveAI (warnNext true on first turn)', () => {
    const ai = ENEMIES['duelist_2'].createAI();
    // doubleMoveAI returns warnNext: true on the first call (sets up the second move)
    // We need a minimal chess board to call takeTurn
    const state = new GameState('knight', 'duelist_2');
    const seq = state.executeEnemyTurnSequence();
    expect(seq.warnNext).toBe(true);
  });
});
