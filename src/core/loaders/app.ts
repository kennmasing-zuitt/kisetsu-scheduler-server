import type { Server } from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { expressMiddleware } from '@as-integrations/express5';
import { corsOptions } from '../config/cors.js';
import { env } from '../config/env.js';
import { GRAPHQL_PATH } from '../config/graphql.js';
import { createApolloServer } from '../graphql/apollo.js';
import { buildContext } from '../graphql/context.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { notFound } from '../middleware/notFound.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { requestId } from '../middleware/requestId.js';
import { requestLogger } from '../middleware/requestLogger.js';

interface CreateAppOptions {
    /** Pass the HTTP server so Apollo can drain it on shutdown (omit in tests). */
    httpServer?: Server;
}

export async function createApp({ httpServer }: CreateAppOptions = {}) {
    const app = express();
    app.disable('x-powered-by');
    if (env.TRUST_PROXY > 0) {
        app.set('trust proxy', env.TRUST_PROXY);
    }
    app.use(requestId);
    app.use(requestLogger);
    // The Apollo Sandbox page (dev only) loads scripts from Apollo's CDN, so CSP is
    // relaxed outside production. Production serves JSON only and keeps the strict default.
    app.use(helmet({ contentSecurityPolicy: env.isProduction }));
    app.use(cors(corsOptions));

    // Infrastructure liveness probe (Docker / load balancer); not part of the API
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    const apollo = createApolloServer(httpServer);
    await apollo.start();

    app.use(
        GRAPHQL_PATH,
        apiLimiter,
        express.json({ limit: '1mb' }),
        expressMiddleware(apollo, { context: buildContext }),
    );

    app.use(notFound);
    app.use(errorHandler);
    return { app, apollo };
}
