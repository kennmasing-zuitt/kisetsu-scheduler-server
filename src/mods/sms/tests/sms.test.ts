import { describe, expect, it } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { registerTestUser } from '../../auth/tests/auth.helpers.js';
import { SmsImpl, SmsLogModel, SmsPurpose } from '../index.js';
import { toSemaphoreNumber } from '../providers/semaphoreProvider.js';
import { useTestSms } from './sms.helpers.js';

const sms = useTestSms();

describe('sms', () => {
    it('sends, logs (code masked) and retries up to 3 times', async () => {
        sms.failNext(2);
        const log = await SmsImpl.sendSms({
            to: '+639171234567',
            purpose: SmsPurpose.setupCode,
            message: '{code} is your code',
            code: '123456',
        });
        expect(log.status).toBe('sent');
        expect(log.attempts).toBe(3);
        expect(sms.outbox[0]).toMatchObject({
            to: '+639171234567',
            message: '123456 is your code',
        });
        const stored = await SmsLogModel.findById(log.id).lean();
        expect(stored?.message).toBe('●●●●●● is your code');
    });

    it('records a failure after 3 attempts', async () => {
        sms.failNext(3);
        const log = await SmsImpl.sendSms({
            to: '+639171234567',
            purpose: SmsPurpose.rebook,
            message: 'Hi',
        });
        expect(log.status).toBe('failed');
        expect(log.error).toBe('test failure');
        expect(sms.outbox).toHaveLength(0);
    });

    it('smsLogs lists failed texts for staff (readSmsLogs)', async () => {
        sms.failNext(3);
        await SmsImpl.sendSms({ to: '+639171234567', purpose: SmsPurpose.rebook, message: 'Hi' });
        await SmsImpl.sendSms({
            to: '+639171234567',
            purpose: SmsPurpose.rebook,
            message: 'Hello',
        });
        const { token } = await registerTestUser();
        const res = await gql<{ smsLogs: { status: string; message: string }[] }>(
            '{ smsLogs(status: failed) { status message to provider attempts } }',
            {},
            bearer(token),
        );
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data?.smsLogs).toEqual([
            expect.objectContaining({
                status: 'failed',
                message: 'Hi',
                attempts: 3,
                provider: 'test',
            }),
        ]);
    });

    it('Semaphore gets local PH numbers and refuses other countries', () => {
        expect(toSemaphoreNumber('+639171234567')).toBe('639171234567');
        expect(() => toSemaphoreNumber('+14155550123')).toThrow(/Philippine/);
    });
});
