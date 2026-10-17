import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { PaginatedResponse } from '../../../shared/graphql/pagination.types.js';
import { Permission, RoleObject } from '../../roles/index.js';

/** GraphQL `User`. The password hash is deliberately not a field, so it can never be queried. */
@ObjectType('User', { description: 'A user account' })
export class UserObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String)
    email!: string;

    @Field(() => RoleObject, { description: "The user's role and its permissions" })
    role!: RoleObject;

    @Field(() => [Permission], { description: 'Per-user grants on top of the role' })
    extraPerms!: Permission[];

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@ObjectType('UserPage')
export class UserPage extends PaginatedResponse(UserObject) {}

@InputType('SetUserAccessInput')
export class SetUserAccessInputType {
    @Field(() => String, { description: 'Role key, e.g. "user" or "support"' })
    role!: string;

    @Field(() => [Permission], {
        nullable: true,
        defaultValue: [],
        description: 'Per-user extras on top of the role. Replaces the existing list.',
    })
    extraPerms?: Permission[];
}
