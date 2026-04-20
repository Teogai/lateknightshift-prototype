/**
 * engine2/constants2.js
 * Game constants for engine2 adapter layer.
 */

export const HAND_SIZE = 6;
export const REDRAW_COUNTDOWN_START = 4;
// Valid promotion short-types (single character)
export const VALID_PROMO = new Set(['q', 'r', 'b', 'n']);

// Character starting piece definitions (type uses short notation: p/n/b/r/q/k, color: 'w'|'b')
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

console.log('[engine2/constants2] loaded');
