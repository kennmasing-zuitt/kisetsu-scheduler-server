import type { GraphQLContext } from '../../../../core/graphql/context.js';
import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import type { AuditMeta } from '../../db/_audit.types.js';

/** Who is acting, plus request id and IP, taken from the GraphQL context. */
export const auditMeta = (ctx: GraphQLContext): AuditMeta => {
    if (!ctx.user) throw new UnauthenticatedError();
    return {
        actorId: ctx.user.impersonatedBy ?? ctx.user.id,
        requestId: ctx.requestId,
        ip: ctx.req.ip,
    };
};
