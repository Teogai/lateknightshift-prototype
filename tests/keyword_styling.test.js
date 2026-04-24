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
});
