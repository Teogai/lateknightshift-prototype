/**
 * config/game.js
 * Global game settings and rarity weights.
 * Pure data — no logic, no imports from js/.
 */

export const MAP_CONFIG = {
  totalFloors: 19,
  treasureFloor: 11,
  transformFloor: 18,
  bossFloor: 19,
  eliteMinFloor: 7,
  roomWeights: { monster: 45, elite: 15, piece_reward: 40, relic: 15 },
  minNodes: 1,
  maxNodes: 3,
};

export const CARD_RARITY_WEIGHTS = { common: 60, uncommon: 37, rare: 3 };

export const PIECE_RARITY_WEIGHTS = {
  common:    { pieces: ['pawn'],           weight: 55 },
  uncommon:  { pieces: ['knight', 'bishop'], weight: 30 },
  rare:      { pieces: ['rook'],           weight: 12 },
  legendary: { pieces: ['queen'],          weight:  3 },
};

export const LIVES = 1;
export const REWARD_CHOICES = 3;
export const PIECE_REWARD_CHOICES = 3;
export const RELIC_REWARD_CHOICES = 3;

export const HAND_SIZE = 6;
export const REDRAW_COUNTDOWN_START = 4;
export const VALID_PROMO = new Set(['q', 'r', 'b', 'n']);
