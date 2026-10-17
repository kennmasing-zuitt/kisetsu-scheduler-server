import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { PublicUser } from '../../db/_users.types.js';
import { UserObject } from '../../dto/user.dto.js';

/** Computed fields of the `User` type (used by every query/mutation that returns a User). */
@Resolver(() => UserObject)
export class UserFieldsHandler {
    // Impl functions return Mongoose documents or .lean() objects, which carry `_id`
    @FieldResolver(() => ID)
    id(@Root() user: PublicUser): string {
        return String(user._id);
    }
}
