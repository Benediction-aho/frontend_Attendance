import { describe, expect, it } from 'vitest';
import { forgetFirstCode, peekFirstCode, rememberFirstCode } from './pendingCode';

describe('first sign-in code memory', () => {
  it('keeps the code in memory until forgotten', () => {
    expect(peekFirstCode()).toBeNull();
    rememberFirstCode('CODE123456');
    expect(peekFirstCode()).toBe('CODE123456');
    forgetFirstCode();
    expect(peekFirstCode()).toBeNull();
  });
});
