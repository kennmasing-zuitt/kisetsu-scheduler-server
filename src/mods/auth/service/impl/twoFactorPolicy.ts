import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { AppError, UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import {
    codeMatches,
    hashCode,
    normalizeRecoveryCode,
} from '../../../../shared/otp/oneTimeCodes.js';
import { openSecret } from '../../../../shared/otp/secretBox.js';
import { normalizeTotpCode, verifyTotp } from '../../../../shared/otp/totp.js';
import { RoleKind } from '../../../roles/index.js';
import { UsersImpl, type UserDocument } from '../../../users/index.js';

/** Wrong codes in a row before a 15-minute lock (on top of the per-IP auth rate limit). */
export const MAX_FAILED_TWO_FACTOR = 5;
export const TWO_FACTOR_LOCK_MINUTES = 15;

/** Admin-kind roles must use 2FA; for everyone else it's optional. */
export const requiresTwoFactor = (access: Pick<AuthUser, 'roleKind'>): boolean =>
    access.roleKind === RoleKind.admin;

export const isTwoFactorEnabled = (user: Pick<UserDocument, 'twoFactor'>): boolean =>
    Boolean(user.twoFactor?.enabledAt);

export const invalidTwoFactorCode = () =>
    new UnauthenticatedError(
        'That code is not right. Try the newest code.',
        'INVALID_TWO_FACTOR_CODE',
    );

/**
 * Checks an authenticator code (6 digits) or a recovery code ("k7dm-3xq9") for a user with 2FA
 * on. Each authenticator code works once, a recovery code is used up. Wrong codes count towards a
 * lock. `user` must be loaded with UsersImpl.findByIdWithTwoFactor.
 */
export async function verifySecondFactor(
    user: UserDocument,
    code: string,
): Promise<'authenticator' | 'recovery'> {
    const tf = user.twoFactor;
    if (!tf?.enabledAt || !tf.secret) {
        throw new AppError(400, 'TWO_FACTOR_NOT_SET_UP', 'Two-factor sign-in is not turned on');
    }
    if (tf.lockedUntil && tf.lockedUntil > new Date()) {
        throw new AppError(
            429,
            'TWO_FACTOR_LOCKED',
            `Too many wrong codes. Try again after ${tf.lockedUntil.toISOString()}.`,
        );
    }

    if (/^\d{6}$/.test(normalizeTotpCode(code))) {
        const step = await verifyTotp(openSecret(tf.secret), code, tf.lastStep);
        if (step != null && (await UsersImpl.acceptTwoFactorStep(user.id, step)))
            return 'authenticator';
    } else {
        const normalized = normalizeRecoveryCode(code);
        const match = (tf.recoveryCodes ?? []).find((hash) => codeMatches(normalized, hash));
        if (match && (await UsersImpl.consumeRecoveryCode(user.id, match))) return 'recovery';
    }

    await UsersImpl.recordTwoFactorFailure(
        user.id,
        MAX_FAILED_TWO_FACTOR,
        new Date(Date.now() + TWO_FACTOR_LOCK_MINUTES * 60_000),
    );
    throw invalidTwoFactorCode();
}

/** Hashes recovery codes for storage (normalised, so "K7DM 3XQ9" matches "k7dm-3xq9"). */
export const hashRecoveryCodes = (codes: string[]): string[] =>
    codes.map((c) => hashCode(normalizeRecoveryCode(c)));
