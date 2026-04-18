export const STARTING_MANA = 3;
export const HAND_SIZE = 5;
export const VALID_PROMO = new Set(['q', 'r', 'b', 'n']);

export const FILES = 'abcdefgh';
export const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export const CHARACTER_PIECES = {
  knight: [
    { type: 'k', color: 'w', sq: 'e1' },
    { type: 'r', color: 'w', sq: 'a1' },
    { type: 'n', color: 'w', sq: 'b1' },
    { type: 'p', color: 'w', sq: 'd2' },
    { type: 'p', color: 'w', sq: 'e2' },
  ],
};

export const VALID_CHARACTERS = new Set(Object.keys(CHARACTER_PIECES));
