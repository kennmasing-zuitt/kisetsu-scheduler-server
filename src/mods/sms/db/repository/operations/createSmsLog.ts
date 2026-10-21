import type { NewSmsLog, SmsLogDocument } from '../../_sms.types.js';
import { SmsLogModel } from '../../smsLog.model.js';

export const createSmsLog = async (data: NewSmsLog): Promise<SmsLogDocument> =>
    SmsLogModel.create(data);
