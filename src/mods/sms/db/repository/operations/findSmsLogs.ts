import type { SmsLogDocument, SmsLogFilter } from '../../_sms.types.js';
import { SmsLogModel } from '../../smsLog.model.js';

/** Newest first. */
export const findSmsLogs = async ({
    status,
    bookingIds,
    limit,
}: SmsLogFilter): Promise<SmsLogDocument[]> =>
    SmsLogModel.find({
        ...(status ? { status } : {}),
        ...(bookingIds ? { bookingId: { $in: bookingIds } } : {}),
    })
        .sort({ createdAt: -1 })
        .limit(limit);
