import type { NextFunction, Request, Response } from 'express';
import { BookingImpl } from '../../mods/booking/index.js';
import { UnauthenticatedError } from '../../shared/errors/AppError.js';

/**
 * Runs in front of /booking/graphql. No Authorization header: anonymous (setting up, signing in,
 * browsing services). A Bearer token must be a client session (staff tokens are not valid here);
 * it's checked against the client's current app, so a staff reset ends it at once.
 */
export async function verifyClientToken(req: Request, _res: Response, next: NextFunction) {
    const header = req.get('authorization');
    if (!header) return next();
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        throw new UnauthenticatedError('Authorization header must be "Bearer <token>"');
    }
    req.bookingClient = await BookingImpl.verifyClientSession(token);
    next();
}
