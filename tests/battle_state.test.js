import { describe, test, expect } from 'vitest';
import { GameState, knightAttacks } from '../js/battle_state.js';
import { moveCard, pawnBoostCard, summonDuckCard, moveDuckCard, stunCard, shieldCard, sacrificeCard, unblockCard, swapCard,
  teleportCard, snapCard, blitzCard, moveTogetherCard, knightMoveCard } from '../js/cards2/move_cards.js';
import { makePiece } from '../js/engine2/pieces.js';
import { get, set } from '../js/engine2/board.js';
import { CHARACTER_PIECES } from '../config/characters.js';
import { ENEMIES } from '../config/enemies.js';
import { HAND_SIZE, REDRAW_COUNTDOWN_START } from '../config/game.js';

function freshGame(character = 'knight', enemy = 'pawn_pusher') {
  return new GameState(character, enemy);
}

test('new game returns board and hand and turn', () => {
  const state = freshGame();
  const d = state.toDict();
  expect(d.board).toBeDefined();
  expect(d.hand).toBeDefined();
  expect(d.turn).toBe('player');
});

test('knight character starts with correct player piece count', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const player = pieces.filter(p => p.color === 'white');
  expect(player).toHaveLength(CHARACTER_PIECES.knight.length);
});

test('pawn_pusher enemy starts with correct enemy piece count', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const enemy = pieces.filter(p => p.color === 'black');
  expect(enemy).toHaveLength(ENEMIES.pawn_pusher.pieces.length);
});

test('new game deals correct hand size', () => {
  const state = freshGame();
  expect(state.toDict().hand).toHaveLength(HAND_SIZE);
});

test('invalid character throws', () => {
  expect(() => new GameState('wizard')).toThrow();
});

test('invalid enemy throws', () => {
  expect(() => new GameState('knight', 'nonexistent_enemy')).toThrow();
});

test('legalDestinationsFor e1 king returns moves', () => {
  const state = freshGame();
  const dests = state.legalDestinationsFor('e1');
  expect(Array.isArray(dests)).toBe(true);
});

test('knightAttacks from e1 returns 4 squares', () => {
  const attacks = knightAttacks('e1');
  expect(attacks).toHaveLength(4);
  expect(attacks).toContain('d3');
  expect(attacks).toContain('f3');
});

test('geometricDestsFor bishop pattern returns diagonals only', () => {
  const state = freshGame();
  // a1 rook used with bishop pattern → diagonal only
  const dests = state.geometricDestsFor('a1', 'b');
  expect(dests.length).toBeGreaterThanOrEqual(0);
  // All dests must be diagonal from a1 (file 0, rank 0 in 0-indexed)
  for (const sq of dests) {
    const dc = Math.abs(sq.charCodeAt(0) - 'a'.charCodeAt(0));
    const dr = Math.abs(parseInt(sq[1]) - 1);
    expect(dc).toBe(dr);
  }
});

test('playPieceCard places a piece on the board', () => {
  const state = freshGame();
  // Find a piece card in hand
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'piece');
  if (idx === -1) return; // no piece card in hand, skip
  const card = d.hand[idx];
  const result = state.playPieceCard(idx, card.piece, 'h2');
  expect(result.error).toBeUndefined();
  expect(state.toDict().board['h2']).toBeDefined();
});

test('playPieceCard removes card from game (not discard)', () => {
  const state = freshGame();
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'piece');
  if (idx === -1) return;
  const card = d.hand[idx];
  const pieceCountBefore = d.hand.filter(c => c.type === 'piece' && c.piece === card.piece).length;
  state.playPieceCard(idx, card.piece, 'h2');
  expect(state.toDict().discard_size).toBe(0);
  expect(state.toDict().discard).toHaveLength(0);
  const pieceCountAfter = state.toDict().hand.filter(c => c.type === 'piece' && c.piece === card.piece).length;
  expect(pieceCountAfter).toBe(pieceCountBefore - 1);
});

