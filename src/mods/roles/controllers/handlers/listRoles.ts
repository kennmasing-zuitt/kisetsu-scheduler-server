import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import { Permission } from '../../db/_roles.enum.js';
import type { Role } from '../../db/_roles.types.js';
import { RoleKey } from '../../db/role.zod.js';
import { RoleObject } from '../../dto/role.dto.js';
import { parseInput } from '../../../../shared/validation.js';
import * as RolesImpl from '../../service/index.js';

@Resolver()
export class ListRolesHandler {
    @Authorized(Permission.readRoles)
    @Query(() => [RoleObject], {
        description: 'All roles, system roles first. Requires readRoles.',
    })
    async roles(): Promise<Role[]> {
        return RolesImpl.listRoles();
    }

    @Authorized(Permission.readRoles)
    @Query(() => RoleObject, {
        nullable: true,
        description: 'One role by key. Requires readRoles.',
    })
    async role(@Arg('key', () => String) key: string): Promise<Role | null> {
        return RolesImpl.getRole(parseInput(RoleKey, key));
    }
}
