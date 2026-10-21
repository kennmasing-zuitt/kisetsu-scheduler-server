import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

const SECRET_FIELDS = '+twoFactor.secret +twoFactor.pendingSecret +twoFactor.recoveryCodes';

/** Loads the sealed 2FA secrets and recovery code hashes. Never return the result to a client. */
export const findByIdWithTwoFactor = async (id: string): Promise<UserDocument | null> =>
    UserModel.findById(id, SECRET_FIELDS);

/** Starts setup: stores a new sealed secret until the first code confirms it. */
export const setPendingTwoFactor = async (id: string, sealedSecret: string): Promise<boolean> => {
    const res = await UserModel.updateOne(
        { _id: id },
        { $set: { 'twoFactor.pendingSecret': sealedSecret } },
    );
    return res.matchedCount > 0;
};

/** Finishes setup: the pending secret becomes the secret, with fresh recovery codes. */
export const enableTwoFactor = async (
    id: string,
    sealedSecret: string,
    step: number,
    recoveryHashes: string[],
): Promise<UserDocument | null> =>
    UserModel.findOneAndUpdate(
        { _id: id, 'twoFactor.pendingSecret': sealedSecret },
        {
            $set: {
                'twoFactor.secret': sealedSecret,
                'twoFactor.pendingSecret': null,
                'twoFactor.lastStep': step,
                'twoFactor.recoveryCodes': recoveryHashes,
                'twoFactor.failedAttempts': 0,
                'twoFactor.lockedUntil': null,
                'twoFactor.enabledAt': new Date(),
            },
        },
        { returnDocument: 'after' },
    );

/**
 * Records an accepted code. Atomic: only succeeds if no code from this step (or later) was
 * accepted in the meantime, so two requests racing with the same code can't both pass.
 */
export const acceptTwoFactorStep = async (id: string, step: number): Promise<boolean> => {
    const res = await UserModel.updateOne(
        { _id: id, $or: [{ 'twoFactor.lastStep': null }, { 'twoFactor.lastStep': { $lt: step } }] },
        {
            $set: {
                'twoFactor.lastStep': step,
                'twoFactor.failedAttempts': 0,
                'twoFactor.lockedUntil': null,
            },
        },
    );
    return res.modifiedCount > 0;
};

/** Removes one recovery code (by hash). False if it wasn't there (already used or wrong). */
export const consumeRecoveryCode = async (id: string, hash: string): Promise<boolean> => {
    const res = await UserModel.updateOne(
        { _id: id, 'twoFactor.recoveryCodes': hash },
        {
            $pull: { 'twoFactor.recoveryCodes': hash },
            $set: { 'twoFactor.failedAttempts': 0, 'twoFactor.lockedUntil': null },
        },
    );
    return res.modifiedCount > 0;
};

/** Counts a wrong code; after `max` in a row the account's 2FA is locked until `lockUntil`. */
export const recordTwoFactorFailure = async (
    id: string,
    max: number,
    lockUntil: Date,
): Promise<void> => {
    const after = await UserModel.findByIdAndUpdate(
        id,
        { $inc: { 'twoFactor.failedAttempts': 1 } },
        { returnDocument: 'after' },
    );
    if (after && (after.twoFactor?.failedAttempts ?? 0) >= max) {
        await UserModel.updateOne(
            { _id: id },
            { $set: { 'twoFactor.failedAttempts': 0, 'twoFactor.lockedUntil': lockUntil } },
        );
    }
};

export const setRecoveryCodes = async (id: string, hashes: string[]): Promise<boolean> => {
    const res = await UserModel.updateOne(
        { _id: id },
        { $set: { 'twoFactor.recoveryCodes': hashes } },
    );
    return res.matchedCount > 0;
};

/** Turns 2FA off. With `revokeTokens` it also signs the user out everywhere (admin reset). */
export const clearTwoFactor = async (id: string, revokeTokens: boolean): Promise<boolean> => {
    const res = await UserModel.updateOne(
        { _id: id },
        {
            $set: {
                twoFactor: {
                    secret: null,
                    pendingSecret: null,
                    lastStep: null,
                    recoveryCodes: [],
                    failedAttempts: 0,
                    lockedUntil: null,
                    enabledAt: null,
                },
            },
            ...(revokeTokens ? { $inc: { tokenVersion: 1 } } : {}),
        },
    );
    return res.matchedCount > 0;
};
