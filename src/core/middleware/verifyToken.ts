import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../../shared/auth/jwt.js';
import { hasPermission, isAdmin } from '../../shared/auth/permissions.js';
import { UnauthenticatedError } from '../../shared/errors/AppError.js';
import { Permission, RolesImpl } from '../../mods/roles/index.js';
import { UsersImpl } from '../../mods/users/index.js';
import { logger } from '../logger.js';

/**
 * Runs in front of /graphql.
 *  - No Authorization header: the request continues anonymously (req.user stays undefined).
 *  - Bearer token: verified (HS256 only, expiry), then the user's CURRENT tokenVersion is loaded.
 *    If the token's `ver` doesn't match (logout / password change since it was issued), or the
 *    user no longer exists, the whole request is rejected with HTTP 401 UNAUTHENTICATED.
 *  - The user's role is loaded and their effective permissions computed (role perms +
 *    extraPerms), so role and access changes apply on the very next request.
 *  - Impersonation tokens (`act` claim) are also checked against the ADMIN on every request: the
 *    admin must still exist, still have the same tokenVersion and still hold impersonateUsers, and
 *    the target must still be a non-admin. Otherwise 401 "Impersonation session has ended".
 *  - On success `sub` is mapped to `id` once, here: the rest of the app uses req.user.id
 *    (exposed to resolvers as ctx.user).
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
    const authUser = await RolesImpl.resolveAuthUser(user);

    if (!claims.act) {
        req.user = authUser;
        return next();
    }

    const admin = await UsersImpl.findById(claims.act.sub);
    const adminAccess = admin ? await RolesImpl.resolveAuthUser(admin) : null;
    const sessionValid =
        admin &&
        adminAccess &&
        (admin.tokenVersion ?? 0) === claims.act.ver &&
        hasPermission(adminAccess, Permission.impersonateUsers) &&
        !isAdmin(authUser);
    if (!sessionValid) throw new UnauthenticatedError('Impersonation session has ended');

    req.user = { ...authUser, impersonatedBy: admin.id };
    // Every impersonated request leaves a trail in the logs (who acted as whom)
    logger.info('Impersonated request', { adminId: admin.id, userId: user.id });
    next();
}
