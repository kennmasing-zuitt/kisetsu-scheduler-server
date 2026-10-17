import { Authorized, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { CurrentUser, DenyImpersonation } from '../../../../core/graphql/auth.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class LogoutHandler {
    @Authorized()
    @UseMiddleware(DenyImpersonation) // an admin must never do this on a user's behalf
    @Mutation(() => Boolean, {
        description:
            'Revokes every token for this user on every device (increments tokenVersion). ' +
            'Returns true; the client should delete its stored token.',
    })
    async logout(@CurrentUser() user: AuthUser): Promise<boolean> {
        await AuthImpl.logout(user.id);
        return true;
    }
}
