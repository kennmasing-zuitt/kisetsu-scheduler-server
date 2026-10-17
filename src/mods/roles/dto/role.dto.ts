import { Field, ID, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { Permission, RoleKind } from '../db/_roles.enum.js';

registerEnumType(RoleKind, {
    name: 'RoleKind',
    description: 'admin roles may hold admin permissions; user roles may not',
});
registerEnumType(Permission, {
    name: 'Permission',
    description:
        'Granular permissions. Admin permissions (superAdmin, readUsers, manageUserAccess, ' +
        'readRoles, manageRoles, logoutUsers, impersonateUsers, readAuditLogs) only apply through ' +
        'an admin-kind role; superAdmin implies every permission.',
});

@ObjectType('Role', { description: 'A named set of permissions assigned to users' })
export class RoleObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String, { description: 'Stable identifier, e.g. "support". Immutable.' })
    key!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String)
    description!: string;

    @Field(() => RoleKind)
    kind!: RoleKind;

    @Field(() => [Permission])
    perms!: Permission[];

    @Field(() => Boolean, { description: 'System roles always exist and cannot be deleted' })
    isSystem!: boolean;

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@InputType('CreateRoleInput')
export class CreateRoleInputType {
    @Field(() => String, { description: '2-40 lowercase letters, digits or dashes' })
    key!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => RoleKind)
    kind!: RoleKind;

    @Field(() => [Permission])
    perms!: Permission[];
}

@InputType('UpdateRoleInput', { description: 'Only the fields you send are changed' })
export class UpdateRoleInputType {
    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => [Permission], { nullable: true, description: 'Replaces the existing list' })
    perms?: Permission[];
}
