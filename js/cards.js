export function moveCard(cost = 1) {
  return { name: 'Move', type: 'move', cost };
}

export function summonCard(piece, cost = 2) {
  return { name: `Summon ${piece.charAt(0).toUpperCase() + piece.slice(1)}`, type: 'summon', piece, cost };
}

export function knightMoveCard() {
  return { name: 'Knight Move', type: 'knight_move', cost: 2 };
}

export const STARTER_DECKS = {
  knight: [
    moveCard(1), moveCard(1), moveCard(1), moveCard(1), moveCard(1),
    moveCard(1), moveCard(1),
    summonCard('pawn', 1), summonCard('pawn', 1),
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
