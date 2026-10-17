import { Authorized, Mutation, Resolver } from 'type-graphql';
import { CurrentUser } from '../../../../core/graphql/auth.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class LogoutHandler {
    @Authorized()
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
