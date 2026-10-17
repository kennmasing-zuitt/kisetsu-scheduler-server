import { Arg, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { RateLimit } from '../../../../core/graphql/middleware/rateLimit.js';
import { authLimiter } from '../../../../core/middleware/rateLimit.js';
import { parseInput } from '../../../../shared/validation.js';
import { RegisterInput } from '../../../users/db/zod/auth.zod.js';
import type { RegisterPayload } from '../../db/_auth.types.js';
import { RegisterInputType, RegisterPayloadObject } from '../../dto/auth.dto.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class RegisterHandler {
    @Mutation(() => RegisterPayloadObject, {
        description: 'Create an account. Rate limited per IP. (was POST /api/v1/auth/register)',
    })
    @UseMiddleware(RateLimit(authLimiter)) // failed attempts count towards AUTH_RATE_LIMIT_MAX
    async register(
        @Arg('input', () => RegisterInputType) input: RegisterInputType,
    ): Promise<RegisterPayload> {
        const { name, email, password } = parseInput(RegisterInput, input);
        const user = await AuthImpl.register(name, email, password);
        return { message: 'Registered! You can now log in.', user };
    }
}
