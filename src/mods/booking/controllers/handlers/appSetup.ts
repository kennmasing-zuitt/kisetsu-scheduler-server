import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import { RateLimit } from '../../../../core/graphql/middleware/rateLimit.js';
import { clientCodeLimiter, setupCodeLimiter } from '../../../../core/middleware/rateLimit.js';
import { parseInput } from '../../../../shared/validation.js';
import type {
    AppEnrollmentResult,
    ClientSessionResult,
    SetupCodeSent,
    SetupCodeVerified,
} from '../../db/_booking.types.js';
import {
    ConfirmAppSetupInput,
    RequestSetupCodeInput,
    StartAppSetupInput,
    VerifySetupCodeInput,
} from '../../db/booking.zod.js';
import {
    AppEnrollmentObject,
    ClientSessionObject,
    SetupCodeSentObject,
    SetupCodeVerifiedObject,
} from '../../dto/booking.dto.js';
import * as BookingImpl from '../../service/index.js';

/** Setting up app sign-in: SMS code -> (name) -> QR -> first app code. */
@Resolver()
export class AppSetupHandler {
    @Mutation(() => SetupCodeSentObject, {
        description:
            'Texts a 6-digit code to the number. Needs a Cloudflare Turnstile token. One per ' +
            'minute and 5 a day per number. Errors: BOT_CHECK_FAILED, SETUP_CODE_TOO_SOON, ' +
            'SETUP_CODE_LIMIT, SMS_UNSUPPORTED_NUMBER, SMS_FAILED',
    })
    @UseMiddleware(RateLimit(setupCodeLimiter))
    async requestSetupCode(
        @Ctx() ctx: GraphQLContext,
        @Arg('mobile', () => String) mobile: string,
        @Arg('turnstileToken', () => String) turnstileToken: string,
    ): Promise<SetupCodeSent> {
        const input = parseInput(RequestSetupCodeInput, { mobile, turnstileToken });
        return BookingImpl.requestSetupCode(input.mobile, input.turnstileToken, ctx.req.ip);
    }

    @Mutation(() => SetupCodeVerifiedObject, {
        description: 'Checks the SMS code (3 tries). Errors: INVALID_SETUP_CODE',
    })
    @UseMiddleware(RateLimit(clientCodeLimiter))
    async verifySetupCode(
        @Arg('mobile', () => String) mobile: string,
        @Arg('code', () => String) code: string,
    ): Promise<SetupCodeVerified> {
        const input = parseInput(VerifySetupCodeInput, { mobile, code });
        return BookingImpl.verifySetupCode(input.mobile, input.code);
    }

    @Mutation(() => AppEnrollmentObject, {
        description: 'Creates the client if new (firstName required), then returns the QR code',
    })
    async startAppSetup(
        @Arg('setupToken', () => String) setupToken: string,
        @Arg('firstName', () => String, { nullable: true }) firstName?: string | null,
        @Arg('lastName', () => String, { nullable: true }) lastName?: string | null,
    ): Promise<AppEnrollmentResult> {
        const input = parseInput(StartAppSetupInput, {
            setupToken,
            firstName: firstName ?? undefined,
            lastName: lastName ?? undefined,
        });
        return BookingImpl.startAppSetup(input.setupToken, input);
    }

    @Mutation(() => ClientSessionObject, {
        description: 'The first code from the app: turns app sign-in on and signs the client in',
    })
    @UseMiddleware(RateLimit(clientCodeLimiter))
    async confirmAppSetup(
        @Arg('setupToken', () => String) setupToken: string,
        @Arg('code', () => String) code: string,
    ): Promise<ClientSessionResult> {
        const input = parseInput(ConfirmAppSetupInput, { setupToken, code });
        return BookingImpl.confirmAppSetup(input.setupToken, input.code);
    }
}
