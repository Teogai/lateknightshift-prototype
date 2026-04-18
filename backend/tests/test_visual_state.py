import pytest
import chess
from fastapi.testclient import TestClient
from backend.server import app, _games
from backend.engine import GameState

client = TestClient(app)


def fresh_game(character="knight") -> dict:
    r = client.post("/game/new", json={"character": character})
    assert r.status_code == 200
    return r.json()


def set_hand(card_type, piece=None, cost=1):
    state = _games["current"]
    if card_type == "summon":
        state.hand = [{"name": f"Summon {piece}", "type": "summon", "piece": piece, "cost": cost}]
    elif card_type == "move":
        state.hand = [{"name": "Move", "type": "move", "cost": cost}]
    elif card_type == "knight_move":
        state.hand = [{"name": "Knight Move", "type": "knight_move", "cost": cost}]
    state.mana = 3


# --- Feature 1: summoned_this_turn exposed ---

def test_summoned_this_turn_in_state():
    fresh_game()
    set_hand("summon", "pawn")
    r = client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c2"})
    assert r.status_code == 200
    data = r.json()
    assert "summoned_this_turn" in data
    assert "c2" in data["summoned_this_turn"]


def test_summoned_not_in_moved_this_turn():
    fresh_game()
    set_hand("summon", "pawn")
    r = client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c2"})
    assert r.status_code == 200
    data = r.json()
    assert "c2" not in data["moved_this_turn"]


def test_summoned_this_turn_clears_after_end_turn():
    fresh_game()
    set_hand("summon", "pawn")
    client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c2"})
    r = client.post("/game/end-turn")
    assert r.status_code == 200
    data = r.json()
    assert data["summoned_this_turn"] == []


# --- Feature 3: last_move tracking ---

def test_last_move_initial_state():
    data = fresh_game()
    assert "last_move" in data
    assert data["last_move"]["from"] is None
    assert data["last_move"]["to"] is None


def test_last_move_after_play_move():
    fresh_game()
    set_hand("move")
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 200
    data = r.json()
    assert data["last_move"]["from"] == "b1"
    assert data["last_move"]["to"] == "a3"


def test_last_move_after_knight_move():
    fresh_game()
    set_hand("knight_move", cost=2)
    r = client.post("/game/play/knight-move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 200
    data = r.json()
    assert data["last_move"]["from"] == "b1"
    assert data["last_move"]["to"] == "a3"


def test_last_move_after_summon():
    fresh_game()
    set_hand("summon", "pawn")
    r = client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c2"})
    assert r.status_code == 200
    data = r.json()
    assert data["last_move"]["from"] is None
    assert data["last_move"]["to"] == "c2"


def test_last_move_after_end_turn():
    fresh_game()
    r = client.post("/game/end-turn")
    assert r.status_code == 200
    data = r.json()
    assert "last_move" in data
    # Enemy always moves, so last_move.to should be set
    assert data["last_move"]["to"] is not None


# --- Feature 4: check indicator ---

def test_in_check_false_on_new_game():
    data = fresh_game()
    assert "in_check" in data
    assert data["in_check"] is False
    assert data["check_attacker_sq"] is None


def test_in_check_true_when_king_attacked():
    fresh_game()
    state = _games["current"]
    # Clear board and set up: white king e1, black rook e8 attacks e1
    state.board.clear()
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.E8, chess.Piece(chess.ROOK, chess.BLACK))
    state.board.set_piece_at(chess.E8, chess.Piece(chess.ROOK, chess.BLACK))
    r = client.get("/game/state")
    assert r.status_code == 200
    data = r.json()
    assert data["in_check"] is True
    assert data["check_attacker_sq"] is not None


def test_check_attacker_sq_is_correct():
    fresh_game()
    state = _games["current"]
    state.board.clear()
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.E4, chess.Piece(chess.ROOK, chess.BLACK))
    r = client.get("/game/state")
    data = r.json()
    assert data["in_check"] is True
    assert data["check_attacker_sq"] == "e4"


def test_in_check_false_when_blocked():
    fresh_game()
    state = _games["current"]
    state.board.clear()
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.E3, chess.Piece(chess.PAWN, chess.WHITE))  # blocks
    state.board.set_piece_at(chess.E8, chess.Piece(chess.ROOK, chess.BLACK))
    r = client.get("/game/state")
    data = r.json()
    assert data["in_check"] is False


# --- Feature 2: legal-moves endpoint ---

def test_legal_moves_endpoint_returns_destinations():
    fresh_game()
    # Knight on b1 has standard knight moves
    r = client.get("/game/legal-moves/b1")
    assert r.status_code == 200
    data = r.json()
    assert data["square"] == "b1"
    assert isinstance(data["destinations"], list)
    # b1 knight can go to a3 or c3 (d2 might be blocked by pawn)
    assert "a3" in data["destinations"] or "c3" in data["destinations"]


def test_legal_moves_summoned_piece_returns_empty():
    fresh_game()
    set_hand("summon", "pawn")
    client.post("/game/play/summon", json={"card_index": 0, "piece_type": "pawn", "to_sq": "c2"})
    r = client.get("/game/legal-moves/c2")
    assert r.status_code == 200
    assert r.json()["destinations"] == []


def test_legal_moves_already_moved_returns_empty():
    fresh_game()
    set_hand("move")
    client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    r = client.get("/game/legal-moves/a3")
    assert r.status_code == 200
    assert r.json()["destinations"] == []


def test_legal_moves_enemy_square_returns_empty():
    fresh_game()
    r = client.get("/game/legal-moves/e7")
    assert r.status_code == 200
    assert r.json()["destinations"] == []


def test_legal_moves_empty_square_returns_empty():
    fresh_game()
    r = client.get("/game/legal-moves/e4")
    assert r.status_code == 200
    assert r.json()["destinations"] == []


def test_legal_moves_no_game_returns_404():
    _games.clear()
    r = client.get("/game/legal-moves/e2")
    assert r.status_code == 404
