import { randomUUID } from 'node:crypto';
import { env } from '../../core/config/env.js';
import { logger } from '../../core/logger.js';
import { AppError } from '../errors/AppError.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Cloudflare's published test secret that accepts every token (the development default)
const ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA';

interface SiteverifyResponse {
    success: boolean;
    'error-codes'?: string[];
    hostname?: string;
    action?: string;
}

/**
 * Checks a Cloudflare Turnstile token (the widget on the booking site) before anything that
 * costs money, like sending an SMS. Tokens last 5 minutes and work once.
 * Throws 400 BOT_CHECK_FAILED when Cloudflare says no.
 */
export async function assertHuman(
    token: string | undefined | null,
    remoteIp?: string,
): Promise<void> {
    if (!token) throw new AppError(400, 'BOT_CHECK_FAILED', 'Please complete the security check');
    // Development and tests with the test secret: same answer Cloudflare would give, no network
    if (!env.isProduction && env.TURNSTILE_SECRET_KEY === ALWAYS_PASS_TEST_SECRET) return;
    let body: SiteverifyResponse;
    try {
        const res = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: env.TURNSTILE_SECRET_KEY,
                response: token,
                remoteip: remoteIp,
                idempotency_key: randomUUID(),
            }),
            signal: AbortSignal.timeout(8000),
        });
        body = (await res.json()) as SiteverifyResponse;
    } catch (err) {
        logger.error('Turnstile verification failed to run', { error: (err as Error).message });
        throw new AppError(
            503,
            'BOT_CHECK_UNAVAILABLE',
            'Security check unavailable. Try again shortly.',
        );
    }
    if (!body.success) {
        logger.warn('Turnstile rejected a token', { errors: body['error-codes'] });
        throw new AppError(400, 'BOT_CHECK_FAILED', 'Security check failed. Please try again.');
    }
}
