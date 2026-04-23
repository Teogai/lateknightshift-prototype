/**
 * battle_state.js
 * Adapter: wraps engine2/GameState with the old GameState API that ui.js expects.
 *
 * Board dict format (toDict): { sq: { type: fullName, color: 'white'|'black' } }
 * engine2 board: { type: fullName, owner: 'player'|'enemy' }
 *
 * All card/AI logic is handled here using engine2 + ai2 + cards2.
 */

import { GameState as Engine2State } from './engine2/state.js';
import { makePiece } from './engine2/pieces.js';
import { get, set, sqToRC, rcToSq, inBounds, makeBoard } from './engine2/board.js';
import { generateLegalActions, isAttackedBy } from './engine2/movegen.js';
import { PIECE_DEFS } from './engine2/pieces.js';
import { buildStarterDeck, dealHand } from './cards2/move_cards.js';
import { ENEMIES, VALID_ENEMIES } from './enemies2.js';
import { VALID_CHARACTERS, CHARACTER_PIECES, HAND_SIZE, REDRAW_COUNTDOWN_START, VALID_PROMO } from './engine2/constants2.js';
import { attachEffect } from './engine2/effects.js';
import { makeShieldEffect } from './engine2/effect_types/shield.js';
import { resolvePromotions } from './engine2/promotion.js';

export { VALID_ENEMIES } from './enemies2.js';
export { VALID_CHARACTERS, CHARACTER_PIECES } from './engine2/constants2.js';
export { rcToSq } from './engine2/board.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

const PIECE_FULL = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
                     pawn: 'pawn', knight: 'knight', bishop: 'bishop', rook: 'rook', queen: 'queen', king: 'king' };
const PIECE_SHORT = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

function ownerToColor(owner) {
  return owner === 'player' ? 'white' : owner === 'neutral' ? 'neutral' : 'black';
}

export const PIECE_VALUES = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 99, duck: 0 };

function colorToOwner(color) {
  return color === 'white' ? 'player' : color === 'neutral' ? 'neutral' : 'enemy';
}

/** Convert engine2 board to the {sq:{type,color,tags}} dict the UI expects. */
function boardToDict(board) {
  const result = {};
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const sq = rcToSq(r, c);
        result[sq] = { type: piece.type, color: ownerToColor(piece.owner), tags: [...piece.tags] };
      }
    }
  }
  return result;
}

/** True if player king is absent from the board (enemy won). */
function playerKingGone(board) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p?.type === 'king' && p?.owner === 'player') return false;
    }
  return true;
}

/** True if enemy king is absent from the board (player won). */
function enemyKingGone(board) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p?.type === 'king' && p?.owner === 'enemy') return false;
    }
  return true;
}

/** Check win state from board, returns 'player_won'|'enemy_won'|null */
function checkKingCaptured(board) {
  if (enemyKingGone(board)) return 'player_won';
  if (playerKingGone(board)) return 'enemy_won';
  return null;
}

/** Knight attack squares from algebraic sq. */
export function knightAttacks(sq) {
  const [r, c] = sqToRC(sq);
  return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([nr, nc]) => inBounds(nr, nc))
    .map(([nr, nc]) => rcToSq(nr, nc));
}

/** Find the square of a king for owner, or null. */
function findKingSq(board, owner) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p?.type === 'king' && p?.owner === owner) return rcToSq(r, c);
    }
  return null;
}

/** Find the first piece that attacks targetSq from attackerOwner. */
function findAttacker(board, targetSq, attackerOwner) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.owner !== attackerOwner) continue;
      const from = rcToSq(r, c);
      // Use pseudo-legal check: does this piece attack targetSq?
      const pseudos = PIECE_DEFS[p.type]?.generateMoves(board, from, p, {}) ?? [];
      if (pseudos.some(m => m.sq === targetSq)) return from;
    }
  return null;
}

/** Validate geometric pattern (bishop/rook/queen) from src to dest on board. */
function matchesPattern(board, fromSq, toSq, patternType) {
  const [ff, fr] = sqToRC(fromSq);
  const [tf, tr] = sqToRC(toSq);
  const dr = tf - ff, dc = tr - fr;
  if (dr === 0 && dc === 0) return false;
  const diag = Math.abs(dr) === Math.abs(dc);
  const straight = dr === 0 || dc === 0;
  let ok = false;
  if (patternType === 'b') ok = diag;
  else if (patternType === 'r') ok = straight;
  else if (patternType === 'q') ok = diag || straight;
  if (!ok) return false;
  // Check path is clear (excluding endpoints)
  const stepR = Math.sign(tf - ff), stepC = Math.sign(tr - fr);
  let r = ff + stepR, c = fr + stepC;
  while (r !== tf || c !== tr) {
    if (!inBounds(r, c)) return false;
    if (board[r][c]) return false;
    r += stepR; c += stepC;
  }
  return true;
}

