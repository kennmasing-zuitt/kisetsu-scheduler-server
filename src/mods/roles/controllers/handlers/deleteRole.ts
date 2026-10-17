import { Arg, Authorized, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { CurrentUser, DenyImpersonation } from '../../../../core/graphql/auth.js';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { parseInput } from '../../../../shared/validation.js';
import { AuditImpl } from '../../../audit/index.js';
import { Permission } from '../../db/_roles.enum.js';
import { RoleKey } from '../../db/role.zod.js';
import * as RolesImpl from '../../service/index.js';

@Resolver()
export class DeleteRoleHandler {
    @Authorized(Permission.manageRoles)
    @UseMiddleware(DenyImpersonation)
    @Mutation(() => Boolean, {
        description:
            'Requires manageRoles. System roles and roles still assigned to users ' +
            '(ROLE_IN_USE) cannot be deleted. Audited.',
    })
    async deleteRole(
        @CurrentUser() actor: AuthUser,
        @Ctx() ctx: GraphQLContext,
        @Arg('key', () => String) key: string,
    ): Promise<boolean> {
        return RolesImpl.deleteRole(actor, parseInput(RoleKey, key), AuditImpl.auditMeta(ctx));
    }
}
