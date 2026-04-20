export const MAP_CONFIG = {
  totalFloors: 16,
  treasureFloor: 9,
  upgradeFloor: 15,
  bossFloor: 16,
  eliteMinFloor: 6,
  roomWeights: { monster: 45, elite: 15, event: 25, shop: 15 },
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
