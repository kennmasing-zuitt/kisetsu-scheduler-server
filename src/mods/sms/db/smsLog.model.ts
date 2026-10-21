import { model, Schema } from 'mongoose';
import { SMS_PURPOSE_VALUES, SMS_STATUS_VALUES, SmsStatus } from './_sms.enum.js';

/** One outgoing text and what happened to it. Codes are never stored in `message`. */
export const SmsLogSchema = new Schema(
    {
        /** E.164, e.g. +639171234567 */
        to: { type: String, required: true, index: true },
        purpose: { type: String, required: true, enum: SMS_PURPOSE_VALUES },
        /** The text as sent, with any code replaced by ●●●●●● */
        message: { type: String, required: true },
        clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
        bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
        status: {
            type: String,
            required: true,
            enum: SMS_STATUS_VALUES,
            default: SmsStatus.sending,
        },
        attempts: { type: Number, default: 0 },
        provider: { type: String, required: true },
        providerMessageId: { type: String, default: null },
        error: { type: String, default: null },
        sentAt: { type: Date, default: null },
    },
    { collection: 'SmsLog', timestamps: true },
);
SmsLogSchema.index({ to: 1, purpose: 1, createdAt: -1 });
SmsLogSchema.index({ status: 1, createdAt: -1 });

export const SmsLogModel = model('SmsLog', SmsLogSchema);
