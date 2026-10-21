import type { AuthUser } from '../../shared/auth/auth.types.js';

declare global {
    namespace Express {
        interface Request {
            /** Set by core/middleware/verifyToken.ts when a valid Bearer token is sent. */
            user?: AuthUser;
            /**
             * Set on /booking/graphql when a valid client session token is sent. (Not `client`:
             * Node already has `req.client`, an alias of the socket.)
             */
            bookingClient?: { id: string };
        }
    }
}

export {};
