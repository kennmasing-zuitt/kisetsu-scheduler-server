import { Arg, Authorized, Ctx, ID, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { z } from 'zod';
import { CurrentUser, DenyImpersonation } from '../../../../core/graphql/auth.js';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { ObjectIdSchema, parseInput } from '../../../../shared/validation.js';
import { AuditImpl } from '../../../audit/index.js';
import { Permission } from '../../../roles/index.js';
import { ImpersonationPayloadObject } from '../../dto/auth.dto.js';
import * as AuthImpl from '../../service/index.js';

const ImpersonateArgs = z.object({
    userId: ObjectIdSchema,
    reason: z.string().trim().min(5).max(500),
});

@Resolver()
export class ImpersonateUserHandler {
    @Authorized(Permission.impersonateUsers)
    @UseMiddleware(DenyImpersonation) // no chaining impersonations
    @Mutation(() => ImpersonationPayloadObject, {
        description:
            'Requires impersonateUsers. Returns a short-lived token that acts as a non-admin user, ' +
            'for support and debugging. A reason is required and recorded in the audit log.',
    })
    async impersonateUser(
        @CurrentUser() admin: AuthUser,
        @Ctx() ctx: GraphQLContext,
        @Arg('userId', () => ID) userId: string,
        @Arg('reason', () => String, { description: 'Why: stored in the audit log (5-500 chars)' })
        reason: string,
    ): Promise<AuthImpl.ImpersonationResult> {
        const args = parseInput(ImpersonateArgs, { userId, reason });
        return AuthImpl.impersonateUser(
            admin.id,
            args.userId,
            args.reason,
            AuditImpl.auditMeta(ctx),
        );
    }
}
