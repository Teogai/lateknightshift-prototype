/**
 * enemies2.js
 * Enemy definitions for engine2. Mirrors enemies.js but uses ai2/search.js.
 *
 * createAI() → { selectMove(state) → action|null }
 *   For default AI: single action per call.
 *   For double-move AI: alternates between single and double action calls.
 */

import { selectAction } from './ai2/search.js';

// ─── AI factories ─────────────────────────────────────────────────────────────

function defaultAI(personality) {
  return {
    selectMove(state) {
      const action = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
      console.log('[enemies2] defaultAI action=%s->%s', action?.source, action?.targets?.[0]);
      return action;
    },
  };
}

function doubleMoveAI(personality) {
  let doubleMovePending = false;
  return {
    selectMove(state) {
      if (doubleMovePending) {
        doubleMovePending = false;
        // Select first move
        const first = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
        if (!first) return null;

        // Temporarily apply first move to pick second from updated board
        state.play(first);
        const second = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
        state.undo();

        console.log('[enemies2] doubleMoveAI first=%s->%s second=%s->%s',
          first?.source, first?.targets?.[0], second?.source, second?.targets?.[0]);
        // Return a compound action with warnNext=false
        return { _double: true, moves: second ? [first, second] : [first], warnNext: false };
      } else {
        doubleMovePending = true;
        const action = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
        console.log('[enemies2] doubleMoveAI warn action=%s->%s', action?.source, action?.targets?.[0]);
        // Return action with warnNext=true flag
        return action ? { ...action, warnNext: true } : null;
      }
    },
  };
}

// ─── enemy definitions ────────────────────────────────────────────────────────

