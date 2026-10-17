import type { AuthUser } from '../../shared/auth/auth.types.js';

declare global {
    namespace Express {
        interface Request {
            /** Set by core/middleware/verifyToken.ts when a valid Bearer token is sent. */
            user?: AuthUser;
        }
    }
}

export {};
