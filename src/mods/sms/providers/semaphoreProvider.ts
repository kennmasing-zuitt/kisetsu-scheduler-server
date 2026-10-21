import { env } from '../../../core/config/env.js';
import { SmsSendError, type SmsProvider } from './smsProvider.js';

const API = 'https://api.semaphore.co/api/v4';

interface SemaphoreMessage {
    message_id?: number | string;
    status?: string;
}

/** Semaphore takes local numbers ("639171234567"); it only delivers to Philippine numbers. */
export const toSemaphoreNumber = (e164: string): string => {
    if (!/^\+639\d{9}$/.test(e164)) {
        throw new SmsSendError('Semaphore only delivers to Philippine mobile numbers', false);
    }
    return e164.slice(1);
};

/**
 * semaphore.co. Codes go through the /otp route (priority delivery, meant for OTP traffic);
 * everything else through /messages. Messages starting with "TEST" are silently dropped by
 * Semaphore, so none of ours do.
 */
export const semaphoreProvider: SmsProvider = {
    name: 'semaphore',
    async send(to, message, { code }) {
        const body = new URLSearchParams({
            apikey: env.SEMAPHORE_API_KEY,
            number: toSemaphoreNumber(to),
            // The OTP route fills in {otp} with `code` (without one it would append its own)
            message: code ? message.replaceAll('{code}', '{otp}') : message,
            sendername: env.SEMAPHORE_SENDER_NAME,
            ...(code ? { code } : {}),
        });
        let res: Response;
        try {
            res = await fetch(`${API}/${code ? 'otp' : 'messages'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
                signal: AbortSignal.timeout(15_000),
            });
        } catch (err) {
            throw new SmsSendError(`Semaphore unreachable: ${(err as Error).message}`);
        }
        const text = await res.text();
        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch {
            json = null;
        }
        const first = Array.isArray(json) ? (json[0] as SemaphoreMessage | undefined) : undefined;
        if (!res.ok || !first) {
            // Validation errors come back as { field: ["reason"] }; never echo the API key
            const reason = text.replace(env.SEMAPHORE_API_KEY, '***').slice(0, 300);
            throw new SmsSendError(
                `Semaphore ${res.status}: ${reason}`,
                res.status >= 500 || res.status === 429,
            );
        }
        if (first.status && /failed|refunded/i.test(first.status)) {
            throw new SmsSendError(`Semaphore status ${first.status}`, false);
        }
        return { messageId: first.message_id != null ? String(first.message_id) : null };
    },
};
