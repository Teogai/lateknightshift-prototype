import { LIVES } from '../config/game.js';
import { buildStarterDeck, upgradeCard as _upgradeCard } from './cards2/move_cards.js';
import { generateNodes } from './map.js';

export { generateNodes } from './map.js';

export class RunState {
  constructor(character) {
    this.character = character;
    this.deck = buildStarterDeck(character);
    this.startingPieces = [];
    this.lives = LIVES;
    this.currentFloor = 1;
    this.phase = 'map';
    this.currentNodes = [];
    this.pendingEnemy = null;
    this.pendingNode = null;
    this.relics = [];
    this.advanceToFloor(1);
  }

  advanceToFloor(floor) {
    this.currentFloor = floor;
    this.currentNodes = generateNodes(floor);
  }

  enterRoom(nodeIndex) {
    const node = this.currentNodes[nodeIndex];
    if (!node) return;
    this.pendingNode = node;
    if (node.type === 'monster' || node.type === 'elite' || node.type === 'boss') {
      this.phase = 'battle';
    } else {
      this.phase = 'room';
    }
  }

  addRewardCard(card) {
    this.deck.push({ ...card });
  }

  addStartingPiece(piece, square) {
    this.startingPieces.push({ piece, square });
  }

  addRelic(relic) {
    this.relics.push(relic);
  }

  removeCard(index) {
    this.deck.splice(index, 1);
  }

  upgradeCard(index) {
    this.deck[index] = _upgradeCard(this.deck[index]);
  }

  transformCard(index, newCard) {
    this.deck[index] = { ...newCard };
  }

  recordDefeat() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = 'defeated';
    }
  }

  isDefeated() {
    return this.lives === 0;
  }

  isComplete() {
    return this.currentFloor > 16 && this.phase === 'complete';
  }
}
