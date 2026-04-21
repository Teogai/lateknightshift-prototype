/**
 * config/charms.js
 * Charm definitions — pure data.
 */

export const CHARM_DEFS = [
  {
    id: 'push',
    name: 'Push',
    desc: 'After moving, push all adjacent pieces 1 square away.',
    validCardTypes: ['move'],
    rarity: 'uncommon',
  },
  {
    id: 'atomic',
    name: 'Atomic',
    desc: 'Piece explodes in a 3x3 area on capture.',
    validCardTypes: ['piece'],
    rarity: 'rare',
  },
];

export const CHARM_RARITY_WEIGHTS = {
  common: 60,
  uncommon: 37,
  rare: 3,
};