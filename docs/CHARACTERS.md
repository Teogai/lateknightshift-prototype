# CHARACTERS

## Rules
- Character = starting pieces + starter deck + signature card

## How to add a character
1. `config/characters.js` — add `CHARACTER_PIECES` entry (type, color, sq)
2. `config/cards.js` — add `STARTER_DECK_DEFS` entry (id, count)
3. `js/cards2/move_cards.js` — `STARTER_DECKS` auto-builds from config at load time

## Data
- Piece definitions: `config/characters.js`
- Deck definitions: `config/cards.js`
