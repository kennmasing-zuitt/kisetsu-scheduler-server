import { logger } from '../../../../core/logger.js';
import { SmsStatus } from '../../db/_sms.enum.js';
import type { OutgoingSms, SmsLogDocument } from '../../db/_sms.types.js';
import * as SmsOperations from '../../db/repository/index.js';
import { smsProvider, SmsSendError } from '../../providers/index.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_000, 4_000];
const MASK = '●●●●●●';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry pauses (tests set them to 0). */
export const smsRetry = { delaysMs: RETRY_DELAYS_MS };

/**
 * Sends a text and records it in SmsLog: up to 3 attempts, pausing 1 s then 4 s, unless the
 * provider says retrying can't help. `{code}` in the message is replaced by `code`, which
 * is never stored. Resolves to the log entry (status sent or failed); never throws for a
 * delivery failure.
 */
export const sendSms = async (sms: OutgoingSms): Promise<SmsLogDocument> => {
    const provider = smsProvider();
    const log = await SmsOperations.createSmsLog({
        to: sms.to,
        purpose: sms.purpose,
        message: sms.message.replaceAll('{code}', MASK),
        clientId: sms.clientId ?? null,
        bookingId: sms.bookingId ?? null,
        provider: provider.name,
    });

    let lastError: string;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const { messageId } = await provider.send(sms.to, sms.message, { code: sms.code });
            await SmsOperations.updateSmsLog(log.id, {
                status: SmsStatus.sent,
                attempts: attempt,
                providerMessageId: messageId,
                error: null,
                sentAt: new Date(),
            });
            log.set({ status: SmsStatus.sent, attempts: attempt, providerMessageId: messageId });
            return log;
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            const retryable = !(err instanceof SmsSendError) || err.retryable;
            if (!retryable || attempt === MAX_ATTEMPTS) {
                await SmsOperations.updateSmsLog(log.id, {
                    status: SmsStatus.failed,
                    attempts: attempt,
                    error: lastError,
                });
                log.set({ status: SmsStatus.failed, attempts: attempt, error: lastError });
                logger.warn('SMS failed', { to: sms.to, purpose: sms.purpose, error: lastError });
                return log;
            }
            await sleep(smsRetry.delaysMs[attempt - 1] ?? 0);
        }
    }
    return log;
};

const pending = new Set<Promise<unknown>>();

/** Sends in the background so the request that caused it isn't held up by retries. */
export const queueSms = (sms: OutgoingSms): void => {
    const job = sendSms(sms)
        .catch((err: unknown) =>
            logger.error('SMS could not be queued', { error: (err as Error).message }),
        )
        .finally(() => pending.delete(job));
    pending.add(job);
};

/** Waits for every queued text (tests, and graceful shutdown). */
export const flushSms = async (): Promise<void> => {
    while (pending.size) await Promise.all([...pending]);
};
