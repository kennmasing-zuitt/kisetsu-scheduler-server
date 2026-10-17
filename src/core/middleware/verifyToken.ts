import type { NextFunction, Request, Response } from 'express';
import { UnauthenticatedError } from '../../shared/errors/AppError.js';
import { verifyAccessToken } from '../../shared/auth/jwt.js';
import { UsersImpl } from '../../mods/users/index.js';

/**
 * Runs in front of /graphql.
 *  - No Authorization header: the request continues anonymously (req.user stays undefined).
 *  - Bearer token: verified (HS256 only, expiry), then the user's CURRENT tokenVersion is loaded.
 *    If the token's `ver` doesn't match (logout / password change since it was issued), or the
 *    user no longer exists, the whole request is rejected with HTTP 401 UNAUTHENTICATED.
 *  - On success `sub` is mapped to `id` once, here: the rest of the app uses req.user.id
 *    (exposed to resolvers as ctx.user.id).
 *
 * The token itself is never logged or included in error messages.
 */
export async function verifyToken(req: Request, _res: Response, next: NextFunction) {
    const header = req.get('authorization');
    if (!header) return next();

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        throw new UnauthenticatedError('Authorization header must be "Bearer <token>"');
    }

    const claims = verifyAccessToken(token);
    const user = await UsersImpl.findById(claims.sub);
    if (!user || (user.tokenVersion ?? 0) !== claims.ver) {
        throw new UnauthenticatedError('Token has been revoked');
    }

    req.user = { id: user.id, roles: user.roles.map((r) => r.key) };
    next();
}
