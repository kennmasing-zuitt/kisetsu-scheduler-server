import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../../core/config/env.js';

/** A random numeric code, e.g. the 6-digit code sent by SMS. */
export const randomDigits = (length = 6): string =>
    Array.from({ length }, () => randomInt(0, 10)).join('');

// No 0/o/1/l/i, so codes read back from paper aren't ambiguous
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Ten recovery codes like "k7dm-3xq9" (about 40 bits each). */
export const newRecoveryCodes = (count = 10): string[] =>
    Array.from({ length: count }, () => {
        const chars = Array.from(
            { length: 8 },
            () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)],
        );
        return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
    });

/** Lowercase, no spaces or dashes: what's hashed and compared. */
export const normalizeRecoveryCode = (code: string): string =>
    code.toLowerCase().replace(/[\s-]/g, '');

/**
 * Keyed hash for one-time codes stored in the database (SMS codes, recovery codes). Keyed with
 * JWT_SECRET so a database dump alone can't brute-force the short SMS codes offline.
 */
export const hashCode = (code: string): string =>
    createHmac('sha256', env.JWT_SECRET).update(code).digest('hex');

export function codeMatches(code: string, hash: string): boolean {
    const a = Buffer.from(hashCode(code), 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
}
