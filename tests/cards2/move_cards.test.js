import { describe, test, expect } from 'vitest';
import {
  moveCard, knightMoveCard, bishopMoveCard, rookMoveCard, queenMoveCard, pawnBoostCard,
  summonCard, curseCard, upgradeCard,
  summonDuckCard, moveDuckCard, stunCard, shieldCard, sacrificeCard, unblockCard,
  CARD_CATALOG, STARTER_DECKS, buildStarterDeck, dealHand,
} from '../../js/cards2/move_cards.js';

// --- card shape ---
test('moveCard has type move', () => {
  const c = moveCard();
  expect(c.type).toBe('move');
});

test('knightMoveCard has moveVariant knight', () => {
  const c = knightMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('knight');
});

test('bishopMoveCard has moveVariant bishop', () => {
  const c = bishopMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('bishop');
});

test('rookMoveCard has moveVariant rook', () => {
  const c = rookMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('rook');
});

test('queenMoveCard has moveVariant queen', () => {
  const c = queenMoveCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('queen');
});

test('pawnBoostCard has moveVariant pawn_boost', () => {
  const c = pawnBoostCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('pawn_boost');
});

test('summonCard pawn has correct type and piece', () => {
  const c = summonCard('pawn');
  expect(c.type).toBe('summon');
  expect(c.piece).toBe('pawn');
});

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

test('CARD_CATALOG includes pawn boost as common', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Pawn Boost');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe('common');
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

// --- image propagation ---
test('CARD_CATALOG pawn_boost includes image from config', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Pawn Boost');
  expect(entry).toBeDefined();
  expect(entry.card().image).toBe('./pieces/pawn-boost.png');
});

test('upgradeCard preserves image field', () => {
  const c = { name: 'Test', type: 'move', image: './pieces/test.jpg' };
  const up = upgradeCard(c);
  expect(up.image).toBe('./pieces/test.jpg');
});

test('cards without image config do not have image field', () => {
  const c = moveCard();
  expect(c.image).toBeUndefined();
});

test('summonDuckCard has type summon_duck', () => {
  const c = summonDuckCard();
  expect(c.type).toBe('summon_duck');
});

test('moveDuckCard has type move_duck', () => {
  const c = moveDuckCard();
  expect(c.type).toBe('move_duck');
});

test('stunCard has type stun', () => {
  const c = stunCard();
  expect(c.type).toBe('stun');
});

test('shieldCard has type shield', () => {
  const c = shieldCard();
  expect(c.type).toBe('shield');
});

test('sacrificeCard has type sacrifice', () => {
  const c = sacrificeCard();
  expect(c.type).toBe('sacrifice');
});

test('unblockCard has type unblock', () => {
  const c = unblockCard();
  expect(c.type).toBe('unblock');
});

test('CARD_CATALOG includes Summon Duck as uncommon', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Summon Duck');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe('uncommon');
});

test('CARD_CATALOG includes Move Duck as common', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Move Duck');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe('common');
});
