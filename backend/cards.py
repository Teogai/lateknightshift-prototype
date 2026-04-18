import random
from typing import Any


Card = dict[str, Any]


def move_card(cost: int = 1) -> Card:
    return {"name": "Move", "type": "move", "cost": cost}


def summon_card(piece: str, cost: int = 2) -> Card:
    return {"name": f"Summon {piece.capitalize()}", "type": "summon", "piece": piece, "cost": cost}


def knight_move_card() -> Card:
    return {"name": "Knight Move", "type": "knight_move", "cost": 2}


STARTER_DECKS: dict[str, list[Card]] = {
    "knight": [
        move_card(1), move_card(1), move_card(1), move_card(1), move_card(1),
        move_card(1), move_card(1),
        summon_card("pawn", 1), summon_card("pawn", 1),
        knight_move_card(),
    ],
}


def build_starter_deck(character: str) -> list[Card]:
    deck = [card.copy() for card in STARTER_DECKS[character]]
    random.shuffle(deck)
    return deck


def deal_hand(
    deck: list[Card],
    size: int,
    discard: list[Card] | None = None,
) -> tuple[list[Card], list[Card], list[Card]]:
    """Return (remaining_deck, hand, discard)."""
    if discard is None:
        discard = []
    hand = deck[:size]
    remaining = deck[size:]
    return remaining, hand, discard
