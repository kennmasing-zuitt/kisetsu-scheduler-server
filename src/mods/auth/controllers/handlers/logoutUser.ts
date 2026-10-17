import { Arg, Authorized, Ctx, ID, Mutation, Resolver } from 'type-graphql';
import type { GraphQLContext } from '../../../../core/graphql/context.js';
import { ObjectIdSchema, parseInput } from '../../../../shared/validation.js';
import { AuditImpl } from '../../../audit/index.js';
import { Permission } from '../../../roles/index.js';
import * as AuthImpl from '../../service/index.js';

@Resolver()
export class LogoutUserHandler {
    @Authorized(Permission.logoutUsers)
    @Mutation(() => Boolean, {
        description:
            'Requires logoutUsers. Signs one user out of every device (increments their ' +
            'tokenVersion). Returns true; NOT_FOUND if the user does not exist. Audited.',
    })
    async logoutUser(
        @Ctx() ctx: GraphQLContext,
        @Arg('userId', () => ID) userId: string,
    ): Promise<boolean> {
        await AuthImpl.logoutUser(parseInput(ObjectIdSchema, userId), AuditImpl.auditMeta(ctx));
        return true;
    }
}
