import type { Request, Response } from 'express';
import type { ExpressContextFunctionArgument } from '@as-integrations/express5';
import type { AuthUser } from '../../shared/auth/auth.types.js';
import { requestContext } from '../requestContext.js';

/** Available in resolvers via `@Ctx() ctx: GraphQLContext`, or `@CurrentUser()` for the user. */
export interface GraphQLContext {
    req: Request;
    res: Response;
    requestId?: string;
    /** The authenticated caller (set by the verifyToken middleware); undefined when anonymous. */
    user?: AuthUser;
}

export async function buildContext({ req, res }: ExpressContextFunctionArgument) {
    return {
        req,
        res,
        requestId: requestContext.getStore()?.requestId,
        user: req.user,
    } satisfies GraphQLContext;
}
