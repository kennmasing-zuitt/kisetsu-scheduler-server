import { Authorized, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../../../../core/graphql/auth.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { SessionObject } from '../../dto/auth.dto.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class SessionHandler {
    @Authorized()
    @Query(() => SessionObject, {
        description: 'The current user, their effective permissions, and any impersonating admin',
    })
    async session(@CurrentUser() user: AuthUser): Promise<AuthImpl.SessionInfo> {
        return AuthImpl.getSession(user);
    }
}
