import { test, expect } from 'vitest';
import { pieceCard, CARD_CATALOG, buildStarterDeck } from '../../js/cards2/move_cards.js';

// --- piece card shape ---
test('pieceCard pawn has correct type and piece', () => {
  const c = pieceCard('pawn');
  expect(c.type).toBe('piece');
  expect(c.piece).toBe('pawn');
  expect(c.name).toBe('Pawn');
});

test('pieceCard knight has correct type and piece', () => {
  const c = pieceCard('knight');
  expect(c.type).toBe('piece');
  expect(c.piece).toBe('knight');
  expect(c.name).toBe('Knight');
});

test('pieceCard bishop has correct type and piece', () => {
  const c = pieceCard('bishop');
  expect(c.type).toBe('piece');
  expect(c.piece).toBe('bishop');
  expect(c.name).toBe('Bishop');
});

test('pieceCard rook has correct type and piece', () => {
  const c = pieceCard('rook');
  expect(c.type).toBe('piece');
  expect(c.piece).toBe('rook');
  expect(c.name).toBe('Rook');
});

test('pieceCard queen has correct type and piece', () => {
  const c = pieceCard('queen');
  expect(c.type).toBe('piece');
  expect(c.piece).toBe('queen');
  expect(c.name).toBe('Queen');
});

// --- catalog entries ---
test('CARD_CATALOG has pawn piece card', () => {
  const entry = CARD_CATALOG.find(e => e.card().type === 'piece' && e.card().piece === 'pawn');
  expect(entry).toBeDefined();
  expect(entry.rarity).toBe('common');
});

test('CARD_CATALOG has knight piece card', () => {
  const entry = CARD_CATALOG.find(e => e.card().type === 'piece' && e.card().piece === 'knight');
  expect(entry).toBeDefined();
});

test('CARD_CATALOG has bishop piece card', () => {
  const entry = CARD_CATALOG.find(e => e.card().type === 'piece' && e.card().piece === 'bishop');
  expect(entry).toBeDefined();
});

test('CARD_CATALOG has rook piece card', () => {
  const entry = CARD_CATALOG.find(e => e.card().type === 'piece' && e.card().piece === 'rook');
  expect(entry).toBeDefined();
});

test('CARD_CATALOG has queen piece card', () => {
  const entry = CARD_CATALOG.find(e => e.card().type === 'piece' && e.card().piece === 'queen');
  expect(entry).toBeDefined();
});

// --- starter deck ---
test('buildStarterDeck has piece cards for knight', () => {
  const deck = buildStarterDeck('knight');
  const pieceCards = deck.filter(c => c.type === 'piece');
  expect(pieceCards.length).toBeGreaterThan(0);
  expect(pieceCards.some(c => c.piece === 'pawn')).toBe(true);
});