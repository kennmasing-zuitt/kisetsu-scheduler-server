import type { MiddlewareFn } from 'type-graphql';
import type { GraphQLContext } from '../../../core/graphql/context.js';
import { UnauthenticatedError } from '../../../shared/errors/AppError.js';

/** Booking-site resolvers that need a signed-in client: @UseMiddleware(ClientOnly) */
export const ClientOnly: MiddlewareFn<GraphQLContext> = async ({ context }, next) => {
    if (!context.bookingClient)
        throw new UnauthenticatedError('Please sign in with your app code', 'SESSION_EXPIRED');
    return next();
};
