import { Arg, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { RateLimit } from '../../../../core/graphql/middleware/rateLimit.js';
import { clientCodeLimiter } from '../../../../core/middleware/rateLimit.js';
import { parseInput } from '../../../../shared/validation.js';
import type { ClientSessionResult } from '../../db/_booking.types.js';
import { ClientLoginInput } from '../../db/booking.zod.js';
import { ClientSessionObject } from '../../dto/booking.dto.js';
import * as BookingImpl from '../../service/index.js';

@Resolver()
export class ClientLoginHandler {
    @Mutation(() => ClientSessionObject, {
        description:
            'Sign in with the mobile number and the current code from the authenticator app. ' +
            'Any failure is INVALID_CLIENT_CODE; 5 wrong codes pause sign-in for 15 minutes.',
    })
    @UseMiddleware(RateLimit(clientCodeLimiter))
    async clientLogin(
        @Arg('mobile', () => String) mobile: string,
        @Arg('code', () => String) code: string,
    ): Promise<ClientSessionResult> {
        const input = parseInput(ClientLoginInput, { mobile, code });
        return BookingImpl.clientLogin(input.mobile, input.code);
    }
}
