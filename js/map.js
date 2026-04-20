const ROOM_META = {
  monster:  { label: 'Monster',  icon: '⚔' },
  elite:    { label: 'Elite',    icon: '★' },
  event:    { label: 'Event',    icon: '✦' },
  shop:     { label: 'Shop',     icon: '$' },
  upgrade:  { label: 'Upgrade',  icon: '▲' },
  boss:     { label: 'Boss',     icon: '☠' },
};

function node(type, enemyKey, labelOverride) {
  const meta = ROOM_META[type];
  return { type, enemyKey: enemyKey || null, label: labelOverride || meta.label, icon: meta.icon };
}

export const FIXED_PATH = [
  node('monster', 'pawn_pusher',    'Pawn Pusher'),
  node('monster', 'knight_rider',   'Knight Rider'),
  node('event',   null,             'Event'),
  node('monster', 'bishop_pair',    'Bishop Pair'),
  node('shop',    null,             'Shop'),
  node('elite',   'duelist',        'Duelist'),
  node('upgrade', null,             'Upgrade'),
  node('monster', 'phalanx',        'Phalanx'),
  node('monster', 'iron_line',      'Iron Line'),
  node('monster', 'cavalry_charge', 'Cavalry Charge'),
  node('event',   null,             'Event'),
  node('elite',   'duelist_2',      'Duelist II'),
  node('monster', 'high_command',   'High Command'),
  node('shop',    null,             'Shop'),
  node('upgrade', null,             'Upgrade'),
  node('boss',    'boss_duelist',   'Boss'),
];

export function generateNodes(floor) {
  return [FIXED_PATH[floor - 1]];
}
