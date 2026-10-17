import type { UserDocument } from '../../users/index.js';

/** What register / login / changePassword hand back: a fresh access token and the user. */
export interface AuthResult {
    token: string;
    user: UserDocument;
}

export interface RegisterPayload extends AuthResult {
    message: string;
}
