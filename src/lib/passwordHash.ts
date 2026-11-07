import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { FORBIDDEN_DEMO_CREDENTIALS, validateDriverPasswordPolicy } from './passwordPolicy';

export { FORBIDDEN_DEMO_CREDENTIALS, validateDriverPasswordPolicy };

const KEY_LENGTH = 64;

export function hashPassword(rawPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(rawPassword, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPasswordHash(rawPassword: string, storedHash?: string | null): boolean {
  if (!rawPassword || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;

  try {
    const storedBuf = Buffer.from(hashHex, 'hex');
    const derivedBuf = scryptSync(rawPassword, salt, KEY_LENGTH);
    if (storedBuf.length !== derivedBuf.length) return false;
    return timingSafeEqual(storedBuf, derivedBuf);
  } catch {
    return false;
  }
}
