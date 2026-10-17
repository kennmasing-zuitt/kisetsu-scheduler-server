import { Arg, Authorized, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { CurrentUser, DenyImpersonation } from '../../../../core/graphql/auth.js';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { parseInput } from '../../../../shared/validation.js';
import { AuditImpl } from '../../../audit/index.js';
import { Permission } from '../../db/_roles.enum.js';
import type { Role } from '../../db/_roles.types.js';
import { RoleKey, UpdateRoleInput } from '../../db/role.zod.js';
import { RoleObject, UpdateRoleInputType } from '../../dto/role.dto.js';
import * as RolesImpl from '../../service/index.js';

@Resolver()
export class UpdateRoleHandler {
    @Authorized(Permission.manageRoles)
    @UseMiddleware(DenyImpersonation)
    @Mutation(() => RoleObject, {
        description:
            'Requires manageRoles. Changes apply to every user with the role on their next request. ' +
            'The super-admin role is locked. Audited.',
    })
    async updateRole(
        @CurrentUser() actor: AuthUser,
        @Ctx() ctx: GraphQLContext,
        @Arg('key', () => String) key: string,
        @Arg('input', () => UpdateRoleInputType) input: UpdateRoleInputType,
    ): Promise<Role> {
        return RolesImpl.updateRole(
            actor,
            parseInput(RoleKey, key),
            parseInput(UpdateRoleInput, input),
            AuditImpl.auditMeta(ctx),
        );
    }
}
