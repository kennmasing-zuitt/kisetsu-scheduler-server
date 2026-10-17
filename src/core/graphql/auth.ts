import { createParameterDecorator, type AuthCheckerFn, type MiddlewareFn } from 'type-graphql';
import type { AuthUser } from '../../shared/auth/auth.types.js';
import { hasPermission } from '../../shared/auth/permissions.js';
import { ForbiddenError, UnauthenticatedError } from '../../shared/errors/AppError.js';
import type { Permission } from '../../mods/roles/db/_roles.enum.js';
import type { GraphQLContext } from './context.js';

/**
 * Backs type-graphql's @Authorized():
 *   @Authorized()                                  any signed-in user, else 401 UNAUTHENTICATED
 *   @Authorized(Permission.readUsers)              must hold the permission, else 403 FORBIDDEN
 *   @Authorized(Permission.a, Permission.b)        must hold ALL listed permissions
 *
 * ctx.user.perms already holds the EFFECTIVE permissions (role + extras, superAdmin expanded),
 * computed once per request by verifyToken via shared/auth/permissions.ts#resolvePermissions.
 */
export const authChecker: AuthCheckerFn<GraphQLContext, Permission> = ({ context }, perms) => {
    const user = context.user;
    if (!user) throw new UnauthenticatedError();
    const missing = perms.filter((perm) => !hasPermission(user, perm));
    if (missing.length > 0) throw new ForbiddenError(`Missing permission: ${missing.join(', ')}`);
    return true;
};

/** Injects the authenticated caller (`{ id, role, roleKind, perms, impersonatedBy? }`). */
export function CurrentUser() {
    return createParameterDecorator<GraphQLContext>(({ context }): AuthUser => {
        if (!context.user) throw new UnauthenticatedError();
        return context.user;
    });
}

/**
 * Blocks a resolver for impersonation tokens (403 IMPERSONATION_NOT_ALLOWED):
 *   @UseMiddleware(DenyImpersonation)
 * Used on account-level actions an admin must never take on a user's behalf.
 */
export const DenyImpersonation: MiddlewareFn<GraphQLContext> = async ({ context }, next) => {
    if (context.user?.impersonatedBy) {
        throw new ForbiddenError(
            'This action is not allowed while impersonating a user',
            'IMPERSONATION_NOT_ALLOWED',
        );
    }
    return next();
};
