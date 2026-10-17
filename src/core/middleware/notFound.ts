import type { Request, Response } from 'express';
import { GRAPHQL_PATH } from '../config/graphql.js';
import { requestContext } from '../requestContext.js';

export function notFound(req: Request, res: Response) {
    res.status(404).json({
        errors: [
            {
                message: `Route ${req.method} ${req.originalUrl} not found. The API is served at ${GRAPHQL_PATH}`,
                extensions: {
                    code: 'NOT_FOUND',
                    requestId: requestContext.getStore()?.requestId,
                },
            },
        ],
    });
}
