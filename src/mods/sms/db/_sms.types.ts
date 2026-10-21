import type { InferSchemaType, Types } from 'mongoose';
import type { SmsPurpose, SmsStatus } from './_sms.enum.js';
import type { SmsLogModel, SmsLogSchema } from './smsLog.model.js';

export type SmsLog = Omit<InferSchemaType<typeof SmsLogSchema>, 'purpose' | 'status'> & {
    _id: Types.ObjectId;
    purpose: SmsPurpose;
    status: SmsStatus;
};
export type SmsLogDocument = InstanceType<typeof SmsLogModel>;

/** A text to send. `code` is substituted for {code} and never stored. */
export interface OutgoingSms {
    to: string;
    purpose: SmsPurpose;
    message: string;
    code?: string;
    clientId?: string | Types.ObjectId | null;
    bookingId?: string | Types.ObjectId | null;
}

export interface NewSmsLog {
    to: string;
    purpose: SmsPurpose;
    message: string;
    clientId?: string | Types.ObjectId | null;
    bookingId?: string | Types.ObjectId | null;
    provider: string;
}

export interface SmsLogFilter {
    status?: SmsStatus;
    bookingIds?: string[];
    limit: number;
}
