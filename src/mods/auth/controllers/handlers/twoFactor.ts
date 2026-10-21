import { Arg, Authorized, Ctx, ID, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { CurrentUser, DenyImpersonation } from '../../../../core/graphql/auth.js';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import { RateLimit } from '../../../../core/graphql/middleware/rateLimit.js';
import { authLimiter } from '../../../../core/middleware/rateLimit.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { TokenPurpose } from '../../../../shared/auth/jwt.js';
import { ForbiddenError, UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import type { TotpEnrollment } from '../../../../shared/otp/totp.js';
import { ObjectIdSchema, parseInput } from '../../../../shared/validation.js';
import { AuditImpl } from '../../../audit/index.js';
import { Permission } from '../../../roles/index.js';
import type { AuthResult, TwoFactorEnabledResult } from '../../db/_auth.types.js';
import { TwoFactorCode, TwoFactorPassword } from '../../db/twoFactor.zod.js';
import {
    AuthPayloadObject,
    TwoFactorEnabledPayloadObject,
    TwoFactorSetupObject,
} from '../../dto/auth.dto.js';
import * as AuthImpl from '../../service/index.js';

/**
 * Whose 2FA a setup call is about: the signed-in user, or (during a sign-in that requires
 * setup) the user named by the challengeToken from login.
 */
async function setupSubject(ctx: GraphQLContext, challengeToken?: string | null): Promise<string> {
    if (challengeToken) {
        const user = await AuthImpl.userForPurposeToken(
            TokenPurpose.twoFactorSetup,
            challengeToken,
        );
        return user.id;
    }
    if (!ctx.user) throw new UnauthenticatedError();
    if (ctx.user.impersonatedBy) {
        throw new ForbiddenError(
            'This action is not allowed while impersonating a user',
            'IMPERSONATION_NOT_ALLOWED',
        );
    }
    return ctx.user.id;
}

@Resolver()
export class TwoFactorHandler {
    @Mutation(() => AuthPayloadObject, {
        description:
            'Step 2 of login: the 6-digit authenticator code, or a recovery code. ' +
            'INVALID_TWO_FACTOR_CODE (401); 5 wrong codes lock 2FA for 15 minutes (TWO_FACTOR_LOCKED).',
    })
    @UseMiddleware(RateLimit(authLimiter))
    async loginTwoFactor(
        @Arg('challengeToken', () => String) challengeToken: string,
        @Arg('code', () => String) code: string,
    ): Promise<AuthResult> {
        return AuthImpl.loginTwoFactor(challengeToken, parseInput(TwoFactorCode, code));
    }

    @Mutation(() => TwoFactorSetupObject, {
        description:
            'Starts turning 2FA on and returns the QR code. Signed in, or with the challengeToken ' +
            'from a login that returned twoFactorSetupRequired.',
    })
    @UseMiddleware(RateLimit(authLimiter))
    async setupTwoFactor(
        @Ctx() ctx: GraphQLContext,
        @Arg('challengeToken', () => String, { nullable: true }) challengeToken?: string | null,
    ): Promise<TotpEnrollment> {
        return AuthImpl.setupTwoFactor(await setupSubject(ctx, challengeToken));
    }

    @Mutation(() => TwoFactorEnabledPayloadObject, {
        description:
            'Finishes turning 2FA on with the first code from the app. Returns the recovery codes ' +
            '(shown once) and an access token.',
    })
    @UseMiddleware(RateLimit(authLimiter))
    async confirmTwoFactor(
        @Ctx() ctx: GraphQLContext,
        @Arg('code', () => String) code: string,
        @Arg('challengeToken', () => String, { nullable: true }) challengeToken?: string | null,
    ): Promise<TwoFactorEnabledResult> {
        return AuthImpl.confirmTwoFactor(
            await setupSubject(ctx, challengeToken),
            parseInput(TwoFactorCode, code),
        );
    }

    @Authorized()
    @UseMiddleware(DenyImpersonation)
    @Mutation(() => Boolean, {
        description:
            'Turns 2FA off (password + code). TWO_FACTOR_REQUIRED (403) for roles that require it.',
    })
    @UseMiddleware(RateLimit(authLimiter))
    async disableTwoFactor(
        @CurrentUser() user: AuthUser,
        @Arg('password', () => String) password: string,
        @Arg('code', () => String) code: string,
    ): Promise<boolean> {
        await AuthImpl.disableTwoFactor(
            user,
            parseInput(TwoFactorPassword, password),
            parseInput(TwoFactorCode, code),
        );
        return true;
    }

    @Authorized()
    @UseMiddleware(DenyImpersonation)
    @Mutation(() => [String], { description: 'New recovery codes (the old ones stop working)' })
    @UseMiddleware(RateLimit(authLimiter))
    async regenerateRecoveryCodes(
        @CurrentUser() user: AuthUser,
        @Arg('code', () => String) code: string,
    ): Promise<string[]> {
        return AuthImpl.regenerateRecoveryCodes(user.id, parseInput(TwoFactorCode, code));
    }

    @Authorized(Permission.resetTwoFactor)
    @Mutation(() => Boolean, {
        description:
            "Lost phone: turns a user's 2FA off and signs them out everywhere. Only a super " +
            'admin can reset an admin. Audited.',
    })
    async resetUserTwoFactor(
        @Ctx() ctx: GraphQLContext,
        @CurrentUser() actor: AuthUser,
        @Arg('userId', () => ID) userId: string,
    ): Promise<boolean> {
        await AuthImpl.resetUserTwoFactor(
            actor,
            parseInput(ObjectIdSchema, userId),
            AuditImpl.auditMeta(ctx),
        );
        return true;
    }
}
