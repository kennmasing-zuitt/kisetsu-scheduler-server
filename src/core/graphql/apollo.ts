import type { Server } from 'node:http';
import { ApolloServer, type ApolloServerPlugin } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { env } from '../config/env.js';
import type { GraphQLContext } from './context.js';
import { formatError } from './formatError.js';
import { loggingPlugin } from './loggingPlugin.js';
import { buildSchema } from './schema.js';

export function createApolloServer(httpServer?: Server) {
    const plugins: ApolloServerPlugin<GraphQLContext>[] = [loggingPlugin];

    // Lets apollo.stop() finish in-flight requests before closing the HTTP server
    if (httpServer) plugins.push(ApolloServerPluginDrainHttpServer({ httpServer }));

    // Apollo Sandbox (an in-browser IDE) at GET /graphql in development only
    plugins.push(
        env.isDevelopment
            ? ApolloServerPluginLandingPageLocalDefault({ embed: true })
            : ApolloServerPluginLandingPageDisabled(),
    );

    return new ApolloServer<GraphQLContext>({
        schema: buildSchema(),
        introspection: !env.isProduction,
        includeStacktraceInErrorResponses: env.isDevelopment,
        formatError,
        plugins,
        // core/loaders/gracefulShutdown.ts owns SIGINT/SIGTERM handling (Apollo, then MongoDB)
        stopOnTerminationSignals: false,
    });
}
