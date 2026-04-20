/**
 * engine2/state.js
 * GameState class: board, tiles, turn, history, undoStack, hand/deck.
 * toJSON() / fromJSON() for save/load (no FEN — pure JSON blob).
 *
 * state.play(action) → { ok, log }
 *   - Resolves action, pushes inverse log onto undoStack.
 *
 * state.undo() → boolean
 *   - Pops top log from undoStack, replays inverses in reverse order.
 *   - Returns false if stack is empty.
 */

import { makeBoard, sqToRC, rcToSq, get, set } from './board.js';
import { resolveAction } from './actions.js';

// ─── GameState ────────────────────────────────────────────────────────────────

export class GameState {
  constructor() {
    /** 8×8 array of Piece|null */
    this.board = makeBoard();
    /** 8×8 array of tile data (effects etc.) */
    this.tiles = Array.from({ length: 8 }, () => Array(8).fill(null));
    /** Whose turn: 'player' | 'enemy' | 'player_won' | 'enemy_won' */
    this.turn = 'player';
    /** En passant target square (algebraic) or null */
    this.enPassant = null;
    /** Castling rights */
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    /** Ordered list of resolved actions (for game history) */
    this.history = [];
    /** Undo stack: each entry is an array of () => void inverse functions */
    this.undoStack = [];
    /** Player hand (card objects) */
    this.hand = [];
    /** Draw pile (card objects) */
    this.deck = [];
    /** Discard pile (card objects) */
    this.discard = [];

    console.log('[engine2/state] GameState created');
  }

  // ─── play ──────────────────────────────────────────────────────────────────

  /**
   * Apply action to this state.
   * @param {object} action - { kind, source, targets, piece, capture?, payload? }
   * @returns {{ ok: true, log: Array }}
   */
  play(action) {
    const log = [];
    resolveAction(this, action, log);
    this.undoStack.push(log);
    this.history.push(action);
    console.log('[engine2/state] play kind=%s undoStack=%d', action.kind, this.undoStack.length);
    return { ok: true, log };
  }

  // ─── canUndo ──────────────────────────────────────────────────────────────

  /**
   * Returns true if there is at least one action on the undo stack.
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  // ─── undo ──────────────────────────────────────────────────────────────────

  /**
   * Undo the most recent action.
   * @returns {boolean} true if an action was undone, false if stack was empty
   */
  undo() {
    if (this.undoStack.length === 0) return false;
    const log = this.undoStack.pop();
    this.history.pop();
    // Replay inverses in reverse order
    for (let i = log.length - 1; i >= 0; i--) {
      log[i]();
    }
    console.log('[engine2/state] undo undoStack=%d', this.undoStack.length);
    return true;
  }

  // ─── toJSON ────────────────────────────────────────────────────────────────

  /**
   * Serialize to a plain JSON-safe object.
   * Sets become arrays. history/undoStack are not persisted (runtime only).
   * @returns {object}
   */
  toJSON() {
    const board = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece) {
          row.push({
            type: piece.type,
            owner: piece.owner,
            tags: [...piece.tags],
            data: { ...piece.data },
            id: piece.id,
          });
        } else {
          row.push(null);
        }
      }
      board.push(row);
    }

    const tiles = [];
    for (let r = 0; r < 8; r++) {
      tiles.push([...this.tiles[r]]);
    }

    return {
      board,
      tiles,
      turn: this.turn,
      enPassant: this.enPassant,
      castling: { ...this.castling },
      hand: this.hand.map(c => ({ ...c })),
      deck: this.deck.map(c => ({ ...c })),
      discard: this.discard.map(c => ({ ...c })),
    };
  }

  // ─── fromJSON ─────────────────────────────────────────────────────────────

  /**
   * Deserialize from a plain object produced by toJSON().
   * @param {object} json
   * @returns {GameState}
   */
  static fromJSON(json) {
    const state = new GameState();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const raw = json.board[r][c];
        if (raw) {
          state.board[r][c] = {
            type: raw.type,
            owner: raw.owner,
            tags: new Set(raw.tags ?? []),
            data: { ...(raw.data ?? {}) },
            id: raw.id,
          };
        } else {
          state.board[r][c] = null;
        }
      }
    }

    if (json.tiles) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          state.tiles[r][c] = json.tiles[r]?.[c] ?? null;
        }
      }
    }

    state.turn = json.turn ?? 'player';
    state.enPassant = json.enPassant ?? null;
    state.castling = { wK: true, wQ: true, bK: true, bQ: true, ...(json.castling ?? {}) };
    state.hand = (json.hand ?? []).map(c => ({ ...c }));
    state.deck = (json.deck ?? []).map(c => ({ ...c }));
    state.discard = (json.discard ?? []).map(c => ({ ...c }));

    console.log('[engine2/state] fromJSON turn=%s', state.turn);
    return state;
  }
}
