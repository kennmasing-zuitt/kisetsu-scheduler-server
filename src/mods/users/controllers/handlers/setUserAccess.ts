import { Arg, Authorized, Ctx, ID, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { CurrentUser, DenyImpersonation } from '../../../../core/graphql/auth.js';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { ObjectIdSchema, parseInput } from '../../../../shared/validation.js';
import { AuditImpl } from '../../../audit/index.js';
import { Permission, RoleKeySchema } from '../../../roles/index.js';
import type { UserDocument } from '../../db/_users.types.js';
import { SetUserAccessInputType, UserObject } from '../../dto/user.dto.js';
import * as UsersImpl from '../../service/index.js';

@Resolver()
export class SetUserAccessHandler {
    @Authorized(Permission.manageUserAccess)
    @UseMiddleware(DenyImpersonation)
    @Mutation(() => UserObject, {
        description:
            "Assign a user's role and per-user extra permissions. You can only grant permissions " +
            'you hold, only a super admin can manage admins, and nobody can change their own ' +
            'access. Audited.',
    })
    async setUserAccess(
        @CurrentUser() actor: AuthUser,
        @Ctx() ctx: GraphQLContext,
        @Arg('userId', () => ID) userId: string,
        @Arg('input', () => SetUserAccessInputType) input: SetUserAccessInputType,
    ): Promise<UserDocument> {
        return UsersImpl.updateUserAccess(
            actor,
            parseInput(ObjectIdSchema, userId),
            { role: parseInput(RoleKeySchema, input.role), extraPerms: input.extraPerms ?? [] },
            AuditImpl.auditMeta(ctx),
        );
    }
}
