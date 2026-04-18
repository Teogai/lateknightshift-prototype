"""Tests for: deck redesign, no-repeat-piece rule, knight move card, pattern AI, pawn promotion."""
import pytest
import chess
from fastapi.testclient import TestClient
from backend.server import app, _games
from backend.engine import GameState
from backend.cards import build_starter_deck, STARTER_DECKS

client = TestClient(app)


def fresh_game() -> dict:
    r = client.post("/game/new", json={"character": "knight"})
    assert r.status_code == 200
    return r.json()


# --- Deck composition ---

def test_new_deck_composition():
    deck = STARTER_DECKS["knight"]
    move_cards = [c for c in deck if c["type"] == "move"]
    summon_pawn_cards = [c for c in deck if c["type"] == "summon" and c.get("piece") == "pawn"]
    knight_move_cards = [c for c in deck if c["type"] == "knight_move"]
    assert len(move_cards) == 7
    assert len(summon_pawn_cards) == 2
    assert len(knight_move_cards) == 1
    assert len(deck) == 10


def test_bishop_character_removed():
    r = client.post("/game/new", json={"character": "bishop"})
    assert r.status_code == 422


# --- No-repeat-piece rule ---

def test_moved_this_turn_blocks_repeat():
    fresh_game()
    state = _games["current"]
    state.hand = [
        {"name": "Move", "type": "move", "cost": 1},
        {"name": "Move", "type": "move", "cost": 1},
    ]
    state.mana = 3
    # Move knight b1 -> a3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 200
    # Try to move that same piece again from a3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "a3", "to_sq": "b5"})
    assert r.status_code == 400
    assert "already moved" in r.json()["detail"]


def test_moved_this_turn_resets_on_new_turn():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 3
    # Move knight b1 -> a3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 200
    # End turn
    client.post("/game/end-turn")
    # Next turn: move the same piece from a3
    state = _games["current"]
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "a3", "to_sq": "b5"})
    assert r.status_code == 200


def test_state_exposes_moved_this_turn():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Move", "type": "move", "cost": 1}]
    state.mana = 3
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 200
    data = r.json()
    assert "moved_this_turn" in data
    assert "a3" in data["moved_this_turn"]


# --- Knight Move card ---

def test_knight_move_valid_destination():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Knight Move", "type": "knight_move", "cost": 2}]
    state.mana = 3
    # Rook on a1: knight jump from a1 -> b3 (valid L-shape)
    r = client.post("/game/play/knight-move", json={"card_index": 0, "from_sq": "a1", "to_sq": "b3"})
    assert r.status_code == 200
    data = r.json()
    assert "b3" in data["board"]
    assert data["board"]["b3"]["type"] == "rook"
    assert data["mana"] == 1


def test_knight_move_invalid_destination():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Knight Move", "type": "knight_move", "cost": 2}]
    state.mana = 3
    # a1 -> a3 is NOT a knight jump
    r = client.post("/game/play/knight-move", json={"card_index": 0, "from_sq": "a1", "to_sq": "a3"})
    assert r.status_code == 400


def test_knight_move_subject_to_no_repeat():
    fresh_game()
    state = _games["current"]
    state.hand = [
        {"name": "Move", "type": "move", "cost": 1},
        {"name": "Knight Move", "type": "knight_move", "cost": 2},
    ]
    state.mana = 3
    # Move knight b1 -> a3 first
    r = client.post("/game/play/move", json={"card_index": 0, "from_sq": "b1", "to_sq": "a3"})
    assert r.status_code == 200
    # Try to knight-move that same piece from a3
    r = client.post("/game/play/knight-move", json={"card_index": 0, "from_sq": "a3", "to_sq": "b5"})
    assert r.status_code == 400


def test_knight_move_costs_2_mana():
    fresh_game()
    state = _games["current"]
    state.hand = [{"name": "Knight Move", "type": "knight_move", "cost": 2}]
    state.mana = 1
    r = client.post("/game/play/knight-move", json={"card_index": 0, "from_sq": "a1", "to_sq": "b3"})
    assert r.status_code == 400
    assert "mana" in r.json()["detail"]


# --- Pattern-based Pawn Pusher AI ---

def test_pawn_pusher_advances_most_forward_pawn():
    """Enemy should advance the pawn that's closest to rank 1."""
    fresh_game()
    state = _games["current"]
    # Clear and set up: one pawn at a5 (rank 4), one at c7 (rank 6)
    for sq in chess.SQUARES:
        state.board.remove_piece_at(sq)
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.E8, chess.Piece(chess.KING, chess.BLACK))
    state.board.set_piece_at(chess.A5, chess.Piece(chess.PAWN, chess.BLACK))  # rank 4, more forward
    state.board.set_piece_at(chess.C7, chess.Piece(chess.PAWN, chess.BLACK))  # rank 6, less forward

    client.post("/game/end-turn")

    board = _games["current"].board
    # Most forward pawn was a5 (rank 4) -> should now be on a4 (rank 3)
    assert board.piece_at(chess.A4) == chess.Piece(chess.PAWN, chess.BLACK)
    assert board.piece_at(chess.A5) is None


def test_pawn_pusher_prefers_capture():
    """Enemy should capture a white piece if available rather than just advancing."""
    fresh_game()
    state = _games["current"]
    for sq in chess.SQUARES:
        state.board.remove_piece_at(sq)
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.E8, chess.Piece(chess.KING, chess.BLACK))
    state.board.set_piece_at(chess.A7, chess.Piece(chess.PAWN, chess.BLACK))
    # Place white piece on b6 — capturable by pawn on a7 diagonally
    state.board.set_piece_at(chess.B6, chess.Piece(chess.ROOK, chess.WHITE))

    client.post("/game/end-turn")

    board = _games["current"].board
    # Pawn should have captured on b6
    assert board.piece_at(chess.B6) == chess.Piece(chess.PAWN, chess.BLACK)
    assert board.piece_at(chess.A7) is None


# --- Pawn promotion ---

def test_pawn_promotion_to_queen():
    """Enemy pawn reaching rank 1 promotes to queen."""
    fresh_game()
    state = _games["current"]
    for sq in chess.SQUARES:
        state.board.remove_piece_at(sq)
    state.board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    state.board.set_piece_at(chess.E8, chess.Piece(chess.KING, chess.BLACK))
    # Pawn on a2 (rank 1) — one step from promotion
    state.board.set_piece_at(chess.A2, chess.Piece(chess.PAWN, chess.BLACK))

    client.post("/game/end-turn")

    board = _games["current"].board
    # a2 pawn moves to a1 and promotes to queen
    assert board.piece_at(chess.A1) == chess.Piece(chess.QUEEN, chess.BLACK)
    assert board.piece_at(chess.A2) is None
