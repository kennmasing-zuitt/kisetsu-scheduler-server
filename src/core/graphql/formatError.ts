import type { GraphQLFormattedError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';
import mongoose from 'mongoose';
import { AppError } from '../../shared/errors/AppError.js';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import { requestContext } from '../requestContext.js';

// Errors Apollo/graphql-js raise before or around execution; they are safe to show as-is.
const CLIENT_ERROR_CODES = new Set([
    'GRAPHQL_PARSE_FAILED',
    'GRAPHQL_VALIDATION_FAILED',
    'BAD_USER_INPUT',
    'BAD_REQUEST',
    'OPERATION_RESOLUTION_FAILURE',
    'PERSISTED_QUERY_NOT_FOUND',
    'PERSISTED_QUERY_NOT_SUPPORTED',
]);

/**
 * GraphQL equivalent of the old Express errorHandler.
 * Every error ends up as `{ message, path, extensions: { code, status?, details?, requestId } }`.
 */
export function formatError(
    formatted: GraphQLFormattedError,
    error: unknown,
): GraphQLFormattedError {
    const original = unwrapResolverError(error);
    const requestId = requestContext.getStore()?.requestId;
    const base = { locations: formatted.locations, path: formatted.path };

    if (original instanceof AppError) {
        return {
            ...base,
            message: original.message,
            extensions: {
                code: original.code,
                status: original.status,
                ...(original.details !== undefined && { details: original.details }),
                requestId,
            },
        };
    }

    if (original instanceof mongoose.Error.CastError) {
        return {
            ...base,
            message: 'Invalid ID',
            extensions: { code: 'INVALID_ID', status: 400, requestId },
        };
    }

    const code = formatted.extensions?.code;
    if (typeof code === 'string' && CLIENT_ERROR_CODES.has(code)) {
        return { ...formatted, extensions: { ...formatted.extensions, requestId } };
    }

    // Anything else is unexpected: log it, hide the details in production
    const err = original as Error;
    logger.error('Unhandled GraphQL error', { error: err?.message, stack: err?.stack });
    return {
        ...base,
        message: env.isProduction ? 'Something went wrong' : (err?.message ?? formatted.message),
        extensions: { code: 'INTERNAL_SERVER_ERROR', status: 500, requestId },
    };
}
