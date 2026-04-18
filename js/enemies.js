// Single source of truth for enemy definitions.
// To add a new enemy: add one entry here with pieces + personality.

export const ENEMIES = {
  pawn_pusher: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'g7' },
    ],
    personality: { material: 1.0, pawn_advance: 2.0, king_safety: 0.8, mobility: 0.1 },
  },
  lone_rook: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'r', color: 'b', sq: 'a8' },
    ],
    personality: { material: 1.5, king_safety: 1.0, mobility: 1.2 },
  },
  knight_rider: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'n', color: 'b', sq: 'b8' },
      { type: 'n', color: 'b', sq: 'g8' },
      { type: 'p', color: 'b', sq: 'b7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'g7' },
    ],
    personality: { material: 1.0, king_safety: 0.6, mobility: 2.0, pawn_advance: 0.2 },
  },
  bishop_pair: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'b', color: 'b', sq: 'c8' },
      { type: 'b', color: 'b', sq: 'f8' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'f7' },
    ],
    personality: { material: 1.2, king_safety: 0.9, mobility: 1.5 },
  },
};

export const VALID_ENEMIES = new Set(Object.keys(ENEMIES));
