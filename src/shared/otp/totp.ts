import { generate, generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../../core/config/env.js';

/** Google Authenticator defaults: SHA-1, 6 digits, 30-second steps. */
export const TOTP_PERIOD_SECONDS = 30;
/** One step either side, for phones whose clock is slightly off. */
const TOLERANCE_SECONDS = TOTP_PERIOD_SECONDS;

/** What a setup screen needs: a QR to scan, the same link, and the secret to type by hand. */
export interface TotpEnrollment {
    secret: string;
    otpauthUrl: string;
    qrDataUrl: string;
}

export const newTotpSecret = (): string => generateSecret();

/** Builds the `otpauth://` link and its QR code (PNG data URL) for an authenticator app. */
export async function totpEnrollment(
    secret: string,
    accountLabel: string,
): Promise<TotpEnrollment> {
    const otpauthUrl = generateURI({ issuer: env.BUSINESS_NAME, label: accountLabel, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });
    return { secret, otpauthUrl, qrDataUrl };
}

/** Accepts "123456", "123 456" or "123-456". */
export const normalizeTotpCode = (code: string): string => code.replace(/[\s-]/g, '');

/**
 * Checks a 6-digit code. Returns the time step it matched (store it as `lastStep`), or null.
 * `afterStep` rejects that step and every earlier one, so each code works only once.
 */
export async function verifyTotp(
    secret: string,
    code: string,
    afterStep?: number | null,
): Promise<number | null> {
    const token = normalizeTotpCode(code);
    if (!/^\d{6}$/.test(token)) return null;
    const result = await verify({
        secret,
        token,
        epochTolerance: TOLERANCE_SECONDS,
        ...(afterStep != null ? { afterTimeStep: afterStep } : {}),
    });
    if (!result.valid) return null;
    return (
        (result as { timeStep?: number }).timeStep ??
        Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS) + result.delta
    );
}

/** The current code for a secret (tests and the dev seed only). */
export const currentTotp = (secret: string, epochSeconds?: number): Promise<string> =>
    generate({ secret, ...(epochSeconds != null ? { epoch: epochSeconds } : {}) });