test('playPieceCard on occupied square returns error', () => {
  const state = freshGame();
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'piece');
  if (idx === -1) return;
  const card = d.hand[idx];
  // e1 is occupied by player king
  const result = state.playPieceCard(idx, card.piece, 'e1');
  expect(result.error).toBeDefined();
});

test('playPieceCard on rank 5 returns error', () => {
  const state = freshGame();
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'piece');
  if (idx === -1) return;
  const card = d.hand[idx];
  const result = state.playPieceCard(idx, card.piece, 'e5');
  expect(result.error).toBeDefined();
});

test('toDict includes redraw_countdown', () => {
  const d = freshGame().toDict();
  expect(d.redraw_countdown).toBe(REDRAW_COUNTDOWN_START);
});

test('toDict does not include mana', () => {
  const d = freshGame().toDict();
  expect(d.mana).toBeUndefined();
});

test('toDict exposes deck and discard arrays', () => {
  const state = freshGame();
  const d = state.toDict();
  expect(Array.isArray(d.deck)).toBe(true);
  expect(Array.isArray(d.discard)).toBe(true);
});

test('applyPromotion on non-pawn square returns error', () => {
  const state = freshGame();
  // e1 has a king, not a promotable pawn
  const result = state.applyPromotion('e1', 'q');
  expect(result.error).toBeDefined();
});

test('redrawHand replaces hand', () => {
  const state = freshGame();
  const firstHand = state.toDict().hand.map(c => c.name);
  state.redrawCountdown = 0; // free redraw
  const result = state.redrawHand();
  expect(result.free).toBe(true);
  expect(result.ok).toBe(true);
  expect(state.toDict().hand).toHaveLength(6);
});

test('redrawHand when countdown > 0 does not execute enemy turn', () => {
  const state = freshGame();
  state.redrawCountdown = 2;
  const boardBefore = JSON.stringify(state.toDict().board);
  const result = state.redrawHand();
  expect(result.free).toBe(false);
  expect(result.ok).toBe(true);
  const boardAfter = JSON.stringify(state.toDict().board);
  expect(boardAfter).toBe(boardBefore);
  expect(state.turn).toBe('player');
});

test('redrawHand when countdown > 0 resets countdown to 5 immediately', () => {
  const state = freshGame();
  state.redrawCountdown = 2;
  const result = state.redrawHand();
  expect(result.free).toBe(false);
  // Countdown should be reset to 5 so that finishEnemyTurnSequence() decrements to 4
  expect(state.redrawCountdown).toBe(REDRAW_COUNTDOWN_START + 1);
});

test('after costly redraw + enemy turn, countdown is 4', () => {
  const state = freshGame();
  state.redrawCountdown = 2;
  state.redrawHand();
  // Simulate enemy turn finishing (which decrements countdown by 1)
  state.finishEnemyTurnSequence();
  expect(state.redrawCountdown).toBe(REDRAW_COUNTDOWN_START);
});

test('redrawHand replaces hand cards', () => {
  const state = freshGame();
  const firstHand = state.toDict().hand.map(c => c.name);
  state.redrawCountdown = 2;
  state.redrawHand();
  const secondHand = state.toDict().hand.map(c => c.name);
  // With probability essentially 1, at least one card should differ after a full reshuffle
  expect(secondHand).not.toEqual(firstHand);
});

