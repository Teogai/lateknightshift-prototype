import pytest
from fastapi.testclient import TestClient
from backend.server import app, _games
from backend.engine import GameState
import chess

client = TestClient(app)


def fresh_game(character="knight") -> dict:
    r = client.post("/game/new", json={"character": character})
    assert r.status_code == 200
    return r.json()


# --- Move card ---

def test_play_move_card_moves_piece():
    fresh_game()
    state = _games["current"]
    # Put a move card at index 0
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 3
    # Knight on b1 can move to a3 or c3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 200
    data = r.json()
    assert "a3" in data["board"]
    assert data["board"]["a3"]["type"] == "knight"
    assert data["mana"] == 2


def test_play_move_card_illegal_move_rejected():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 3
    # Rook on a1, a2 is occupied by pawn — can't move rook to a8 (blocked)
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "a1", "to_sq": "a8"})
    assert r.status_code == 400


def test_play_move_card_no_mana():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Move", "type": "move", "cost": 2}]
    state.mana = 1
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 400


def test_play_move_card_wrong_color():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 3
    # e7 is a black pawn
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e7", "to_sq": "e5"})
    assert r.status_code == 400


# --- Summon card ---

def test_play_summon_card_places_piece():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Summon Pawn", "type": "summon", "piece": "pawn", "cost": 1}]
    state.mana = 3
    # a1 is occupied; use c1 (empty in knight setup)
    r = client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c2"})
    assert r.status_code == 200
    data = r.json()
    assert "c2" in data["board"]
    assert data["board"]["c2"]["type"] == "pawn"


def test_summon_pawn_invalid_rank():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Summon Pawn", "type": "summon", "piece": "pawn", "cost": 1}]
    state.mana = 3
    r = client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c5"})
    assert r.status_code == 400


def test_summoned_piece_cannot_move_same_turn():
    fresh_game()
    state = _games["current"]
    state.hand = [
        {"name": "Summon Pawn", "type": "summon", "piece": "pawn", "cost": 1},
        {"name": "Move", "type": "move", "cost": 1},
    ]
    state.mana = 3
    # Summon pawn on c2 (empty square in knight setup)
    r = client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c2"})
    assert r.status_code == 200
    # Try to move it
    state = _games["current"]
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "c2", "to_sq": "c3"})
    assert r.status_code == 400


# --- End turn ---

def test_end_turn_enemy_moves():
    fresh_game()
    board_before = dict(_games["current"].board.piece_map())
    r = client.post("/game/end-turn")
    assert r.status_code == 200
    data = r.json()
    assert data["turn"] == "player"
    board_after = _games["current"].board.piece_map()
    # Board should have changed (enemy moved)
    assert board_before != board_after


def test_end_turn_resets_mana():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 1
    client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    r = client.post("/game/end-turn")
    data = r.json()
    assert data["mana"] == 3


def test_end_turn_deals_new_hand():
    fresh_game()
    r = client.post("/game/end-turn")
    data = r.json()
    assert len(data["hand"]) == 5


# --- Win condition ---

def test_player_wins_on_king_capture():
    fresh_game()
    state = _games["current"]
    # Place player piece adjacent to enemy king for a capture
    state.board.remove_piece_at(chess.E8)  # remove black king
    state.board.set_piece_at(chess.E8, chess.Piece(chess.QUEEN, chess.WHITE))
    state.board.set_piece_at(chess.D8, chess.Piece(chess.KING, chess.BLACK))
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "e8", "to_sq": "d8"})
    assert r.status_code == 200
    data = r.json()
    assert data["turn"] == "player_won"


def test_enemy_wins_on_king_capture():
    fresh_game()
    state = _games["current"]
    # Clear the board and set up a position where black's only move is to capture the white king
    for sq in chess.SQUARES:
        state.board.remove_piece_at(sq)
    # Black rook on a8, white king on a1 — only legal black move is Ra1# (king capture)
    state.board.set_piece_at(chess.A1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.A8, chess.Piece(chess.ROOK, chess.BLACK))
    state.board.set_piece_at(chess.H8, chess.Piece(chess.KING, chess.BLACK))
    r = client.post("/game/end-turn")
    data = r.json()
    assert data["turn"] == "enemy_won"
