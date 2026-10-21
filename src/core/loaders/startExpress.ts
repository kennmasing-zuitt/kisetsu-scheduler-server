import { createServer } from 'node:http';
import { env } from '../config/env.js';
import { GRAPHQL_PATH } from '../config/graphql.js';
import { logger } from '../logger.js';
import { createApp } from './app.js';

export default async function startExpress() {
    const httpServer = createServer();
    const { app, apollo, bookingApollo } = await createApp({ httpServer });
    httpServer.on('request', app);

    await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(env.PORT, resolve);
    }).catch((err: Error) => {
        logger.error('Server failed to start', { error: err.message });
        process.exit(1);
    });

    logger.info(`GraphQL ready at http://localhost:${env.PORT}${GRAPHQL_PATH} [${env.NODE_ENV}]`);
    return { httpServer, apollo, bookingApollo };
}
