/**
 * config/cards.js
 * Card catalog and starter deck definitions — pure data.
 * Factory functions live in js/cards2/ and wire up at runtime.
 */

export const CARD_DEFS = [
  { id: 'move',         name: 'Move',           type: 'move',   rarity: 'common', desc: 'Move {piece} to legal square.' },
  { id: 'summon_pawn',  name: 'Summon Pawn',    type: 'summon', piece: 'pawn',  rarity: 'common', image: './pieces/Chess_plt60.png', desc: 'Summon {pawn} on rank 1-2.' },
  { id: 'summon_knight',name: 'Summon Knight',  type: 'summon', piece: 'knight',rarity: 'common', image: './pieces/Chess_nlt60.png', desc: 'Summon {knight} on rank 1-2.' },
  { id: 'summon_bishop',name: 'Summon Bishop',  type: 'summon', piece: 'bishop',rarity: 'common', image: './pieces/Chess_blt60.png', desc: 'Summon {bishop} on rank 1-2.' },
  { id: 'summon_rook',  name: 'Summon Rook',    type: 'summon', piece: 'rook',  rarity: 'uncommon', image: './pieces/Chess_rlt60.png', desc: 'Summon {rook} on rank 1-2.' },
  { id: 'summon_queen', name: 'Summon Queen',   type: 'summon', piece: 'queen', rarity: 'rare', image: './pieces/Chess_qlt60.png', desc: 'Summon {queen} on rank 1-2.' },
  { id: 'knight_move',  name: 'Knight Move',    type: 'move',   moveVariant: 'knight', rarity: 'common', image: './pieces/Chess_nlt60.png', desc: '{Knight} jump to any square.' },
  { id: 'bishop_move',  name: 'Bishop Move',    type: 'move',   moveVariant: 'bishop', rarity: 'uncommon', image: './pieces/Chess_blt60.png', desc: 'Move like {bishop}.' },
  { id: 'rook_move',    name: 'Rook Move',      type: 'move',   moveVariant: 'rook',   rarity: 'uncommon', image: './pieces/Chess_rlt60.png', desc: 'Move like {rook}.' },
  { id: 'queen_move',   name: 'Queen Move',     type: 'move',   moveVariant: 'queen',  rarity: 'rare', image: './pieces/Chess_qlt60.png', desc: 'Move like {queen}.' },
  { id: 'pawn_boost',   name: 'Pawn Boost',     type: 'move',   moveVariant: 'pawn_boost', rarity: 'common', image: './pieces/pawn-boost.png', desc: 'Slide {pawn} forward.' },
  { id: 'summon_duck',  name: 'Summon Duck',    type: 'summon_duck', rarity: 'uncommon', image: './pieces/duck.png', desc: 'Place {duck} anywhere.' },
  { id: 'move_duck',    name: 'Move Duck',      type: 'move_duck',   rarity: 'common', image: './pieces/duck.png', desc: 'Move any {duck}.' },
  { id: 'stun',         name: 'Stun',           type: 'stun',   rarity: 'common', desc: 'Apply {stun}.' },
  { id: 'shield',       name: 'Shield',         type: 'shield', rarity: 'uncommon', desc: 'Apply {shield}.' },
  { id: 'sacrifice',    name: 'Sacrifice',      type: 'sacrifice', rarity: 'uncommon', desc: 'Sacrifice {piece}. Destroy weaker.' },
  { id: 'unblock',      name: 'Unblock',        type: 'unblock', rarity: 'uncommon', desc: 'Apply {ghost} 5 turns.' },
];

// Factory wiring keys used by js/cards2/move_cards.js
export const CARD_FACTORY_KEYS = {
  move:        'moveCard',
  summon_pawn: 'summonCard',
  summon_knight:'summonCard',
  summon_bishop:'summonCard',
  summon_rook: 'summonCard',
  summon_queen:'summonCard',
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
};

export const STARTER_DECK_DEFS = {
  knight: [
    { id: 'move', count: 7 },
    { id: 'summon_pawn', count: 2 },
    { id: 'knight_move', count: 1 },
  ],
};
