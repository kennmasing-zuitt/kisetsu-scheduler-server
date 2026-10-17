import { createParameterDecorator, type AuthCheckerFn } from 'type-graphql';
import type { AuthUser } from '../../shared/auth/auth.types.js';
import { ForbiddenError, UnauthenticatedError } from '../../shared/errors/AppError.js';
import type { RoleKey } from '../../mods/users/db/_users.enum.js';
import type { GraphQLContext } from './context.js';

/**
 * Backs type-graphql's @Authorized():
 *   @Authorized()                    any signed-in user, else 401 UNAUTHENTICATED
 *   @Authorized(RoleKey.appAdmin)    signed-in user with one of the roles, else 403 FORBIDDEN
 */
export const authChecker: AuthCheckerFn<GraphQLContext, RoleKey> = ({ context }, roles) => {
    const user = context.user;
    if (!user) throw new UnauthenticatedError();
    if (roles.length > 0 && !roles.some((role) => user.roles.includes(role))) {
        throw new ForbiddenError();
    }
    return true;
};

/** Injects the authenticated caller (`{ id, roles }`) into a resolver argument. */
export function CurrentUser() {
    return createParameterDecorator<GraphQLContext>(({ context }): AuthUser => {
        if (!context.user) throw new UnauthenticatedError();
        return context.user;
    });
}
