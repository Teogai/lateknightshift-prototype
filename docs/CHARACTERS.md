# CHARACTERS

## Rules
- Character = starting pieces + starter deck + signature card
- Prototype scope: one character (The Knight)

## The Knight
- Starting pieces: King e1, Rook a1, Knight b1, Pawn a2, Pawn d2, Pawn e2
- Starter deck: 7×Move, 2×Summon Pawn, 1×Knight Move (10 cards total)
- Signature: Knight Move card

## How to add a character
1. `config/characters.js` — add `CHARACTER_PIECES` entry (type, color, sq)
2. `config/cards.js` — add `STARTER_DECK_DEFS` entry (id, count)
3. `js/cards2/move_cards.js` — `STARTER_DECKS` auto-builds from config at load time

## Data
- Piece definitions: `config/characters.js`
- Deck definitions: `config/cards.js`
