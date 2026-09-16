import { describe, it, expect } from 'bun:test';
import { hashToken, generateSecureToken } from '../src/lib/services/auth-service';

describe('Auth Security - Token Hashing', () => {
  it('generates a 48-char random hex token', () => {
    const token = generateSecureToken();
    expect(token).toBeDefined();
    expect(token.length).toBe(48);
    expect(/^[0-9a-f]{48}$/.test(token)).toBe(true);
  });

  it('hashes token into a 64-char SHA-256 hex string', () => {
    const token = generateSecureToken();
    const hash = hashToken(token);
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('produces deterministic output for the same token', () => {
    const token = 'sample-verification-token-xyz-123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('produces distinct hashes for different tokens', () => {
    const tokenA = generateSecureToken();
    const tokenB = generateSecureToken();
    expect(hashToken(tokenA)).not.toBe(hashToken(tokenB));
  });

  it('handles accidental leading and trailing whitespace safely', () => {
    const token = 'my-secret-token';
    expect(hashToken(`  ${token}  `)).toBe(hashToken(token));
  });
});
