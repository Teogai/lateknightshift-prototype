import chess
import random
from typing import Literal


STARTING_MANA = 3
HAND_SIZE = 5

# Character starting setups: (piece_type, square) for white pieces
CHARACTER_PIECES: dict[str, list[tuple[chess.PieceType, chess.Square]]] = {
    "knight": [
        (chess.KING,   chess.E1),
        (chess.ROOK,   chess.A1),
        (chess.KNIGHT, chess.B1),
        (chess.PAWN,   chess.D2),
        (chess.PAWN,   chess.E2),
    ],
    "bishop": [
        (chess.KING,   chess.E1),
        (chess.BISHOP, chess.C1),
        (chess.BISHOP, chess.F1),
        (chess.PAWN,   chess.D2),
        (chess.PAWN,   chess.E2),
    ],
}

# Enemy starting setups: (piece_type, square) for black pieces
ENEMY_PIECES: dict[str, list[tuple[chess.PieceType, chess.Square]]] = {
    "pawn_pusher": [
        (chess.KING,  chess.E8),
        (chess.PAWN,  chess.A7),
        (chess.PAWN,  chess.C7),
        (chess.PAWN,  chess.E7),
        (chess.PAWN,  chess.G7),
    ],
}

VALID_CHARACTERS = set(CHARACTER_PIECES.keys())


def board_to_dict(board: chess.Board) -> dict[str, dict]:
    result = {}
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece:
            result[chess.square_name(sq)] = {
                "type": chess.piece_name(piece.piece_type),
                "color": "white" if piece.color == chess.WHITE else "black",
            }
    return result


def make_board(character: str, enemy: str = "pawn_pusher") -> chess.Board:
    board = chess.Board(fen=None)
    for ptype, sq in CHARACTER_PIECES[character]:
        board.set_piece_at(sq, chess.Piece(ptype, chess.WHITE))
    for ptype, sq in ENEMY_PIECES[enemy]:
        board.set_piece_at(sq, chess.Piece(ptype, chess.BLACK))
    board.turn = chess.WHITE
    return board


class GameState:
    def __init__(self, character: str):
        from backend.cards import build_starter_deck, deal_hand
        self.board = make_board(character)
        self.character = character
        self.mana = STARTING_MANA
        self.deck, self.hand, self.discard = deal_hand(
            build_starter_deck(character), HAND_SIZE
        )
        self.turn: Literal["player", "enemy", "player_won", "enemy_won"] = "player"
        self.summoned_this_turn: set[chess.Square] = set()

    def to_dict(self) -> dict:
        return {
            "board": board_to_dict(self.board),
            "mana": self.mana,
            "hand": self.hand,
            "turn": self.turn,
            "deck_size": len(self.deck),
            "discard_size": len(self.discard),
        }

    def legal_moves_for(self, color: chess.Color) -> list[chess.Move]:
        # Use pseudo_legal_moves so king-capture is possible (our win condition)
        original = self.board.turn
        self.board.turn = color
        moves = [m for m in self.board.pseudo_legal_moves if self.board.color_at(m.from_square) == color]
        self.board.turn = original
        return moves

    def play_move_card(self, card_index: int, from_sq: str, to_sq: str) -> dict:
        hand = self.hand
        if card_index < 0 or card_index >= len(hand):
            return {"error": "invalid card index"}
        card = hand[card_index]
        if card["type"] != "move":
            return {"error": "not a move card"}
        if self.mana < card["cost"]:
            return {"error": "not enough mana"}

        from_square = chess.parse_square(from_sq)
        to_square = chess.parse_square(to_sq)
        piece = self.board.piece_at(from_square)
        if piece is None or piece.color != chess.WHITE:
            return {"error": "no friendly piece on that square"}
        if from_square in self.summoned_this_turn:
            return {"error": "summoned pieces cannot move this turn"}

        move = chess.Move(from_square, to_square)
        # Use pseudo_legal_moves so king capture is a valid move
        self.board.turn = chess.WHITE
        if move not in self.board.pseudo_legal_moves:
            return {"error": "illegal move"}

        # Execute
        self.board.push(move)
        self.board.turn = chess.WHITE  # don't advance turn normally
        self.mana -= card["cost"]
        self.discard.append(hand.pop(card_index))
        self._check_king_captured()
        return {"ok": True}

    def play_summon_card(self, card_index: int, piece_type: str, to_sq: str) -> dict:
        hand = self.hand
        if card_index < 0 or card_index >= len(hand):
            return {"error": "invalid card index"}
        card = hand[card_index]
        if card["type"] != "summon":
            return {"error": "not a summon card"}
        if self.mana < card["cost"]:
            return {"error": "not enough mana"}
        if card.get("piece") and card["piece"] != piece_type:
            return {"error": "card summons a different piece type"}

        type_map = {
            "pawn": chess.PAWN, "knight": chess.KNIGHT,
            "bishop": chess.BISHOP, "rook": chess.ROOK,
            "queen": chess.QUEEN,
        }
        if piece_type not in type_map:
            return {"error": "unknown piece type"}

        to_square = chess.parse_square(to_sq)
        if self.board.piece_at(to_square) is not None:
            return {"error": "square occupied"}

        rank = chess.square_rank(to_square)
        if type_map[piece_type] == chess.PAWN:
            if rank not in (0, 1):
                return {"error": "pawns must be placed on ranks 1 or 2"}
        else:
            if rank != 0:
                return {"error": "pieces must be placed on rank 1"}

        self.board.set_piece_at(to_square, chess.Piece(type_map[piece_type], chess.WHITE))
        self.summoned_this_turn.add(to_square)
        self.mana -= card["cost"]
        self.discard.append(hand.pop(card_index))
        return {"ok": True}

    def end_turn(self) -> dict:
        from backend.cards import build_starter_deck, deal_hand
        if self.turn != "player":
            return {"error": "not player turn"}
        self.turn = "enemy"
        self.summoned_this_turn.clear()

        # Enemy makes one legal move; prefer king captures
        moves = self.legal_moves_for(chess.BLACK)
        if moves:
            king_captures = [
                m for m in moves
                if self.board.piece_at(m.to_square) == chess.Piece(chess.KING, chess.WHITE)
            ]
            move = king_captures[0] if king_captures else random.choice(moves)
            self.board.turn = chess.BLACK
            self.board.push(move)
            self.board.turn = chess.WHITE
            self._check_king_captured()

        if self.turn not in ("player_won", "enemy_won"):
            self.turn = "player"
            self.mana = STARTING_MANA
            self.discard.extend(self.hand)
            self.hand = []
            # Deal new hand (reshuffle if needed)
            if len(self.deck) < HAND_SIZE:
                self.deck.extend(self.discard)
                self.discard = []
                random.shuffle(self.deck)
            self.deck, drawn, self.discard = deal_hand(
                self.deck, HAND_SIZE, self.discard
            )
            self.hand = drawn

        return {"ok": True}

    def _check_king_captured(self):
        white_king = any(
            self.board.piece_at(sq) == chess.Piece(chess.KING, chess.WHITE)
            for sq in chess.SQUARES
        )
        black_king = any(
            self.board.piece_at(sq) == chess.Piece(chess.KING, chess.BLACK)
            for sq in chess.SQUARES
        )
        if not black_king:
            self.turn = "player_won"
        elif not white_king:
            self.turn = "enemy_won"
