/**
 * engine2/board.js
 * Board representation: 8×8 array of Piece|null, coord helpers.
 * No chess.js dependency.
 */

const FILES = 'abcdefgh';

/** Convert algebraic square to [row, col] (row 0 = rank 8, row 7 = rank 1). */
export function sqToRC(sq) {
  const col = sq.charCodeAt(0) - 97; // a=0 … h=7
  const row = 8 - parseInt(sq[1]);   // rank 1 → row 7, rank 8 → row 0
  return [row, col];
}

/** Convert [row, col] to algebraic square. */
export function rcToSq(row, col) {
  return FILES[col] + (8 - row);
}

/** True if [row, col] is within the 8×8 board. */
export function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/** Return an 8×8 array of nulls representing an empty board. */
export function makeBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

/** Get piece at algebraic square (returns null for empty). */
export function get(board, sq) {
  const [r, c] = sqToRC(sq);
  return board[r][c];
}

/** Set piece at algebraic square (pass null to clear). */
export function set(board, sq, piece) {
  const [r, c] = sqToRC(sq);
  board[r][c] = piece;
}

console.log('[engine2/board] loaded');
