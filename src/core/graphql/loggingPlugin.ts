import type { ApolloServerPlugin } from '@apollo/server';
import { logger } from '../logger.js';
import type { GraphQLContext } from './context.js';

/** Logs which operation each /graphql request ran (the URL is always the same). */
export const loggingPlugin: ApolloServerPlugin<GraphQLContext> = {
    async requestDidStart() {
        return {
            async didResolveOperation({ operationName, operation }) {
                logger.info('GraphQL operation', {
                    operation: operation?.operation,
                    operationName: operationName ?? '(anonymous)',
                });
            },
        };
    },
};
