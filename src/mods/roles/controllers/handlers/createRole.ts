import { Arg, Authorized, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { CurrentUser, DenyImpersonation } from '../../../../core/graphql/auth.js';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { parseInput } from '../../../../shared/validation.js';
import { AuditImpl } from '../../../audit/index.js';
import { Permission } from '../../db/_roles.enum.js';
import type { Role } from '../../db/_roles.types.js';
import { CreateRoleInput } from '../../db/role.zod.js';
import { CreateRoleInputType, RoleObject } from '../../dto/role.dto.js';
import * as RolesImpl from '../../service/index.js';

@Resolver()
export class CreateRoleHandler {
    @Authorized(Permission.manageRoles)
    @UseMiddleware(DenyImpersonation)
    @Mutation(() => RoleObject, {
        description:
            'Requires manageRoles. You can only include permissions you hold; admin roles need a ' +
            'super admin. Audited.',
    })
    async createRole(
        @CurrentUser() actor: AuthUser,
        @Ctx() ctx: GraphQLContext,
        @Arg('input', () => CreateRoleInputType) input: CreateRoleInputType,
    ): Promise<Role> {
        return RolesImpl.createRole(
            actor,
            parseInput(CreateRoleInput, input),
            AuditImpl.auditMeta(ctx),
        );
    }
}
