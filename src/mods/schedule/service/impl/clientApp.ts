import { AppError, ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { formatMobile } from '../../../../shared/mobile.js';
import { openSecret, sealSecret } from '../../../../shared/otp/secretBox.js';
import {
    newTotpSecret,
    totpEnrollment,
    verifyTotp,
    type TotpEnrollment,
} from '../../../../shared/otp/totp.js';
import type { Client } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/** Wrong codes in a row before booking-site sign-in pauses for 15 minutes. */
export const MAX_FAILED_CLIENT_CODES = 5;
export const CLIENT_LOCK_MINUTES = 15;

/** One answer for every sign-in failure, so the page can't be used to find out who is a client. */
export const invalidClientCode = () =>
    new AppError(
        401,
        'INVALID_CLIENT_CODE',
        'That number and code didn’t match. After several wrong codes, sign-in pauses for 15 minutes.',
    );

/** Starts (or restarts) app setup for a client: a QR code for their authenticator. */
export const startClientAppSetup = async (clientId: string): Promise<TotpEnrollment> => {
    const client = await ScheduleOperations.findClientById(clientId);
    if (!client) throw new NotFoundError('Client not found');
    const secret = newTotpSecret();
    await ScheduleOperations.setClientAppPending(clientId, sealSecret(secret));
    return totpEnrollment(secret, formatMobile(client.mobile));
};

/** Finishes setup with the first code from the app. Replaces any earlier phone. */
export const confirmClientApp = async (clientId: string, code: string): Promise<Client> => {
    const client = await ScheduleOperations.findClientWithApp({ id: clientId });
    if (!client) throw new NotFoundError('Client not found');
    const pending = client.app?.pendingSecret;
    if (!pending) throw new AppError(400, 'APP_NOT_SET_UP', 'Start the setup first');
    const step = await verifyTotp(openSecret(pending), code);
    if (step == null) {
        throw new AppError(
            401,
            'INVALID_CLIENT_CODE',
            'That code is not right. Try the newest code in the app.',
        );
    }
    const updated = await ScheduleOperations.enableClientApp(clientId, pending, step);
    if (!updated)
        throw new ConflictError('The setup changed meanwhile. Start again.', 'APP_SETUP_CHANGED');
    return updated;
};

/**
 * Booking-site sign-in: the client's mobile and the current code from their app. Unknown
 * numbers, clients without the app, locked clients and wrong codes all get INVALID_CLIENT_CODE.
 */
export const verifyClientAppCode = async (mobile: string, code: string): Promise<Client> => {
    const client = await ScheduleOperations.findClientWithApp({ mobile });
    const app = client?.app;
    if (!client || !app?.enabledAt || !app.secret) throw invalidClientCode();
    if (app.lockedUntil && app.lockedUntil > new Date()) throw invalidClientCode();

    const step = await verifyTotp(openSecret(app.secret), code, app.lastStep);
    if (step != null && (await ScheduleOperations.acceptClientAppStep(String(client._id), step)))
        return client;

    await ScheduleOperations.recordClientAppFailure(
        String(client._id),
        MAX_FAILED_CLIENT_CODES,
        new Date(Date.now() + CLIENT_LOCK_MINUTES * 60_000),
    );
    throw invalidClientCode();
};

/** Staff action for a lost phone: app sign-in off and booking-site sessions ended. */
export const resetClientApp = async (clientId: string): Promise<Client> => {
    const client = await ScheduleOperations.clearClientApp(clientId);
    if (!client) throw new NotFoundError('Client not found');
    return client;
};

/** For the booking-site session check: the client's current app version, or null if off. */
export const clientAppVersion = async (clientId: string): Promise<number | null> => {
    const client = await ScheduleOperations.findClientById(clientId);
    return client?.app?.enabledAt ? (client.app.version ?? 0) : null;
};
