import type { UserDocument } from '../../users/index.js';

export interface RegisterPayload {
    message: string;
    user: UserDocument;
}
