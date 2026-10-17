import type { Request, Response } from 'express';
import type { ExpressContextFunctionArgument } from '@as-integrations/express5';
import { requestContext } from '../requestContext.js';

/** Available in resolvers via `@Ctx() ctx: GraphQLContext`. */
export interface GraphQLContext {
    req: Request;
    res: Response;
    requestId?: string;
    // Add the authenticated user here once login/JWT is implemented, e.g. `user?: PublicUser`
}

export async function buildContext({ req, res }: ExpressContextFunctionArgument) {
    return {
        req,
        res,
        requestId: requestContext.getStore()?.requestId,
    } satisfies GraphQLContext;
}
