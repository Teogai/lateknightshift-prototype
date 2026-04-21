import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Test that the hand container CSS allows proper scrolling
 * when content overflows, while maintaining center alignment
 * when content fits.
 */
describe('hand scroll CSS', () => {
  const cssPath = path.resolve(__dirname, '../css/cards.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  test('hand-scroll should not use justify-content center', () => {
    // Extract #hand-scroll styles
    const handScrollMatch = cssContent.match(/#hand-scroll\s*\{([^}]+)\}/);
    expect(handScrollMatch).toBeTruthy();
    
    const handScrollStyles = handScrollMatch[1];
    
    // After fix: justify-content should NOT be 'center'
    // It should either not exist or be something else (like flex-start)
    const justifyContentMatch = handScrollStyles.match(/justify-content:\s*([^;]+)/);
    if (justifyContentMatch) {
      expect(justifyContentMatch[1].trim()).not.toBe('center');
    }
  });

  test('hand should have margin auto for centering when small', () => {
    // Extract #hand styles
    const handMatch = cssContent.match(/#hand\s*\{([^}]+)\}/);
    expect(handMatch).toBeTruthy();
    
    const handStyles = handMatch[1];
    
    // After fix: margin should be '0 auto' to center when content fits
    expect(handStyles).toContain('margin:');
    expect(handStyles).toMatch(/margin:\s*0\s+auto/);
  });
});