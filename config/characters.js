/**
 * config/characters.js
 * Character definitions — pure data.
 */

export const CHARACTER_PIECES = {
  knight: [
    { type: 'k', color: 'w', sq: 'e1' },
    { type: 'r', color: 'w', sq: 'a1' },
    { type: 'n', color: 'w', sq: 'b1' },
    { type: 'p', color: 'w', sq: 'a2' },
    { type: 'p', color: 'w', sq: 'd2' },
    { type: 'p', color: 'w', sq: 'e2' },
  ],
};

export const VALID_CHARACTERS = new Set(Object.keys(CHARACTER_PIECES));
