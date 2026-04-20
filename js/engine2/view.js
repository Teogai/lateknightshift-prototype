/**
 * engine2/view.js
 * getView(state, perspective) → ViewState
 *
 * Identity shallow clone — no fog filtering yet.
 * Reserves the seam for future per-perspective visibility masking.
 *
 * Board is a shallow 2D array copy; pieces are shallow-cloned objects.
 * Mutations to the returned view must NOT affect state.
 */

/**
 * @param {import('./state.js').GameState} state
 * @param {'player'|'enemy'} perspective
 * @returns {{ board: Array, tiles: Array, turn: string, enPassant: string|null, castling: object, perspective: string }}
 */
export function getView(state, perspective) {
  // Shallow-copy each row so row-level mutations are isolated
  const board = state.board.map(row =>
    row.map(piece => {
      if (piece === null) return null;
      // Shallow-clone piece; data gets its own object so top-level property
      // mutations don't reach state, while nested references are unchanged.
      return {
        type: piece.type,
        owner: piece.owner,
        tags: piece.tags,          // Set — shared ref; filtering is future work
        data: { ...piece.data },   // shallow copy so data.x mutations are isolated
        id: piece.id,
      };
    })
  );

  // Shallow-copy each tile row
  const tiles = state.tiles.map(row => [...row]);

  console.log('[engine2/view] getView perspective=%s turn=%s', perspective, state.turn);

  return {
    board,
    tiles,
    turn: state.turn,
    enPassant: state.enPassant,
    castling: { ...state.castling },
    perspective,
  };
}
