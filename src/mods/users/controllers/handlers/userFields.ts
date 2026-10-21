import { Ctx, FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import { NotFoundError } from '../../../../shared/errors/AppError.js';
import { RoleObject, type Role } from '../../../roles/index.js';
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

    // Looked up through a per-request cache, so a page of users costs one query per distinct role
    @FieldResolver(() => RoleObject)
    async role(@Root() user: PublicUser, @Ctx() ctx: GraphQLContext): Promise<Role> {
        const role = await ctx.roles.get(user.role);
        if (!role) throw new NotFoundError(`Role "${user.role}" not found`);
        return role;
    }

    @FieldResolver(() => Boolean, { description: 'Signs in with an authenticator code too' })
    twoFactorEnabled(@Root() user: PublicUser): boolean {
        return Boolean(user.twoFactor?.enabledAt);
    }

    @FieldResolver(() => Date, { nullable: true })
    twoFactorEnabledAt(@Root() user: PublicUser): Date | null {
        return user.twoFactor?.enabledAt ?? null;
    }
}
