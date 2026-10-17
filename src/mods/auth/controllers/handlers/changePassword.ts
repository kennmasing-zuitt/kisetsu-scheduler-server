import { Arg, Authorized, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { CurrentUser } from '../../../../core/graphql/auth.js';
import { RateLimit } from '../../../../core/graphql/middleware/rateLimit.js';
import { authLimiter } from '../../../../core/middleware/rateLimit.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { parseInput } from '../../../../shared/validation.js';
import { ChangePasswordInput } from '../../../users/db/zod/auth.zod.js';
import type { AuthResult } from '../../db/_auth.types.js';
import { AuthPayloadObject, ChangePasswordInputType } from '../../dto/auth.dto.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class ChangePasswordHandler {
    @Authorized()
    @Mutation(() => AuthPayloadObject, {
        description:
            'Requires the current password (403 WRONG_PASSWORD otherwise). Signs out every other ' +
            'device and returns a fresh token for this one.',
    })
    @UseMiddleware(RateLimit(authLimiter)) // wrong current passwords count towards the limit
    async changePassword(
        @CurrentUser() user: AuthUser,
        @Arg('input', () => ChangePasswordInputType) input: ChangePasswordInputType,
    ): Promise<AuthResult> {
        return AuthImpl.changePassword(user.id, parseInput(ChangePasswordInput, input));
    }
}
