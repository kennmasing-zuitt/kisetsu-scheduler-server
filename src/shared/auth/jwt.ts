import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../core/config/env.js';
import { UnauthenticatedError } from '../errors/AppError.js';
import type { AccessTokenClaims } from './auth.types.js';

// Pinned on both sign and verify, so a token claiming another algorithm (e.g. "none") is rejected
const ALGORITHM = 'HS256' as const;

interface TokenSubject {
    id: string;
    tokenVersion?: number | null;
    role?: string | null;
}

const baseClaims = (user: TokenSubject): AccessTokenClaims => ({
    sub: user.id,
    ver: user.tokenVersion ?? 0,
    role: user.role ?? undefined,
});

const sign = (claims: AccessTokenClaims, expiresIn: string) =>
    jwt.sign(claims, env.JWT_SECRET, {
        algorithm: ALGORITHM,
        expiresIn: expiresIn as SignOptions['expiresIn'],
    });

/** Signs `{ sub: user.id, ver: user.tokenVersion, role }`, expiring after JWT_EXPIRES_IN. */
export function signAccessToken(user: TokenSubject): string {
    return sign(baseClaims(user), env.JWT_EXPIRES_IN);
}

/**
 * Signs a token that acts as `target`, with `act: { sub: admin.id, ver: admin.tokenVersion }`,
 * expiring after IMPERSONATION_TOKEN_TTL. verifyToken re-checks the admin on every request.
 */
export function signImpersonationToken(
    target: TokenSubject,
    admin: TokenSubject,
): { token: string; expiresAt: Date } {
    const token = sign(
        { ...baseClaims(target), act: { sub: admin.id, ver: admin.tokenVersion ?? 0 } },
        env.IMPERSONATION_TOKEN_TTL,
    );
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, expiresAt: new Date(exp * 1000) };
}

const ClaimsSchema = z.object({
    sub: z.string().min(1),
    ver: z.number().int().nonnegative(),
    role: z.string().optional(),
    act: z.object({ sub: z.string().min(1), ver: z.number().int().nonnegative() }).optional(),
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
