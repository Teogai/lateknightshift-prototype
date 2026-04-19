import { Chess } from 'chess.js';
import { buildStarterDeck, dealHand } from './cards.js';
import { HAND_SIZE, REDRAW_COUNTDOWN_START, VALID_PROMO, VALID_CHARACTERS } from './engine/constants.js';
import { ENEMIES, VALID_ENEMIES } from './enemies.js';
import {
  makeBoard, boardToDict, knightAttacks,
  getMovesForSq, pseudoLegalMovesFor, allGeometricMovesFor,
  checkKingCaptured, checkInfo, enemyCheckInfo, executeKingCapture, clearPath,
} from './engine/board.js';

export { HAND_SIZE, REDRAW_COUNTDOWN_START, VALID_PROMO, CHARACTER_PIECES, VALID_CHARACTERS } from './engine/constants.js';
export { ENEMIES, VALID_ENEMIES } from './enemies.js';
export { boardToDict, knightAttacks, enemyCheckInfo } from './engine/board.js';

// Validate that a move matches a geometric pattern (ignoring actual piece type).
// patternPiece: 'b' (diagonal), 'r' (straight), 'q' (both)
function matchesPattern(chess, fromSq, toSq, patternPiece) {
  const ff = fromSq.charCodeAt(0) - 97;
  const fr = parseInt(fromSq[1]) - 1;
  const tf = toSq.charCodeAt(0) - 97;
  const tr = parseInt(toSq[1]) - 1;
  const df = tf - ff, dr = tr - fr;
  if (df === 0 && dr === 0) return false;
  // re-use clearPath for path-clear check
  const diag = Math.abs(df) === Math.abs(dr);
  const straight = df === 0 || dr === 0;
  let matches = false;
  if (patternPiece === 'b') matches = diag;
  else if (patternPiece === 'r') matches = straight;
  else if (patternPiece === 'q') matches = diag || straight;
  if (!matches) return false;
  return clearPath(chess, ff, fr, tf, tr);
}

