import { signPurposeToken, TokenPurpose, verifyPurposeToken } from '../../../../shared/auth/jwt.js';
import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import { ScheduleImpl, type Client } from '../../../schedule/index.js';
import type { ClientSessionResult } from '../../db/_booking.types.js';

/** A 30-minute booking-site session, tied to the client's current app (a reset ends it). */
export function signClientSession(
    client: Pick<Client, '_id' | 'firstName' | 'app'>,
): ClientSessionResult {
    const clientId = String(client._id);
    const { token, expiresAt } = signPurposeToken(TokenPurpose.clientSession, {
        sub: clientId,
        ver: client.app?.version ?? 0,
    });
    return { token, expiresAt, clientId, firstName: client.firstName };
}

/** Booking-site sign-in with the mobile and the current app code. */
export const clientLogin = async (mobile: string, code: string): Promise<ClientSessionResult> =>
    signClientSession(await ScheduleImpl.verifyClientAppCode(mobile, code));

/** Checks a session token: signature, expiry, and that the app wasn't reset since. */
export async function verifyClientSession(token: string): Promise<{ id: string }> {
    const claims = verifyPurposeToken(TokenPurpose.clientSession, token, 'SESSION_EXPIRED');
    const version = await ScheduleImpl.clientAppVersion(claims.sub);
    if (version == null || version !== claims.ver) {
        throw new UnauthenticatedError('Please sign in again', 'SESSION_EXPIRED');
    }
    return { id: claims.sub };
}
