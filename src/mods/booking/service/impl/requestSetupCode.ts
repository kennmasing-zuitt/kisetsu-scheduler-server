import { env } from '../../../../core/config/env.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { formatMobile } from '../../../../shared/mobile.js';
import { hashCode, randomDigits } from '../../../../shared/otp/oneTimeCodes.js';
import { assertHuman } from '../../../../shared/otp/turnstile.js';
import { SmsImpl, SmsPurpose, SmsStatus } from '../../../sms/index.js';
import type { SetupCodeSent } from '../../db/_booking.types.js';
import * as BookingOperations from '../../db/repository/index.js';

export const SETUP_CODE_TTL_MINUTES = 5;
export const SETUP_CODE_RESEND_SECONDS = 60;
export const SETUP_CODES_PER_DAY = 5;

/** "+639171234567" -> "0917 *** 4567" */
export const maskMobile = (mobile: string): string =>
    formatMobile(mobile).replace(/^(\S+ )(\d{3})( \d{4})$/, '$1***$3');

/**
 * Step 1 of app setup: texts a 6-digit code to the number. Needs a passed Turnstile check.
 * Limits: one code per 60 s and 5 a day per number (plus an hourly cap per IP), because each
 * text costs money. Works for numbers that aren't clients yet (they give their name later).
 */
export const requestSetupCode = async (
    mobile: string,
    turnstileToken: string,
    remoteIp?: string,
): Promise<SetupCodeSent> => {
    await assertHuman(turnstileToken, remoteIp);

    if (env.SMS_PROVIDER === 'semaphore' && !/^\+639\d{9}$/.test(mobile)) {
        throw new AppError(
            400,
            'SMS_UNSUPPORTED_NUMBER',
            'Codes can only be texted to Philippine mobile numbers. Please call us to book.',
        );
    }

    const now = Date.now();
    const [latest, today] = await Promise.all([
        SmsImpl.findLatestSms(mobile, SmsPurpose.setupCode),
        SmsImpl.countSmsSince(mobile, SmsPurpose.setupCode, new Date(now - 24 * 3600_000)),
    ]);
    const resendAt = latest ? latest.createdAt.getTime() + SETUP_CODE_RESEND_SECONDS * 1000 : 0;
    if (resendAt > now) {
        throw new AppError(
            429,
            'SETUP_CODE_TOO_SOON',
            'Please wait a minute before asking for a new code.',
            {
                retryAfter: new Date(resendAt),
            },
        );
    }
    if (today >= SETUP_CODES_PER_DAY) {
        throw new AppError(
            429,
            'SETUP_CODE_LIMIT',
            'Too many codes for this number today. Try again tomorrow.',
        );
    }

    const code = randomDigits(6);
    const expiresAt = new Date(now + SETUP_CODE_TTL_MINUTES * 60_000);
    await BookingOperations.saveVerification(mobile, hashCode(code), expiresAt);

    const log = await SmsImpl.sendSms({
        to: mobile,
        purpose: SmsPurpose.setupCode,
        code,
        message:
            `{code} is your ${env.BUSINESS_NAME} code to set up online booking. ` +
            `It expires in ${SETUP_CODE_TTL_MINUTES} minutes. Never share it with anyone.`,
    });
    if (log.status !== SmsStatus.sent) {
        await BookingOperations.deleteVerification(mobile);
        throw new AppError(
            503,
            'SMS_FAILED',
            'We couldn’t send the text just now. Please try again shortly.',
        );
    }

    return {
        sentTo: maskMobile(mobile),
        expiresAt,
        resendAfter: new Date(now + SETUP_CODE_RESEND_SECONDS * 1000),
    };
};