export class GameState {
  constructor(character, enemy = 'pawn_pusher', persistentDeck = null, startingPieces = []) {
    if (!VALID_CHARACTERS.has(character)) throw new Error(`unknown character: ${character}`);
    if (!VALID_ENEMIES.has(enemy)) throw new Error(`unknown enemy: ${enemy}`);
    this._chess = makeBoard(character, enemy);

    // Place any extra starting pieces from a run
    for (const { piece, square } of startingPieces) {
      if (!this._chess.get(square)) {
        this._chess.put(piece, square);
      }
    }

    const enemyDef = ENEMIES[enemy];
    this._personality = enemyDef.personality;
    this._enemyAI = enemyDef.createAI ? enemyDef.createAI() : null;
    this.character = character;
    this.redrawCountdown = REDRAW_COUNTDOWN_START;
    this.enemyWillDoubleMove = false;

    const rawDeck = persistentDeck
      ? persistentDeck.map(c => ({ ...c }))
      : buildStarterDeck(character);
    // shuffle
    for (let i = rawDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawDeck[i], rawDeck[j]] = [rawDeck[j], rawDeck[i]];
    }
    const dealt = dealHand(rawDeck, HAND_SIZE);
    this.deck = dealt.deck;
    this.hand = dealt.hand;
    this.discard = dealt.discard;
    this.turn = 'player';
    this.summonedThisTurn = new Set();
    this.movedThisTurn = new Set();
    this.lastMove = { from: null, to: null };
    this.enPassantTarget = null;
    // Rolling log of recent position keys (board segment of FEN). Used by the
    // enemy AI to penalize moves that reach a recently-seen position, which
    // breaks cross-turn shuffling in quiet endgames.
    this.positionHistory = [this._positionKey()];
  }

  _positionKey() {
    // Board-only FEN segment: ignores turn/castling/EP/halfmove intentionally
    // so "same pieces on same squares" counts as repetition regardless of side to move.
    return this._chess.fen().split(' ')[0];
  }

  _pushPositionHistory() {
    this.positionHistory.push(this._positionKey());
    if (this.positionHistory.length > 12) this.positionHistory.shift();
  }

  toDict() {
    const check = checkInfo(this._chess);
    const enemyCheck = enemyCheckInfo(this._chess);
    return {
      board: boardToDict(this._chess),
      redraw_countdown: this.redrawCountdown,
      hand: this.hand,
      turn: this.turn,
      deck_size: this.deck.length,
      discard_size: this.discard.length,
      moved_this_turn: [...this.movedThisTurn],
      summoned_this_turn: [...this.summonedThisTurn],
      last_move: { from: this.lastMove.from, to: this.lastMove.to },
      in_check: check.in_check,
      check_attacker_sq: check.check_attacker_sq,
      enemy_in_check: enemyCheck.enemy_in_check,
      enemy_check_attacker_sq: enemyCheck.enemy_check_attacker_sq,
      enemy_will_double_move: this.enemyWillDoubleMove,
    };
  }

  legalDestinationsFor(sq) {
    const piece = this._chess.get(sq);
    if (!piece || piece.color !== 'w') return [];
    if (this.summonedThisTurn.has(sq) || this.movedThisTurn.has(sq)) return [];
    return getMovesForSq(this._chess, sq, 'w', this.enPassantTarget).map(m => m.to);
  }

  geometricDestsFor(sq, pattern) {
    const piece = this._chess.get(sq);
    if (!piece || piece.color !== 'w') return [];
    if (this.movedThisTurn.has(sq)) return [];
    const dests = [];
    for (let rank = 1; rank <= 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const to = 'abcdefgh'[file] + rank;
        if (to === sq) continue;
        const target = this._chess.get(to);
        if (target?.color === 'w') continue;
        if (matchesPattern(this._chess, sq, to, pattern)) dests.push(to);
      }
    }
    return dests;
  }

  pseudoLegalMovesFor(color) {
    return pseudoLegalMovesFor(this._chess, color, this.enPassantTarget);
  }

  _allGeometricMovesFor(color) {
    return allGeometricMovesFor(this._chess, color);
  }

  playMoveCard(cardIndex, fromSq, toSq, promotion = null) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return { error: 'invalid card index' };
    const card = this.hand[cardIndex];
    if (card.type !== 'move') return { error: 'not a move card' };
    if (card.unplayable) return { error: 'card is unplayable' };

    const piece = this._chess.get(fromSq);
    if (!piece || piece.color !== 'w') return { error: 'no friendly piece on that square' };
    if (this.summonedThisTurn.has(fromSq)) return { error: 'summoned pieces cannot move this turn' };
    if (this.movedThisTurn.has(fromSq)) return { error: 'piece already moved this turn' };

    const isPromo = piece.type === 'p' && toSq[1] === '8';
    if (isPromo && !VALID_PROMO.has(promotion)) return { error: 'promotion piece required' };

    const targetPiece = this._chess.get(toSq);
    const isKingCapture = targetPiece?.type === 'k' && targetPiece?.color === 'b';

    if (isKingCapture) {
      const movingPiece = isPromo ? { type: promotion, color: 'w' } : piece;
      executeKingCapture(this._chess, fromSq, toSq, movingPiece);
    } else {
      const dests = getMovesForSq(this._chess, fromSq, 'w', this.enPassantTarget).map(m => m.to);
      if (!dests.includes(toSq)) return { error: 'illegal move' };

      const fen = this._chess.fen();
      const parts = fen.split(' ');
      const epW = this.enPassantTarget;
      parts[1] = 'w'; parts[2] = '-'; parts[3] = (epW && epW[1] === '6') ? epW : '-';
      this._chess.load(parts.join(' '));
      this._chess.move({ from: fromSq, to: toSq, promotion: isPromo ? promotion : undefined });
    }

    const isPawnDoublePush = piece.type === 'p' && fromSq[1] === '2' && toSq[1] === '4';
    this.enPassantTarget = isPawnDoublePush ? (toSq[0] + '3') : null;

    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.movedThisTurn.add(toSq);
    this.lastMove = { from: fromSq, to: toSq };
    this._pushPositionHistory();
    const winner = checkKingCaptured(this._chess);
    if (winner) this.turn = winner;
    const { pendingMoves: pm1, warnNext: wn1, error: e1 } = this.startEnemyTurn();
    if (!e1) this.finishEnemyTurn(pm1, wn1);
    return { ok: true };
  }

  playKnightMoveCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return { error: 'invalid card index' };
    const card = this.hand[cardIndex];
    if (card.type !== 'knight_move') return { error: 'not a knight_move card' };

    const piece = this._chess.get(fromSq);
    if (!piece || piece.color !== 'w') return { error: 'no friendly piece on that square' };
    if (this.movedThisTurn.has(fromSq)) return { error: 'piece already moved this turn' };

    if (!knightAttacks(fromSq).includes(toSq)) return { error: 'invalid knight move destination' };

    const target = this._chess.get(toSq);
    if (target?.color === 'w') return { error: 'square occupied by friendly piece' };

    this._chess.remove(fromSq);
    this._chess.put(piece, toSq);

    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.movedThisTurn.add(toSq);
    this.lastMove = { from: fromSq, to: toSq };
    this._pushPositionHistory();
    const winner = checkKingCaptured(this._chess);
    if (winner) this.turn = winner;
    const { pendingMoves: pm2, warnNext: wn2, error: e2 } = this.startEnemyTurn();
    if (!e2) this.finishEnemyTurn(pm2, wn2);

    if (piece.type === 'p' && toSq[1] === '8') return { ok: true, needs_promotion: [toSq] };
    return { ok: true };
  }

  _playPatternMoveCard(cardIndex, expectedType, pattern, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return { error: 'invalid card index' };
    const card = this.hand[cardIndex];
    if (card.type !== expectedType) return { error: `not a ${expectedType} card` };

    const piece = this._chess.get(fromSq);
    if (!piece || piece.color !== 'w') return { error: 'no friendly piece on that square' };
    if (this.movedThisTurn.has(fromSq)) return { error: 'piece already moved this turn' };

    const target = this._chess.get(toSq);
    if (target?.color === 'w') return { error: 'square occupied by friendly piece' };
    if (!matchesPattern(this._chess, fromSq, toSq, pattern)) return { error: 'invalid destination for this card' };

    const isKingCapture = target?.type === 'k' && target?.color === 'b';
    if (isKingCapture) {
      executeKingCapture(this._chess, fromSq, toSq, piece);
    } else {
      this._chess.remove(fromSq);
      this._chess.put(piece, toSq);
    }

    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.movedThisTurn.add(toSq);
    this.lastMove = { from: fromSq, to: toSq };
    this._pushPositionHistory();
    const winner = checkKingCaptured(this._chess);
    if (winner) this.turn = winner;
    const { pendingMoves: pm3, warnNext: wn3, error: e3 } = this.startEnemyTurn();
    if (!e3) this.finishEnemyTurn(pm3, wn3);

    if (piece.type === 'p' && toSq[1] === '8') return { ok: true, needs_promotion: [toSq] };
    return { ok: true };
  }

  playBishopMoveCard(cardIndex, fromSq, toSq) {
    return this._playPatternMoveCard(cardIndex, 'bishop_move', 'b', fromSq, toSq);
  }

  playRookMoveCard(cardIndex, fromSq, toSq) {
    return this._playPatternMoveCard(cardIndex, 'rook_move', 'r', fromSq, toSq);
  }

  playQueenMoveCard(cardIndex, fromSq, toSq) {
    return this._playPatternMoveCard(cardIndex, 'queen_move', 'q', fromSq, toSq);
  }

  applyPromotion(sq, promoType) {
    if (!VALID_PROMO.has(promoType)) return { error: 'invalid promotion piece' };
    const piece = this._chess.get(sq);
    if (!piece || piece.type !== 'p' || piece.color !== 'w') return { error: 'no promotable pawn on that square' };
    this._chess.remove(sq);
    this._chess.put({ type: promoType, color: 'w' }, sq);
    return { ok: true };
  }

  playSummonCard(cardIndex, pieceType, toSq) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return { error: 'invalid card index' };
    const card = this.hand[cardIndex];
    if (card.type !== 'summon') return { error: 'not a summon card' };
    if (card.piece && card.piece !== pieceType) return { error: 'card summons a different piece type' };

    const typeMap = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q' };
    if (!typeMap[pieceType]) return { error: 'unknown piece type' };

    if (this._chess.get(toSq)) return { error: 'square occupied' };

    const rank = parseInt(toSq[1]);
    if (pieceType === 'pawn') {
      if (rank !== 1 && rank !== 2) return { error: 'pawns must be placed on ranks 1 or 2' };
    } else {
      if (rank !== 1) return { error: 'pieces must be placed on rank 1' };
    }

    this._chess.put({ type: typeMap[pieceType], color: 'w' }, toSq);
    this.summonedThisTurn.add(toSq);
    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: null, to: toSq };
    this._pushPositionHistory();
    const { pendingMoves: pm4, warnNext: wn4, error: e4 } = this.startEnemyTurn();
    if (!e4) this.finishEnemyTurn(pm4, wn4);
    return { ok: true };
  }

  _executeEnemyMoveObj(chosen) {
    if (!chosen) return;
    this.lastMove = { from: chosen.from, to: chosen.to };
    const movingPiece = this._chess.get(chosen.from);
    const targetRank = parseInt(chosen.to[1]);
    const isPromo = movingPiece?.type === 'p' && targetRank === 1;
    const isDiagonal = chosen.from[0] !== chosen.to[0];
    const destinationWasEmpty = !this._chess.get(chosen.to);
    const isEnPassantCapture = movingPiece?.type === 'p' && isDiagonal && destinationWasEmpty;
    this._chess.remove(chosen.from);
    this._chess.remove(chosen.to);
    this._chess.put(isPromo ? { type: 'q', color: 'b' } : movingPiece, chosen.to);
    if (isEnPassantCapture) {
      this._chess.remove(chosen.to[0] + chosen.from[1]);
    }
    const isEnemyDoublePush = movingPiece?.type === 'p' && chosen.from[1] === '7' && chosen.to[1] === '5';
    if (isEnemyDoublePush) this.enPassantTarget = chosen.to[0] + '6';
    this._pushPositionHistory();
  }

  startEnemyTurn() {
    if (this.turn !== 'player') return { error: 'not player turn' };
    this.turn = 'enemy';
    this.summonedThisTurn.clear();
    this.movedThisTurn.clear();

    if (!this._enemyAI) {
      this.enPassantTarget = null;
      return { pendingMoves: [], warnNext: false };
    }

    const result = this._enemyAI.takeTurn(this._chess, this._personality, this.enPassantTarget, this.positionHistory);
    this.enPassantTarget = null;

    if (result.moves.length > 0) {
      this._executeEnemyMoveObj(result.moves[0]);
      this.lastMove = { from: result.moves[0].from, to: result.moves[0].to };
      const winner = checkKingCaptured(this._chess);
      if (winner) {
        this.turn = winner;
        this.enemyWillDoubleMove = false;
        return { pendingMoves: [], warnNext: false };
      }
    }

    return { pendingMoves: result.moves.slice(1), warnNext: result.warnNext || false };
  }

  finishEnemyTurn(pendingMoves, warnNext = false) {
    for (const move of pendingMoves) {
      this._executeEnemyMoveObj(move);
      this.lastMove = { from: move.from, to: move.to };
      const winner = checkKingCaptured(this._chess);
      if (winner) { this.turn = winner; break; }
    }

    this.enemyWillDoubleMove = warnNext;

    if (this.turn !== 'player_won' && this.turn !== 'enemy_won') {
      this.turn = 'player';
      this.redrawCountdown = Math.max(0, this.redrawCountdown - 1);
    }

    return { ok: true };
  }

  redrawHand() {
    this.discard.push(...this.hand);
    this.hand = [];
    if (this.deck.length < HAND_SIZE) {
      this.deck.push(...this.discard);
      this.discard = [];
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
    const dealt = dealHand(this.deck, HAND_SIZE, this.discard);
    this.deck = dealt.deck;
    this.hand = dealt.hand;
    this.discard = dealt.discard;
    console.log(`[redraw] countdown=${this.redrawCountdown} free=${this.redrawCountdown === 0}`);
    if (this.redrawCountdown === 0) {
      this.redrawCountdown = REDRAW_COUNTDOWN_START;
      return { ok: true, free: true };
    }
    const { pendingMoves, warnNext } = this.startEnemyTurn();
    this.finishEnemyTurn(pendingMoves, warnNext);
    return { ok: true, free: false };
  }

  endTurn() {
    const { pendingMoves, warnNext, error } = this.startEnemyTurn();
    if (error) return { error };
    return this.finishEnemyTurn(pendingMoves, warnNext);
  }
}
