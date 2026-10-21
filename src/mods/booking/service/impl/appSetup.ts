import { signPurposeToken, TokenPurpose, verifyPurposeToken } from '../../../../shared/auth/jwt.js';
import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import { ScheduleImpl, ScheduleOperations } from '../../../schedule/index.js';
import type { AppEnrollmentResult, ClientSessionResult } from '../../db/_booking.types.js';
import { signClientSession } from './clientSession.js';
import { NEW_CLIENT } from './verifySetupCode.js';

const SETUP_EXPIRED = 'APP_SETUP_EXPIRED';

function readSetupToken(setupToken: string): { sub: string; mobile: string } {
    const claims = verifyPurposeToken(TokenPurpose.clientAppSetup, setupToken, SETUP_EXPIRED);
    const mobile = claims.data?.mobile;
    if (!mobile) throw new UnauthenticatedError('Invalid token', 'INVALID_TOKEN');
    return { sub: claims.sub, mobile };
}

/**
 * Step 3: creates the client if the number is new (first name required), then returns the QR
 * code for their authenticator app and a setup token naming the client.
 */
export const startAppSetup = async (
    setupToken: string,
    names: { firstName?: string; lastName?: string },
): Promise<AppEnrollmentResult> => {
    const { sub, mobile } = readSetupToken(setupToken);
    const client =
        sub === NEW_CLIENT
            ? await ScheduleImpl.findOrCreateClient({
                  clientMobile: mobile,
                  clientFirstName: names.firstName,
                  clientLastName: names.lastName,
              })
            : await ScheduleOperations.findClientById(sub);
    if (!client || client.mobile !== mobile)
        throw new UnauthenticatedError('Invalid token', 'INVALID_TOKEN');

    const clientId = String(client._id);
    const enrollment = await ScheduleImpl.startClientAppSetup(clientId);
    const { token } = signPurposeToken(TokenPurpose.clientAppSetup, {
        sub: clientId,
        ver: 0,
        data: { mobile },
    });
    return { ...enrollment, setupToken: token };
};

/** Step 4: the first code from the app turns app sign-in on and signs the client in. */
export const confirmAppSetup = async (
    setupToken: string,
    code: string,
): Promise<ClientSessionResult> => {
    const { sub } = readSetupToken(setupToken);
    if (sub === NEW_CLIENT)
        throw new UnauthenticatedError('Start the setup first', 'APP_NOT_SET_UP');
    const client = await ScheduleImpl.confirmClientApp(sub, code);
    return signClientSession(client);
};
