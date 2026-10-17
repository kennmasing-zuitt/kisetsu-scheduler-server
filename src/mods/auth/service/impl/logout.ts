import { UsersImpl } from '../../../users/index.js';

/**
 * Increments tokenVersion, so every token issued so far (on every device) stops working.
 * The client should also delete its stored token.
 */
export const logout = async (userId: string): Promise<void> => {
    await UsersImpl.incrementTokenVersion(userId);
};
