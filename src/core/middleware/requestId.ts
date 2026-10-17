import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { requestContext } from '../requestContext.js';

export function requestId(req: Request, res: Response, next: NextFunction) {
    const id = req.get('x-request-id') ?? randomUUID();
    res.setHeader('X-Request-Id', id);
    requestContext.run({ requestId: id }, next);
}