describe('debugMovePiece', () => {
  test('moves piece without consuming card', () => {
    const state = freshGame();
    const d = state.toDict();
    // Find a white piece (player piece)
    let fromSq = null;
    for (const sq in d.board) {
      if (d.board[sq].color === 'white') {
        fromSq = sq;
        break;
      }
    }
    expect(fromSq).toBeDefined();
    
    const result = state.debugMovePiece(fromSq, 'h4');
    expect(result.error).toBeUndefined();
    const d2 = state.toDict();
    expect(d2.board[fromSq]).toBeUndefined();
    expect(d2.board['h4']).toBeDefined();
    expect(d2.board['h4'].type).toBe(d.board[fromSq].type);
    expect(d2.board['h4'].color).toBe('white');
  });

  test('returns error if no piece at source', () => {
    const state = freshGame();
    const result = state.debugMovePiece('h4', 'h5');
    expect(result.error).toBeDefined();
  });

  test('detects win if debug move captures enemy king', () => {
    const state = freshGame();
    const d = state.toDict();
    
    // Find the enemy king square
    let enemyKingSq = null;
    for (const sq in d.board) {
      if (d.board[sq].color === 'black' && d.board[sq].type === 'king') {
        enemyKingSq = sq;
        break;
      }
    }
    expect(enemyKingSq).toBeDefined();
    
    // Find a white piece
    let fromSq = null;
    for (const sq in d.board) {
      if (d.board[sq].color === 'white') {
        fromSq = sq;
        break;
      }
    }
    expect(fromSq).toBeDefined();
    
    const result = state.debugMovePiece(fromSq, enemyKingSq);
    expect(result.error).toBeUndefined();
    expect(state.turn).toBe('player_won');
  });

  test('detects promotion when moving pawn to rank 8', () => {
    const state = freshGame();
    // Move a pawn to rank 7 first using debug move
    let pawnSq = null;
    const d1 = state.toDict();
    for (const sq in d1.board) {
      if (d1.board[sq].color === 'white' && d1.board[sq].type === 'pawn') {
        pawnSq = sq;
        break;
      }
    }
    expect(pawnSq).toBeDefined();
    
    // Move pawn from rank 2 to rank 7
    const result1 = state.debugMovePiece(pawnSq, 'a7');
    expect(result1.error).toBeUndefined();
    expect(result1.needs_promotion).toBeUndefined();
    
    // Move pawn from rank 7 to rank 8 - should trigger promotion
    const result2 = state.debugMovePiece('a7', 'a8');
    expect(result2.error).toBeUndefined();
    expect(result2.needs_promotion).toBe(true);
  });
});


describe('pawn boost', () => {
  function makeStateWithPawnBoost(placements) {
    const state = new GameState('knight', 'pawn_pusher');
    // Clear board
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state._state.board[r][c] = null;
    // Place pieces
    for (const { sq, type, owner } of placements) {
      set(state._state.board, sq, makePiece(type, owner));
    }
    // Set hand to only pawn boost
    state._state.hand = [pawnBoostCard()];
    state._state.deck = [];
    state._state.discard = [];
    return state;
  }

  test('pawn can slide forward multiple squares', () => {
    const state = makeStateWithPawnBoost([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a2', type: 'pawn', owner: 'player' },
    ]);
    const dests = state.pawnBoostDestsFor('a2');
    expect(dests).toContain('a3');
    expect(dests).toContain('a4');
    expect(dests).toContain('a5');
    expect(dests).toContain('a6');
    expect(dests).toContain('a7');
    expect(dests).toContain('a8');
    expect(dests).toHaveLength(6);
  });

  test('non-pawn piece rejected', () => {
    const state = makeStateWithPawnBoost([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
    ]);
    expect(state.pawnBoostDestsFor('a1')).toHaveLength(0);
    const result = state.playPawnBoostCard(0, 'a1', 'a4');
    expect(result.error).toBeDefined();
  });

  test('blocked by friendly piece', () => {
    const state = makeStateWithPawnBoost([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a2', type: 'pawn', owner: 'player' },
      { sq: 'a5', type: 'pawn', owner: 'player' },
    ]);
    const dests = state.pawnBoostDestsFor('a2');
    expect(dests).toContain('a3');
    expect(dests).toContain('a4');
    expect(dests).not.toContain('a5');
    expect(dests).not.toContain('a6');
    expect(dests).toHaveLength(2);
  });

  test('can capture enemy piece at end of slide', () => {
    const state = makeStateWithPawnBoost([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a2', type: 'pawn', owner: 'player' },
      { sq: 'a6', type: 'pawn', owner: 'enemy' },
    ]);
    const dests = state.pawnBoostDestsFor('a2');
    expect(dests).toContain('a6');
    expect(dests).not.toContain('a7');
    const result = state.playPawnBoostCard(0, 'a2', 'a6');
    expect(result.error).toBeUndefined();
    expect(state.toDict().board['a6'].type).toBe('pawn');
    expect(state.toDict().board['a6'].color).toBe('white');
  });

  test('promotion on rank 8', () => {
    const state = makeStateWithPawnBoost([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a7', type: 'pawn', owner: 'player' },
    ]);
    const result = state.playPawnBoostCard(0, 'a7', 'a8');
    expect(result.error).toBeUndefined();
    expect(result.needs_promotion).toBeUndefined();
    const promo = state.checkPromotions();
    expect(promo.playerPromos).toEqual(['a8']);
  });
});



