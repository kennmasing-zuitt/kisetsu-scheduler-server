import type { UserDocument } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

// Thin wrappers so other modules (auth) reach the User collection through UsersImpl only.
export const findByIdWithTwoFactor = (id: string): Promise<UserDocument | null> =>
    UsersOperations.findByIdWithTwoFactor(id);
export const setPendingTwoFactor = (id: string, sealed: string) =>
    UsersOperations.setPendingTwoFactor(id, sealed);
export const enableTwoFactor = (
    id: string,
    sealed: string,
    step: number,
    recoveryHashes: string[],
) => UsersOperations.enableTwoFactor(id, sealed, step, recoveryHashes);
export const acceptTwoFactorStep = (id: string, step: number) =>
    UsersOperations.acceptTwoFactorStep(id, step);
export const consumeRecoveryCode = (id: string, hash: string) =>
    UsersOperations.consumeRecoveryCode(id, hash);
export const recordTwoFactorFailure = (id: string, max: number, lockUntil: Date) =>
    UsersOperations.recordTwoFactorFailure(id, max, lockUntil);
export const setRecoveryCodes = (id: string, hashes: string[]) =>
    UsersOperations.setRecoveryCodes(id, hashes);
export const clearTwoFactor = (id: string, revokeTokens: boolean) =>
    UsersOperations.clearTwoFactor(id, revokeTokens);
