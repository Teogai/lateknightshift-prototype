import { Chess } from 'chess.js';
import { buildStarterDeck, dealHand } from './cards.js';
import { selectMove, PAWN_PUSHER, LONE_ROOK, KNIGHT_RIDER, BISHOP_PAIR } from './ai.js';
import { STARTING_MANA, HAND_SIZE, VALID_PROMO, VALID_CHARACTERS, VALID_ENEMIES } from './engine/constants.js';
import {
  makeBoard, boardToDict, knightAttacks,
  getMovesForSq, pseudoLegalMovesFor, allGeometricMovesFor,
  checkKingCaptured, checkInfo, executeKingCapture,
} from './engine/board.js';

export { STARTING_MANA, HAND_SIZE, VALID_PROMO, CHARACTER_PIECES, ENEMY_PIECES, VALID_CHARACTERS, VALID_ENEMIES } from './engine/constants.js';
export { boardToDict, knightAttacks } from './engine/board.js';

const PERSONALITIES = {
  pawn_pusher:  PAWN_PUSHER,
  lone_rook:    LONE_ROOK,
  knight_rider: KNIGHT_RIDER,
  bishop_pair:  BISHOP_PAIR,
};

export class GameState {
  constructor(character, enemy = 'pawn_pusher') {
    if (!VALID_CHARACTERS.has(character)) throw new Error(`unknown character: ${character}`);
    if (!VALID_ENEMIES.has(enemy)) throw new Error(`unknown enemy: ${enemy}`);
    this._chess = makeBoard(character, enemy);
    this._personality = PERSONALITIES[enemy];
    this.character = character;
    this.mana = STARTING_MANA;
    const dealt = dealHand(buildStarterDeck(character), HAND_SIZE);
    this.deck = dealt.deck;
    this.hand = dealt.hand;
    this.discard = dealt.discard;
    this.turn = 'player';
    this.summonedThisTurn = new Set();
    this.movedThisTurn = new Set();
    this.lastMove = { from: null, to: null };
    this.enPassantTarget = null;
  }

  toDict() {
    const check = checkInfo(this._chess);
    return {
      board: boardToDict(this._chess),
      mana: this.mana,
      hand: this.hand,
      turn: this.turn,
      deck_size: this.deck.length,
      discard_size: this.discard.length,
      moved_this_turn: [...this.movedThisTurn],
      summoned_this_turn: [...this.summonedThisTurn],
      last_move: { from: this.lastMove.from, to: this.lastMove.to },
      in_check: check.in_check,
      check_attacker_sq: check.check_attacker_sq,
    };
  }

  legalDestinationsFor(sq) {
    const piece = this._chess.get(sq);
    if (!piece || piece.color !== 'w') return [];
    if (this.summonedThisTurn.has(sq) || this.movedThisTurn.has(sq)) return [];
    return getMovesForSq(this._chess, sq, 'w', this.enPassantTarget).map(m => m.to);
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
    if (this.mana < card.cost) return { error: 'not enough mana' };

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

    this.mana -= card.cost;
    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.movedThisTurn.add(toSq);
    this.lastMove = { from: fromSq, to: toSq };
    const winner = checkKingCaptured(this._chess);
    if (winner) this.turn = winner;
    return { ok: true };
  }

  playKnightMoveCard(cardIndex, fromSq, toSq) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return { error: 'invalid card index' };
    const card = this.hand[cardIndex];
    if (card.type !== 'knight_move') return { error: 'not a knight_move card' };
    if (this.mana < card.cost) return { error: 'not enough mana' };

    const piece = this._chess.get(fromSq);
    if (!piece || piece.color !== 'w') return { error: 'no friendly piece on that square' };
    if (this.movedThisTurn.has(fromSq)) return { error: 'piece already moved this turn' };

    if (!knightAttacks(fromSq).includes(toSq)) return { error: 'invalid knight move destination' };

    const target = this._chess.get(toSq);
    if (target?.color === 'w') return { error: 'square occupied by friendly piece' };

    this._chess.remove(fromSq);
    this._chess.put(piece, toSq);

    this.mana -= card.cost;
    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.movedThisTurn.add(toSq);
    this.lastMove = { from: fromSq, to: toSq };
    const winner = checkKingCaptured(this._chess);
    if (winner) this.turn = winner;

    if (piece.type === 'p' && toSq[1] === '8') return { ok: true, needs_promotion: [toSq] };
    return { ok: true };
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
    if (this.mana < card.cost) return { error: 'not enough mana' };
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
    this.mana -= card.cost;
    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.lastMove = { from: null, to: toSq };
    return { ok: true };
  }

  endTurn() {
    if (this.turn !== 'player') return { error: 'not player turn' };
    this.turn = 'enemy';
    this.summonedThisTurn.clear();
    this.movedThisTurn.clear();

    let moves = pseudoLegalMovesFor(this._chess, 'b', this.enPassantTarget);
    if (!moves.length) moves = allGeometricMovesFor(this._chess, 'b');
    if (moves.length) {
      const chosen = selectMove(this._chess, moves, this._personality, 2, this.enPassantTarget);

      if (chosen) {
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
        this.enPassantTarget = isEnemyDoublePush ? (chosen.to[0] + '6') : null;

        const winner = checkKingCaptured(this._chess);
        if (winner) this.turn = winner;
      }
    }

    if (this.turn !== 'player_won' && this.turn !== 'enemy_won') {
      this.turn = 'player';
      this.mana = STARTING_MANA;
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
    }

    return { ok: true };
  }
}