/** Resolve push effect: push all adjacent pieces 1 square away from center.
 *  Only pushes if the square directly behind the piece is empty and on-board.
 *  Returns array of { from, to } for all pushed pieces.
 */
export function resolvePush(board, centerSq, runState = null) {
  const [cr, cc] = sqToRC(centerSq);
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const pushes = [];
  const hasSlammer = runState?.relics?.some(r => r.id === 'slammer');

  for (const [dr, dc] of DIRS) {
    const r = cr + dr, c = cc + dc;
    if (!inBounds(r, c)) continue;
    const sq = rcToSq(r, c);
    const piece = get(board, sq);
    if (!piece) continue;

    const nextR = r + dr, nextC = c + dc;
    const blocked = !inBounds(nextR, nextC) || get(board, rcToSq(nextR, nextC));

    if (blocked && hasSlammer) {
      // Slammer: destroy the pushed piece
      const shielded = piece.tags?.has('shielded');
      if (shielded) {
        piece.tags.delete('shielded');
      } else {
        set(board, sq, null);
      }
      continue;
    }

    if (!inBounds(nextR, nextC)) continue; // Off-board, can't push
    const nextSq = rcToSq(nextR, nextC);
    if (get(board, nextSq)) continue; // Occupied, can't push

    // Push this single piece
    set(board, sq, null);
    set(board, nextSq, piece);
    pushes.push({ from: sq, to: nextSq });
  }

  return pushes;
}

/** Resolve atomic explosion: destroy all pieces in 3x3 area centered on sq. */
function resolveAtomicExplosion(board, centerSq) {
  const [cr, cc] = sqToRC(centerSq);
  const destroyed = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = cr + dr, c = cc + dc;
      if (!inBounds(r, c)) continue;
      const sq = rcToSq(r, c);
      const piece = get(board, sq);
      if (piece) {
        destroyed.push({ sq, piece });
        set(board, sq, null);
      }
    }
  }
  return destroyed;
}

/** Check and resolve atomic explosions after a capture.
 *  If the capturing piece or captured piece is atomic, destroy 3x3 area.
 */
function checkAndResolveAtomic(board, fromSq, toSq, wasCapture) {
  if (!wasCapture) return false;
  
  const mover = get(board, toSq);
  const isAtomic = mover?.data?.atomic;
  
  if (isAtomic) {
    resolveAtomicExplosion(board, toSq);
    return true;
  }
  return false;
}

// ─── BattleState (adapter) ────────────────────────────────────────────────────

export class GameState {
  constructor(character, enemy = 'pawn_pusher', persistentDeck = null, startingPieces = []) {
    if (!VALID_CHARACTERS.has(character)) throw new Error(`unknown character: ${character}`);
    if (!VALID_ENEMIES.has(enemy)) throw new Error(`unknown enemy: ${enemy}`);

    this._state = new Engine2State();
    this.character = character;

    // Place player pieces from CHARACTER_PIECES
    for (const { type, sq } of CHARACTER_PIECES[character]) {
      const fullType = PIECE_FULL[type] || type;
      set(this._state.board, sq, makePiece(fullType, 'player'));
    }

    // Place starting pieces from run
    for (const { piece, square } of startingPieces) {
      if (!get(this._state.board, square)) {
        const pieceType = PIECE_FULL[piece.type] || piece.type;
        set(this._state.board, square, makePiece(pieceType, 'player'));
      }
    }

    // Place enemy pieces
    const enemyDef = ENEMIES[enemy];
    for (const { type, sq, owner } of enemyDef.pieces) {
      set(this._state.board, sq, makePiece(type, owner || 'enemy'));
    }

    this._enemyAI = enemyDef.createAI();
    this._personality = enemyDef.personality;
    this._enemyAiType = enemyDef.aiType;
    this.enemyPhase = enemyDef.aiType === 'doubleMove' ? 'warn' : 'normal';

    // Cards
    const rawDeck = persistentDeck
      ? persistentDeck.map(c => ({ ...c }))
      : buildStarterDeck(character);
    // shuffle
    for (let i = rawDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawDeck[i], rawDeck[j]] = [rawDeck[j], rawDeck[i]];
    }
    const dealt = dealHand(rawDeck, HAND_SIZE);
    this._state.deck = dealt.deck;
    this._state.hand = dealt.hand;
    this._state.discard = dealt.discard;