describe('move card promotion', () => {
  function makeStateWithMoveCard(placements) {
    const state = new GameState('knight', 'pawn_pusher');
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state._state.board[r][c] = null;
    for (const { sq, type, owner } of placements) {
      set(state._state.board, sq, makePiece(type, owner));
    }
    state._state.hand = [moveCard()];
    state._state.deck = [];
    state._state.discard = [];
    return state;
  }

  test('playMoveCard with pawn to rank 8 leaves pawn for checkPromotions', () => {
    const state = makeStateWithMoveCard([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a7', type: 'pawn', owner: 'player' },
    ]);
    const result = state.playMoveCard(0, 'a7', 'a8');
    expect(result.error).toBeUndefined();
    // Pawn should NOT be auto-promoted - should still be a pawn
    const board = state.toDict().board;
    expect(board['a8'].type).toBe('pawn');
    expect(board['a8'].color).toBe('white');
    // checkPromotions should detect it
    const promo = state.checkPromotions();
    expect(promo.playerPromos).toEqual(['a8']);
  });

  test('playMoveCard with explicit promotion choice works', () => {
    const state = makeStateWithMoveCard([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a7', type: 'pawn', owner: 'player' },
    ]);
    const result = state.playMoveCard(0, 'a7', 'a8', 'q');
    expect(result.error).toBeUndefined();
    // Pawn should be promoted to queen immediately
    const board = state.toDict().board;
    expect(board['a8'].type).toBe('queen');
    expect(board['a8'].color).toBe('white');
    // No pending promotions
    const promo = state.checkPromotions();
    expect(promo.playerPromos).toEqual([]);
  });
});
describe('new card play methods', () => {
  function makeStateWithCards(cards, placements) {
    const state = new GameState('knight', 'pawn_pusher');
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state._state.board[r][c] = null;
    for (const { sq, type, owner } of placements) {
      set(state._state.board, sq, makePiece(type, owner));
    }
    state._state.hand = cards;
    state._state.deck = [];
    state._state.discard = [];
    return state;
  }

  test('playSummonDuckCard places duck on empty square', () => {
    const state = makeStateWithCards([summonDuckCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const result = state.playSummonDuckCard(0, 'd4');
    expect(result.error).toBeUndefined();
    const board = state.toDict().board;
    expect(board['d4']).toBeDefined();
    expect(board['d4'].type).toBe('duck');
    expect(board['d4'].color).toBe('neutral');
  });

  test('playSummonDuckCard removes card from game (not discard)', () => {
    const state = makeStateWithCards([summonDuckCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    state.playSummonDuckCard(0, 'd4');
    expect(state.toDict().discard_size).toBe(0);
    expect(state._state.hand).toHaveLength(0);
  });

  test('playSummonDuckCard fails on occupied square', () => {
    const state = makeStateWithCards([summonDuckCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const result = state.playSummonDuckCard(0, 'e1');
    expect(result.error).toBeDefined();
  });

  test('playMoveDuckCard moves duck from one square to another', () => {
    const state = makeStateWithCards([moveDuckCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'duck', owner: 'neutral' },
    ]);
    const result = state.playMoveDuckCard(0, 'd4', 'f5');
    expect(result.error).toBeUndefined();
    const board = state.toDict().board;
    expect(board['d4']).toBeUndefined();
    expect(board['f5']).toBeDefined();
    expect(board['f5'].type).toBe('duck');
  });

  test('playMoveDuckCard fails if no duck at source', () => {
    const state = makeStateWithCards([moveDuckCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const result = state.playMoveDuckCard(0, 'd4', 'f5');
    expect(result.error).toBeDefined();
  });

  test('playStunCard adds stunned tag and sets stunTurns=2', () => {
    const state = makeStateWithCards([stunCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'enemy' },
    ]);
    const result = state.playStunCard(0, 'd4');
    expect(result.error).toBeUndefined();
    const piece = get(state._state.board, 'd4');
    expect(piece.tags.has('stunned')).toBe(true);
    expect(piece.data.stunTurns).toBe(2);
  });

  test('stun decays after 2 turns', () => {
    const state = makeStateWithCards([stunCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'enemy' },
    ]);
    state.playStunCard(0, 'd4');
    const piece = get(state._state.board, 'd4');

    // After 1 decay: still stunned
    state._decayStunStatuses();
    expect(piece.tags.has('stunned')).toBe(true);
    expect(piece.data.stunTurns).toBe(1);

    // After 2nd decay: tag removed
    state._decayStunStatuses();
    expect(piece.tags.has('stunned')).toBe(false);
    expect(piece.data.stunTurns).toBeUndefined();
  });

  test('stun on enemy lasts exactly 2 enemy turns via turn cycle', () => {
    const state = makeStateWithCards([stunCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'enemy' },
    ]);
    state.playStunCard(0, 'd4');
    const piece = get(state._state.board, 'd4');
    expect(piece.data.stunTurns).toBe(2);

    // End player turn, start enemy turn — should NOT decay stun yet
    state.startEnemyTurn();
    expect(piece.tags.has('stunned')).toBe(true);
    expect(piece.data.stunTurns).toBe(2);

    // End enemy turn — this is where decay happens
    state.finishEnemyTurnSequence();
    expect(piece.tags.has('stunned')).toBe(true);
    expect(piece.data.stunTurns).toBe(1);

    // Next turn cycle — enemy turn 2, should still be stunned
    state.startEnemyTurn();
    expect(piece.tags.has('stunned')).toBe(true);
    expect(piece.data.stunTurns).toBe(1);

    // End enemy turn 2 — stun expires
    state.finishEnemyTurnSequence();
    expect(piece.tags.has('stunned')).toBe(false);
    expect(piece.data.stunTurns).toBeUndefined();
  });

  test('playShieldCard adds shielded tag and attaches effect', () => {
    const state = makeStateWithCards([shieldCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const result = state.playShieldCard(0, 'd4');
    expect(result.error).toBeUndefined();
    const piece = get(state._state.board, 'd4');
    expect(piece.tags.has('shielded')).toBe(true);
    expect(state._state._effects).toBeDefined();
    expect(state._state._effects.pieces.has(piece.id)).toBe(true);
  });

  test('playSacrificeCard destroys friendly and weaker enemy', () => {
    const state = makeStateWithCards([sacrificeCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
    ]);
    const result = state.playSacrificeCard(0, 'd4', 'd5');
    expect(result.error).toBeUndefined();
    const board = state.toDict().board;
    expect(board['d4']).toBeUndefined();
    expect(board['d5']).toBeUndefined();
  });

  test('playSacrificeCard fails if enemy is stronger or equal', () => {
    const state = makeStateWithCards([sacrificeCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'pawn', owner: 'player' },
      { sq: 'd5', type: 'rook', owner: 'enemy' },
    ]);
    const result = state.playSacrificeCard(0, 'd4', 'd5');
    expect(result.error).toBeDefined();
    const board = state.toDict().board;
    expect(board['d4']).toBeDefined();
    expect(board['d5']).toBeDefined();
  });

  test('playUnblockCard adds ghost tag and sets ghostTurns', () => {
    const state = makeStateWithCards([unblockCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const result = state.playUnblockCard(0, 'd4');
    expect(result.error).toBeUndefined();
    const piece = get(state._state.board, 'd4');
    expect(piece.tags.has('ghost')).toBe(true);
    expect(piece.data.ghostTurns).toBe(5);
  });

  test('legalMovesForPiece returns legal destinations for any piece', () => {
    const state = makeStateWithCards([], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'f6', type: 'knight', owner: 'enemy' },
    ]);
    // Player rook at d4 should have legal moves
    const moves = state.legalMovesForPiece('d4');
    expect(moves.length).toBeGreaterThan(0);
    // Enemy knight at f6 should have legal moves
    const enemyMoves = state.legalMovesForPiece('f6');
    expect(enemyMoves.length).toBeGreaterThan(0);
    // Empty square returns empty array
    expect(state.legalMovesForPiece('a1')).toHaveLength(0);
  });

  test('playSwapMoveCard swaps two friendly pieces', () => {
    const state = makeStateWithCards([swapCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'f6', type: 'bishop', owner: 'player' },
    ]);
    const result = state.playSwapMoveCard(0, 'd4', 'f6');
    expect(result.error).toBeUndefined();
    const board = state.toDict().board;
    expect(board['d4'].type).toBe('bishop');
    expect(board['f6'].type).toBe('rook');
  });

  test('playSwapMoveCard fails if either square is empty', () => {
    const state = makeStateWithCards([swapCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const result = state.playSwapMoveCard(0, 'd4', 'f6');
    expect(result.error).toBeDefined();
  });

  test('playSwapMoveCard fails if target is enemy piece', () => {
    const state = makeStateWithCards([swapCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'f6', type: 'bishop', owner: 'enemy' },
    ]);
    const result = state.playSwapMoveCard(0, 'd4', 'f6');
    expect(result.error).toBeDefined();
  });

  test('playSwapMoveCard validates card is move type with swap variant', () => {
    const state = makeStateWithCards([{ name: 'Swap', type: 'action', actionType: 'swap' }], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'f6', type: 'bishop', owner: 'player' },
    ]);
    const result = state.playSwapMoveCard(0, 'd4', 'f6');
    expect(result.error).toBeDefined();
  });

  test('playTeleportCard moves piece to empty square', () => {
    const state = makeStateWithCards([teleportCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
    ]);
    const result = state.playTeleportCard(0, 'd4', 'h1');
    expect(result.error).toBeUndefined();
    const board = state.toDict().board;
    expect(board['d4']).toBeUndefined();
    expect(board['h1'].type).toBe('rook');
  });

  test('playTeleportCard fails if destination occupied', () => {
    const state = makeStateWithCards([teleportCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'h1', type: 'pawn', owner: 'player' },
    ]);
    const result = state.playTeleportCard(0, 'd4', 'h1');
    expect(result.error).toBeDefined();
  });

  test('playTeleportCard fails if no friendly piece at source', () => {
    const state = makeStateWithCards([teleportCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    const result = state.playTeleportCard(0, 'd4', 'h1');
    expect(result.error).toBeDefined();
  });

  test('playTeleportCard leaves pawn on rank 8, checkPromotions detects it', () => {
    const state = makeStateWithCards([teleportCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a7', type: 'pawn', owner: 'player' },
    ]);
    const result = state.playTeleportCard(0, 'a7', 'a8');
    expect(result.error).toBeUndefined();
    expect(result.needs_promotion).toBeUndefined();
    // Pawn is still a pawn after teleport
    const board = state.toDict().board;
    expect(board['a8'].type).toBe('pawn');
    // Global check detects it
    const promo = state.checkPromotions();
    expect(promo.playerPromos).toEqual(['a8']);
  });

  test('full promotion flow: teleport + checkPromotions + applyPromotion', () => {
    const state = makeStateWithCards([teleportCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a7', type: 'pawn', owner: 'player' },
    ]);
    state.playTeleportCard(0, 'a7', 'a8');
    const promo = state.checkPromotions();
    expect(promo.playerPromos).toEqual(['a8']);
    state.applyPromotion('a8', 'q');
    const board = state.toDict().board;
    expect(board['a8'].type).toBe('queen');
    expect(board['a8'].color).toBe('white');
    // No more promotions needed
    expect(state.checkPromotions().playerPromos).toEqual([]);
  });

  test('knight move to rank 8 triggers promotion via checkPromotions', () => {
    const state = makeStateWithCards([knightMoveCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'b6', type: 'pawn', owner: 'player' },
    ]);
    const result = state.playKnightMoveCard(0, 'b6', 'a8');
    expect(result.error).toBeUndefined();
    expect(result.needs_promotion).toBeUndefined();
    const promo = state.checkPromotions();
    expect(promo.playerPromos).toEqual(['a8']);
  });

  test('enemy pawn auto-promotes to queen on rank 1 via checkPromotions', () => {
    const state = makeStateWithCards([teleportCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
    ]);
    // Manually place enemy pawn on rank 1 (a1 = row 7, col 0)
    const enemyPawn = makePiece('pawn', 'enemy');
    state._state.board[7][0] = enemyPawn;
    const promo = state.checkPromotions();
    expect(promo.autoPromoted).toEqual(['a1']);
    expect(state.toDict().board['a1'].type).toBe('queen');
    expect(state.toDict().board['a1'].color).toBe('black');
  });

  test('no phantom promotion after promoting pawn', () => {
    const state = makeStateWithCards([teleportCard(), knightMoveCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a7', type: 'pawn', owner: 'player' },
      { sq: 'b1', type: 'knight', owner: 'player' },
    ]);
    // Teleport pawn to a8
    state.playTeleportCard(0, 'a7', 'a8');
    state.checkPromotions();
    state.applyPromotion('a8', 'q');
    // Now move knight - should NOT trigger promotion
    state.playKnightMoveCard(1, 'b1', 'c3');
    const promo = state.checkPromotions();
    expect(promo.playerPromos).toEqual([]);
  });

  test('playSnapCard captures enemy without moving', () => {
    const state = makeStateWithCards([snapCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'enemy' },
    ]);
    const result = state.playSnapCard(0, 'd4', 'd5');
    expect(result.error).toBeUndefined();
    const board = state.toDict().board;
    expect(board['d4'].type).toBe('rook');
    expect(board['d5']).toBeUndefined();
  });

  test('playSnapCard fails if target is not a legal capture', () => {
    const state = makeStateWithCards([snapCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'h8', type: 'pawn', owner: 'enemy' },
    ]);
    const result = state.playSnapCard(0, 'd4', 'h8');
    expect(result.error).toBeDefined();
  });

  test('playSnapCard fails if target is friendly', () => {
    const state = makeStateWithCards([snapCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd4', type: 'rook', owner: 'player' },
      { sq: 'd5', type: 'pawn', owner: 'player' },
    ]);
    const result = state.playSnapCard(0, 'd4', 'd5');
    expect(result.error).toBeDefined();
  });

  test('playBlitzFirstMove moves piece and stores state', () => {
    const state = makeStateWithCards([blitzCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
    ]);
    const result = state.playBlitzFirstMove(0, 'a1', 'a4');
    expect(result.error).toBeUndefined();
    expect(state.toDict().board['a1']).toBeUndefined();
    expect(state.toDict().board['a4'].type).toBe('rook');
    expect(state._blitzPieceSq).toBe('a4');
    expect(state._blitzCardIndex).toBe(0);
  });

  test('playBlitzSecondMove moves again and discards card', () => {
    const state = makeStateWithCards([blitzCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
    ]);
    state.playBlitzFirstMove(0, 'a1', 'a4');
    const result = state.playBlitzSecondMove('a6');
    expect(result.error).toBeUndefined();
    expect(state.toDict().board['a4']).toBeUndefined();
    expect(state.toDict().board['a6'].type).toBe('rook');
    expect(state._state.hand).toHaveLength(0);
  });

  test('playBlitzSecondMove fails if no blitz state', () => {
    const state = makeStateWithCards([blitzCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
    ]);
    const result = state.playBlitzSecondMove('a4');
    expect(result.error).toBeDefined();
  });

  test('blitz state clears on enemy turn start', () => {
    const state = makeStateWithCards([blitzCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
    ]);
    state.playBlitzFirstMove(0, 'a1', 'a4');
    expect(state._blitzPieceSq).toBe('a4');
    state.startEnemyTurn();
    expect(state._blitzPieceSq).toBeNull();
  });

  test('blitz second move has legal destinations after first move', () => {
    const state = makeStateWithCards([blitzCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
    ]);
    state.playBlitzFirstMove(0, 'a1', 'a4');
    const dests = state.legalDestinationsFor('a4');
    expect(dests.length).toBeGreaterThan(0);
  });

  test('playMoveTogetherFirst moves piece and stores state', () => {
    const state = makeStateWithCards([moveTogetherCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
      { sq: 'b1', type: 'knight', owner: 'player' },
    ]);
    const result = state.playMoveTogetherFirst(0, 'a1', 'a4');
    expect(result.error).toBeUndefined();
    expect(state.toDict().board['a1']).toBeUndefined();
    expect(state.toDict().board['a4'].type).toBe('rook');
    expect(state._moveTogetherFirstPieceSq).toBe('a4');
    expect(state._moveTogetherCardIndex).toBe(0);
    expect(state._state.hand).toHaveLength(1);
  });

  test('playMoveTogetherSecond moves second piece and discards card', () => {
    const state = makeStateWithCards([moveTogetherCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
      { sq: 'b1', type: 'knight', owner: 'player' },
    ]);
    state.playMoveTogetherFirst(0, 'a1', 'a4');
    const result = state.playMoveTogetherSecond('b1', 'c3');
    expect(result.error).toBeUndefined();
    expect(state.toDict().board['b1']).toBeUndefined();
    expect(state.toDict().board['c3'].type).toBe('knight');
    expect(state._state.hand).toHaveLength(0);
  });

  test('playMoveTogetherSecond fails if same piece', () => {
    const state = makeStateWithCards([moveTogetherCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
      { sq: 'b1', type: 'knight', owner: 'player' },
    ]);
    state.playMoveTogetherFirst(0, 'a1', 'a4');
    const result = state.playMoveTogetherSecond('a4', 'a6');
    expect(result.error).toBeDefined();
  });

  test('playMoveTogetherSecond fails if no state', () => {
    const state = makeStateWithCards([moveTogetherCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'b1', type: 'knight', owner: 'player' },
    ]);
    const result = state.playMoveTogetherSecond('b1', 'c3');
    expect(result.error).toBeDefined();
  });

  test('move together state clears on enemy turn start', () => {
    const state = makeStateWithCards([moveTogetherCard()], [
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'a1', type: 'rook', owner: 'player' },
      { sq: 'b1', type: 'knight', owner: 'player' },
    ]);
    state.playMoveTogetherFirst(0, 'a1', 'a4');
    expect(state._moveTogetherFirstPieceSq).toBe('a4');
    state.startEnemyTurn();
    expect(state._moveTogetherFirstPieceSq).toBeNull();
  });
});
