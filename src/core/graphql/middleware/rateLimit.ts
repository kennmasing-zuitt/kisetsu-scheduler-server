import type { RateLimitRequestHandler } from 'express-rate-limit';
import type { MiddlewareFn } from 'type-graphql';
import { markRateLimitFailure } from '../../middleware/rateLimit.js';
import type { GraphQLContext } from '../context.js';

/**
 * type-graphql middleware that applies an express-rate-limit limiter to one resolver:
 *
 *   @UseMiddleware(RateLimit(authLimiter))
 *   @Mutation(() => RegisterPayload)
 *   register(...) {}
 *
 * Every operation shares the /graphql URL, so per-operation limits can't be done with
 * Express routing. If the resolver throws, the attempt is flagged as failed so limiters
 * using `skipSuccessfulRequests` count it.
 */
export function RateLimit(limiter: RateLimitRequestHandler): MiddlewareFn<GraphQLContext> {
    return async ({ context }, next) => {
        const { req, res } = context;
        await new Promise<void>((resolve, reject) => {
            void limiter(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
        });
        try {
            return await next();
        } catch (err) {
            markRateLimitFailure(res);
            throw err;
        }
    };
}
