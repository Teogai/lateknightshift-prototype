// cards2/line_card.js — lineCard: pick direction+start, capture `length` squares in a line.
// Produces Action {kind:'capture', source, targets:[sq1, sq2, ...sqN]}
//
// targetGenerator yields arrays of `length` squares for valid in-bounds lines
// starting one step away from the source in each of 8 directions.

import { sqToRC, rcToSq, inBounds } from '../engine2/board.js';

// 8 cardinal + diagonal directions as [dr, dc]
const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

/**
 * Build a line of `length` squares starting at (r, c) in direction (dr, dc).
 * Returns null if any square is out of bounds.
 */
function buildLine(r, c, dr, dc, length) {
  const squares = [];
  for (let i = 0; i < length; i++) {
    const nr = r + dr * i;
    const nc = c + dc * i;
    if (!inBounds(nr, nc)) return null;
    squares.push(rcToSq(nr, nc));
  }
  return squares;
}

/**
 * lineCard({length})
 *   play(state, sourceSq, targetLine) -> Action | null
 *     targetLine: string[] of exactly `length` squares (from targetGenerator)
 *   targetGenerator(state, sourceSq) -> Iterable<string[]>
 *     Each yielded value is an array of `length` algebraic squares.
 */
export function lineCard({ length = 3 } = {}) {
  return {
    name: 'Line',
    kind: 'line',
    length,

    play(state, sourceSq, targetLine) {
      if (!Array.isArray(targetLine) || targetLine.length !== length) {
        console.log('[cards2/line] rejected — bad targetLine src=%s len=%s',
          sourceSq, Array.isArray(targetLine) ? targetLine.length : typeof targetLine);
        return null;
      }
      console.log('[cards2/line] play src=%s targets=%s', sourceSq, targetLine.join(','));
      return {
        kind: 'capture',
        source: sourceSq,
        targets: targetLine,
        payload: null,
      };
    },

    *targetGenerator(state, sourceSq) {
      const [sr, sc] = sqToRC(sourceSq);
      for (const [dr, dc] of DIRECTIONS) {
        // Start one step away from the source
        const startR = sr + dr;
        const startC = sc + dc;
        const line = buildLine(startR, startC, dr, dc, length);
        if (line) {
          console.log('[cards2/line] targetGenerator src=%s dir=[%d,%d] line=%s', sourceSq, dr, dc, line.join(','));
          yield line;
        }
      }
    },
  };
}

console.log('[cards2/line_card] loaded');
