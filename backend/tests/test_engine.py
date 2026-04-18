import pytest
from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)


def test_new_game_returns_board():
    r = client.post("/game/new", json={"character": "knight"})
    assert r.status_code == 200
    data = r.json()
    assert "board" in data
    assert "mana" in data
    assert "hand" in data
    assert "turn" in data
    assert data["mana"] == 3
    assert data["turn"] == "player"


def test_new_game_knight_pieces():
    r = client.post("/game/new", json={"character": "knight"})
    data = r.json()
    board = data["board"]
    # board is dict of square -> piece
    pieces = list(board.values())
    player_pieces = [p for p in pieces if p["color"] == "white"]
    # Knight character: K + 2P + N + R = 5 pieces
    assert len(player_pieces) == 5



def test_new_game_enemy_pieces():
    r = client.post("/game/new", json={"character": "knight"})
    data = r.json()
    board = data["board"]
    pieces = list(board.values())
    enemy_pieces = [p for p in pieces if p["color"] == "black"]
    # Pawn Pusher: K + 4P = 5 pieces
    assert len(enemy_pieces) == 5


def test_new_game_hand_size():
    r = client.post("/game/new", json={"character": "knight"})
    data = r.json()
    assert len(data["hand"]) == 5


def test_invalid_character():
    r = client.post("/game/new", json={"character": "wizard"})
    assert r.status_code == 422
