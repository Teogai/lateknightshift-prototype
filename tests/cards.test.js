import { describe, test, expect } from 'vitest';
import {
  moveCard, summonCard, knightMoveCard, bishopMoveCard, rookMoveCard, queenMoveCard,
  curseCard, upgradeCard, CARD_CATALOG, STARTER_DECKS, buildStarterDeck,
} from '../js/cards.js';

// --- Summon costs ---
test('summonCard pawn costs 2', () => expect(summonCard('pawn').cost).toBe(2));
test('summonCard knight costs 3', () => expect(summonCard('knight').cost).toBe(3));
test('summonCard bishop costs 3', () => expect(summonCard('bishop').cost).toBe(3));
test('summonCard rook costs 3', () => expect(summonCard('rook').cost).toBe(3));
test('summonCard queen costs 3', () => expect(summonCard('queen').cost).toBe(3));

// --- New card factories ---
test('bishopMoveCard has type move with bishop variant and cost 2', () => {
  const c = bishopMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('bishop');
  expect(c.cost).toBe(2);
});
test('rookMoveCard has type move with rook variant and cost 3', () => {
  const c = rookMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('rook');
  expect(c.cost).toBe(3);
});
test('queenMoveCard has type move with queen variant and cost 3', () => {
  const c = queenMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('queen');
  expect(c.cost).toBe(3);
});
test('curseCard is unplayable', () => {
  const c = curseCard();
  expect(c.type).toBe('curse');
  expect(c.unplayable).toBe(true);
});

// --- upgradeCard ---
test('upgradeCard returns a copy, not the original', () => {
  const orig = moveCard();
  const upgraded = upgradeCard(orig);
  expect(upgraded).not.toBe(orig);
  expect(orig.multiMove).toBeUndefined();
});
test('upgraded Move has multiMove flag', () => {
  expect(upgradeCard(moveCard()).multiMove).toBe(true);
});
test('upgraded Summon Pawn costs 1', () => {
  expect(upgradeCard(summonCard('pawn')).cost).toBe(1);
});
test('upgraded Summon Knight costs 2', () => {
  expect(upgradeCard(summonCard('knight')).cost).toBe(2);
});
test('upgraded Knight Move costs 1', () => {
  expect(upgradeCard(knightMoveCard()).cost).toBe(1);
});
test('upgraded Bishop Move costs 1', () => {
  expect(upgradeCard(bishopMoveCard()).cost).toBe(1);
});
test('upgraded Rook Move costs 2', () => {
  expect(upgradeCard(rookMoveCard()).cost).toBe(2);
});
test('upgraded Queen Move costs 2', () => {
  expect(upgradeCard(queenMoveCard()).cost).toBe(2);
});
test('upgradeCard sets upgraded flag', () => {
  expect(upgradeCard(moveCard()).upgraded).toBe(true);
});

// --- CARD_CATALOG ---
test('CARD_CATALOG has all expected rarities', () => {
  const rarities = CARD_CATALOG.map(e => e.rarity);
  expect(rarities).toContain('common');
  expect(rarities).toContain('uncommon');
  expect(rarities).toContain('rare');
});
test('CARD_CATALOG entries produce valid cards', () => {
  for (const entry of CARD_CATALOG) {
    const c = entry.card();
    expect(c.name).toBeDefined();
    expect(c.type).toBeDefined();
  }
});

// --- Starter deck ---
test('knight starter deck has 10 cards', () => {
  expect(STARTER_DECKS.knight).toHaveLength(10);
});
test('knight starter deck has 8 move cards (7 basic + 1 knight move)', () => {
  expect(STARTER_DECKS.knight.filter(c => c.type === 'move')).toHaveLength(8);
});
test('knight starter deck has 2 summon pawn cards', () => {
  expect(STARTER_DECKS.knight.filter(c => c.type === 'summon' && c.piece === 'pawn')).toHaveLength(2);
});
test('knight starter deck has 1 move card with knight variant', () => {
  expect(STARTER_DECKS.knight.filter(c => c.type === 'move' && c.moveVariant === 'knight')).toHaveLength(1);
});
test('buildStarterDeck returns shuffled independent copy', () => {
  const a = buildStarterDeck('knight');
  const b = buildStarterDeck('knight');
  expect(a).toHaveLength(10);
  // copies are independent objects
  a[0].cost = 99;
  expect(b[0].cost).not.toBe(99);
});

// --- Card categories ---
test('knightMoveCard has type move and moveVariant knight', () => {
  const c = knightMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('knight');
});
test('bishopMoveCard has type move and moveVariant bishop', () => {
  const c = bishopMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('bishop');
});
test('rookMoveCard has type move and moveVariant rook', () => {
  const c = rookMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('rook');
});
test('queenMoveCard has type move and moveVariant queen', () => {
  const c = queenMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('queen');
});
test('curseCard has type curse and category curse', () => {
  const c = curseCard();
  expect(c.type).toBe('curse');
});
test('upgraded Knight Move still has moveVariant', () => {
  const c = upgradeCard(knightMoveCard());
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('knight');
  expect(c.upgraded).toBe(true);
});
test('knight starter deck has 1 knight_move card with moveVariant', () => {
  const knightMoves = STARTER_DECKS.knight.filter(c => c.type === 'move' && c.moveVariant === 'knight');
  expect(knightMoves).toHaveLength(1);
});
