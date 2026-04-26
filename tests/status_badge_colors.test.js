import { test, expect } from 'vitest';
import { STATUS_BADGE_COLORS } from '../js/ui.js';

test('STATUS_BADGE_COLORS has entries for all power tags', () => {
  const powerTags = [
    'knight_power',
    'bishop_power', 
    'rook_power',
    'queen_power',
    'king_power',
  ];
  
  for (const tag of powerTags) {
    expect(STATUS_BADGE_COLORS[tag]).toBeDefined();
    expect(STATUS_BADGE_COLORS[tag]).toMatch(/^#[0-9a-fA-F]{6}$/);
  }
});

test('STATUS_BADGE_COLORS has entry for uncapturable tag', () => {
  expect(STATUS_BADGE_COLORS['uncapturable']).toBeDefined();
  expect(STATUS_BADGE_COLORS['uncapturable']).toMatch(/^#[0-9a-fA-F]{6}$/);
});
