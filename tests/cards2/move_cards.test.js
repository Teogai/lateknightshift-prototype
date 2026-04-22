import { describe, test, expect } from 'vitest';
import {
  moveCard, knightMoveCard, bishopMoveCard, rookMoveCard, queenMoveCard, pawnBoostCard,
  pieceCard, curseCard, upgradeCard,
  summonDuckCard, moveDuckCard, stunCard, shieldCard, sacrificeCard, unblockCard, swapCard,
  teleportCard, snapCard, blitzCard, moveTogetherCard,
  CARD_CATALOG, STARTER_DECKS, buildStarterDeck, dealHand,
} from '../../js/cards2/move_cards.js';
import { STARTER_DECK_DEFS, CARD_DEFS } from '../../config/cards.js';
import { HAND_SIZE } from '../../config/game.js';

const KNIGHT_DECK_SIZE = STARTER_DECK_DEFS.knight.reduce((sum, c) => sum + c.count, 0);

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

test('pieceCard pawn has correct type and piece', () => {
  const c = pieceCard('pawn');
  expect(c.type).toBe('piece');
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

test('STARTER_DECKS knight has correct deck size', () => {
  expect(STARTER_DECKS.knight).toHaveLength(KNIGHT_DECK_SIZE);
});

test('buildStarterDeck returns correct deck size', () => {
  const deck = buildStarterDeck('knight');
  expect(deck).toHaveLength(KNIGHT_DECK_SIZE);
});

test('buildStarterDeck throws on unknown character', () => {
  expect(() => buildStarterDeck('wizard')).toThrow();
});

test('dealHand returns hand of correct size', () => {
  const deck = buildStarterDeck('knight');
  const { hand, deck: remaining } = dealHand(deck, HAND_SIZE);
  expect(hand).toHaveLength(HAND_SIZE);
  expect(remaining).toHaveLength(KNIGHT_DECK_SIZE - HAND_SIZE);
});

// --- image propagation ---
test('CARD_CATALOG pawn_boost includes image from config', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Pawn Boost');
  expect(entry).toBeDefined();
  expect(entry.card().image).toBe('./img/pawn-boost.png');
});

test('upgradeCard preserves image field', () => {
  const c = { name: 'Test', type: 'move', image: './img/test.jpg' };
  const up = upgradeCard(c);
  expect(up.image).toBe('./img/test.jpg');
});

test('cards without image config do not have image field', () => {
  const c = moveCard();
  expect(c.image).toBeUndefined();
});

test('summonDuckCard has type piece and piece duck', () => {
  const c = summonDuckCard();
  expect(c.type).toBe('piece');
  expect(c.piece).toBe('duck');
});

test('moveDuckCard has type move and moveVariant duck', () => {
  const c = moveDuckCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('duck');
});

test('stunCard has type action and actionType stun', () => {
  const c = stunCard();
  expect(c.type).toBe('action');
  expect(c.actionType).toBe('stun');
});

test('shieldCard has type action and actionType shield', () => {
  const c = shieldCard();
  expect(c.type).toBe('action');
  expect(c.actionType).toBe('shield');
});

test('sacrificeCard has type action and actionType sacrifice', () => {
  const c = sacrificeCard();
  expect(c.type).toBe('action');
  expect(c.actionType).toBe('sacrifice');
});

test('unblockCard has type action and actionType unblock', () => {
  const c = unblockCard();
  expect(c.type).toBe('action');
  expect(c.actionType).toBe('unblock');
});

test('CARD_CATALOG includes Duck with config rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Duck');
  const configDef = CARD_DEFS.find(d => d.id === 'summon_duck');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe(configDef.rarity);
});

test('CARD_CATALOG includes Move Duck with config rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Move Duck');
  const configDef = CARD_DEFS.find(d => d.id === 'move_duck');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe(configDef.rarity);
});

test('swapCard has type move and moveVariant swap', () => {
  const c = swapCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('swap');
});

test('CARD_CATALOG includes Swap with config rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Swap');
  const configDef = CARD_DEFS.find(d => d.id === 'swap');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe(configDef.rarity);
});

test('teleportCard has type move and moveVariant teleport', () => {
  const c = teleportCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('teleport');
});

test('CARD_CATALOG includes Teleport with config rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Teleport');
  const configDef = CARD_DEFS.find(d => d.id === 'teleport');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe(configDef.rarity);
});

test('snapCard has type action and actionType snap', () => {
  const c = snapCard();
  expect(c.type).toBe('action');
  expect(c.actionType).toBe('snap');
});

test('CARD_CATALOG includes Snap with config rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Snap');
  const configDef = CARD_DEFS.find(d => d.id === 'snap');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe(configDef.rarity);
});

test('blitzCard has type move and moveVariant blitz', () => {
  const c = blitzCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('blitz');
});

test('CARD_CATALOG includes Blitz with config rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Blitz');
  const configDef = CARD_DEFS.find(d => d.id === 'blitz');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe(configDef.rarity);
});

test('moveTogetherCard has type move and moveVariant move_together', () => {
  const c = moveTogetherCard();
  expect(c.type).toBe('move');
  expect(c.moveVariant).toBe('move_together');
});

test('CARD_CATALOG includes Move Together with config rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Move Together');
  const configDef = CARD_DEFS.find(d => d.id === 'move_together');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe(configDef.rarity);
});

// --- rarity propagation to instances ---
test('CARD_CATALOG card instances include rarity', () => {
  const entry = CARD_CATALOG.find(e => e.card().name === 'Queen Move');
  expect(entry).toBeDefined();
  const card = entry.card();
  expect(card.rarity).toBe('rare');
});

test('STARTER_DECKS knight cards include rarity', () => {
  const deck = STARTER_DECKS.knight;
  expect(deck.length).toBeGreaterThan(0);
  for (const card of deck) {
    expect(card.rarity).toBeDefined();
    expect(['common', 'uncommon', 'rare']).toContain(card.rarity);
  }
});

test('buildStarterDeck returns cards with rarity', () => {
  const deck = buildStarterDeck('knight');
  expect(deck.length).toBeGreaterThan(0);
  for (const card of deck) {
    expect(card.rarity).toBeDefined();
    expect(['common', 'uncommon', 'rare']).toContain(card.rarity);
  }
});