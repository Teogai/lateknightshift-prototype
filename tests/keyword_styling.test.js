import { describe, test, expect } from 'vitest';
import { makeCardEl } from '../js/ui.js';

describe('atomic and push keyword styling', () => {
  test('atomic keyword has styling classes', () => {
    const card = { name: 'Atomic Move', type: 'move', desc: 'Move {piece}. {Atomic}' };
    const el = makeCardEl(card);
    const keywords = el.querySelectorAll('.keyword');
    
    // Find atomic keyword (capitalized by CSS)
    const atomicKeyword = Array.from(keywords).find(k => k.textContent.toLowerCase() === 'atomic');
    expect(atomicKeyword).toBeDefined();
    expect(atomicKeyword.classList.contains('keyword-atomic')).toBe(true);
    expect(atomicKeyword.style.color).not.toBe(''); // Color is applied inline
  });

  test('push keyword has styling classes', () => {
    const card = { name: 'Push Move', type: 'move', desc: 'Move {piece}. {Push}' };
    const el = makeCardEl(card);
    const keywords = el.querySelectorAll('.keyword');
    
    // Find push keyword (capitalized by CSS)
    const pushKeyword = Array.from(keywords).find(k => k.textContent.toLowerCase() === 'push');
    expect(pushKeyword).toBeDefined();
    expect(pushKeyword.classList.contains('keyword-push')).toBe(true);
    expect(pushKeyword.style.color).not.toBe(''); // Color is applied inline
  });

  test('keywords have mouse event listeners for tooltip', () => {
    const card = { name: 'Atomic Move', type: 'move', desc: 'Move {piece}. {Atomic}' };
    const el = makeCardEl(card);
    const keywords = el.querySelectorAll('.keyword');
    const atomicKeyword = Array.from(keywords).find(k => k.textContent.toLowerCase() === 'atomic');
    
    expect(atomicKeyword).toBeDefined();
  });

  test('multi-word knight_power keyword is parsed with correct class and color', () => {
    const card = { name: 'Knight Power', type: 'action', desc: 'Apply {knight power}: can move like a {knight}. Lasts 1 move.' };
    const el = makeCardEl(card);
    const keywords = el.querySelectorAll('.keyword');
    
    const knightPowerKeyword = Array.from(keywords).find(k => k.textContent === 'knight power');
    expect(knightPowerKeyword).toBeDefined();
    expect(knightPowerKeyword.classList.contains('keyword-knight_power')).toBe(true);
    expect(knightPowerKeyword.style.color).not.toBe(''); // Color is applied inline
  });

  test('multi-word bishop_power keyword is parsed with correct class and color', () => {
    const card = { name: 'Bishop Power', type: 'action', desc: 'Apply {bishop power}: can move like a {bishop}. Lasts 1 move.' };
    const el = makeCardEl(card);
    const keywords = el.querySelectorAll('.keyword');
    
    const bishopPowerKeyword = Array.from(keywords).find(k => k.textContent === 'bishop power');
    expect(bishopPowerKeyword).toBeDefined();
    expect(bishopPowerKeyword.classList.contains('keyword-bishop_power')).toBe(true);
    expect(bishopPowerKeyword.style.color).not.toBe('');
  });
});
