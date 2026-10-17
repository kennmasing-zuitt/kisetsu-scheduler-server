import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { Role } from '../../db/_roles.types.js';
import { RoleObject } from '../../dto/role.dto.js';

@Resolver(() => RoleObject)
export class RoleFieldsHandler {
    @FieldResolver(() => ID)
    id(@Root() role: Role): string {
        return String(role._id);
    }

    @FieldResolver(() => String)
    description(@Root() role: Role): string {
        return role.description ?? '';
    }
}