export const ENEMIES = {
  pawn_pusher: {
    name: 'Pawn Pusher',
    specialAbility: { name: 'Pawn Rush', description: 'Aggressively advances pawns toward promotion.' },
    pieces: [
      { type: 'king', owner: 'enemy', sq: 'e8' },
      { type: 'pawn', owner: 'enemy', sq: 'a7' },
      { type: 'pawn', owner: 'enemy', sq: 'c7' },
      { type: 'pawn', owner: 'enemy', sq: 'd7' },
      { type: 'pawn', owner: 'enemy', sq: 'e7' },
      { type: 'pawn', owner: 'enemy', sq: 'g7' },
    ],
    personality: { material: 1.0, pawn_advance: 2.0, king_safety: 0.8, mobility: 0.1, aggression: 0.5 },
    createAI() { return defaultAI(this.personality); },
  },
  knight_rider: {
    name: 'Knight Rider',
    specialAbility: { name: 'Horse Power', description: 'Leverages knight mobility for rapid flanking attacks.' },
    pieces: [
      { type: 'king',   owner: 'enemy', sq: 'e8' },
      { type: 'knight', owner: 'enemy', sq: 'b8' },
      { type: 'knight', owner: 'enemy', sq: 'g8' },
      { type: 'pawn',   owner: 'enemy', sq: 'b7' },
      { type: 'pawn',   owner: 'enemy', sq: 'e7' },
      { type: 'pawn',   owner: 'enemy', sq: 'g7' },
    ],
    personality: { material: 1.0, king_safety: 0.6, mobility: 2.0, pawn_advance: 0.2, aggression: 1.2 },
    createAI() { return defaultAI(this.personality); },
  },
  bishop_pair: {
    name: 'Bishop Pair',
    specialAbility: { name: 'Diagonal Control', description: 'Coordinates two bishops to dominate open diagonals.' },
    pieces: [
      { type: 'king',   owner: 'enemy', sq: 'e8' },
      { type: 'bishop', owner: 'enemy', sq: 'c8' },
      { type: 'bishop', owner: 'enemy', sq: 'f8' },
      { type: 'pawn',   owner: 'enemy', sq: 'e7' },
      { type: 'pawn',   owner: 'enemy', sq: 'c7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
    ],
    personality: { material: 1.2, king_safety: 0.9, mobility: 1.5, aggression: 1.0 },
    createAI() { return defaultAI(this.personality); },
  },
  phalanx: {
    name: 'Phalanx',
    specialAbility: { name: 'Wall Formation', description: 'Advances a fortified king flanked by protecting knights.' },
    pieces: [
      { type: 'king',   owner: 'enemy', sq: 'e7' },
      { type: 'bishop', owner: 'enemy', sq: 'd7' },
      { type: 'pawn',   owner: 'enemy', sq: 'c7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
      { type: 'knight', owner: 'enemy', sq: 'c6' },
      { type: 'knight', owner: 'enemy', sq: 'f6' },
      { type: 'pawn',   owner: 'enemy', sq: 'd6' },
      { type: 'pawn',   owner: 'enemy', sq: 'e6' },
    ],
    personality: { material: 1.0, king_safety: 0.5, mobility: 1.5, aggression: 1.2 },
    createAI() { return defaultAI(this.personality); },
  },
  iron_line: {
    name: 'Iron Line',
    specialAbility: { name: 'Iron Defense', description: 'Holds a heavy defensive line anchored by rook and bishop.' },
    pieces: [
      { type: 'king',   owner: 'enemy', sq: 'e8' },
      { type: 'rook',   owner: 'enemy', sq: 'a8' },
      { type: 'bishop', owner: 'enemy', sq: 'f8' },
      { type: 'pawn',   owner: 'enemy', sq: 'a7' },
      { type: 'pawn',   owner: 'enemy', sq: 'b7' },
      { type: 'pawn',   owner: 'enemy', sq: 'd7' },
      { type: 'pawn',   owner: 'enemy', sq: 'e7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
      { type: 'knight', owner: 'enemy', sq: 'c6' },
      { type: 'pawn',   owner: 'enemy', sq: 'c5' },
    ],
    personality: { material: 1.5, king_safety: 1.0, mobility: 1.0, aggression: 1.5 },
    createAI() { return defaultAI(this.personality); },
  },
  cavalry_charge: {
    name: 'Cavalry Charge',
    specialAbility: { name: 'Four Horsemen', description: 'Deploys four knights in a sweeping cavalry rush.' },
    pieces: [
      { type: 'king',   owner: 'enemy', sq: 'e8' },
      { type: 'knight', owner: 'enemy', sq: 'b8' },
      { type: 'knight', owner: 'enemy', sq: 'c8' },
      { type: 'knight', owner: 'enemy', sq: 'f8' },
      { type: 'knight', owner: 'enemy', sq: 'g8' },
      { type: 'pawn',   owner: 'enemy', sq: 'a7' },
      { type: 'pawn',   owner: 'enemy', sq: 'b7' },
      { type: 'pawn',   owner: 'enemy', sq: 'c7' },
      { type: 'pawn',   owner: 'enemy', sq: 'd7' },
      { type: 'pawn',   owner: 'enemy', sq: 'e7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
      { type: 'pawn',   owner: 'enemy', sq: 'g7' },
      { type: 'pawn',   owner: 'enemy', sq: 'h7' },
    ],
    personality: { material: 1.0, king_safety: 0.5, mobility: 2.5, aggression: 1.5 },
    createAI() { return defaultAI(this.personality); },
  },
  high_command: {
    name: 'High Command',
    specialAbility: { name: 'Siege Tactics', description: 'Commands a mixed heavy army with relentless pressure.' },
    pieces: [
      { type: 'king',   owner: 'enemy', sq: 'g8' },
      { type: 'bishop', owner: 'enemy', sq: 'c8' },
      { type: 'rook',   owner: 'enemy', sq: 'f8' },
      { type: 'pawn',   owner: 'enemy', sq: 'a7' },
      { type: 'pawn',   owner: 'enemy', sq: 'b7' },
      { type: 'pawn',   owner: 'enemy', sq: 'c7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
      { type: 'pawn',   owner: 'enemy', sq: 'g7' },
      { type: 'pawn',   owner: 'enemy', sq: 'h7' },
      { type: 'knight', owner: 'enemy', sq: 'c6' },
      { type: 'knight', owner: 'enemy', sq: 'f6' },
      { type: 'pawn',   owner: 'enemy', sq: 'e6' },
      { type: 'pawn',   owner: 'enemy', sq: 'd5' },
    ],
    personality: { material: 1.3, king_safety: 0.8, mobility: 1.2, aggression: 1.4 },
    createAI() { return defaultAI(this.personality); },
  },
  duelist: {
    name: 'Duelist',
    specialAbility: { name: 'Double Strike', description: 'Every other turn, takes two moves instead of one.' },
    pieces: [
      { type: 'bishop', owner: 'enemy', sq: 'c8' },
      { type: 'knight', owner: 'enemy', sq: 'd8' },
      { type: 'king',   owner: 'enemy', sq: 'e8' },
      { type: 'bishop', owner: 'enemy', sq: 'f8' },
      { type: 'pawn',   owner: 'enemy', sq: 'c7' },
      { type: 'pawn',   owner: 'enemy', sq: 'd7' },
      { type: 'pawn',   owner: 'enemy', sq: 'e7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
    ],
    personality: { material: 1.2, king_safety: 0.8, mobility: 1.5, aggression: 1.2 },
    createAI() { return doubleMoveAI(this.personality); },
  },
  duelist_2: {
    name: 'Duelist II',
    specialAbility: { name: 'Double Strike+', description: 'Double-move threat backed by rook and queen firepower.' },
    pieces: [
      { type: 'rook',   owner: 'enemy', sq: 'a8' },
      { type: 'queen',  owner: 'enemy', sq: 'b8' },
      { type: 'bishop', owner: 'enemy', sq: 'c8' },
      { type: 'knight', owner: 'enemy', sq: 'd8' },
      { type: 'king',   owner: 'enemy', sq: 'e8' },
      { type: 'bishop', owner: 'enemy', sq: 'f8' },
      { type: 'pawn',   owner: 'enemy', sq: 'a7' },
      { type: 'pawn',   owner: 'enemy', sq: 'c7' },
      { type: 'pawn',   owner: 'enemy', sq: 'd7' },
      { type: 'pawn',   owner: 'enemy', sq: 'e7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
      { type: 'pawn',   owner: 'enemy', sq: 'g7' },
    ],
    personality: { material: 1.5, king_safety: 1.0, mobility: 1.5, aggression: 1.5 },
    createAI() { return doubleMoveAI(this.personality); },
  },
  boss_duelist: {
    name: 'Boss Duelist',
    specialAbility: { name: 'Grand Finale', description: 'Commands the full chess army with relentless double moves.' },
    pieces: [
      { type: 'rook',   owner: 'enemy', sq: 'a8' },
      { type: 'knight', owner: 'enemy', sq: 'b8' },
      { type: 'bishop', owner: 'enemy', sq: 'c8' },
      { type: 'queen',  owner: 'enemy', sq: 'd8' },
      { type: 'king',   owner: 'enemy', sq: 'e8' },
      { type: 'bishop', owner: 'enemy', sq: 'f8' },
      { type: 'knight', owner: 'enemy', sq: 'g8' },
      { type: 'rook',   owner: 'enemy', sq: 'h8' },
      { type: 'pawn',   owner: 'enemy', sq: 'a7' },
      { type: 'pawn',   owner: 'enemy', sq: 'b7' },
      { type: 'pawn',   owner: 'enemy', sq: 'c7' },
      { type: 'pawn',   owner: 'enemy', sq: 'd7' },
      { type: 'pawn',   owner: 'enemy', sq: 'e7' },
      { type: 'pawn',   owner: 'enemy', sq: 'f7' },
      { type: 'pawn',   owner: 'enemy', sq: 'g7' },
      { type: 'pawn',   owner: 'enemy', sq: 'h7' },
    ],
    personality: { material: 1.5, king_safety: 1.2, mobility: 1.0, pawn_advance: 0.8, aggression: 1.5 },
    createAI() { return doubleMoveAI(this.personality); },
  },
};

export const VALID_ENEMIES = new Set(Object.keys(ENEMIES));

// Regular enemies pool
export const REGULAR_ENEMIES = ['pawn_pusher', 'knight_rider', 'bishop_pair'];
// Elite enemies
export const ELITE_ENEMY = 'duelist';
export const ELITE_2_ENEMY = 'duelist_2';
// Boss enemy
export const BOSS_ENEMY = 'boss_duelist';

console.log('[enemies2] loaded enemies=%d', Object.keys(ENEMIES).length);
