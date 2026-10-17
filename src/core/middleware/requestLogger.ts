import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = performance.now();
    logger.info('Request started', { method: req.method, path: req.originalUrl });

    res.on('finish', () => {
        const durationMs = Math.round(performance.now() - start);
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        logger.log(level, 'Request finished', { status: res.statusCode, durationMs });
    });

    next();
}
