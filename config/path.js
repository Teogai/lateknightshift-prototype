/**
 * config/path.js
 * Fixed map path — pure data.
 */

export const ROOM_META = {
  monster:  { label: 'Monster',  icon: '⚔' },
  elite:    { label: 'Elite',    icon: '★' },
  event:    { label: 'Event',    icon: '✦' },
  shop:     { label: 'Shop',     icon: '$' },
  upgrade:  { label: 'Upgrade',  icon: '▲' },
  boss:     { label: 'Boss',     icon: '☠' },
};

export const FIXED_PATH = [
  { type: 'monster', enemy: 'pawn_pusher',    label: 'Pawn Pusher' },
  { type: 'monster', enemy: 'knight_rider',   label: 'Knight Rider' },
  { type: 'event',   enemy: null,             label: 'Event' },
  { type: 'monster', enemy: 'bishop_pair',    label: 'Bishop Pair' },
  { type: 'shop',    enemy: null,             label: 'Shop' },
  { type: 'elite',   enemy: 'duelist',        label: 'Duelist' },
  { type: 'upgrade', enemy: null,             label: 'Upgrade' },
  { type: 'monster', enemy: 'phalanx',        label: 'Phalanx' },
  { type: 'monster', enemy: 'iron_line',      label: 'Iron Line' },
  { type: 'monster', enemy: 'cavalry_charge', label: 'Cavalry Charge' },
  { type: 'event',   enemy: null,             label: 'Event' },
  { type: 'elite',   enemy: 'duelist_2',      label: 'Duelist II' },
  { type: 'monster', enemy: 'high_command',   label: 'High Command' },
  { type: 'shop',    enemy: null,             label: 'Shop' },
  { type: 'upgrade', enemy: null,             label: 'Upgrade' },
  { type: 'boss',    enemy: 'boss_duelist',   label: 'Boss' },
];
