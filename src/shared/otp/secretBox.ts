import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../core/config/env.js';

// AES-256-GCM: confidentiality plus an auth tag, so a tampered value fails to decrypt
const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

const key = () => Buffer.from(env.TOTP_ENCRYPTION_KEY, 'base64');

/**
 * Encrypts a short secret (an authenticator seed) for storage: `v1.<iv>.<tag>.<ciphertext>`,
 * each part base64url. A database dump without TOTP_ENCRYPTION_KEY can't produce codes.
 */
export function sealSecret(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key(), iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv, tag, data]
        .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
        .join('.');
}

/** Reverses sealSecret. Throws if the value was tampered with or the key changed. */
export function openSecret(sealed: string): string {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== VERSION || !iv || !tag || !data) throw new Error('Unsupported sealed secret');
    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64url')),
        decipher.final(),
    ]).toString('utf8');
}
