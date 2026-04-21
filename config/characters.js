/**
 * config/characters.js
 * Character definitions — pure data.
 */

export const CHARACTER_PIECES = {
  knight: [
    { type: 'k', color: 'w', sq: 'e1' },
    { type: 'r', color: 'w', sq: 'd1' },
    { type: 'n', color: 'w', sq: 'f1' },
    { type: 'p', color: 'w', sq: 'd2' },
    { type: 'p', color: 'w', sq: 'e2' },
    { type: 'p', color: 'w', sq: 'f2' },
  ],
};

export const VALID_CHARACTERS = new Set(Object.keys(CHARACTER_PIECES));
