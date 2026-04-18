"""Tests for player pawn promotion via play_move_card."""
import pytest
import chess
from fastapi.testclient import TestClient
from backend.server import app, _games

client = TestClient(app)


def fresh_game() -> dict:
    r = client.post("/game/new", json={"character": "knight"})
    assert r.status_code == 200
    return r.json()


def setup_pawn_on_e7():
    """Clear board, place white king e1, black king e8 (a-file), white pawn e7."""
    fresh_game()
    state = _games["current"]
    for sq in chess.SQUARES:
        state.board.remove_piece_at(sq)
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.A8, chess.Piece(chess.KING, chess.BLACK))
    state.board.set_piece_at(chess.E7, chess.Piece(chess.PAWN, chess.WHITE))
    # Give state a move card in hand slot 0
    state.hand = [{"type": "move", "cost": 1}]
    state.mana = 3
    state.moved_this_turn = set()
    state.summoned_this_turn = set()


def test_player_promotes_to_queen():
    setup_pawn_on_e7()
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e7", "to_sq": "e8", "promotion": "q"})
    assert r.status_code == 200
    board = _games["current"].board
    assert board.piece_at(chess.E8) == chess.Piece(chess.QUEEN, chess.WHITE)
    assert board.piece_at(chess.E7) is None


@pytest.mark.parametrize("letter,piece_type", [
    ("q", chess.QUEEN),
    ("r", chess.ROOK),
    ("b", chess.BISHOP),
    ("n", chess.KNIGHT),
])
def test_player_promotes_all_pieces(letter, piece_type):
    setup_pawn_on_e7()
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e7", "to_sq": "e8", "promotion": letter})
    assert r.status_code == 200
    board = _games["current"].board
    assert board.piece_at(chess.E8) == chess.Piece(piece_type, chess.WHITE)


def test_missing_promotion_returns_400():
    setup_pawn_on_e7()
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e7", "to_sq": "e8"})
    assert r.status_code == 400
    assert "promotion" in r.json()["detail"]


def test_invalid_promotion_letter_returns_400():
    setup_pawn_on_e7()
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e7", "to_sq": "e8", "promotion": "x"})
    assert r.status_code == 400
    assert "promotion" in r.json()["detail"]


def test_non_pawn_move_ignores_promotion_field():
    fresh_game()
    state = _games["current"]
    for sq in chess.SQUARES:
        state.board.remove_piece_at(sq)
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.A8, chess.Piece(chess.KING, chess.BLACK))
    state.board.set_piece_at(chess.A1, chess.Piece(chess.ROOK, chess.WHITE))
    state.hand = [{"type": "move", "cost": 1}]
    state.mana = 3
    state.moved_this_turn = set()
    state.summoned_this_turn = set()

    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "a1", "to_sq": "a5", "promotion": "q"})
    assert r.status_code == 200
    board = _games["current"].board
    assert board.piece_at(chess.A5) == chess.Piece(chess.ROOK, chess.WHITE)


def test_pawn_not_on_rank_7_ignores_promotion():
    fresh_game()
    state = _games["current"]
    for sq in chess.SQUARES:
        state.board.remove_piece_at(sq)
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.A8, chess.Piece(chess.KING, chess.BLACK))
    state.board.set_piece_at(chess.E6, chess.Piece(chess.PAWN, chess.WHITE))
    state.hand = [{"type": "move", "cost": 1}]
    state.mana = 3
    state.moved_this_turn = set()
    state.summoned_this_turn = set()

    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e6", "to_sq": "e7", "promotion": "q"})
    assert r.status_code == 200
    board = _games["current"].board
    assert board.piece_at(chess.E7) == chess.Piece(chess.PAWN, chess.WHITE)


def test_promoted_piece_in_moved_this_turn():
    setup_pawn_on_e7()
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e7", "to_sq": "e8", "promotion": "q"})
    assert r.status_code == 200
    data = r.json()
    assert "e8" in data["moved_this_turn"]


def test_promoted_piece_cannot_move_again():
    setup_pawn_on_e7()
    client.post("/game/play/move", json={"card_index": 0, "from_sq": "e7", "to_sq": "e8", "promotion": "q"})
    state = _games["current"]
    state.hand = [{"type": "move", "cost": 1}]
    state.mana = 3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e8", "to_sq": "e7"})
    assert r.status_code == 400
    assert "already moved" in r.json()["detail"]
