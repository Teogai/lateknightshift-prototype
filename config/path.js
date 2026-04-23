/**
 * config/path.js
 * Fixed map path — pure data.
 */

export const ROOM_META = {
  monster:     { label: 'Monster',     icon: '⚔' },
  elite:       { label: 'Elite',       icon: '★' },
  piece_reward:{ label: 'Piece reward',icon: '$' },
  transform:   { label: 'Transform',   icon: '▲' },
  relic:       { label: 'Relic',       icon: '◆' },
  boss:        { label: 'Boss',        icon: '☠' },
};

export const FIXED_PATH = [
  { type: 'monster',     enemy: 'pawn_pusher',    label: 'Pawn Pusher' },
  { type: 'monster',     enemy: 'knight_rider',   label: 'Knight Rider' },
  { type: 'piece_reward',enemy: null,             label: 'Piece reward' },
  { type: 'relic',       enemy: null,             label: 'Relic' },
  { type: 'monster',     enemy: 'bishop_pair',    label: 'Bishop Pair' },
  { type: 'piece_reward',enemy: null,             label: 'Piece reward' },
  { type: 'elite',       enemy: 'duelist',        label: 'Duelist' },
  { type: 'relic',       enemy: null,             label: 'Relic' },
  { type: 'transform',   enemy: null,             label: 'Transform' },
  { type: 'monster',     enemy: 'phalanx',        label: 'Phalanx' },
  { type: 'monster',     enemy: 'iron_line',      label: 'Iron Line' },
  { type: 'relic',       enemy: null,             label: 'Relic' },
  { type: 'monster',     enemy: 'cavalry_charge', label: 'Cavalry Charge' },
  { type: 'piece_reward',enemy: null,             label: 'Piece reward' },
  { type: 'elite',       enemy: 'duelist_2',      label: 'Duelist II' },
  { type: 'monster',     enemy: 'high_command',   label: 'High Command' },
  { type: 'piece_reward',enemy: null,             label: 'Piece reward' },
  { type: 'transform',   enemy: null,             label: 'Transform' },
  { type: 'boss',        enemy: 'boss_duelist',   label: 'Boss' },
];
