import type { ApolloServer } from '@apollo/server';
import type { GraphQLContext } from '../graphql/context.js';
import { logger } from '../logger.js';
import { disconnectDB } from './connectToMongo.js';

export default function gracefulShutdown(apollo: ApolloServer<GraphQLContext>): void {
    let shuttingDown = false;

    async function shutdown(signal: string) {
        if (shuttingDown) return; // ignore a second Ctrl+C while closing
        shuttingDown = true;
        logger.info(`${signal} received, shutting down`);

        // Safety net: force exit if something hangs (e.g. a stuck keep-alive connection)
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000).unref();

        try {
            // 1. Stop Apollo; the drain plugin stops new requests and waits for in-flight ones
            await apollo.stop();
            // 2. Close the database connection
            await disconnectDB();
            logger.info('Shutdown complete');
            // 3. Exit cleanly
            process.exit(0);
        } catch (err) {
            logger.error('Error during shutdown', { error: (err as Error).message });
            process.exit(1);
        }
    }

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled promise rejection', { reason: String(reason) });
        void shutdown('unhandledRejection');
    });
}
