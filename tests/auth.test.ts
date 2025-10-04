import { describe, it, expect } from 'bun:test';
import { hash, verify } from 'argon2';
import { generateMeetingCode, validateMeetingCode } from '../src/meetings/code';

describe('Password Hashing', () => {
  it('should hash and verify password', async () => {
    const password = 'test123456';
    const passwordHash = await hash(password);

    expect(passwordHash).toBeDefined();
    expect(passwordHash).not.toBe(password);

    const isValid = await verify(passwordHash, password);
    expect(isValid).toBe(true);

    const isInvalid = await verify(passwordHash, 'wrongpassword');
    expect(isInvalid).toBe(false);
  });
});

describe('Meeting Code', () => {
  it('should generate valid meeting code', () => {
    const code = generateMeetingCode();

    expect(code).toBeDefined();
    expect(validateMeetingCode(code)).toBe(true);
    expect(code).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
  });

  it('should validate meeting codes correctly', () => {
    expect(validateMeetingCode('abc-defg-hij')).toBe(true);
    expect(validateMeetingCode('ABC-DEFG-HIJ')).toBe(false); // uppercase
    expect(validateMeetingCode('ab-defg-hij')).toBe(false); // wrong length
    expect(validateMeetingCode('abc-def-hij')).toBe(false); // wrong middle length
    expect(validateMeetingCode('abcdefghij')).toBe(false); // no dashes
  });
});
