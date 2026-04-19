import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';
import { bishopMoveCard, rookMoveCard, queenMoveCard, moveCard, summonCard } from '../js/cards.js';
import { Chess } from 'chess.js';

// --- persistentDeck ---
test('persistentDeck is used instead of starter deck', () => {
  const deck = [moveCard(), moveCard(), moveCard(), summonCard('pawn'), summonCard('pawn'),
                moveCard(), moveCard(), moveCard(), moveCard(), moveCard()];
  const gs = new GameState('knight', 'pawn_pusher', deck);
  // All cards in hand + deck should be move or summon
  const all = [...gs.hand, ...gs.deck, ...gs.discard];
  expect(all.every(c => c.type === 'move' || c.type === 'summon')).toBe(true);
});

// --- startingPieces ---
test('startingPieces are placed on board', () => {
  const extra = [{ piece: { type: 'r', color: 'w' }, square: 'h1' }];
  const gs = new GameState('knight', 'pawn_pusher', null, extra);
  const board = gs.toDict().board;
  expect(board['h1']?.type).toBe('rook');
  expect(board['h1']?.color).toBe('white');
});
test('startingPieces are skipped if square occupied', () => {
  // a1 is never occupied by default knight setup, e1 is the white king
  const extra = [{ piece: { type: 'r', color: 'w' }, square: 'e1' }];
  const gs = new GameState('knight', 'pawn_pusher', null, extra);
  const board = gs.toDict().board;
  // e1 still has king (not replaced)
  expect(board['e1']?.type).toBe('king');
});

// --- bishopMoveCard ---
test('bishopMoveCard moves any piece diagonally', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs._chess.clear();
  gs._chess.put({ type: 'k', color: 'w' }, 'e1');
  gs._chess.put({ type: 'k', color: 'b' }, 'e8');
  gs._chess.put({ type: 'r', color: 'w' }, 'd2');
  gs.hand = [bishopMoveCard()];
  gs.mana = 3;
  const result = gs.playBishopMoveCard(0, 'd2', 'f4');
  expect(result.ok).toBe(true);
  expect(gs._chess.get('f4')?.type).toBe('r');
});
test('bishopMoveCard rejects straight-line destination', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs._chess.clear();
  gs._chess.put({ type: 'k', color: 'w' }, 'e1');
  gs._chess.put({ type: 'k', color: 'b' }, 'e8');
  gs._chess.put({ type: 'r', color: 'w' }, 'd2');
  gs.hand = [bishopMoveCard()];
  gs.mana = 3;
  const result = gs.playBishopMoveCard(0, 'd2', 'd5');
  expect(result.error).toBeDefined();
});

// --- rookMoveCard ---
test('rookMoveCard moves any piece in straight line', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs._chess.clear();
  gs._chess.put({ type: 'k', color: 'w' }, 'e1');
  gs._chess.put({ type: 'k', color: 'b' }, 'e8');
  gs._chess.put({ type: 'b', color: 'w' }, 'a1');
  gs.hand = [rookMoveCard()];
  gs.mana = 3;
  const result = gs.playRookMoveCard(0, 'a1', 'a5');
  expect(result.ok).toBe(true);
  expect(gs._chess.get('a5')?.type).toBe('b');
});
test('rookMoveCard rejects diagonal destination', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs._chess.clear();
  gs._chess.put({ type: 'k', color: 'w' }, 'e1');
  gs._chess.put({ type: 'k', color: 'b' }, 'e8');
  gs._chess.put({ type: 'b', color: 'w' }, 'a1');
  gs.hand = [rookMoveCard()];
  gs.mana = 3;
  const result = gs.playRookMoveCard(0, 'a1', 'c3');
  expect(result.error).toBeDefined();
});

// --- queenMoveCard ---
test('queenMoveCard moves diagonally', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs._chess.clear();
  gs._chess.put({ type: 'k', color: 'w' }, 'e1');
  gs._chess.put({ type: 'k', color: 'b' }, 'e8');
  gs._chess.put({ type: 'p', color: 'w' }, 'b2');
  gs.hand = [queenMoveCard()];
  gs.mana = 3;
  const result = gs.playQueenMoveCard(0, 'b2', 'd4');
  expect(result.ok).toBe(true);
});
test('queenMoveCard moves straight', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs._chess.clear();
  gs._chess.put({ type: 'k', color: 'w' }, 'e1');
  gs._chess.put({ type: 'k', color: 'b' }, 'e8');
  gs._chess.put({ type: 'p', color: 'w' }, 'b2');
  gs.hand = [queenMoveCard()];
  gs.mana = 3;
  const result = gs.playQueenMoveCard(0, 'b2', 'b6');
  expect(result.ok).toBe(true);
});

// --- geometricDestsFor ---
test('geometricDestsFor bishop pattern returns diagonals', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs._chess.clear();
  gs._chess.put({ type: 'k', color: 'w' }, 'e1');
  gs._chess.put({ type: 'k', color: 'b' }, 'e8');
  gs._chess.put({ type: 'r', color: 'w' }, 'd4');
  const dests = gs.geometricDestsFor('d4', 'b');
  expect(dests).toContain('e5');
  expect(dests).toContain('c3');
  expect(dests).not.toContain('d5');
});
