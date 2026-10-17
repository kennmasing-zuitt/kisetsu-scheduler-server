import { describe, it, expect } from 'vitest';
import { redact } from '../logger.js';

describe('log redaction', () => {
    it('never lets tokens, passwords or auth headers through', () => {
        const out = redact({
            token: 'eyJ.abc.def',
            accessToken: 'eyJ.x.y',
            tokenVersion: 3,
            user: { email: 'a@b.c', password: 'hash' },
            headers: { authorization: 'Bearer eyJ' },
            args: [
                { $set: { password: '$2b$10$hash' } },
                { currentPassword: 'x', newPassword: 'y' },
            ],
        });
        expect(out).toEqual({
            token: '[REDACTED]',
            accessToken: '[REDACTED]',
            tokenVersion: 3,
            user: { email: 'a@b.c', password: '[REDACTED]' },
            headers: { authorization: '[REDACTED]' },
            args: [
                { $set: { password: '[REDACTED]' } },
                { currentPassword: '[REDACTED]', newPassword: '[REDACTED]' },
            ],
        });
    });
});
