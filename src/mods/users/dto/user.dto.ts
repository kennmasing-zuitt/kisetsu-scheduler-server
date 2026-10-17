import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { PaginatedResponse } from '../../../shared/graphql/pagination.types.js';
import { RoleKey } from '../db/_users.enum.js';

registerEnumType(RoleKey, { name: 'RoleKey' });

@ObjectType('UserRole')
export class UserRoleObject {
    @Field(() => RoleKey)
    key!: RoleKey;
}

/** GraphQL `User`. The password hash is deliberately not a field, so it can never be queried. */
@ObjectType('User', { description: 'A user account' })
export class UserObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String)
    email!: string;

    @Field(() => [UserRoleObject])
    roles!: UserRoleObject[];

    @Field(() => Date)
    createdAt!: Date;

    @Field(() => Date)
    updatedAt!: Date;
}

@ObjectType('UserPage')
export class UserPage extends PaginatedResponse(UserObject) {}
