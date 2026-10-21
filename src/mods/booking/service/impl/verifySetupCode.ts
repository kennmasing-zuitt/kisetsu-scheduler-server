import { signPurposeToken, TokenPurpose } from '../../../../shared/auth/jwt.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { codeMatches } from '../../../../shared/otp/oneTimeCodes.js';
import { ScheduleOperations } from '../../../schedule/index.js';
import type { SetupCodeVerified } from '../../db/_booking.types.js';
import * as BookingOperations from '../../db/repository/index.js';

export const SETUP_CODE_MAX_ATTEMPTS = 3;

/** `sub` of a setup token for a number that isn't a client yet */
export const NEW_CLIENT = 'new';

const wrongCode = () =>
    new AppError(
        401,
        'INVALID_SETUP_CODE',
        'That code is not right, or it expired. Ask for a new one.',
    );

/**
 * Step 2 of app setup: the SMS code. Three tries, then a new code is needed. Returns a setup
 * token (15 min) proving the number, and whether we still need the client's name.
 */
export const verifySetupCode = async (mobile: string, code: string): Promise<SetupCodeVerified> => {
    const pending = await BookingOperations.findVerification(mobile);
    if (!pending) throw wrongCode();
    if (!codeMatches(code.replace(/\s/g, ''), pending.codeHash)) {
        const attempts = await BookingOperations.recordVerificationAttempt(mobile);
        if (attempts >= SETUP_CODE_MAX_ATTEMPTS) await BookingOperations.deleteVerification(mobile);
        throw wrongCode();
    }
    await BookingOperations.deleteVerification(mobile);

    const client = await ScheduleOperations.findClientByMobile(mobile);
    const { token: setupToken } = signPurposeToken(TokenPurpose.clientAppSetup, {
        sub: client ? String(client._id) : NEW_CLIENT,
        ver: 0,
        data: { mobile },
    });
    return {
        setupToken,
        needsName: !client,
        firstName: client?.firstName ?? null,
        hasApp: Boolean(client?.app?.enabledAt),
    };
};
