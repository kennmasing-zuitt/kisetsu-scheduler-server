import type { SmsPurpose } from '../../_sms.enum.js';
import type { SmsLogDocument } from '../../_sms.types.js';
import { SmsLogModel } from '../../smsLog.model.js';

/** How many texts of this kind went to `to` since `since` (for send limits). */
export const countSmsSince = async (
    to: string,
    purpose: SmsPurpose,
    since: Date,
): Promise<number> => SmsLogModel.countDocuments({ to, purpose, createdAt: { $gte: since } });

/** The latest text of this kind to `to` (for the resend cooldown). */
export const findLatestSms = async (
    to: string,
    purpose: SmsPurpose,
): Promise<SmsLogDocument | null> => SmsLogModel.findOne({ to, purpose }).sort({ createdAt: -1 });
