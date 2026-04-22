/**
 * cards2/move_cards.js
 * Card factories for move/summon/curse cards (engine2 compatible).
 * Also exports CARD_CATALOG, STARTER_DECKS, buildStarterDeck, dealHand.
 *
 * Card data is imported from config/cards.js; this file wires factory functions.
 */

import { CARD_DEFS, CARD_FACTORY_KEYS, STARTER_DECK_DEFS } from '../../config/cards.js';

export function moveCard() {
  return { name: 'Move', type: 'move' };
}

export function pieceCard(piece) {
  return { name: `${piece.charAt(0).toUpperCase() + piece.slice(1)}`, type: 'piece', piece };
}

export function knightMoveCard() {
  return { name: 'Knight Move', type: 'move', moveVariant: 'knight' };
}

export function bishopMoveCard() {
  return { name: 'Bishop Move', type: 'move', moveVariant: 'bishop' };
}

export function rookMoveCard() {
  return { name: 'Rook Move', type: 'move', moveVariant: 'rook' };
}

export function queenMoveCard() {
  return { name: 'Queen Move', type: 'move', moveVariant: 'queen' };
}

export function pawnBoostCard() {
  return { name: 'Pawn Boost', type: 'move', moveVariant: 'pawn_boost' };
}

export function curseCard(name = 'Curse') {
  return { name, type: 'curse', unplayable: true };
}

export function summonDuckCard() {
  return { name: 'Summon Duck', type: 'piece', piece: 'duck' };
}

export function moveDuckCard() {
  return { name: 'Move Duck', type: 'move', moveVariant: 'duck' };
}

export function stunCard() {
  return { name: 'Stun', type: 'action', actionType: 'stun' };
}

export function shieldCard() {
  return { name: 'Shield', type: 'action', actionType: 'shield' };
}

export function sacrificeCard() {
  return { name: 'Sacrifice', type: 'action', actionType: 'sacrifice' };
}

export function unblockCard() {
  return { name: 'Unblock', type: 'action', actionType: 'unblock' };
}

// Returns upgraded copy of a card (never mutates original)
export function upgradeCard(card) {
  const c = { ...card };
  if (c.type === 'move' && !c.moveVariant) {
    c.multiMove = true; // upgraded Move: move 2 pieces
  }
  c.upgraded = true;
  return c;
}

// ─── factory wiring ───────────────────────────────────────────────────────────

const _factories = {
  moveCard,
  pieceCard,
  knightMoveCard,
  bishopMoveCard,
  rookMoveCard,
  queenMoveCard,
  pawnBoostCard,
  summonDuckCard,
  moveDuckCard,
  stunCard,
  shieldCard,
  sacrificeCard,
  unblockCard,
  curseCard,
};

function makeCardInstance(def) {
  const key = CARD_FACTORY_KEYS[def.id];
  const factory = _factories[key];
  let card;
  if (def.type === 'piece') {
    card = factory(def.piece);
  } else if (def.type === 'curse') {
    card = factory(def.name);
  } else {
    card = factory();
  }
  if (def.image) card.image = def.image;
  if (def.desc) card.desc = def.desc;
  return card;
}

export const CARD_CATALOG = CARD_DEFS.map(def => {
  const key = CARD_FACTORY_KEYS[def.id];
  const factory = _factories[key];
  let cardFn;
  if (def.type === 'piece') {
    cardFn = () => factory(def.piece);
  } else if (def.type === 'curse') {
    cardFn = () => factory(def.name);
  } else {
    cardFn = factory;
  }
  return {
    card: () => {
      const c = cardFn();
      if (def.image) c.image = def.image;
      if (def.desc) c.desc = def.desc;
      return c;
    },
    rarity: def.rarity,
  };
});

export const STARTER_DECKS = {};
for (const [character, entries] of Object.entries(STARTER_DECK_DEFS)) {
  STARTER_DECKS[character] = entries.flatMap(entry => {
    const def = CARD_DEFS.find(c => c.id === entry.id);
    const cards = [];
    for (let i = 0; i < entry.count; i++) {
      cards.push(makeCardInstance(def));
    }
    return cards;
  });
}

export function buildStarterDeck(character) {
  const template = STARTER_DECKS[character];
  if (!template) throw new Error(`unknown character: ${character}`);
  const deck = template.map(c => ({ ...c }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Returns { deck, hand, discard }
export function dealHand(deck, size, discard = []) {
  return { deck: deck.slice(size), hand: deck.slice(0, size), discard };
}

console.log('[cards2/move_cards] loaded');
