import type { SmsStatus } from '../../_sms.enum.js';
import { SmsLogModel } from '../../smsLog.model.js';

export interface SmsLogPatch {
    status: SmsStatus;
    attempts: number;
    providerMessageId?: string | null;
    error?: string | null;
    sentAt?: Date | null;
}

export const updateSmsLog = async (id: string, patch: SmsLogPatch): Promise<void> => {
    await SmsLogModel.updateOne({ _id: id }, { $set: patch });
};
