// Catches errors raised OUTSIDE GraphQL execution (CORS, malformed JSON, body too large, ...).
// Errors thrown inside resolvers are shaped by core/graphql/formatError.ts instead.
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../logger.js';
import { env } from '../config/env.js';

interface HttpError extends Error {
    status?: number;
    type?: string;
}

const send = (res: Response, status: number, code: string, message: string) => {
    res.status(status).json({ errors: [{ message, extensions: { code } }] });
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        send(res, err.status, err.code, err.message);
        return;
    }

    const httpErr = err as HttpError;
    if (httpErr.type === 'entity.parse.failed') {
        send(res, 400, 'BAD_REQUEST', 'Malformed JSON body');
        return;
    }
    if (httpErr.type === 'entity.too.large') {
        send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
        return;
    }

    logger.error('Unhandled Error', { error: httpErr.message, stack: httpErr.stack });
    send(
        res,
        500,
        'INTERNAL_SERVER_ERROR',
        env.isProduction ? 'Something went wrong' : httpErr.message,
    );
}
