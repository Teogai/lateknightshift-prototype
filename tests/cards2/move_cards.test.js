import { describe, test, expect } from 'vitest';
import {
  moveCard, knightMoveCard, bishopMoveCard, rookMoveCard, queenMoveCard,
  summonCard, curseCard, upgradeCard,
  CARD_CATALOG, STARTER_DECKS, buildStarterDeck, dealHand,
} from '../../js/cards2/move_cards.js';

// --- card shape ---
test('moveCard has type move cost 1', () => {
  const c = moveCard(1);
  expect(c.type).toBe('move');
  expect(c.cost).toBe(1);
});

test('knightMoveCard has moveVariant knight', () => {
  const c = knightMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('knight');
  expect(c.cost).toBe(2);
});

test('bishopMoveCard has moveVariant bishop', () => {
  const c = bishopMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('bishop');
  expect(c.cost).toBe(2);
});

test('rookMoveCard has moveVariant rook', () => {
  const c = rookMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('rook');
  expect(c.cost).toBe(3);
});

test('queenMoveCard has moveVariant queen', () => {
  const c = queenMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('queen');
  expect(c.cost).toBe(3);
});

test('summonCard pawn costs 2', () => expect(summonCard('pawn').cost).toBe(2));
test('summonCard knight costs 3', () => expect(summonCard('knight').cost).toBe(3));
test('summonCard rook costs 3', () => expect(summonCard('rook').cost).toBe(3));
test('summonCard queen costs 3', () => expect(summonCard('queen').cost).toBe(3));

test('curseCard is unplayable', () => {
  const c = curseCard();
  expect(c.type).toBe('curse');
  expect(c.unplayable).toBe(true);
});

// --- upgradeCard ---
test('upgradeCard Move gets multiMove', () => {
  const c = upgradeCard(moveCard());
  expect(c.multiMove).toBe(true);
  expect(c.upgraded).toBe(true);
});

test('upgradeCard Summon Pawn costs 1', () => {
  expect(upgradeCard(summonCard('pawn')).cost).toBe(1);
});

test('upgradeCard returns copy not original', () => {
  const orig = moveCard();
  const up = upgradeCard(orig);
  expect(up).not.toBe(orig);
  expect(orig.multiMove).toBeUndefined();
});

// --- CARD_CATALOG, STARTER_DECKS ---
test('CARD_CATALOG has at least 10 entries', () => {
  expect(CARD_CATALOG.length).toBeGreaterThanOrEqual(10);
});

test('STARTER_DECKS knight has 10 cards', () => {
  expect(STARTER_DECKS.knight).toHaveLength(10);
});

test('buildStarterDeck returns 10 cards', () => {
  const deck = buildStarterDeck('knight');
  expect(deck).toHaveLength(10);
});

test('buildStarterDeck throws on unknown character', () => {
  expect(() => buildStarterDeck('wizard')).toThrow();
});

test('dealHand returns hand of size 6', () => {
  const deck = buildStarterDeck('knight');
  const { hand, deck: remaining } = dealHand(deck, 6);
  expect(hand).toHaveLength(6);
  expect(remaining).toHaveLength(4);
});
