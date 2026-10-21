import type { SmsPurpose, SmsStatus } from '../../db/_sms.enum.js';
import type { SmsLogDocument } from '../../db/_sms.types.js';
import * as SmsOperations from '../../db/repository/index.js';

export const readSmsLogs = async (
    status?: SmsStatus | null,
    limit = 50,
): Promise<SmsLogDocument[]> =>
    SmsOperations.findSmsLogs({
        status: status ?? undefined,
        limit: Math.min(Math.max(limit, 1), 200),
    });

/** Texts about these bookings (newest first), e.g. to show "client notified" on a booking. */
export const readSmsForBookings = async (bookingIds: string[]): Promise<SmsLogDocument[]> =>
    bookingIds.length ? SmsOperations.findSmsLogs({ bookingIds, limit: 500 }) : [];

/** How many texts of this kind went to `to` since `since` (send limits). */
export const countSmsSince = (to: string, purpose: SmsPurpose, since: Date): Promise<number> =>
    SmsOperations.countSmsSince(to, purpose, since);

/** The latest text of this kind to `to` (resend cooldown). */
export const findLatestSms = (to: string, purpose: SmsPurpose): Promise<SmsLogDocument | null> =>
    SmsOperations.findLatestSms(to, purpose);
