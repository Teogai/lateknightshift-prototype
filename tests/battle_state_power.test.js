import { describe, test, expect } from 'vitest';
import { GameState } from '../js/battle_state.js';

test('playPowerCard applies knight_power tag to friendly piece', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  const hand = gs.toDict().hand;
  const card = hand.find(c => c.actionType === 'knight_power');
  if (!card) return; // Skip if power card not in hand

  const cardIndex = hand.indexOf(card);
  const result = gs.playPowerCard(cardIndex, 'e1'); // knight starts at e1

  expect(result.ok).toBe(true);
  const piece = gs.toDict().board['e1'];
  expect(piece.tags).toContain('knight_power');
});

test('playPowerCard fails on enemy piece', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  const hand = gs.toDict().hand;
  const card = hand.find(c => c.actionType === 'knight_power');
  if (!card) return;

  const cardIndex = hand.indexOf(card);
  // Try to apply to enemy pawn at e7
  const result = gs.playPowerCard(cardIndex, 'e7');

  expect(result.error).toBeDefined();
});

test('playPowerCard discards the card', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  const before = gs.toDict();
  const hand = before.hand;
  const card = hand.find(c => c.actionType === 'knight_power');
  if (!card) return;

  const cardIndex = hand.indexOf(card);
  gs.playPowerCard(cardIndex, 'e1');

  const after = gs.toDict();
  expect(after.hand.length).toBe(before.hand.length - 1);
  expect(after.discard_size).toBe(before.discard_size + 1);
});

test('playPowerCard works for all power types', () => {
  const powerTypes = ['knight_power', 'bishop_power', 'rook_power', 'queen_power', 'king_power'];

  for (const powerType of powerTypes) {
    const gs = new GameState('knight', 'pawn_pusher');
    const hand = gs.toDict().hand;
    // Manually inject the power card into hand for testing
    hand.push({ name: 'Test Power', type: 'action', actionType: powerType, rarity: 'common' });
    const cardIndex = hand.length - 1;

    const result = gs.playPowerCard(cardIndex, 'e1');
    expect(result.ok).toBe(true);

    const piece = gs.toDict().board['e1'];
    expect(piece.tags).toContain(powerType);
  }
});

test('playPowerCard can stack multiple power tags', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  const hand = gs.toDict().hand;

  // Inject two power cards
  hand.push({ name: 'Knight Power', type: 'action', actionType: 'knight_power', rarity: 'common' });
  hand.push({ name: 'Bishop Power', type: 'action', actionType: 'bishop_power', rarity: 'uncommon' });

  gs.playPowerCard(hand.length - 2, 'e1');
  gs.playPowerCard(hand.length - 1, 'e1');

  const piece = gs.toDict().board['e1'];
  expect(piece.tags).toContain('knight_power');
  expect(piece.tags).toContain('bishop_power');
});
