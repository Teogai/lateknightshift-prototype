import { Chess } from 'chess.js';
import { buildStarterDeck, dealHand } from './cards.js';
import { selectMove, PAWN_PUSHER } from './ai.js';

export const STARTING_MANA = 3;
export const HAND_SIZE = 5;
export const VALID_PROMO = new Set(['q', 'r', 'b', 'n']);

const FILES = 'abcdefgh';

// chess.js single-char type -> full name
const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export const CHARACTER_PIECES = {
  knight: [
    { type: 'k', color: 'w', sq: 'e1' },
    { type: 'r', color: 'w', sq: 'a1' },
    { type: 'n', color: 'w', sq: 'b1' },
    { type: 'p', color: 'w', sq: 'd2' },
    { type: 'p', color: 'w', sq: 'e2' },
  ],
};

export const ENEMY_PIECES = {
  pawn_pusher: [
    { type: 'k', color: 'b', sq: 'e8' },
    { type: 'p', color: 'b', sq: 'a7' },
    { type: 'p', color: 'b', sq: 'c7' },
    { type: 'p', color: 'b', sq: 'e7' },
    { type: 'p', color: 'b', sq: 'g7' },
  ],
};

export const VALID_CHARACTERS = new Set(Object.keys(CHARACTER_PIECES));

export function boardToDict(chess) {
  const result = {};
  const board = chess.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const sq = FILES[file] + (8 - rank);
        result[sq] = {
          type: PIECE_NAMES[piece.type],
          color: piece.color === 'w' ? 'white' : 'black',
        };
      }
    }
  }
  return result;
}

function makeBoard(character, enemy = 'pawn_pusher') {
  const chess = new Chess();
  chess.clear();
  for (const { type, color, sq } of CHARACTER_PIECES[character]) {
    chess.put({ type, color }, sq);
  }
  for (const { type, color, sq } of ENEMY_PIECES[enemy]) {
    chess.put({ type, color }, sq);
  }
  return chess;
}

// Compute knight-attack squares for a given square name
export function knightAttacks(sq) {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    .map(([df, dr]) => [file + df, rank + dr])
    .filter(([f, r]) => f >= 0 && f < 8 && r >= 0 && r < 8)
    .map(([f, r]) => FILES[f] + (r + 1));
}

export class GameState {
  constructor(character) {
    if (!VALID_CHARACTERS.has(character)) throw new Error(`unknown character: ${character}`);
    this._chess = makeBoard(character);
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
  }

