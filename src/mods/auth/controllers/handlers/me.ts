import { Authorized, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../../../../core/graphql/auth.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { UserObject, type UserDocument } from '../../../users/index.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class MeHandler {
    @Authorized()
    @Query(() => UserObject, { description: 'The signed-in user (requires a Bearer token)' })
    async me(@CurrentUser() user: AuthUser): Promise<UserDocument> {
        return AuthImpl.getMe(user.id);
    }
}
