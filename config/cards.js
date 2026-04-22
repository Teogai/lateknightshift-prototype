/**
 * config/cards.js
 * Card catalog and starter deck definitions — pure data.
 * Factory functions live in js/cards2/ and wire up at runtime.
 */

export const CARD_DEFS = [
  { id: 'move',         name: 'Move',           type: 'move',   rarity: 'common', desc: 'Move {piece} to legal square.' },
  { id: 'piece_pawn',   name: 'Pawn',           type: 'piece',  piece: 'pawn',  rarity: 'common', image: './img/Chess_plt60.png', desc: '{pawn}' },
  { id: 'piece_knight', name: 'Knight',         type: 'piece',  piece: 'knight',rarity: 'common', image: './img/Chess_nlt60.png', desc: '{knight}' },
  { id: 'piece_bishop', name: 'Bishop',         type: 'piece',  piece: 'bishop',rarity: 'common', image: './img/Chess_blt60.png', desc: '{bishop}' },
  { id: 'piece_rook',   name: 'Rook',           type: 'piece',  piece: 'rook',  rarity: 'uncommon', image: './img/Chess_rlt60.png', desc: '{rook}' },
  { id: 'piece_queen',  name: 'Queen',          type: 'piece',  piece: 'queen', rarity: 'rare', image: './img/Chess_qlt60.png', desc: '{queen}' },
  { id: 'knight_move',  name: 'Knight Move',    type: 'move',   moveVariant: 'knight', rarity: 'common', image: './img/Chess_nlt60.png', desc: '{Knight} jump to any square.' },
  { id: 'bishop_move',  name: 'Bishop Move',    type: 'move',   moveVariant: 'bishop', rarity: 'uncommon', image: './img/Chess_blt60.png', desc: 'Move like {bishop}.' },
  { id: 'rook_move',    name: 'Rook Move',      type: 'move',   moveVariant: 'rook',   rarity: 'uncommon', image: './img/Chess_rlt60.png', desc: 'Move like {rook}.' },
  { id: 'queen_move',   name: 'Queen Move',     type: 'move',   moveVariant: 'queen',  rarity: 'rare', image: './img/Chess_qlt60.png', desc: 'Move like {queen}.' },
  { id: 'pawn_boost',   name: 'Pawn Boost',     type: 'move',   moveVariant: 'pawn_boost', rarity: 'common', image: './img/pawn-boost.png', desc: 'Slide {pawn} forward.' },
  { id: 'summon_duck',  name: 'Summon Duck',    type: 'piece',  piece: 'duck', rarity: 'uncommon', image: './img/duck.png', desc: 'Place {duck} anywhere.' },
  { id: 'move_duck',    name: 'Move Duck',      type: 'move',   moveVariant: 'duck', rarity: 'uncommon', image: './img/duck.png', desc: 'Move any {duck}.' },
  { id: 'stun',         name: 'Stun',           type: 'action', actionType: 'stun', rarity: 'common', desc: 'Apply {stun} for 2 turns.' },
  { id: 'shield',       name: 'Shield',         type: 'action', actionType: 'shield', rarity: 'uncommon', desc: 'Apply {shield}.' },
  { id: 'sacrifice',    name: 'Sacrifice',      type: 'action', actionType: 'sacrifice', rarity: 'uncommon', desc: 'Sacrifice {piece}. Destroy weaker.' },
  { id: 'unblock',      name: 'Unblock',        type: 'action', actionType: 'unblock', rarity: 'uncommon', desc: 'Apply {ghost} 5 turns.' },
  { id: 'curse',        name: 'Curse',          type: 'curse',  rarity: 'common', desc: 'Unplayable.' },
  { id: 'curse_sloth',  name: 'Curse of Sloth', type: 'curse',  rarity: 'common', desc: 'Unplayable.' },
];

// Factory wiring keys used by js/cards2/move_cards.js
export const CARD_FACTORY_KEYS = {
  move:        'moveCard',
  piece_pawn:  'pieceCard',
  piece_knight:'pieceCard',
  piece_bishop:'pieceCard',
  piece_rook:  'pieceCard',
  piece_queen: 'pieceCard',
  knight_move: 'knightMoveCard',
  bishop_move: 'bishopMoveCard',
  rook_move:   'rookMoveCard',
  queen_move:  'queenMoveCard',
  pawn_boost:  'pawnBoostCard',
  summon_duck: 'summonDuckCard',
  move_duck:   'moveDuckCard',
  stun:        'stunCard',
  shield:      'shieldCard',
  sacrifice:   'sacrificeCard',
  unblock:     'unblockCard',
  curse:       'curseCard',
  curse_sloth: 'curseCard',
};

export const STARTER_DECK_DEFS = {
  knight: [
    { id: 'move', count: 7 },
    { id: 'piece_pawn', count: 2 },
    { id: 'knight_move', count: 1 },
  ],
};
