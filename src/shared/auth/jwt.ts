import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../core/config/env.js';
import { RoleKey } from '../../mods/users/db/_users.enum.js';
import { UnauthenticatedError } from '../errors/AppError.js';
import type { AccessTokenClaims } from './auth.types.js';

// Pinned on both sign and verify, so a token claiming another algorithm (e.g. "none") is rejected
const ALGORITHM = 'HS256' as const;

interface TokenSubject {
    id: string;
    tokenVersion?: number | null;
    roles: { key: RoleKey }[];
}

/** Signs `{ sub: user.id, ver: user.tokenVersion, roles }`, expiring after JWT_EXPIRES_IN. */
export function signAccessToken(user: TokenSubject): string {
    const claims: AccessTokenClaims = {
        sub: user.id,
        ver: user.tokenVersion ?? 0,
        roles: user.roles.map((r) => r.key),
    };
    return jwt.sign(claims, env.JWT_SECRET, {
        algorithm: ALGORITHM,
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
}

const ClaimsSchema = z.object({
    sub: z.string().min(1),
    ver: z.number().int().nonnegative(),
    roles: z.array(z.enum(RoleKey)).default([]),
});

/**
 * Checks signature, algorithm and expiry, then the claim shape.
 * Throws UNAUTHENTICATED (401) without echoing the token anywhere.
 */
export function verifyAccessToken(token: string): AccessTokenClaims {
    let decoded: unknown;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) throw new UnauthenticatedError('Token expired');
        throw new UnauthenticatedError('Invalid token');
    }
    const parsed = ClaimsSchema.safeParse(decoded);
    if (!parsed.success) throw new UnauthenticatedError('Invalid token');
    return parsed.data;
}
