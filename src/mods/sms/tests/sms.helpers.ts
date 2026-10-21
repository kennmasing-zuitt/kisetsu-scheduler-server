import { afterEach, beforeEach } from 'vitest';
import { setSmsProviderForTests, SmsImpl, SmsSendError, type SmsProvider } from '../index.js';

export interface SentSms {
    to: string;
    message: string;
    code?: string;
}

/**
 * Replaces the SMS provider for a test file: texts are captured in `outbox` (with the code
 * filled in), `failNext(n)` makes the next n sends fail. Retries don't wait.
 */
export function useTestSms() {
    const outbox: SentSms[] = [];
    let failures = 0;
    const provider: SmsProvider = {
        name: 'test',
        async send(to, message, { code }) {
            if (failures > 0) {
                failures -= 1;
                throw new SmsSendError('test failure');
            }
            outbox.push({ to, message: code ? message.replaceAll('{code}', code) : message, code });
            return { messageId: String(outbox.length) };
        },
    };
    beforeEach(() => {
        outbox.length = 0;
        failures = 0;
        SmsImpl.smsRetry.delaysMs = [0, 0];
        setSmsProviderForTests(provider);
    });
    afterEach(async () => {
        await SmsImpl.flushSms();
        setSmsProviderForTests(null);
    });
    return {
        outbox,
        failNext(n: number) {
            failures = n;
        },
    };
}