    this.turn = 'player';
    this.redrawCountdown = REDRAW_COUNTDOWN_START;
    this.enemyWillDoubleMove = false;
    this.lastMove = { from: null, to: null };
    this._blitzPieceSq = null;
    this._blitzCardIndex = null;
    this._moveTogetherFirstPieceSq = null;
    this._moveTogetherCardIndex = null;

    console.log('[battle_state] created character=%s enemy=%s', character, enemy);
  }

  // ─── toDict ────────────────────────────────────────────────────────────────

  toDict() {
    const board = this._state.board;
    const playerKingSq = findKingSq(board, 'player');
    const enemyKingSq  = findKingSq(board, 'enemy');

    let inCheck = false, checkAttackerSq = null;
    if (playerKingSq && isAttackedBy(board, playerKingSq, 'enemy')) {
      inCheck = true;
      checkAttackerSq = findAttacker(board, playerKingSq, 'enemy');
    }

    let enemyInCheck = false, enemyCheckAttackerSq = null;
    if (enemyKingSq && isAttackedBy(board, enemyKingSq, 'player')) {
      enemyInCheck = true;
      enemyCheckAttackerSq = findAttacker(board, enemyKingSq, 'player');
    }

    return {
      board: boardToDict(board),
      redraw_countdown: this.redrawCountdown,
      hand: this._state.hand,
      turn: this.turn,
      deck_size: this._state.deck.length,
      discard_size: this._state.discard.length,
      deck: this._state.deck.map(c => ({ ...c })),
      discard: this._state.discard.map(c => ({ ...c })),
      last_move: { from: this.lastMove.from, to: this.lastMove.to },
      in_check: inCheck,
      check_attacker_sq: checkAttackerSq,
      enemy_in_check: enemyInCheck,
      enemy_check_attacker_sq: enemyCheckAttackerSq,
      enemy_will_double_move: this.enemyWillDoubleMove,
    };
  }

  // ─── move targeting ────────────────────────────────────────────────────────

  legalDestinationsFor(sq) {
    const piece = get(this._state.board, sq);
    if (!piece || piece.owner !== 'player') return [];
    const actions = generateLegalActions(this._state, 'player');
    return actions
      .filter(a => a.source === sq)
      .map(a => a.targets[0]);
  }

  legalMovesForPiece(sq) {
    const piece = get(this._state.board, sq);
    if (!piece) return [];
    const owner = piece.owner;
    const actions = generateLegalActions(this._state, owner);
    return actions
      .filter(a => a.source === sq)
      .map(a => a.targets[0]);
  }

  geometricDestsFor(sq, pattern) {
    const piece = get(this._state.board, sq);
    if (!piece || piece.owner !== 'player') return [];
    const board = this._state.board;
    const dests = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const toSq = rcToSq(r, c);
        if (toSq === sq) continue;
        const target = board[r][c];
        if (target?.owner === 'player') continue;
        if (matchesPattern(board, sq, toSq, pattern)) dests.push(toSq);
      }
    }
    return dests;
  }

  pawnBoostDestsFor(sq) {
    const piece = get(this._state.board, sq);
    if (!piece || piece.owner !== 'player' || piece.type !== 'pawn') return [];
    const board = this._state.board;
    const [fromR, fromC] = sqToRC(sq);
    const dests = [];
    // Player pawns move forward = decreasing row (toward rank 8)
    for (let r = fromR - 1; r >= 0; r--) {
      const target = board[r][fromC];
      if (target) {
        if (target.owner !== 'player') dests.push(rcToSq(r, fromC));
        break;
      }
      dests.push(rcToSq(r, fromC));
    }
    return dests;
  }

  // ─── card play ─────────────────────────────────────────────────────────────

  playMoveCard(cardIndex, fromSq, toSq, promotion = null) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move') return { error: 'not a move card' };
    if (card.unplayable) return { error: 'card is unplayable' };

    const piece = get(this._state.board, fromSq);
    const hasDuckHandler = this.runState?.relics?.some(r => r.id === 'duck_handler');
    const isDuck = piece?.type === 'duck';
    if (!piece || (piece.owner !== 'player' && !(isDuck && hasDuckHandler))) {
      return { error: 'no friendly piece on that square' };
    }

    // For duck with Duck Handler: king-like moves, no captures
    if (isDuck && hasDuckHandler) {
      const [fr, fc] = sqToRC(fromSq);
      const [tr, tc] = sqToRC(toSq);
      const dr = Math.abs(tr - fr);
      const dc = Math.abs(tc - fc);
      if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
        return { error: 'not a legal destination' };
      }
      const target = get(this._state.board, toSq);
      if (target) {
        return { error: 'not a legal destination' };
      }
      // Move duck
      set(this._state.board, fromSq, null);
      set(this._state.board, toSq, piece);
      this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
      this.lastMove = { from: fromSq, to: toSq };
      return { ok: true };
    }

    const targetPiece = get(this._state.board, toSq);
    const isCapture = targetPiece && targetPiece.owner !== 'player';
    const isKingCapture = targetPiece?.type === 'king' && targetPiece?.owner === 'enemy';

    if (!isKingCapture) {
      const actions = generateLegalActions(this._state, 'player');
      const action = actions.find(a => a.source === fromSq && a.targets[0] === toSq);
      if (!action) return { error: 'illegal move' };

      if (promotion) {
        const promoType = PIECE_FULL[promotion] || promotion;
        action.payload = { ...(action.payload || {}), promotion: promoType };
      } else if (action.payload?.promotion) {
        // No promotion choice provided: strip auto-promotion so
        // checkPromotions can show the promotion modal instead.
        const { promotion: _, ...restPayload } = action.payload;
        action.payload = Object.keys(restPayload).length > 0 ? restPayload : undefined;
      }
      this._state.play(action);
    } else {
      // King capture: bypass legality check
      const promoType = promotion ? PIECE_FULL[promotion] || promotion : null;
      const action = {
        kind: 'move',
        source: fromSq,
        targets: [toSq],
        piece,
        ...(promoType ? { payload: { promotion: promoType } } : {}),
      };
      this._state.play(action);
    }

    const isPawnDoublePush = piece.type === 'pawn' && fromSq[1] === '2' && toSq[1] === '4';
    this._state.enPassant = isPawnDoublePush ? (toSq[0] + '3') : null;

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    // Resolve push charm if present
    if (card.charm?.id === 'push') {
      resolvePush(this._state.board, toSq, this.runState);
    }

    // Resolve atomic explosion if capture by atomic piece
    checkAndResolveAtomic(this._state.board, fromSq, toSq, isCapture);

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  playKnightMoveCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== 'knight') return { error: 'not a knight_move card' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };

    if (!knightAttacks(fromSq).includes(toSq)) return { error: 'invalid knight move destination' };

    const target = get(this._state.board, toSq);
    const isCapture = target && target.owner !== 'player';
    if (target?.owner === 'player') return { error: 'square occupied by friendly piece' };

    set(this._state.board, fromSq, null);
    set(this._state.board, toSq, piece);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    // Resolve push charm if present
    if (card.charm?.id === 'push') {
      resolvePush(this._state.board, toSq, this.runState);
    }

    // Resolve atomic explosion if capture by atomic piece
    checkAndResolveAtomic(this._state.board, fromSq, toSq, isCapture);

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  _playPatternMoveCard(cardIndex, expectedVariant, pattern, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== expectedVariant) return { error: `not a ${expectedVariant} move card` };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };

    const target = get(this._state.board, toSq);
    const isCapture = target && target.owner !== 'player';
    if (target?.owner === 'player') return { error: 'square occupied by friendly piece' };
    if (!matchesPattern(this._state.board, fromSq, toSq, pattern)) return { error: 'invalid destination for this card' };

    set(this._state.board, fromSq, null);
    set(this._state.board, toSq, piece);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    // Resolve push charm if present
    if (card.charm?.id === 'push') {
      resolvePush(this._state.board, toSq, this.runState);
    }

    // Resolve atomic explosion if capture by atomic piece
    checkAndResolveAtomic(this._state.board, fromSq, toSq, isCapture);

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  playBishopMoveCard(cardIndex, fromSq, toSq) {
    return this._playPatternMoveCard(cardIndex, 'bishop', 'b', fromSq, toSq);
  }

  playRookMoveCard(cardIndex, fromSq, toSq) {
    return this._playPatternMoveCard(cardIndex, 'rook', 'r', fromSq, toSq);
  }

  playQueenMoveCard(cardIndex, fromSq, toSq) {
    return this._playPatternMoveCard(cardIndex, 'queen', 'q', fromSq, toSq);
  }

  playPawnBoostCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== 'pawn_boost') return { error: 'not a pawn_boost card' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };
    if (piece.type !== 'pawn') return { error: 'pawn boost can only be used on pawns' };

    const dests = this.pawnBoostDestsFor(fromSq);
    if (!dests.includes(toSq)) return { error: 'invalid destination for pawn boost' };

    const target = get(this._state.board, toSq);
    const isCapture = target && target.owner !== 'player';

    set(this._state.board, fromSq, null);
    set(this._state.board, toSq, piece);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    // Resolve push charm if present
    if (card.charm?.id === 'push') {
      resolvePush(this._state.board, toSq, this.runState);
    }

    // Resolve atomic explosion if capture by atomic piece
    checkAndResolveAtomic(this._state.board, fromSq, toSq, isCapture);

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  applyPromotion(sq, promoType) {
    if (!VALID_PROMO.has(promoType)) return { error: 'invalid promotion piece' };
    const piece = get(this._state.board, sq);
    if (!piece || piece.type !== 'pawn') return { error: 'no promotable pawn on that square' };
    set(this._state.board, sq, makePiece(PIECE_FULL[promoType] || promoType, piece.owner));
    return { ok: true };
  }

  checkPromotions() {
    const { playerPromos, autoPromoted } = resolvePromotions(this._state);
    return { playerPromos, autoPromoted };
  }

  playPieceCard(cardIndex, pieceType, toSq) {
    if (this.toDict().turn !== 'player') return { error: 'not player turn' };
    const hand = this._state.hand;
    const card = hand[cardIndex];
    if (card.type !== 'piece') return { error: 'not a piece card' };
    if (card.piece && card.piece !== pieceType) return { error: 'card places a different piece type' };

    if (!PIECE_FULL[pieceType] && !['pawn','knight','bishop','rook','queen'].includes(pieceType))
      return { error: 'unknown piece type' };

    if (get(this._state.board, toSq)) return { error: 'square occupied' };

    const rank = parseInt(toSq[1]);
    if (rank !== 1 && rank !== 2) return { error: 'pieces must be placed on ranks 1 or 2' };

    const newPiece = makePiece(pieceType, 'player');
    if (card.charm?.id === 'atomic') {
      newPiece.data.atomic = true;
    }
    set(this._state.board, toSq, newPiece);
    this._state.hand.splice(cardIndex, 1);
    this.lastMove = { from: null, to: toSq };

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  // ─── status decay ──────────────────────────────────────────────────────────

  _decayGhostStatuses(owner) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this._state.board[r][c];
        if (!piece || piece.owner !== owner) continue;
        if (!piece.tags.has('ghost')) continue;
        const turns = piece.data.ghostTurns ?? 1;
        if (turns <= 1) {
          piece.tags.delete('ghost');
          delete piece.data.ghostTurns;
        } else {
          piece.data.ghostTurns = turns - 1;
        }
      }
    }
  }

  _decayStunStatuses() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this._state.board[r][c];
        if (!piece) continue;
        if (!piece.tags.has('stunned')) continue;
        const turns = piece.data.stunTurns ?? 1;
        if (turns <= 1) {
          piece.tags.delete('stunned');
          delete piece.data.stunTurns;
        } else {
          piece.data.stunTurns = turns - 1;
        }
      }
    }
  }

  // ─── new card play methods ─────────────────────────────────────────────────

  playSummonDuckCard(cardIndex, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'piece' || card.piece !== 'duck') return { error: 'not a summon_duck card' };
    if (get(this._state.board, toSq)) return { error: 'square occupied' };

    set(this._state.board, toSq, makePiece('duck', 'neutral'));
    this._state.hand.splice(cardIndex, 1);
    this.lastMove = { from: null, to: toSq };

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  playMoveDuckCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== 'duck') return { error: 'not a move_duck card' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.type !== 'duck') return { error: 'no duck on that square' };
    if (get(this._state.board, toSq)) return { error: 'destination occupied' };

    set(this._state.board, fromSq, null);
    set(this._state.board, toSq, piece);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    return { ok: true };
  }

  playStunCard(cardIndex, sq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'action' || card.actionType !== 'stun') return { error: 'not a stun card' };

    const piece = get(this._state.board, sq);
    if (!piece) return { error: 'no piece on that square' };

    piece.tags.add('stunned');
    piece.data.stunTurns = 2;
    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);

    return { ok: true };
  }

  playShieldCard(cardIndex, sq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'action' || card.actionType !== 'shield') return { error: 'not a shield card' };

    const piece = get(this._state.board, sq);
    if (!piece) return { error: 'no piece on that square' };

    piece.tags.add('shielded');
    const shieldFx = makeShieldEffect(piece.id);
    attachEffect(this._state, { piece: piece.id }, shieldFx);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);

    return { ok: true };
  }

  playSacrificeCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'action' || card.actionType !== 'sacrifice') return { error: 'not a sacrifice card' };

    const friendly = get(this._state.board, fromSq);
    if (!friendly || friendly.owner !== 'player') return { error: 'select a friendly piece to sacrifice' };

    const enemy = get(this._state.board, toSq);
    if (!enemy || enemy.owner === 'player') return { error: 'select an enemy piece to destroy' };

    const friendlyVal = PIECE_VALUES[friendly.type] ?? 0;
    const enemyVal = PIECE_VALUES[enemy.type] ?? 0;
    if (enemyVal >= friendlyVal) return { error: 'target must be weaker than sacrificed piece' };

    set(this._state.board, fromSq, null);
    set(this._state.board, toSq, null);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  playUnblockCard(cardIndex, sq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'action' || card.actionType !== 'unblock') return { error: 'not an unblock card' };

    const piece = get(this._state.board, sq);
    if (!piece) return { error: 'no piece on that square' };

    piece.tags.add('ghost');
    piece.data.ghostTurns = 5;

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);

    return { ok: true };
  }

  playSwapMoveCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== 'swap') return { error: 'not a swap card' };

    const piece1 = get(this._state.board, fromSq);
    const piece2 = get(this._state.board, toSq);
    if (!piece1 || !piece2) return { error: 'both squares must have pieces' };
    if (piece1.owner !== 'player' || piece2.owner !== 'player') return { error: 'both pieces must be friendly' };

    set(this._state.board, fromSq, piece2);
    set(this._state.board, toSq, piece1);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    return { ok: true };
  }

  playTeleportCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== 'teleport') return { error: 'not a teleport card' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };

    const target = get(this._state.board, toSq);
    if (target) return { error: 'destination must be empty' };

    set(this._state.board, fromSq, null);
    set(this._state.board, toSq, piece);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  playSnapCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'action' || card.actionType !== 'snap') return { error: 'not a snap card' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };

    const target = get(this._state.board, toSq);
    if (!target || target.owner === 'player') return { error: 'target must be an enemy piece' };

    // Verify it's a legal capture target for this piece
    const actions = generateLegalActions(this._state, 'player');
    const canCapture = actions.some(a => a.source === fromSq && a.targets[0] === toSq);
    if (!canCapture) return { error: 'not a legal capture target' };

    // Capture without moving
    set(this._state.board, toSq, null);

    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: fromSq, to: toSq };

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  playBlitzFirstMove(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== 'blitz') return { error: 'not a blitz card' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };

    const actions = generateLegalActions(this._state, 'player');
    const action = actions.find(a => a.source === fromSq && a.targets[0] === toSq);
    if (!action) return { error: 'illegal move' };

    this._state.play(action);

    this._blitzPieceSq = toSq;
    this._blitzCardIndex = cardIndex;
    this.lastMove = { from: fromSq, to: toSq };

    return { ok: true };
  }

  playBlitzSecondMove(toSq) {
    if (this._blitzPieceSq === null) return { error: 'no active blitz move' };

    const fromSq = this._blitzPieceSq;
    const piece = get(this._state.board, fromSq);
    if (!piece) return { error: 'piece no longer on board' };

    const actions = generateLegalActions(this._state, 'player');
    const action = actions.find(a => a.source === fromSq && a.targets[0] === toSq);
    if (!action) return { error: 'illegal move' };

    this._state.play(action);

    // Discard the card now
    const cardIndex = this._blitzCardIndex;
    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);

    this._blitzPieceSq = null;
    this._blitzCardIndex = null;
    this.lastMove = { from: fromSq, to: toSq };

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  playMoveTogetherFirst(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this._state.hand.length) return { error: 'invalid card index' };
    const card = this._state.hand[cardIndex];
    if (card.type !== 'move' || card.moveVariant !== 'move_together') return { error: 'not a move_together card' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };

    const actions = generateLegalActions(this._state, 'player');
    const action = actions.find(a => a.source === fromSq && a.targets[0] === toSq);
    if (!action) return { error: 'illegal move' };

    this._state.play(action);

    this._moveTogetherFirstPieceSq = toSq;
    this._moveTogetherCardIndex = cardIndex;
    this.lastMove = { from: fromSq, to: toSq };

    return { ok: true };
  }

  playMoveTogetherSecond(fromSq, toSq) {
    if (this._moveTogetherFirstPieceSq === null) return { error: 'no active move_together' };

    if (fromSq === this._moveTogetherFirstPieceSq) return { error: 'must move a different piece' };

    const piece = get(this._state.board, fromSq);
    if (!piece || piece.owner !== 'player') return { error: 'no friendly piece on that square' };

    const actions = generateLegalActions(this._state, 'player');
    const action = actions.find(a => a.source === fromSq && a.targets[0] === toSq);
    if (!action) return { error: 'illegal move' };

    this._state.play(action);

    // Discard the card now
    const cardIndex = this._moveTogetherCardIndex;
    this._state.discard.push(this._state.hand.splice(cardIndex, 1)[0]);

    this._moveTogetherFirstPieceSq = null;
    this._moveTogetherCardIndex = null;
    this.lastMove = { from: fromSq, to: toSq };

    const winner = checkKingCaptured(this._state.board);
    if (winner) this.turn = winner;

    return { ok: true };
  }

  // ─── enemy turn ────────────────────────────────────────────────────────────

  _applyEnemyAction(action) {
    if (!action) return;
    this._state.enPassant = null;
    this.lastMove = { from: action.source, to: action.targets?.[0] ?? null };
    // Handle en passant update
    const piece = get(this._state.board, action.source);
    
    // Check if destination has an atomic piece before capture
    const dest = action.targets?.[0];
    const targetPiece = dest ? get(this._state.board, dest) : null;
    const isCapture = targetPiece && targetPiece.owner !== piece?.owner;
    const targetWasAtomic = targetPiece?.data?.atomic;
    
    this._state.play(action);
    
    // Resolve atomic explosion if captured piece was atomic
    if (isCapture && targetWasAtomic) {
      resolveAtomicExplosion(this._state.board, dest);
    }
    
    // Track enemy pawn double-push for en passant
    if (piece?.type === 'pawn' && action.source?.[1] === '7' && action.targets?.[0]?.[1] === '5') {
      this._state.enPassant = action.targets[0][0] + '6';
    }
  }

  startEnemyTurn() {
    if (this.turn !== 'player') return { error: 'not player turn' };
    this.turn = 'enemy';
    this._blitzPieceSq = null;
    this._blitzCardIndex = null;
    this._moveTogetherFirstPieceSq = null;
    this._moveTogetherCardIndex = null;
    this._decayGhostStatuses('enemy');

    if (!this._enemyAI) {
      return { pendingMoves: [], warnNext: false };
    }

    // Determine current phase and pass to AI
    const phase = this._enemyAiType === 'doubleMove' ? this.enemyPhase : 'normal';
    const result = this._enemyAI.selectMove(this._state, phase);

    if (!result) {
      return { pendingMoves: [], warnNext: false };
    }

    // Compute warnNext for next turn based on phase transition
    let warnNext = false;
    if (this._enemyAiType === 'doubleMove') {
      if (phase === 'warn') {
        this.enemyPhase = 'double';
        warnNext = true; // next turn will be double
      } else {
        this.enemyPhase = 'warn';
        warnNext = false; // next turn will be normal
      }
    }

    // Double-move AI returns { _double: true, moves: [...] }
    if (result._double) {
      const [first, ...rest] = result.moves;
      if (first) {
        this._applyEnemyAction(first);
        this.lastMove = { from: first.source, to: first.targets?.[0] };
        const winner = checkKingCaptured(this._state.board);
        if (winner) {
          this.turn = winner;
          return { pendingMoves: [], warnNext };
        }
      }
      return { pendingMoves: rest, warnNext };
    }

    this._applyEnemyAction(result);
    if (result.source) {
      this.lastMove = { from: result.source, to: result.targets?.[0] };
    }
    const winner = checkKingCaptured(this._state.board);
    if (winner) {
      this.turn = winner;
      return { pendingMoves: [], warnNext };
    }

    return { pendingMoves: [], warnNext };
  }

  finishEnemyTurn(pendingMoves, warnNext = false) {
    for (const action of pendingMoves) {
      this._applyEnemyAction(action);
      this.lastMove = { from: action.source, to: action.targets?.[0] };
      const winner = checkKingCaptured(this._state.board);
      if (winner) { this.turn = winner; break; }
    }

    // Auto-promote any enemy pawns that reached rank 1
    resolvePromotions(this._state);

    this.enemyWillDoubleMove = warnNext;

    if (this.turn !== 'player_won' && this.turn !== 'enemy_won') {
      this.turn = 'player';
      this.redrawCountdown = Math.max(0, this.redrawCountdown - 1);
    }

    return { ok: true };
  }

  executeEnemyTurnSequence() {
    const { pendingMoves, warnNext, error } = this.startEnemyTurn();
    if (error) return { error, firstMove: null, remainingMoves: [], warnNext: false, gameEnded: false };

    const firstMove = this.lastMove.from !== null ? { from: this.lastMove.from, to: this.lastMove.to } : null;
    const gameEnded = this.turn === 'player_won' || this.turn === 'enemy_won';

    return { firstMove, remainingMoves: pendingMoves, warnNext, gameEnded };
  }

  executeNextEnemyMove(action) {
    this._applyEnemyAction(action);
    const winner = checkKingCaptured(this._state.board);
    if (winner) {
      this.turn = winner;
      return { ok: true, gameEnded: true };
    }
    // Auto-promote any enemy pawns that reached rank 1
    resolvePromotions(this._state);
    return { ok: true, gameEnded: false };
  }

  finishEnemyTurnSequence(warnNext = false) {
    this.enemyWillDoubleMove = warnNext;
    // enPassant is intentionally NOT cleared here — it must persist into the
    // player's turn so they can capture en passant.  It is cleared at the
    // start of the next enemy turn (_applyEnemyAction).

    if (this.turn !== 'player_won' && this.turn !== 'enemy_won') {
      this.turn = 'player';
      this.redrawCountdown = Math.max(0, this.redrawCountdown - 1);
      this._decayGhostStatuses('player');
      this._decayStunStatuses();
    }

    return { ok: true };
  }

  // ─── redraw ────────────────────────────────────────────────────────────────

  redrawHand() {
    this._state.discard.push(...this._state.hand);
    this._state.hand = [];
    if (this._state.deck.length < HAND_SIZE) {
      this._state.deck.push(...this._state.discard);
      this._state.discard = [];
      for (let i = this._state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._state.deck[i], this._state.deck[j]] = [this._state.deck[j], this._state.deck[i]];
      }
    }
    const dealt = dealHand(this._state.deck, HAND_SIZE, this._state.discard);
    this._state.deck = dealt.deck;
    this._state.hand = dealt.hand;
    this._state.discard = dealt.discard;
    console.log('[battle_state] redraw countdown=%d free=%s', this.redrawCountdown, this.redrawCountdown === 0);
    if (this.redrawCountdown === 0) {
      this.redrawCountdown = REDRAW_COUNTDOWN_START;
      return { ok: true, free: true };
    }
    // Costly redraw: reset countdown to START+1 so finishEnemyTurnSequence() decrements to START
    this.redrawCountdown = REDRAW_COUNTDOWN_START + 1;
    return { ok: true, free: false };
  }

  // ─── debug ────────────────────────────────────────────────────────────────

  debugMovePiece(fromSq, toSq) {
    const board = this._state.board;
    const piece = get(board, fromSq);
    if (!piece) return { error: 'no piece at ' + fromSq };
    set(board, toSq, piece);
    set(board, fromSq, null);
    const win = checkKingCaptured(board);
    if (win) this.turn = win;
    console.log('[debug] move %s→%s piece=%s win=%s', fromSq, toSq, piece.type, win);
    
    // Check for pawn promotion (rank 8 = row 0 for white pawns)
    if (piece.type === 'pawn' && piece.owner === 'player') {
      const [r] = sqToRC(toSq);
      if (r === 0) return { needs_promotion: true };
    }
    
    return {};
  }

  endTurn() {
    const { pendingMoves, warnNext, error } = this.startEnemyTurn();
    if (error) return { error };
    return this.finishEnemyTurn(pendingMoves, warnNext);
  }
}

console.log('[battle_state] loaded');
