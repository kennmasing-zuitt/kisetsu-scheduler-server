import { Arg, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { RateLimit } from '../../../../core/graphql/middleware/rateLimit.js';
import { authLimiter } from '../../../../core/middleware/rateLimit.js';
import { parseInput } from '../../../../shared/validation.js';
import { LoginInput } from '../../../users/db/zod/auth.zod.js';
import type { AuthResult } from '../../db/_auth.types.js';
import { AuthPayloadObject, LoginInputType } from '../../dto/auth.dto.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class LoginHandler {
    @Mutation(() => AuthPayloadObject, {
        description:
            'Exchange email + password for an access token. Unknown email and wrong password both ' +
            'return INVALID_CREDENTIALS (401). Rate limited per IP.',
    })
    @UseMiddleware(RateLimit(authLimiter))
    async login(@Arg('input', () => LoginInputType) input: LoginInputType): Promise<AuthResult> {
        return AuthImpl.login(parseInput(LoginInput, input));
    }
}
