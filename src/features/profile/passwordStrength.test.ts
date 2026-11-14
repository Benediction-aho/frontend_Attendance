import { describe, expect, it } from 'vitest';
import { passwordStrength } from './passwordStrength';

describe('passwordStrength (guidance only)', () => {
  it('is empty for an empty field', () => expect(passwordStrength('').level).toBe(0));
  it('flags short passwords as weak', () => expect(passwordStrength('abc1').level).toBe(1));
  it('rates letters + digits of 8+ as fair', () =>
    expect(passwordStrength('accra2026').level).toBe(2));
  it('rates long mixed passwords as strong', () =>
    expect(passwordStrength('Kumasi-Market-2026').level).toBe(3));
});
