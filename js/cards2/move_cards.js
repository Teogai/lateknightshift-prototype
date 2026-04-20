/**
 * cards2/move_cards.js
 * Card factories for move/summon/curse cards (engine2 compatible).
 * Also exports CARD_CATALOG, STARTER_DECKS, buildStarterDeck, dealHand.
 */

export function moveCard(cost = 1) {
  return { name: 'Move', type: 'move', cost };
}

export function summonCard(piece, cost) {
  const defaultCosts = { pawn: 2, knight: 3, bishop: 3, rook: 3, queen: 3 };
  const c = cost !== undefined ? cost : (defaultCosts[piece] ?? 2);
  return { name: `Summon ${piece.charAt(0).toUpperCase() + piece.slice(1)}`, type: 'summon', piece, cost: c };
}

export function knightMoveCard() {
  return { name: 'Knight Move', type: 'move', moveVariant: 'knight', cost: 2 };
}

export function bishopMoveCard() {
  return { name: 'Bishop Move', type: 'move', moveVariant: 'bishop', cost: 2 };
}

export function rookMoveCard() {
  return { name: 'Rook Move', type: 'move', moveVariant: 'rook', cost: 3 };
}

export function queenMoveCard() {
  return { name: 'Queen Move', type: 'move', moveVariant: 'queen', cost: 3 };
}

export function curseCard() {
  return { name: 'Curse', type: 'curse', cost: 0, unplayable: true };
}

// Returns upgraded copy of a card (never mutates original)
export function upgradeCard(card) {
  const c = { ...card };
  if (c.type === 'move' && !c.moveVariant) {
    c.multiMove = true; // upgraded Move: move 2 pieces
  } else if (c.type === 'summon' && c.piece === 'pawn') {
    c.cost = 1;
  } else if (c.type === 'move' || c.type === 'summon') {
    c.cost = Math.max(1, c.cost - 1);
  }
  c.upgraded = true;
  return c;
}

export const CARD_CATALOG = [
  { card: moveCard,                   rarity: 'common' },
  { card: () => summonCard('pawn'),   rarity: 'common' },
  { card: () => summonCard('knight'), rarity: 'common' },
  { card: () => summonCard('bishop'), rarity: 'common' },
  { card: knightMoveCard,             rarity: 'common' },
  { card: bishopMoveCard,             rarity: 'common' },
  { card: () => summonCard('rook'),   rarity: 'uncommon' },
  { card: rookMoveCard,               rarity: 'uncommon' },
  { card: () => summonCard('queen'),  rarity: 'rare' },
  { card: queenMoveCard,              rarity: 'rare' },
];

export const STARTER_DECKS = {
  knight: [
    moveCard(1), moveCard(1), moveCard(1), moveCard(1), moveCard(1),
    moveCard(1), moveCard(1),
    summonCard('pawn'), summonCard('pawn'),
    knightMoveCard(),
  ],
};

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
