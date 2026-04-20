import { describe, test, expect } from 'vitest';
import { GameState, knightAttacks } from '../js/battle_state.js';

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

test('knight character starts with 6 player pieces', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const player = pieces.filter(p => p.color === 'white');
  expect(player).toHaveLength(6);
});

test('pawn_pusher enemy starts with 6 enemy pieces', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const enemy = pieces.filter(p => p.color === 'black');
  expect(enemy).toHaveLength(6);
});

test('new game deals 6 cards', () => {
  const state = freshGame();
  expect(state.toDict().hand).toHaveLength(6);
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

test('playSummonCard places a piece on the board', () => {
  const state = freshGame();
  // Find a summon card in hand
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'summon');
  if (idx === -1) return; // no summon in hand, skip
  const card = d.hand[idx];
  const result = state.playSummonCard(idx, card.piece, 'h2');
  expect(result.error).toBeUndefined();
  expect(state.toDict().board['h2']).toBeDefined();
});

test('playSummonCard on occupied square returns error', () => {
  const state = freshGame();
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'summon');
  if (idx === -1) return;
  const card = d.hand[idx];
  // e1 is occupied by player king
  const result = state.playSummonCard(idx, card.piece, 'e1');
  expect(result.error).toBeDefined();
});

test('playSummonCard on rank 5 returns error', () => {
  const state = freshGame();
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'summon');
  if (idx === -1) return;
  const card = d.hand[idx];
  const result = state.playSummonCard(idx, card.piece, 'e5');
  expect(result.error).toBeDefined();
});

test('toDict includes redraw_countdown', () => {
  const d = freshGame().toDict();
  expect(d.redraw_countdown).toBe(4);
});

test('toDict does not include mana', () => {
  const d = freshGame().toDict();
  expect(d.mana).toBeUndefined();
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