  toDict() {
    const check = this._checkInfo();
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

  // Save board piece positions (FEN can be invalid on custom boards missing a king).
  _savePieces() {
    const saved = [];
    const board = this._chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p) saved.push({ sq: FILES[f] + (8 - r), piece: { type: p.type, color: p.color } });
      }
    }
    return saved;
  }

  _restorePieces(saved) {
    this._chess.clear();
    for (const { sq, piece } of saved) this._chess.put(piece, sq);
  }

  // Temporarily switch board turn to get moves for a square of a given color.
  // chess.js only returns moves when it's that color's turn.
  // We avoid FEN load/restore because custom boards may lack both kings (invalid FEN).
  _getMovesForSq(sq, color) {
    const saved = this._savePieces();
    try {
      // Build minimal valid FEN with altered turn. Must have at least one king per side;
      // if the board lacks them (test setup), chess.js load() throws → we catch and return [].
      const fen = this._chess.fen();
      const parts = fen.split(' ');
      parts[1] = color;
      parts[2] = '-';
      parts[3] = '-';
      this._chess.load(parts.join(' '));
      return this._chess.moves({ square: sq, verbose: true });
    } catch {
      return [];
    } finally {
      this._restorePieces(saved);
    }
  }

  // Returns destinations a player piece on `sq` can legally move to.
  legalDestinationsFor(sq) {
    const piece = this._chess.get(sq);
    if (!piece || piece.color !== 'w') return [];
    if (this.summonedThisTurn.has(sq) || this.movedThisTurn.has(sq)) return [];
    return this._getMovesForSq(sq, 'w').map(m => m.to);
  }

  // Enumerate pseudo-legal moves for a color, including king-capture moves
  // that chess.js omits (since it's our win condition, not checkmate).
  pseudoLegalMovesFor(color) {
    const moves = [];
    const board = this._chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece || piece.color !== color) continue;
        const sq = FILES[f] + (8 - r);
        const sqMoves = this._getMovesForSq(sq, color);
        moves.push(...sqMoves);
      }
    }
    // chess.js won't generate moves that capture the enemy king.
    // Find and add those manually using isAttacked.
    const enemyColor = color === 'w' ? 'b' : 'w';
    const enemyKingSq = this._findKing(enemyColor);
    if (enemyKingSq && this._chess.isAttacked(enemyKingSq, color)) {
      const attackers = this._findAttackersOf(enemyKingSq, color);
      for (const attSq of attackers) {
        if (!moves.some(m => m.from === attSq && m.to === enemyKingSq)) {
          moves.push({ from: attSq, to: enemyKingSq });
        }
      }
    }
    return moves;
  }

  _findKing(color) {
    const board = this._chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p?.type === 'k' && p?.color === color) return FILES[f] + (8 - r);
      }
    }
    return null;
  }

  // Direct attack geometry — no FEN needed, works even without both kings on board.
  _pieceAttacks(fromSq, pieceType, pieceColor, toSq) {
    const ff = fromSq.charCodeAt(0) - 97;
    const fr = parseInt(fromSq[1]) - 1;
    const tf = toSq.charCodeAt(0) - 97;
    const tr = parseInt(toSq[1]) - 1;
    const df = tf - ff, dr = tr - fr;
    switch (pieceType) {
      case 'n': return (Math.abs(df) === 2 && Math.abs(dr) === 1) || (Math.abs(df) === 1 && Math.abs(dr) === 2);
      case 'k': return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0);
      case 'p': { const fwd = pieceColor === 'w' ? 1 : -1; return dr === fwd && Math.abs(df) === 1; }
      case 'r': return (df === 0 || dr === 0) && this._clearPath(ff, fr, tf, tr);
      case 'b': return Math.abs(df) === Math.abs(dr) && this._clearPath(ff, fr, tf, tr);
      case 'q': return (df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) && this._clearPath(ff, fr, tf, tr);
      default: return false;
    }
  }

  _clearPath(ff, fr, tf, tr) {
    const steps = Math.max(Math.abs(tf - ff), Math.abs(tr - fr));
    const sf = Math.sign(tf - ff), sr = Math.sign(tr - fr);
    for (let i = 1; i < steps; i++) {
      if (this._chess.get(FILES[ff + sf * i] + (fr + sr * i + 1))) return false;
    }
    return true;
  }

  _findAttackersOf(targetSq, attackingColor) {
    const attackers = [];
    const board = this._chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p || p.color !== attackingColor) continue;
        const sq = FILES[f] + (8 - r);
        if (this._pieceAttacks(sq, p.type, p.color, targetSq)) attackers.push(sq);
      }
    }
    return attackers;
  }

  // Generate all geometric moves for a color, ignoring check constraints.
  // Used as fallback when chess.js filters all moves due to "leaving king in check".
  _allGeometricMovesFor(color) {
    const moves = [];
    const board = this._chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece || piece.color !== color) continue;
        const from = FILES[f] + (8 - r);
        const rank = 8 - r;
        if (piece.type === 'p') {
          const nextRank = color === 'w' ? rank + 1 : rank - 1;
          if (nextRank >= 1 && nextRank <= 8) {
            const step1 = FILES[f] + nextRank;
            if (!this._chess.get(step1)) {
              moves.push({ from, to: step1 });
              const startRank = color === 'w' ? 2 : 7;
              if (rank === startRank) {
                const step2Rank = color === 'w' ? rank + 2 : rank - 2;
                if (!this._chess.get(FILES[f] + step2Rank))
                  moves.push({ from, to: FILES[f] + step2Rank });
              }
            }
          }
        }
        for (let tr = 0; tr < 8; tr++) {
          for (let tf = 0; tf < 8; tf++) {
            if (r === tr && f === tf) continue;
            const target = board[tr][tf];
            if (target?.color === color) continue;
            const to = FILES[tf] + (8 - tr);
            if (this._pieceAttacks(from, piece.type, color, to))
              moves.push({ from, to });
          }
        }
      }
    }
    return moves;
  }

  _checkKingCaptured() {
    let whiteKing = false, blackKing = false;
    const board = this._chess.board();
    for (const row of board) {
      for (const piece of row) {
        if (piece?.type === 'k') {
          if (piece.color === 'w') whiteKing = true;
          else blackKing = true;
        }
      }
    }
    if (!blackKing) this.turn = 'player_won';
    else if (!whiteKing) this.turn = 'enemy_won';
  }

  _checkInfo() {
    const whiteKingSq = this._findKing('w');
    if (!whiteKingSq) return { in_check: false, check_attacker_sq: null };
    const inCheck = this._chess.isAttacked(whiteKingSq, 'b');
    if (!inCheck) return { in_check: false, check_attacker_sq: null };
    const attackers = this._findAttackersOf(whiteKingSq, 'b');
    return { in_check: true, check_attacker_sq: attackers[0] ?? null };
  }

  // Execute a king-capture manually (chess.js won't generate these moves).
  _executeKingCapture(fromSq, toSq, piece) {
    this._chess.remove(fromSq);
    this._chess.remove(toSq);
    this._chess.put(piece, toSq);
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
      this._executeKingCapture(fromSq, toSq, movingPiece);
    } else {
      // Validate legality via pseudo-legal moves (same semantics as python-chess)
      const dests = this._getMovesForSq(fromSq, 'w').map(m => m.to);
      if (!dests.includes(toSq)) return { error: 'illegal move' };

      const fen = this._chess.fen();
      const parts = fen.split(' ');
      parts[1] = 'w'; parts[2] = '-'; parts[3] = '-';
      this._chess.load(parts.join(' '));
      this._chess.move({ from: fromSq, to: toSq, promotion: isPromo ? promotion : undefined });
    }

    this.mana -= card.cost;
    this.discard.push(this.hand.splice(cardIndex, 1)[0]);
    this.movedThisTurn.add(toSq);
    this.lastMove = { from: fromSq, to: toSq };
    this._checkKingCaptured();
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
    this._checkKingCaptured();
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

    let moves = this.pseudoLegalMovesFor('b');
    if (!moves.length) moves = this._allGeometricMovesFor('b');
    if (moves.length) {
      const chosen = selectMove(this._chess, moves, PAWN_PUSHER, 2);

      if (chosen) {
        this.lastMove = { from: chosen.from, to: chosen.to };
        const targetPiece = this._chess.get(chosen.to);
        const capturesKing = targetPiece?.type === 'k';

        // Execute move manually (avoids FEN complexity, works on any board state)
        const movingPiece = this._chess.get(chosen.from);
        const targetRank = parseInt(chosen.to[1]);
        const isPromo = movingPiece?.type === 'p' && targetRank === 1;
        this._chess.remove(chosen.from);
        this._chess.remove(chosen.to);
        this._chess.put(isPromo ? { type: 'q', color: 'b' } : movingPiece, chosen.to);

        this._checkKingCaptured();
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
