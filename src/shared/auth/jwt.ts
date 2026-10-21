import { createHmac } from 'node:crypto';
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

// ---------------------------------------------------------------------------------------------
// Purpose tokens: short-lived tokens for one step of a flow (2FA challenge, 2FA setup, client
// app setup, client session). Each purpose is signed with its own key derived from JWT_SECRET,
// so none of them can ever pass verifyAccessToken (or each other's checks), whatever they hold.
// ---------------------------------------------------------------------------------------------

export enum TokenPurpose {
    /** Password was right; now enter the authenticator code (loginTwoFactor) */
    twoFactorChallenge = 'twoFactorChallenge',
    /** Password was right but this role must set up 2FA first (setup/confirmTwoFactor) */
    twoFactorSetup = 'twoFactorSetup',
    /** Client proved the mobile number by SMS; may now confirm their authenticator */
    clientAppSetup = 'clientAppSetup',
    /** Client signed in with an authenticator code on the booking site */
    clientSession = 'clientSession',
}

const PURPOSE_TTL: Record<TokenPurpose, string> = {
    [TokenPurpose.twoFactorChallenge]: '5m',
    [TokenPurpose.twoFactorSetup]: '15m',
    [TokenPurpose.clientAppSetup]: '15m',
    [TokenPurpose.clientSession]: '30m',
};

const purposeKey = (purpose: TokenPurpose) =>
    createHmac('sha256', env.JWT_SECRET).update(`purpose:${purpose}`).digest();

export interface PurposeClaims {
    /** User id, or client id for client tokens */
    sub: string;
    /** tokenVersion (users) or app version (clients) when signed */
    ver: number;
    /** Extra data, e.g. the mobile number during client setup */
    data?: Record<string, string>;
}

const PurposeClaimsSchema = z.object({
    sub: z.string().min(1),
    ver: z.number().int().nonnegative(),
    pur: z.string(),
    data: z.record(z.string(), z.string()).optional(),
});

export function signPurposeToken(
    purpose: TokenPurpose,
    claims: PurposeClaims,
): { token: string; expiresAt: Date } {
    const token = jwt.sign({ ...claims, pur: purpose }, purposeKey(purpose), {
        algorithm: ALGORITHM,
        expiresIn: PURPOSE_TTL[purpose] as SignOptions['expiresIn'],
    });
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, expiresAt: new Date(exp * 1000) };
}

/** Throws UNAUTHENTICATED with `expiredCode` when expired, `INVALID_TOKEN` otherwise. */
export function verifyPurposeToken(
    purpose: TokenPurpose,
    token: string,
    expiredCode = 'TOKEN_EXPIRED',
): PurposeClaims {
    let decoded: unknown;
    try {
        decoded = jwt.verify(token, purposeKey(purpose), { algorithms: [ALGORITHM] });
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new UnauthenticatedError('This step expired. Please start again.', expiredCode);
        }
        throw new UnauthenticatedError('Invalid token', 'INVALID_TOKEN');
    }
    const parsed = PurposeClaimsSchema.safeParse(decoded);
    if (!parsed.success || parsed.data.pur !== purpose) {
        throw new UnauthenticatedError('Invalid token', 'INVALID_TOKEN');
    }
    const { sub, ver, data } = parsed.data;
    return { sub, ver, data };
}
