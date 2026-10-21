import type { UserDocument } from '../../users/index.js';

/** What register / login / changePassword hand back: a fresh access token and the user. */
export interface AuthResult {
    token: string;
    user: UserDocument;
}

export interface RegisterPayload extends AuthResult {
    message: string;
}

/** What login hands back: a session, or the next 2FA step. */
export interface LoginResult {
    token?: string;
    user?: UserDocument;
    /** 2FA is on: send the code with loginTwoFactor(challengeToken, code) */
    twoFactorRequired: boolean;
    /** The role requires 2FA and it isn't set up: setupTwoFactor / confirmTwoFactor with challengeToken */
    twoFactorSetupRequired: boolean;
    challengeToken?: string;
}

export interface TwoFactorEnabledResult extends AuthResult {
    /** Shown once; only hashes are stored */
    recoveryCodes: string[];
}
