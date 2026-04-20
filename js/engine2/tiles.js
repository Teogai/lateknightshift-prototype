/**
 * engine2/tiles.js
 * Tile type registry and factory.
 *
 * TILE_DEFS: registry of tile type definitions.
 *   Each entry: { type, onTileEnter? }
 *   onTileEnter(piece, sq, log) — called after a piece lands on this tile.
 *     piece: the Piece object now at sq
 *     sq:    destination square (algebraic)
 *     log:   mutation inverse log (mutations must be logged for undo)
 *
 * Tile types:
 *   normal  — no effect (same as null tile, explicit representation)
 *   void    — blocks movement; no piece can land here
 *   damage  — onTileEnter: adds 'wounded' tag to the entering piece
 *   heal    — onTileEnter: removes 'wounded' tag from the entering piece (if present)
 *
 * makeTile(type) → { type }
 */

import { _setTag } from './actions.js';

// ─── TILE_DEFS ────────────────────────────────────────────────────────────────

export const TILE_DEFS = {
  /** No effect — explicit normal tile (equivalent to null entry). */
  normal: {
    type: 'normal',
    // No onTileEnter hook needed
  },

  /** Void tile — blocks all movement. Filtered in movegen before this hook runs. */
  void: {
    type: 'void',
    // No onTileEnter needed; movegen prevents landing here
  },

  /**
   * Damage tile — any piece that enters gains the 'wounded' tag.
   * Mutation recorded in log for undo.
   */
  damage: {
    type: 'damage',
    onTileEnter(piece, sq, log) {
      if (!piece.tags.has('wounded')) {
        _setTag(piece, 'wounded', 'add', log);
        console.log('[engine2/tiles] damage tile wounded piece.id=%s sq=%s', piece.id, sq);
      }
    },
  },

  /**
   * Heal tile — removes 'wounded' tag from the entering piece (if present).
   * Mutation recorded in log for undo.
   */
  heal: {
    type: 'heal',
    onTileEnter(piece, sq, log) {
      if (piece.tags.has('wounded')) {
        _setTag(piece, 'wounded', 'delete', log);
        console.log('[engine2/tiles] heal tile cured piece.id=%s sq=%s', piece.id, sq);
      }
    },
  },
};

// ─── makeTile ─────────────────────────────────────────────────────────────────

/**
 * Create a tile object for placement in state.tiles.
 * @param {'normal'|'void'|'damage'|'heal'} type
 * @returns {{ type: string }}
 */
export function makeTile(type) {
  if (!TILE_DEFS[type]) {
    console.warn('[engine2/tiles] unknown tile type=%s', type);
  }
  return { type };
}

console.log('[engine2/tiles] loaded');
